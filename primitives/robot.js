 /**
 * Implements ToonTalk's robots
 * Authors = Ken Kahn
 * License: New BSD
 */
 
 /*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */


(function () {
    "use strict";

window.TOONTALK.robot = (function (TT) {

    var add_step_to_robot = function (widget, action_name, robot, additional_info, new_widget) {
        var path, now;
        robot.current_action_name = action_name;
        // following relies on current_action_name being set
        path = TT.path.get_path_to(widget, robot, true);
        if (path) {
            if (!additional_info) {
                additional_info = {};
            }
            now = Date.now();
            additional_info.time = now-robot.time_of_last_step;
            robot.time_of_last_step = now;
            robot.add_step(TT.robot_action.create(path, action_name, additional_info), new_widget);
        } else {
            console.log("No path found for " + action_name);
        }
        robot.current_action_name = undefined;
    };
   
    var robot = Object.create(TT.widget);

    var name_counter = 0;
 
    robot.create = function (frontside_conditions, backside_conditions, body, description, thing_in_hand, run_once, next_robot, name, watched_speed) {
        // frontside_conditions is a widget that needs to be matched against the frontside of the widget to run
        // backside_conditions is a list of required widgets on the backside
        // body holds the actions the robot does when it runs
        // if watched_speed is 0 then runs at original speed
        // otherwise is a positive number which is the multiplier of the normal default speed for each step
        var new_robot = Object.create(robot);
        // grab the default definition of remove_backside_widget so can use it while overriding it
        var widget_remove_backside_widget;
        // who should do the 'repeating'
        var first_in_team;
        // if not the first_in_team then the robot just before this one
        var previous_robot;
        // if set specifies the maximum duration of any watched step
        var maximum_step_duration;
        // callbacks to run at the end of each cycle
        var body_finished_listeners = [];
        // when running watched runs these after each step
        var watched_step_end_listeners = [];
        // backside that the robot is (or last) was running on
        var context; // context that the robut is running in (typically the backside of something)
        var context_is_backside; // true if the context was run as a backside (e.g. it on the back of a widget that was run)
        var top_level_context; // if the context is on the backside of another (and possibly more) this is the top level widget
        var queue; // run queue this robot is running (or will run) on
        var running_or_in_run_queue, stopped;
        var original_backside_widgets_of_context, original_backside_widgets_of_context_copy, backside_matched_widgets;
        if (!body) {
            body = TT.actions.create();
        }
        if (!first_in_team) {
            first_in_team = new_robot;
        }
        if (frontside_conditions) {
            frontside_conditions.set_parent_of_frontside(new_robot);
        };
        new_robot.is_robot = function () {
            return true;
        };
        new_robot.get_frontside_conditions = function () {
            return frontside_conditions;
        };
        new_robot.set_frontside_conditions = function (new_value) {
            frontside_conditions = new_value;
            if (frontside_conditions) {
                frontside_conditions.set_parent_of_frontside(this);
            }
        };
        new_robot.get_backside_matched_widgets = function () {
           return backside_matched_widgets;
        };
        new_robot.set_backside_matched_widgets = function (new_value) {
            backside_matched_widgets = new_value;
        };
        new_robot.get_matched_backside_widget = function (backside_widget) {
            if (backside_matched_widgets) {
                return backside_matched_widgets[original_backside_widgets_of_context.indexOf(backside_widget)];
            }
        };
        new_robot.get_backside_widget_of_type = function (type_name, context) {
            // supporting the older format for backwards compatibility
            var backside_widgets, backside_widget;
            if (backside_matched_widgets) {
                return backside_matched_widgets[type_name];
            }
            backside_widgets = context && context.get_backside_widgets();
            if (!backside_widgets) {
                return;
            }
            backside_widgets.some(function (widget) {
                if (widget.is_of_type(type_name) && this.get_newly_created_widgets().indexOf(widget) < 0) {
                    // first condition of type that wasn't just added or created it by this robot
                    backside_widget = widget;
                    return true;
                }
            }.bind(this));
            return backside_widget;            
        };
        new_robot.get_backside_conditions = function () {
            return backside_conditions;
        };
        new_robot.set_backside_conditions = function (new_value) {
            if ($.isArray(new_value)) {
                backside_conditions = 
                    new_value.map(function (condition) {
                        if (condition.is_nest && condition.is_nest()) {
                            // replace a covered nest with a copy of its top contents
                            // this is for backwards compatibility
                            return condition.dereference().copy();
                        }
                        return condition;
                    });
            } else {
                // older format was only one backside condition per type
                backside_conditions = [];
                TT.UTILITIES.available_types.forEach(function (type) {
                    if (new_value[type]) {
                        backside_conditions.push(new_value[type]);
                    }
                });
            }
            if (backside_conditions) {
                // only makes sense to erase frontsides of backside_conditions
                backside_conditions.forEach(function (condition) {
                    if (condition.is_backside()) {
                        condition.set_parent_of_backside(this);
                    } else {
                        TT.widget.erasable(condition);
                        condition.set_parent_of_frontside(this);
                    }
                }.bind(this)); 
            }
        };
        if (backside_conditions) {
            new_robot.set_backside_conditions(backside_conditions);
        }
        new_robot.initialize_backside_conditions = function () {
//          Any covered nests should be used as a condition
            var context = this.get_training_context();
            // following used to also include copy_covered_nests: true but that caused nest sharing between members of a robot team
            // that led to several bugs -- also robots shouldn't be able to tell if it has a widget or has a nest with that widget on top
            original_backside_widgets_of_context = context.get_backside_widgets().slice();
            original_backside_widgets_of_context_copy = TT.UTILITIES.copy_widget_sides(original_backside_widgets_of_context, {just_value: true});
            this.set_backside_conditions([]);
        };
        new_robot.add_to_backside_conditions = function (widget) {
            var widget_copy, widget_index;
            if (this.get_newly_created_widgets().indexOf(widget) >= 0) {
                // this isn't a condition since robot just added or created it
                return;
            }
            if (!backside_conditions) {
                backside_conditions = [];
            }
            // the condition is what the widget was like when training started
            // but no need to consider all backside widgets as backside conditions
            // only those that are "used"
            widget_index = original_backside_widgets_of_context.indexOf(widget);
            if (widget_index >= 0) {
                widget_copy = original_backside_widgets_of_context_copy[widget_index];
            }
            if (!widget_copy) {
                return;
            }
            // note that if widget is a covered nest then the type below is nest but the copy is of the nest contents
            if (backside_conditions.indexOf(widget_copy) < 0) {
                backside_conditions.push(widget_copy);
                TT.widget.erasable(widget_copy);
            }
        };
        new_robot.get_backside_condition_index = function (widget) {
            var index;
            if (backside_matched_widgets) {
                index = backside_matched_widgets.indexOf(widget);
                if (index < 0) {
                    index = backside_matched_widgets.length;
                    backside_matched_widgets.push(widget);
                }
            } else {
                index = 0;
                backside_matched_widgets = [widget];
            }
            return index;
        };
        new_robot.get_body = function () {
            return body;
        };
        new_robot.set_body = function (new_value) {
            body = new_value;
        };
        new_robot.get_running = function () {
            return running_or_in_run_queue || this.is_ok_to_run();
        };
        new_robot.running_or_in_run_queue = function () {
            return running_or_in_run_queue;
        };
        new_robot.set_running_or_in_run_queue = function (new_value) {
            running_or_in_run_queue = new_value;
        };
//         new_robot.set_running = function (new_value) {
//             running = new_value;
//         };
        new_robot.stopped = function () {
            return stopped;
        };
        new_robot.set_stopped = function (new_value) {
            if (stopped === new_value) {
                return;
            }
            stopped = new_value;
            if (stopped) {
                if (this.visible()) {
                    $(this.get_frontside_element()).removeClass("toontalk-robot-waiting");
                     this.drop_thing_in_hand();
                     this.rerender();
                }
                running_or_in_run_queue = false;
            }
            if (this.get_next_robot()) {
                this.get_next_robot().set_stopped(new_value);
            }
        };
        new_robot.drop_thing_in_hand = function () {
            if (!thing_in_hand) {
                return;
            }
            thing_in_hand.drop_on(this.top_level_widget(), undefined, this);
            this.set_thing_in_hand(undefined);
        }
        new_robot.finish_cycle_immediately = function (do_at_end_of_cycle) {
            var stored_maximum_step_duration = maximum_step_duration;
            var continuation = function () {
                maximum_step_duration = stored_maximum_step_duration;
                this.set_visible(false);
                if (do_at_end_of_cycle) {
                    do_at_end_of_cycle();
                }
            }.bind(this);
            maximum_step_duration = 0;
            this.add_body_finished_listener(continuation);
        };
        new_robot.get_maximum_step_duration = function () {
            return maximum_step_duration;
        };
        new_robot.get_context = function () {
            return context;
        };
        new_robot.set_context = function (new_value) {
            context = new_value;
            if (this.get_next_robot()) {
                this.get_next_robot().set_context(new_value);
            }
        };
        new_robot.context_is_backside = function () {
            return context_is_backside;
        };
        new_robot.set_context_is_backside = function (new_value) {
            context_is_backside = new_value;
            if (this.get_next_robot()) {
                this.get_next_robot().set_context_is_backside(new_value);
            }
        };
        new_robot.get_top_level_context = function () {
            return top_level_context;
        };
        new_robot.set_top_level_context = function (new_value) {
            top_level_context = new_value;
            if (this.get_next_robot()) {
                this.get_next_robot().set_top_level_context(new_value);
            }
        };
        new_robot.get_queue = function () {
            return queue;
        };
        new_robot.set_queue = function (new_value) {
            queue = new_value;
            if (this.get_next_robot()) {
                this.get_next_robot().set_queue(new_value);
            }
        };
        new_robot.animate_consequences_of_actions = function () {
            return this.visible() && maximum_step_duration !== 0;
        };
        new_robot.transform_step_duration = function (duration) {
            if (duration === undefined && maximum_step_duration === 0) {
                return 0;
            }
            if (!this.visible()) {
                // was watched but window hidden or robot's context closed
                return 0;
            }
            if (watched_speed && duration) {
                return duration/watched_speed;
            }
            // TODO: decide if maximum_step_duration is obsolete
            if (typeof maximum_step_duration === 'number') {
                return Math.min(duration, maximum_step_duration);
            }
            return duration;
        };
        new_robot.transform_original_step_duration = function (duration) {
            // no watched speed means the original durations (if known)
            // when duration isn't available the speed will be used
            if (context && !context.get_backside()) { // context is undefined if being trained (by another robot)
                // was watched but no longer
                return 0;
            }
            if (!this.visible()) {
                // was watched but window hidden or robot's context closed
                return 0;
            }
            if (!watched_speed) {
                return duration;
            }
        };
        new_robot.transform_animation_speed = function (speed) {
            if (context && !context.get_backside()) {
                // was watched but no longer
                return 0;
            }
            if (!this.visible()) {
                // was watched but window hidden or robot's context closed
                return 0;
            }
            if (watched_speed) {
                return speed*watched_speed;
            }
            return speed;
        };
        new_robot.set_animating = function (animating, robot_offset) {
            var frontside_element = this.get_frontside_element();
            var $top_level_element, robot_offset;
            if (animating && TT.UTILITIES.visible_element(frontside_element)) {
                if (!robot_offset) {
                    robot_offset = $(frontside_element).offset();
                } 
                // z ordering (z-index) doesn't work unless the robot is a child of the top-level backside while animating
                // need to change its relative coordinates so it doesn't move
                $(frontside_element).css({width:  '', // rely upon toontalk-robot-animating for dimensions
                                          height: '', // otherwise doesn't animate well
                                          "z-index": TT.UTILITIES.next_z_index()});
                TT.UTILITIES.set_position_relative_to_top_level_backside($(frontside_element), robot_offset);
                $top_level_element = $(frontside_element).closest(".toontalk-backside-of-top-level");
                if ($top_level_element.length > 0) {
                    $top_level_element.get(0).appendChild(frontside_element);
                }
                $(frontside_element).addClass("toontalk-robot-animating");
                setTimeout(function () {
                               // need to delay this since otherwise it takes a couple seconds to transform into the animating form
                               $(frontside_element).addClass("toontalk-side-animating");
                            },
                            2000);
            } else {
                $(frontside_element).removeClass("toontalk-robot-animating toontalk-side-animating");
            }
        };
        new_robot.add_body_finished_listener = function (listener) {
            body_finished_listeners.push(listener);
        };
        new_robot.run_body_finished_listeners = function () {
            body_finished_listeners.forEach(function (listener) {
                listener();
            });
            body_finished_listeners = [];
        };
        new_robot.add_watched_step_end_listeners = function (listener) {
            watched_step_end_listeners.push(listener);
        };
        new_robot.run_watched_step_end_listeners = function () {
            watched_step_end_listeners.forEach(function (listener) {
                listener();
            });
            watched_step_end_listeners = [];
        };
        new_robot.get_thing_in_hand = function () {
            return thing_in_hand;
        };
        new_robot.set_thing_in_hand = function (new_value) {
            if (TT.debugging) {
                if (new_value && new_value.get_type_name() === 'empty hole') {
                    TT.UTILITIES.report_internal_error("Robot trying to pick up an empty hole.");
                    return;
                }
                if (TT.logging && TT.logging.indexOf("thing_in_hand") >= 0) {
                    console.log(this.to_debug_string(50) + " now has in his hand " + (new_value ? new_value.to_debug_string(50) : "nothing"));
                }
            }
            if (new_value && !new_value.location_constrained_by_container()) {
                // if location is constrained by container than so is size so don't save this
                new_value.save_dimensions();
            }
            thing_in_hand = new_value;
        };
        new_robot.get_next_robot = function () {
            return next_robot;
        };
        new_robot.set_next_robot = function (new_value) {
            var backside_element = this.get_backside_element();
            if (new_value) {
                new_value.set_first_in_team(this.get_first_in_team());
            }
            if (!new_value && next_robot) {
                // next guy is no longer in this team
                next_robot.set_first_in_team(next_robot);
                next_robot.set_previous_robot(undefined);
            }
            next_robot = new_value;
            if (next_robot) {
                next_robot.set_previous_robot(this);
            }
            if (backside_element) {
                $(backside_element).find(".toontalk-drop-area-instructions").get(0).innerHTML = this.drop_area_instructions();
            }
        };
        new_robot.get_previous_robot = function () {
            return previous_robot;
        };
        new_robot.set_previous_robot = function (new_value) {
            previous_robot = new_value;
        };
        new_robot.get_first_in_team = function () {
            return first_in_team;
        };
        new_robot.set_first_in_team = function (new_value) {
            first_in_team = new_value;
            if (next_robot) {
                next_robot.set_first_in_team(new_value);
            }
        };
        new_robot.walk_children = function (child_action) {
            var frontside_condition_widget;
            if (next_robot) {
                if (!child_action(next_robot)) {
                    return;
                }
            }
            frontside_condition_widget = this.get_frontside_conditions();
            if (frontside_condition_widget && !frontside_condition_widget.is_top_level()) {
                if (!child_action(frontside_condition_widget)) {
                    return;
                }
            }
            // TODO: backside conditions too -- but not clear this makes sense for all purposes
        };
        new_robot.get_run_once = function () {
            return run_once;
        };
        new_robot.set_run_once = function (new_value) {
            run_once = new_value;
            this.update_title();
            return true;
        };
        new_robot.get_watched_speed = function () {
            return watched_speed;
        };
        new_robot.set_watched_speed = function (new_value) {
            watched_speed = new_value;
            return true;
        };
        new_robot.can_run = function () {
            // can run if just runs on top-level backside
            // perhaps this should check the match_status since if unable to match can't run
            // but some callers mean capable of running in general not just now
            return (this.get_frontside_conditions() && this.get_frontside_conditions().is_top_level()) ||
                    TT.widget.can_run.call(this);
        };
        new_robot.training_started = function (robot_training_this_robot) {
            var context = this.get_training_context();
            var backside_element;
            if (!context) {
                TT.UTILITIES.report_internal_error("Robot started training but can't find its 'context'.");
                return;
            }
            if (this.being_trained) {
                // could be robot is training this robot and both called this and clicked the button
                return;
            }
            this.time_of_last_step = Date.now();
            this.being_trained = true;
            this.set_frontside_conditions(context.copy({just_value: true}));
            this.initialize_backside_conditions();
            if (!robot_training_this_robot) {
                // use miniature robot image for cursor
                $("*").css({cursor: 'url(' + TT.UTILITIES.absolute_file_path("images/RB19.32x32.PNG") + '), default'});
                // use moves the robot cursor and the robot being trained becomes ghostly until training finishes
                $(this.get_frontside_element()).addClass("toontalk-ghost_robot");
            }
            this.update_title();
            backside_element = this.get_backside_element();
            $(backside_element).find(".toontalk-conditions-panel").remove();
            if (this.robot_training_this_robot()) {
                this.robot_training_this_robot().started_training_another(this);
            }
        };
        new_robot.training_finished = function () {
            if (!this.being_trained) {
                return; // already finished -- perhaps a watched robot was training another
            }
            var newly_created_widgets, i, widget;
            newly_created_widgets = this.get_body().get_newly_created_widgets();
            for (i = 0; i < newly_created_widgets.length; i++) {
                widget = newly_created_widgets[i];
                if (widget.last_action === "drop it on top-level" || widget.last_action === "copy") {
                    this.add_step(TT.robot_action.create(TT.newly_created_widgets_path.create(i), "add to the top-level backside"));
                }
            }
            $(this.get_frontside_element()).removeClass("toontalk-ghost_robot");
            this.rerender();
            this.being_trained = false;
            this.update_title();
            this.backup_all();
            this.robot_finished_training();
            if (this.robot_in_training()) {
                // robot finished training a robot
                this.robot_in_training().finished_training_another(this);
            } else {
                $("*").css({cursor: ''}); // restore cursor
            }
        };      
        if (TT.debugging || TT.logging) {
            new_robot.to_debug_string = function (max_length) {
                var frontside_conditions = this.get_frontside_conditions();
                return ("Robot (" + (this.get_description() || "") + " " + this.get_name() + ") runs if working on " + 
                        (frontside_conditions ? TT.UTILITIES.add_a_or_an(frontside_conditions.toString()) : "anything")).substring(0, max_length);;
            };
        }
        if (next_robot) {
            // this will update first_in_team for subsequent robots
            new_robot.set_next_robot(next_robot);
        }
        new_robot.add_standard_widget_functionality(new_robot);
        widget_remove_backside_widget = new_robot.remove_backside_widget.bind(new_robot);
        new_robot.has_name(new_robot);
        new_robot.set_name(name);
        new_robot.set_description(description);
        new_robot.remove_backside_widget = function (widget_side, ignore_if_not_on_backside) {
            // e.g. a condition has been vacuumed away
            // TODO: if robot training a robot ensure path is OK
            var frontside_conditions = this.get_frontside_conditions();
            var backside_conditions;
            if (widget_side === frontside_conditions) {
                this.set_frontside_conditions(undefined);
                return;
            }
            backside_conditions = this.get_backside_conditions();
            if (backside_conditions &&
                backside_conditions.some(function (condition, index) {
                                             if (widget_side === condition) {
                                                 // splice it out
                                                 backside_conditions.splice(index, 1);
                                                 return true;
                                             }
                                         })) {
                return;
            }
            // else do the default widget behaviour for removal
            widget_remove_backside_widget(widget_side, ignore_if_not_on_backside);
        };
        if (TT.debugging) {
            new_robot._debug_id = TT.UTILITIES.generate_unique_id();
            new_robot._debug_string = new_robot.to_debug_string();
        }
        return new_robot;
    };
    
    robot.create_backside = function () {
        return TT.robot_backside.create(this);
    };
    
    robot.copy = function (parameters) {
        var frontside_conditions = this.get_frontside_conditions();
        var backside_conditions = this.get_backside_conditions();
        var frontside_conditions_copy = frontside_conditions ? frontside_conditions.copy({just_value: true}) : undefined;
        var next_robot = this.get_next_robot();
        var next_robot_copy = next_robot ? next_robot.copy(parameters) : undefined;
        var backside_conditions_copy;
        if (backside_conditions) {
            backside_conditions_copy = TT.UTILITIES.copy_widgets(backside_conditions, {just_value: true});
        }
        var copy = this.create(frontside_conditions_copy,
                               backside_conditions_copy,
                               this.get_body().copy(),
                               this.get_description(),
                               this.get_thing_in_hand(),
                               this.get_run_once(),
                               next_robot_copy,
                               (!parameters || !parameters.fresh_copy) && this.get_name(),
                               this.get_watched_speed());
        return this.add_to_copy(copy, parameters);
    };
    
    robot.match = function (other) {
        // no need to do more -- any trained robot matches any other and any untrained matches any untrained
        var this_body_empty, other_body_empty;
        if (other.is_robot()) {
            this_body_empty  = this .get_body().is_empty();
            other_body_empty = other.get_body().is_empty()
            if (this_body_empty === other_body_empty) {
                return "matched";
            }
        }
        this.last_match = other;
        return this;
    };

    robot.generate_name = function () {
        name_counter++;
        return "#" + name_counter.toString();
    };
    
    robot.run = function (context, context_is_backside, top_level_context, queue) {
        // top_level_context if defined is top level context is the top widget if there are backsides on backsides (and possibly so on)
        var frontside_condition_widget = this.get_frontside_conditions();
        var backside_conditions, backside_widgets, condition_frontside_element, to_run_when_non_empty, next_robot_match_status, clear_all_mismatch_displays, 
            backside_matched_widgets, backside;
        if (this.being_trained || this.running_or_in_run_queue()) {
            // should not run if being trained or already scheduled to run
            return this;
        }
        backside = this.get_backside();
        if (backside && backside.visible() && frontside_condition_widget) {
            clear_all_mismatch_displays = function (widget) {
                // conditions could keep last_match_status and when displayed use appropriate CSS
                $(widget.get_element()).removeClass("toontalk-conditions-not-matched toontalk-conditions-waiting")
                                       // clear all the mismatch displays from descendants
                                       .find(".toontalk-conditions-not-matched, .toontalk-conditions-waiting").removeClass("toontalk-conditions-not-matched toontalk-conditions-waiting");
            };
            clear_all_mismatch_displays(frontside_condition_widget);
            this.rerender();
        }
        if (context) {
            // context should be undefined if this robot is just repeatedly running
            this.set_context(context);
            this.set_context_is_backside(context_is_backside);
            this.set_top_level_context(top_level_context);
            this.set_queue(queue);
        } else {
            context = this.get_context();
        }
//      console.log("Match is " + TT.UTILITIES.match(frontside_condition_widget, context) + " for condition " + frontside_condition_widget + " with " + context);
        this.match_status = TT.UTILITIES.match(frontside_condition_widget, this.get_context());
        if (this.match_status === 'matched') {
            backside_matched_widgets = [];
            backside_conditions = this.get_backside_conditions();      
            if (backside_conditions && backside_conditions.length > 0) {
                backside_widgets = context.get_backside_widgets();
                if (backside_widgets) {
                    backside_conditions.some(function (condition) {
                        // check that a widget on the back matches this condition
                        var sub_match_status, best_sub_match_status;
                        if (condition.matching_widget && 
                            condition.matching_widget.get_parent === context) {
                            // try the last widget (if still a backside widget) first to see if it matches since corresponding widget rarely changes
                            sub_match_status = TT.UTILITIES.match(condition, condition.matching_widget);
                            if (sub_match_status === 'matched') {
                                backside_matched_widgets.push(condition.matching_widget);
                                best_sub_match_status = sub_match_status;
                            }
                        }
                        if (!best_sub_match_status) {
                            // if matching_widget didn't help search for match
                            backside_widgets.some(function (backside_widget_side) {
                                sub_match_status = undefined;
                                if (backside_matched_widgets.indexOf(backside_widget_side) >= 0) {
                                    // don't match twice against the same backside widget
                                    return;
                                }
                                if (backside_widget_side !== this) {
                                    // robots ignore themselves when matching backside widgets
                                    if (!backside_widget_side.is_backside()) {   
                                        if (clear_all_mismatch_displays) {
                                            // this is only defined if the backside is visible
                                            clear_all_mismatch_displays(backside_widget_side);
                                        }
                                        sub_match_status = TT.UTILITIES.match(condition, backside_widget_side);
                                        if (sub_match_status === 'matched') {
                                            backside_matched_widgets.push(backside_widget_side);
                                            best_sub_match_status = sub_match_status;
                                            condition.matching_widget = backside_widget_side; // to save time next time around
                                            return true;
                                        } else if (!sub_match_status.is_widget) {
                                            // match_status is suspension info
                                            best_sub_match_status = sub_match_status;
                                        } else if (!best_sub_match_status || best_sub_match_status.is_widget) {
                                            // only set to failure if not a suspension (or match)
                                            best_sub_match_status = sub_match_status;
                                        }
                                    }
                                }
                                if (best_sub_match_status === undefined) {
                                    best_sub_match_status = condition;
                                }
                            }.bind(this));
                        }
                        if (best_sub_match_status !== 'matched') {
                            // failed or suspended
                            this.match_status = best_sub_match_status;
                            return true;
                        }
                   }.bind(this));
                }
                if (this.match_status !== 'matched') {
                    backside_matched_widgets = undefined;
                }
                this.set_backside_matched_widgets(backside_matched_widgets);
            }
        }
//      console.log("robot#" + this._debug_id + " match_status is " + this.match_status);
        if (this.match_status === 'matched') {
            if (!queue) {
                queue = this.get_queue() || TT.DEFAULT_QUEUE;
            }
            this.get_body().reset_newly_created_widgets();
            queue.enqueue(this);
            return this.match_status;
        }
        if (this.match_status.is_widget) { // failed to match - this.match_status is the cause
            $(this.match_status.get_frontside_element()).addClass("toontalk-conditions-not-matched");
            this.rerender();
            if (this.get_next_robot()) {
                return this.get_next_robot().run();
            }
            return this.match_status;
        }
        // suspended waiting on a nest
        this.match_status.forEach(function (waiting_widget) {
            if (waiting_widget[1]) {
                // true for nests but not birds busy delivering
                // waiting_widget is [widget, pattern]
                $(waiting_widget[1].get_element()).addClass("toontalk-conditions-waiting");
            }
        });
        if (this.get_next_robot()) {
            next_robot_match_status = this.get_next_robot().run();
            if (next_robot_match_status === 'matched') {
                return next_robot_match_status;
            } else if (!next_robot_match_status.is_widget) {
                // subsequent robot suspended too -- perhaps on different things
                next_robot_match_status.forEach(function (sub_match_status) {
                    if (this.match_status.indexOf(sub_match_status) < 0) {
                        this.match_status.push(sub_match_status);
                    }
                }.bind(this));
            }
        }
        if (this.get_first_in_team() === this) {
            to_run_when_non_empty = function () {
                 this.set_waiting(false);
                 this.run();
            }.bind(this);
            this.match_status.forEach(function (sub_match_status) {
                if (sub_match_status[0]) {
                    // e.g. a nest
                    sub_match_status[0].run_when_non_empty(to_run_when_non_empty, this);
                } else {
                    // e.g. a bird busy delivering
                    sub_match_status.run_when_non_empty(to_run_when_non_empty, this);
                }
            }.bind(this));
            this.set_waiting(true);
        }
        return this.match_status;                    
    };

    robot.set_waiting = function (waiting) {
        var frontside_element = this.get_frontside_element();
        if (!frontside_element) {
            return;
        }
        if (waiting) {
            if (this.visible()) {
                TT.UTILITIES.add_animation_class(frontside_element, "toontalk-robot-waiting");
                TT.UTILITIES.give_tooltip(frontside_element, "This robot is waiting for a bird to deliver something.");
            }
        } else {
            $(frontside_element).removeClass("toontalk-robot-waiting");
            TT.UTILITIES.give_tooltip(frontside_element, this.get_title());
        }
    };
    
    robot.run_actions = function () {
        if (this.stopped()) { 
            this.get_first_in_team().set_running(false);
            return false;
        }
        if (this.get_first_in_team().visible()) {
            return this.get_body().run_watched(this);
        }
        return this.get_body().run_unwatched(this);
    };

    robot.drop_from_data_transfer = function (data_transferred_widget, target_widget) {
        var backside_widgets;
        if (data_transferred_widget.is_top_level && data_transferred_widget.is_top_level()) {
            // wait for geometry to settle down before treating this as a series of pick up and drops
            // need to get a copy of the list before other processing clobbes it
            backside_widgets = data_transferred_widget.get_backside_widgets().slice();
            setTimeout(function () {
                backside_widgets.forEach(function (widget) {    
                    this.picked_up(widget, undefined, true);
                    this.time_of_last_step -= 1000; // let a second elapse between each step
                    this.dropped_on(widget, target_widget.get_backside());
                    this.time_of_last_step -= 1000;                           
                }.bind(this));
            }.bind(this));
        } else {
            // delay this until drop when location is known
            this.data_transfer = data_transferred_widget;
        }
    };

    robot.ignore_pick_up_or_drop = function (other) {
        return this === other.get_widget() || // robot picked up its frontside or backside  
               other.is_top_level() ||
               this.get_parent_of_frontside() === other; // just moving the context the robot is being trained in
    };
    
    robot.picked_up = function (widget_side, json, is_resource) {
        var path, step, action_name, widget_copy, new_widget_side, additional_info, now;
        if (this.ignore_pick_up_or_drop(widget_side)) {
            return;
        }
        // current_action_name is used to distinguish between removing something from its container versus referring to it
        if (widget_side.get_infinite_stack && widget_side.get_infinite_stack()) {
            // does this cause an addition to newly created backside widgets?
            this.current_action_name = "pick up a copy of";
        } else {
            this.current_action_name = "pick up";
        }
        if (is_resource) {
            new_widget_side = widget_side; // this widget_side was just created
            // robot needs a copy of the resource to avoid sharing it with training widget
            widget_copy = widget_side.copy({fresh_copy: true});
            path = TT.path.get_path_to_resource(widget_copy);
        } else {
            path = TT.path.get_path_to(widget_side, this, true);
        }
        if (path) {
            now = Date.now();
            additional_info = {time: now-this.time_of_last_step};
            this.time_of_last_step = now;
            step = TT.robot_action.create(path, this.current_action_name, additional_info);
            this.add_step(step, new_widget_side);
        }
        widget_side.last_action = this.current_action_name;
        this.current_action_name = undefined;
        this.set_thing_in_hand(widget_side);
        return step;
    };
    
    robot.dropped_on = function (source_widget, target_widget_side) {
        // need to support dropping on backside of a widget as well as which side of a box 
        var path, step, additional_info, $target_element,
            target_location, source_location,
            target_width, target_height, left_offset_fraction, top_offset_fraction,
            now;
        if (this.ignore_pick_up_or_drop(source_widget)) {
            return;
        }
        if (this.get_parent_of_frontside() && this.get_parent_of_frontside().get_widget() === source_widget) {
            // robot dropped the backside of what it is working on -- so ignore this
            // this.get_parent_of_frontside() is undefined when not first_in_team -- TODO: determine if this is sensible
            return;
        }
        if (this.data_transfer) {
            // the drop is from outside this tab/window
            this.picked_up(this.data_transfer, undefined, true);
            this.data_transfer = undefined;
            this.time_of_last_step -= 1000; // let a second elapse between receiving it and dropping it
        }
        this.current_action_name = "drop it on";
        path = TT.path.get_path_to(target_widget_side, this);
        if (path) {
            if (target_widget_side.is_backside()) {
                $target_element = $(target_widget_side.get_element());
                target_location = $target_element.offset();
                target_width    = $target_element.width();
                target_height   = $target_element.height();
                source_location = $(source_widget.get_frontside_element()).offset();
                left_offset_fraction = (source_location.left-target_location.left)/target_width;
                top_offset_fraction  = (source_location.top -target_location.top) /target_height;
                // ensure that the fractions are between 0 and 1
                // can be out of range if waiting for a IMG element to load
                left_offset_fraction = Math.max(0, Math.min(1, left_offset_fraction));
                top_offset_fraction  = Math.max(0, Math.min(1, top_offset_fraction));
                // store the drop location as a fraction of width and height of target so does something sensible when run on different size target
                additional_info = {left_offset_fraction: left_offset_fraction,
                                   top_offset_fraction:  top_offset_fraction};
            } else {
                additional_info = {};
            }
            now = Date.now();
            additional_info.time = now-this.time_of_last_step;
            this.time_of_last_step = now;
            step = TT.robot_action.create(path, this.current_action_name, additional_info);
            this.add_step(step);
        }
        source_widget.last_action = this.current_action_name + " " + target_widget_side.get_type_name();
        this.current_action_name = undefined;
        this.set_thing_in_hand(undefined);
    };

    robot.dropped_on_text_area = function (widget, target_widget, details) {
        var action_name = "drop it on the text area of";
        add_step_to_robot(widget, action_name, this, details);
        widget.last_action = action_name + " " + target_widget.get_type_name();
        this.set_thing_in_hand(undefined);
    };
    
    robot.copied = function (widget, widget_copy, picked_up) {
        var action_name = picked_up ? "pick up a copy of" : "copy";
        add_step_to_robot(widget, action_name, this, undefined, widget_copy);
        widget_copy.last_action = action_name;
    };
    
    robot.removed = function (widget) {
        var action_name = "remove";
        var context;
        if (this.get_parent()) {
            context = this.get_parent().get_widget();
        }
        add_step_to_robot(widget, action_name, this);
        widget.last_action = action_name;
        if (context === widget || widget === this) {
            // robot is vacuuming up its context (and itself) or itself
            // TODO: add some animation to make clearer what is happening
            this.add_to_top_level_backside(this.copy());
            this.training_finished();
        } else {
            // needed since removal may require this when running (since removal also applies to taking out of a container)
            // this way the robot could restore things using the vacuum
            this.add_newly_created_widget_if_new(widget);
        }
    };

    robot.restored = function (widget) {
        // robot used vacuum to restore previously vacuumed widget
        var action_name = "restore";
        add_step_to_robot(widget, action_name, this);
    };
    
    robot.edited = function (widget, details) {
        var action_name = "edit";
        add_step_to_robot(widget, action_name, this, details);
    };
    
    robot.erased_widget = function (widget) {
        var action_name = "change whether erased";
        add_step_to_robot(widget, action_name, this);
    };

    robot.resized_widget = function (widget, previous_width, previous_height, new_width, new_height) {
        var action_name = "change size of";
        var x_factor, y_factor;
        if (previous_width === new_width && previous_height === new_height) {
            return;
        }
        x_factor = new_width /previous_width;
        y_factor = new_height/previous_height;
        add_step_to_robot(widget, action_name, this, {x_factor: x_factor,
                                                      y_factor: y_factor});
    };

    robot.started_training_another = function (robot_to_train) {
        var action_name = "start training";
        add_step_to_robot(robot_to_train, action_name, this);
    };

    robot.finished_training_another = function (trained_robot) {
        var action_name = "stop training";
        add_step_to_robot(trained_robot, action_name, this);
    };

    robot.trained = function (robot_in_training, step_trained) {
        var action_name = "train";
        add_step_to_robot(robot_in_training, action_name, this, {step: step_trained});  
    };

    robot.backside_opened = function (widget) {
        var action_name = "open the backside";
        add_step_to_robot(widget, action_name, this);
    };

    robot.backside_closed = function (backside) {
        var action_name = "close the backside";
        if (backside.is_primary_backside()) {
            add_step_to_robot(backside.get_widget(), action_name, this);
        } else {
            this.removed(backside);
        }
    };

    robot.button_clicked = function (selector, widget_side) {
        var action_name = "click the button of";
        add_step_to_robot(widget_side.get_widget(), action_name, this, {button_selector: selector});
    };
   
    robot.created_widget = function (new_widget, source_widget, button_selector) {
        this.add_newly_created_widget(new_widget);
        if (!new_widget.get_parent()) {
            this.add_to_top_level_backside(new_widget, false);
        }
        this.add_step(TT.robot_action.create(TT.path.get_path_to_resource(new_widget.copy()), 
                                             "add a new widget to the work space",
                                             {button_selector: button_selector,
                                              path_to_source: TT.path.get_path_to(source_widget, this)}));
    };

    robot.get_newly_created_widgets = function () {
        return this.get_body().get_newly_created_widgets();
    };
    
    robot.remove_from_container = function (part_side, container) {
        // this is used when running a robot -- not training
        // need to compute index now since parent may have changed by the time this runs
        // or perhaps not and a different bug was making it appear to be so
        var index = container.get_index_of && part_side.get_parent_of_frontside() && container.get_index_of(part_side);
        var do_removal =
            function () {
                // if part has already been removed from a nest in another container
                // the following will ignore this due to the last argument being true
                container.removed_from_container(part_side, undefined, index, true);
        };
        // if part_side is a covered nest then its contents are removed not the nest itself
        part_side = part_side.dereference();
        if (this.animate_consequences_of_actions()) {
            // if animating then delay removing it
            // otherwise hole empties before the robot gets there
            this.add_watched_step_end_listeners(do_removal);
        } else {
            do_removal();
        }
        // might be new -- following does nothing if already known
        this.add_newly_created_widget_if_new(part_side);
    };

    robot.get_training_context = function () {
        return this.get_first_in_team().get_parent_of_frontside() && this.get_first_in_team().get_parent_of_frontside().get_widget();
    };
    
    robot.add_step = function (step, new_widget) {
        this.get_body().add_step(step, new_widget);
        this.update_title();
        if (step.get_action_name() !== 'train' && step.get_action_name() !== 'start training' && this.robot_training_this_robot()) {
            // this limits training to two levels -- could have more but must limit it
            this.robot_training_this_robot().trained(this, step);
        }
    };
    
    robot.update_display = function () {
        var frontside = this.get_frontside(true);
        var backside = this.get_backside(); 
        var thing_in_hand = this.get_thing_in_hand();
        var frontside_element, thing_in_hand_element;
        if (TT.debugging) {
            // this can't be done during robot creation since robot actions references to newly_created_widgets is premature
            this._debug_string = this.to_debug_string();
        }
        frontside_element = frontside.get_element();
        if (thing_in_hand) {
            thing_in_hand_element = thing_in_hand.get_element();
        }
        if (!thing_in_hand_element && this.carrying_tool) {
            thing_in_hand_element = document.createElement("div");
            $(thing_in_hand_element).addClass(this.carrying_tool);
        }
        TT.UTILITIES.give_tooltip(frontside_element, this.get_title());
        $(frontside_element).addClass("toontalk-robot");
        $(frontside_element).children(".toontalk-held-by-robot").remove(); // if needed will be added again below
        if (thing_in_hand_element) {
            frontside_element.appendChild(thing_in_hand_element);
        }
        if (this.match_status) {
            if (this.match_status.is_widget) { // didn't match
                $(frontside_element).addClass("toontalk-side-animating toontalk-robot-not-matched");
            } else {
                $(frontside_element).removeClass("toontalk-robot-not-matched");
            }
        }
        frontside_element.setAttribute('toontalk_name', this.get_name());
        // TODO: determine if timeout still needed   
        TT.UTILITIES.set_timeout( // wait for layout to settle down
            function () {
                var relative_left, relative_top, thing_in_hand_width, thing_in_hand_height, robot_width, robot_height, css;
                if (thing_in_hand_element) {
                    css = {position: "absolute"};
                    // tried to add position: absolute to toontalk-held-by-robot CSS but didn't work
                    $(thing_in_hand_element).addClass("toontalk-held-by-robot");
                    // compute where the thing should be to be centred over the robot
                    thing_in_hand_width  = TT.UTILITIES.get_element_width(thing_in_hand_element); 
                    thing_in_hand_height = TT.UTILITIES.get_element_height(thing_in_hand_element);
                    robot_width          = TT.UTILITIES.get_element_width(frontside_element); 
                    robot_height         = TT.UTILITIES.get_element_height(frontside_element);
                    if (thing_in_hand && thing_in_hand_width === 0) {
                        // could be holding a tool so thing_in_hand is undefined but 
                        // thing_in_hand_element is the tool's element
                        if (thing_in_hand.get_default_width) {
                            thing_in_hand_width = thing_in_hand.get_default_width();
                        } else {
                            thing_in_hand_width  = robot_width*2;
                        }
                        if (thing_in_hand.get_default_height) {
                            thing_in_hand_height = thing_in_hand.get_default_height();
                        } else {
                            thing_in_hand_height = robot_height/2;
                        }
                        css.width  = thing_in_hand_width;
                        css.height = thing_in_hand_height;
                    }
                    relative_left = (robot_width-thing_in_hand_width)/2;
                    relative_top  = robot_height/4;
                    css.left = relative_left;
                    css.top  = relative_top;
                    $(thing_in_hand_element).css(css);
                    if (thing_in_hand) {
                        thing_in_hand.rerender();
                    }
                }
            });
    };
    
    robot.add_newly_created_widget = function (new_widget) {
        return this.get_body().add_newly_created_widget(new_widget);
    };
    
    robot.add_newly_created_widget_if_new = function (new_widget) {
        if (new_widget !== this.get_training_context() && this !== new_widget) {
            // ignore manipulations of the context or the robot
            return this.get_body().add_newly_created_widget_if_new(new_widget);
        }
    };

    robot.is_newly_created = function (widget) {
        return this.get_body().is_newly_created(widget);
    };
    
    robot.get_recently_created_widget = function () {
        var newly_created_widgets = this.get_body().get_newly_created_widgets();
        return newly_created_widgets[newly_created_widgets.length-1];
    };
    
    robot.get_title = function () {
        var description = this.get_description();
        var frontside_element;
        if (description) {
            description = "I'm " + description;
            if (description.lastIndexOf('.') < 0) {
                description = description + ".";
            }
            return description + "\n" + this.toString();
        }
        frontside_element = this.get_frontside_element();
        if ($(frontside_element).is(".toontalk-top-level-resource")) {
            return "Drag this robot to a work area.";   
        }
        return this.toString();
    };
    
    robot.toString = function (to_string_info) {
        var frontside_conditions, backside_conditions, backside_conditions_defined, body, prefix, postfix, frontside_is_top_level,
            frontside_conditions_string, next_robot, robot_description, robot_conditions_description, original_person, mismatch_description, backside_description;
        if (to_string_info && to_string_info.role === "conditions") {
            return "any robot";
        }
        if (to_string_info && to_string_info.role === "match_status") {
            return "robot " + this.get_name();
        }
        frontside_conditions = this.get_frontside_conditions();
        if (!frontside_conditions) {
            return "an untrained robot";
        }
        frontside_is_top_level = frontside_conditions.is_top_level();
        if (!to_string_info) {
            to_string_info = {};
        }
        original_person = to_string_info.person;
        if (to_string_info && to_string_info.resource) {
            if (this.get_description()) {
                return '"' + this.get_description() + '"';
            }
            // a robot manipulating another robot so switch person              
            to_string_info.person = 'third';
        }
        backside_conditions = this.get_backside_conditions();
        body = this.get_body();
        prefix = "";
        postfix = "";
        next_robot = this.get_next_robot();
        if (frontside_is_top_level) {
            robot_conditions_description = "When the workspace's green flag " + 
                                           TT.UTILITIES.encode_HTML_for_title("<span class='toontalk-green-flag-icon'></span>") +
                                           " is pressed";
        } else {
            frontside_conditions_string = TT.UTILITIES.add_a_or_an(frontside_conditions.get_full_description({role: "conditions"}));
            robot_conditions_description = "When working on something that matches " + frontside_conditions_string;
        }
        if (backside_conditions) {
            backside_conditions.forEach(function (condition) {
                if (condition) {
                    robot_conditions_description += " and\nif on the" + 
                                                    (frontside_is_top_level ? " work area " : " back ") + 
                                                    " is " + TT.UTILITIES.add_a_or_an(condition.get_full_description({role: "conditions"}));
                    backside_conditions_defined = true;
                }
            });
            if (backside_conditions_defined) {
                // need new line before the "he will"
                robot_conditions_description += "\n";
            }
        }
        if (this.being_trained) {
            if (body.is_empty()) {
                return "I'm ready to be trained. Show me what to do and then click on my 'Stop training' button.";
            }
            prefix = "is being trained.\n";
            postfix = "\n..."; // to indicate still being constructed
        }  
        robot_description = prefix + robot_conditions_description + 
                            (to_string_info && to_string_info.person === 'third' ? " he will " : " I will ") + 
                            (this.get_run_once() ? "" : "repeatedly ") +
                            "\n" + (body.toString({robot: this}) || "do nothing") + postfix;
        if (to_string_info && to_string_info.resource) {
            // restore "person"
            to_string_info.person = original_person;
            return robot_description.replace(/\n/g, " ");
        }
        if (this.match_status) {
            if (this.match_status.is_widget) {
                if (frontside_conditions.is_top_level()) {
                    backside_description = "the work area I'm running on";
                } else {
                    backside_description = "the " + frontside_conditions.get_type_name() + " I'm on the back of";
                }
                if (this.match_status === frontside_conditions) {
                    mismatch_description = backside_description;
                } else if (this.match_status.has_ancestor(frontside_conditions)) {
                    mismatch_description = "the " + (this.match_status.last_match ? this.match_status.last_match.toString() : "thing") + " inside the " + backside_description;
                } else {
                    if (!frontside_conditions.is_top_level()) {
                        backside_description =  "the " + this.match_status.get_type_name() + " on " + backside_description;
                    }
                    backside_conditions.some(function (condition) {
                        if (this.match_status === condition) {
                            mismatch_description = "any " + condition.get_type_name(true) + " on ";
                            if (!frontside_conditions.is_top_level()) {
                                mismatch_description += "the back of ";
                            } 
                            mismatch_description += backside_description;
                            return true;
                        } else if (this.match_status.has_ancestor(condition)) {
                            mismatch_description = "any " + this.match_status.toString() + " inside the " + condition.get_type_name(true) + " on the back of " + backside_description;
                            return true;
                        }
                    }.bind(this));
                }
                robot_description = "I'm not running because the " + this.match_status.toString({role: "match_status"}) + 
                                   " (highlighted in red on my backside) that I'm expecting doesn't match " + mismatch_description + ". Perhaps editing my conditions will help.\n" + 
                                   robot_description;
            } else if (this.match_status !== 'matched') {              
                robot_description = "I'm waiting for something to be delivered to the nest that matches " +  
                                    ((this.match_status[0][1]) ? TT.UTILITIES.add_a_or_an(this.match_status[0][1].toString()) : 
                                                                 TT.UTILITIES.add_a_or_an(this.match_status[0].toString())) +
                                    " in my conditions (highlighted in yellow on my backside).\n" + robot_description;
            }
        }
        if (next_robot) {
            robot_description += "\nIf it doesn't match then the next robot will try to run.\n" + next_robot.toString();
        }
        return robot_description;
    };
    
    robot.get_type_name = function (plural) {
        if (plural) {
            return "robots";
        }
        return "robot";
    };
    
    robot.maintain_proportional_dimensions = function () {
        // should not be stretched in only one dimension
        return true;
    };

    robot.matching_resource = function (other) {
        // untrained robots match each other
        return other.is_robot() &&
               !this .get_frontside_conditions() &&
               !other.get_frontside_conditions() &&
               this .get_body().is_empty() &&
               other.get_body().is_empty();
    };

    robot.get_top_level_context_description = function (to_string_info) {
        var frontside_conditions = this.get_frontside_conditions();
        var type = frontside_conditions.get_type_name();
        if (type === 'top-level') {
            if (to_string_info && to_string_info.person === "third") {
                return "his workspace";
            }
            return "my workspace";
        }
        if (to_string_info && to_string_info.person === "third") {
            return "the " + type + " he's working on";
        }
        return "the " + type + " I'm working on";
    };

    robot.get_help_URL = function () {
        return "docs/manual/robots.html";
    };

    robot.drop_area_instructions = function () {
        if (this.get_next_robot()) {
            return "This robot here will try to run when I can't:&nbsp;&nbsp;";
        }
        return "Drop a robot here who will try to run when I can't.";
    };
    
    robot.get_json = function (json_history, callback, start_time) {
        var frontside_conditions = this.get_frontside_conditions();
        var backside_conditions = this.get_backside_conditions();
        var backside_conditions_json,  frontside_conditions_json;
        var backside_conditions_callback = function () {
            var next_robot_callback = function (next_robot_json, start_time) {
                var frontside_conditions_callback = function (frontside_conditions_json, start_time) {
                     callback({type: "robot",
                               frontside_conditions: frontside_conditions_json,
                               backside_conditions: backside_conditions_json,
                               body: body_json,
                               run_once: this.get_run_once(),
                               next_robot: next_robot_json,
                               name: this.get_name(),
                               speed: this.get_watched_speed()
                              },
                              start_time);
                }.bind(this);
                var body_json_callback = function (json, start_time) {
                    body_json = json;
                    if (frontside_conditions) {
                        if (frontside_conditions.is_top_level()) {
                            frontside_conditions_callback({type: "top_level"}, start_time);
                        } else {
                            TT.UTILITIES.get_json(frontside_conditions, json_history, frontside_conditions_callback, start_time);
                        }
                    } else {
                        frontside_conditions_callback(undefined, start_time);
                    }
                };
                this.get_body().get_json(json_history, body_json_callback, start_time);
            }.bind(this);
            if (this.get_next_robot()) {
                TT.UTILITIES.get_json(this.get_next_robot(), json_history, next_robot_callback, start_time);
            } else {
                next_robot_callback(undefined, start_time);
            }
        }.bind(this);
        var next_robot_json, body_json, children_callback;
        if (backside_conditions) {
            backside_conditions_json = [];
            TT.UTILITIES.get_json_of_array(backside_conditions, backside_conditions_json, 0, json_history, backside_conditions_callback, start_time);
        } else {
            backside_conditions_callback();
        }
    };
    
    TT.creators_from_json["robot"] = function (json, additional_info) {
        var next_robot, thing_in_hand, frontside_conditions, backside_conditions, robot;
        if (json.thing_in_hand) {
            thing_in_hand = TT.UTILITIES.create_from_json(json.thing_in_hand, additional_info);
        }
        if (json.next_robot) {
            next_robot = TT.UTILITIES.create_from_json(json.next_robot, additional_info);
        }
        if (json.backside_conditions) {
            if ($.isArray(json.backside_conditions)) {
                backside_conditions = TT.UTILITIES.create_array_from_json(json.backside_conditions, additional_info);
            } else if (json.semantic) {
                // older format
                TT.UTILITIES.available_types.forEach(function (type) {
                    if (json.semantic.backside_conditions[type]) {
                        backside_conditions.push(TT.UTILITIES.get_json(json.semantic.backside_conditions[type], json_history));
                    }
                });
           }
        }
        frontside_conditions = TT.UTILITIES.create_from_json(json.frontside_conditions || json.bubble, additional_info);
        robot = TT.robot.create(frontside_conditions,
                                backside_conditions,
                                undefined,
                                json.description,
                                thing_in_hand,
                                json.run_once,
                                next_robot,
                                json.name,
                                json.speed);
        // need to pass the robot down to some of the path expressions of the body
        if (!additional_info) {
            additional_info = {};
        }
        additional_info.robot = robot;
        robot.set_body(TT.UTILITIES.create_from_json(json.body, additional_info));
        return robot;
    };

    robot.find_conditions_path = function (widget, robot_with_widget_in_conditions, robot) {
         var frontside_conditions = robot_with_widget_in_conditions.get_frontside_conditions();
         var path_within_conditions = frontside_conditions === widget ? 'entire_condition' : frontside_conditions.get_path_to && frontside_conditions.get_path_to(widget, robot);
         var path_to_robot = TT.path.get_path_to(robot_with_widget_in_conditions, robot);
         var backside_conditions, backside_condition_with_path;
         if (!path_within_conditions) {
             backside_conditions = robot_with_widget_in_conditions.get_backside_conditions();
             backside_conditions.some(function (condition) {
                                          if (condition) {
                                              path_within_conditions = condition.get_path_to(widget, robot);
                                              if (path_within_conditions) {
                                                  backside_condition_with_path = condition;
                                                  return true;
                                              }
                                          }
                                      });
         }
         if (!path_within_conditions) {
             TT.UTILITIES.report_internal_error("Robot has widget in its conditions but unable to construct the path.");
             return;
         }
         return TT.robot.create_conditions_path(path_within_conditions, path_to_robot, backside_condition_with_path);
    };

    robot.create_conditions_path = function (path_within_conditions, path_to_robot, backside_condition_with_path) {
        if (typeof backside_condition_with_path === 'string') {
            // in older version backside_condition_with_path is just the type_name 
            this.get_backside_conditions().some(function (backside_condition) {
                if (backside_condition && backside_condition.get_type_name() === backside_condition_with_path) {
                    backside_condition_with_path = backside_condition;
                    return true;
                }
            });
        }  
        return {dereference_path: function (robot) {
                    var robot_with_widget_in_conditions = TT.path.dereference_path(path_to_robot, robot);
                    var condition;
                    if (backside_condition_with_path) {
                        condition = backside_condition_with_path;
                    } else {
                        condition = robot_with_widget_in_conditions.get_frontside_conditions();
                    }
                    if (path_within_conditions === 'entire_condition') {
                        return condition;
                    }
                    return TT.path.dereference_path(path_within_conditions, robot, condition);
                },
                toString: function () {
                    var path_to_condition_description = (path_within_conditions === 'entire_condition') ?
                                                        "the " : TT.path.toString(path_within_conditions) + " of the ";                                                     
                    if (backside_condition_with_path) {
                        return path_to_condition_description + backside_condition_with_path.toString() + " backside condition of " + TT.path.toString(path_to_robot);
                    }
                    return path_to_condition_description + " front side condition of " + TT.path.toString(path_to_robot);
                },
                get_json: function (json_history, callback, start_time) {
                    var backside_condition_callback = function (backside_condition_json, start_time) {
                        var path_to_robot_callback = function (path_to_robot_json, start_time) {
                            var path_within_conditions_callback = function (path_within_conditions_json, start_time) {
                                callback({type: "path_to_robot_conditions",
                                          backside_condition: backside_condition_with_path && path_within_conditions_json,
                                          path_to_robot: path_to_robot_json,
                                          path_within_conditions: path_within_conditions_json},
                                         start_time);
                            };
                            if (path_within_conditions === 'entire_condition') {
                                path_within_conditions_callback('entire_condition', start_time);
                            } else {
                                path_within_conditions.get_json(json_history, path_within_conditions_callback, start_time);
                            }
                        };
                        path_to_robot.get_json(json_history, path_to_robot_callback, start_time);
                    };
                    if (backside_condition_with_path) {
                        TT.UTILITIES.get_json(backside_condition_with_path, json_history, backside_condition_callback, start_time);
                    } else {
                        backside_condition_callback(undefined, start_time);
                    }
                }};
    };

    TT.creators_from_json["path_to_robot_conditions"] = function (json) {
            var path_to_robot = TT.UTILITIES.create_from_json(json.path_to_robot);
            var path_within_conditions = (json.path_within_conditions === 'entire_condition') ? 
                                         json.path_within_conditions : TT.UTILITIES.create_from_json(json.path_within_conditions);
            var backside_condition = json.backside_condition && TT.UTILITIES.create_from_json(json.backside_condition);
            return TT.robot.create_conditions_path(path_within_conditions, path_to_robot, backside_condition);
    };
    
    return robot;
}(window.TOONTALK));

window.TOONTALK.robot_backside = 
(function (TT) {
    "use strict";
    var create_conditions_area = function (text, condition_widget, robot, class_name) {
        var description = TT.UTILITIES.create_text_element(text);
        var condition_element = condition_widget.get_element(true);
        var condition_element_div_parent = document.createElement('div');
        var scale_element = function () {
                                var css;
                                if (!condition_widget.visible()) {
                                    return;
                                }
                                $(condition_element).parent().addClass("toontalk-conditions-container");
                                condition_widget.update_display();
                                // need to add the class before checking width and height
                                css = {width:  $(condition_element_div_parent).width(),
                                       height: $(condition_element_div_parent).height(),
                                       left:   '',
                                       top:    ''};
                                if (condition_widget.use_scaling_transform) {
                                    condition_widget.use_scaling_transform(css);
                                } else if (condition_widget.is_backside()) {
                                    TT.UTILITIES.scale_element(condition_element, 
                                                               css.width,
                                                               css.height,
                                                               condition_widget.get_original_width()  || $(condition_element).width(),
                                                               condition_widget.get_original_height() || $(condition_element).height(),
                                                               undefined,
                                                               css);
                                }
                                $(condition_element).css(css);
                                condition_widget.rerender();
                            };
        var conditions_panel;
        $(condition_element).addClass("toontalk-conditions-contents " + class_name);
        if (robot.match_status) {
            if (robot.match_status.is_widget) {
                $(robot.match_status.get_frontside_element()).addClass("toontalk-conditions-not-matched");
            } else if (robot.match_status !== 'matched') {
                robot.match_status.forEach(function (waiting_widget) {
                    // waiting_widget is [widget, pattern]
                    $(waiting_widget[1].get_element()).addClass("toontalk-conditions-waiting");
                });
            }
        }
        // wrapping the condition_element in a div forces it to be in the right place in the table
        condition_element_div_parent.appendChild(condition_element);
        conditions_panel = TT.UTILITIES.create_horizontal_table(description, condition_element_div_parent);
        $(conditions_panel).addClass("toontalk-conditions-panel");
        TT.UTILITIES.run_when_dimensions_known(condition_element, function () {
                                                                      // need to delay this to ensure this happens after original dimensions set
                                                                      // if condition is an element widget
                                                                      setTimeout(scale_element, 100);
                                                                  });
        return conditions_panel;
    };
    var add_conditions_area = function (backside_element, robot) {
        var frontside_condition_widget = robot.get_frontside_conditions();
        var backside_conditions = robot.get_backside_conditions();
        var robot_visible = robot.visible();
        var green_flag_message = "I always run when the green flag <span class='toontalk-green-flag-icon'></span> is clicked.";
        var area_class_name;
        if (frontside_condition_widget) {
            if (frontside_condition_widget.is_top_level()) {
                if (backside_element.firstChild.textContent.indexOf("I always run when the green flag") < 0) {
                    backside_element.insertBefore(TT.UTILITIES.create_text_element(green_flag_message),
                                                  backside_element.firstChild);
                }
            } else if ($(backside_element).find(".toontalk-frontside-conditions-area").length === 0) {
                // and not already added
                backside_element.insertBefore(create_conditions_area("I run only if the thing I'm on the back of matches: ", 
                                                                     frontside_condition_widget, 
                                                                     robot,
                                                                     "toontalk-frontside-conditions-area"), 
                                              backside_element.firstChild);
            }
            frontside_condition_widget.set_visible(robot_visible);
            frontside_condition_widget.rerender();
        }
        if (backside_conditions) {
            backside_conditions.forEach(function (backside_condition) {
                var condition_element, type;
                if (backside_condition) {
                    if (backside_condition.is_backside()) {
                        type = "on-backside";
                    } else {
                        type = backside_condition.get_type_name();
                    }
                    area_class_name = "toontalk-backside-" + type + "-conditions-area";
                    if (type === 'bird') {
                        condition_element = TT.UTILITIES.create_text_element("And there is a bird on the back.");
                    } else {
                        condition_element = create_conditions_area("And if " + TT.UTILITIES.add_a_or_an(type) + " matches: ", 
                                                                   backside_condition, 
                                                                   robot,
                                                                   area_class_name);
                    }
                    backside_element.insertBefore(condition_element, backside_element.firstChild.nextSibling);
                    backside_condition.set_visible(robot_visible);
                    backside_condition.rerender();
                }
            });
        }
    };
    return {
        create: function (robot) {
            var backside = TT.backside.create(robot);
            var backside_element = backside.get_element();
            var run_once_title = function (run_once) {
                if (run_once) {
                    return "Check this if you want the robot to start over again after finishing what he was trained to do.";
                } else {
                    return "Uncheck this if you want the robot to stop after finishing what he was trained to do.";
                }
            }
            var run_once_input = TT.UTILITIES.create_check_box(!robot.get_run_once(),
                                                               "toontalk-run-once-check-box",
                                                               "When finished start again",
                                                               run_once_title(robot.get_run_once()));
            var speed_names  = ["normal", "original", "double", "half", "very fast", "very slow"];
            var speed_values = [ 1,        0,          2,       .5,      10,         .25];
            // 0 used to be undefined and the default -- means follow original timing if available
            var speed_value_to_name = function (value) {
                // default is normal (index 0)
                var index = value !== undefined ? speed_values.indexOf(value) : 0;
                return speed_names[index];
            };
            var speed_name_to_value = function (name) {
                var index = speed_names.indexOf(name);
                return speed_values[index];
            };
            var speed_menu = TT.UTILITIES.create_select_menu("robot_speed",
                                                             speed_names,
                                                             "toontalk-select-function",
                                                             "  What speed should I run at? ",
                                                             "Click to select the speed I'll run when watched.",
                                                             ["The normal speed for each step", 
                                                              "The original delay between steps when I was trained",
                                                              "Double the normal speed",
                                                              "Half the normal speed",
                                                              "Ten times normal speed",
                                                              "One-fourth of normal speed"]);
            var next_robot_area = TT.UTILITIES.create_drop_area(robot.drop_area_instructions());
            var next_robot = robot.get_next_robot();
            var advanced_settings_button = TT.backside.create_advanced_settings_button(backside, robot);
            var generic_backside_update = backside.update_display.bind(backside);
            var add_to_drop_area = function (widget, drop_area) {
                    var frontside_element = widget.get_frontside_element(true);
                    var default_width, default_height;
                    if (widget.get_default_width) {
                        default_width  = widget.get_default_width();
                        default_height = widget.get_default_height();
                        // top left of drop area with default dimensions
                        $(frontside_element).css({left: "",
                                                  top:  "", 
                                                  width:  default_width,
                                                  height: default_height});
                    }
                    drop_area.appendChild(frontside_element);
            };
            var generic_hide_backside = backside.hide_backside;
            var run_once_button_clicked =
                function (event) {
                    var keep_running = run_once_input.button.checked;
                    robot.set_run_once(!keep_running);
                    TT.UTILITIES.give_tooltip(run_once_input.container, run_once_title(!keep_running));
                    if (robot.robot_in_training()) {
                        robot.robot_in_training().edited(robot, {setter_name: "set_run_once",
                                                                 argument_1: !keep_running,
                                                                 toString: "change to " + (keep_running ? "run again" : "run once") + " of the robot",
                                                                 button_selector: ".toontalk-run-once-check-box"});
                    }
                    event.stopPropagation();
                };
            var generic_add_advanced_settings = backside.add_advanced_settings;
            backside.hide_backside = function (event) {
                generic_hide_backside.call(this, event);
                if (robot.being_trained) {
                    robot.training_finished();
                }
            };
            // TODO: replace JQuery data with element property
            $(next_robot_area).data("drop_area_owner", robot);
            run_once_input.button.addEventListener('click', run_once_button_clicked);
            $(speed_menu.menu).val(speed_value_to_name(robot.get_watched_speed())).selectmenu("refresh");
            $(speed_menu.menu).on('selectmenuselect', function (event) {
                robot.set_watched_speed(speed_name_to_value(event.target.value));
            });
            if (next_robot) {
                add_to_drop_area(next_robot, next_robot_area);
            }
            next_robot_area.addEventListener('drop', function (event) {
                // start training when robot is dropped here
                var dragee = TT.UTILITIES.get_dragee();
                var widget = TT.UTILITIES.widget_side_of_jquery(dragee);
                var backside;
                if (widget && widget.is_robot()) {
                    if (widget.get_body().is_empty()) {
                        backside = widget.open_backside();
                        $(backside.get_element()).find(".toontalk-train-backside-button").click();
                    } else {
                        add_to_drop_area(widget, next_robot_area);
                        robot.set_next_robot(widget);
                    }
                }
            });
            backside.get_next_robot_area = function () {
                return next_robot_area;
            };
            backside.update_display = function () {
                var frontside_element = robot.get_frontside_element();
                if (frontside_element) {
                    TT.UTILITIES.give_tooltip(frontside_element, robot.get_title());                    
                }
                generic_backside_update();
            };
            TT.UTILITIES.when_attached(backside_element,
                                       function () {
                                           var backside_conditions = robot.get_backside_conditions();
                                           var frontside_conditions = robot.get_frontside_conditions();
                                           if (backside_conditions) {
                                               backside_conditions.forEach(function (condition) {
                                                   condition.set_visible(true);
                                               });
                                           }
                                           if (frontside_conditions) {
                                               frontside_conditions.set_visible(true);
                                           }
                                      });
            backside_element.appendChild(this.create_train_button(backside, robot));
            add_conditions_area(backside_element, robot);
            backside_element.appendChild(advanced_settings_button);
            backside.add_advanced_settings = function () {
                generic_add_advanced_settings.call(backside, run_once_input.container, speed_menu.container, next_robot_area);   
            };
            return backside;
        },
        
        create_train_button: function (backside, robot) {
            var backside_element = backside.get_element();
            var $backside_element = $(backside_element);
            var $train_button = $("<button>Train</button>").button();
            var training = false;
            var train_button_clicked =
                function (event) {
                    training = !training;
                    backside.change_label_and_title_of_train_button(training);
                    if (training) {
                        robot.initialize_backside_conditions();
                        robot.get_body().reset_steps();
                        // first occurence of robot is where to find top_level_widget
                        // second is the robot being trained
                        robot.robot_started_training(robot);
                        robot.training_started();
                    } else {
                        robot.training_finished();
                    }
                    event.stopPropagation();
                };
            $train_button.addClass("toontalk-train-backside-button");
            backside.change_label_and_title_of_train_button = function (training_started) {
                if (training_started) {
                    $train_button.button("option", "label", "Stop training " + robot.get_name());
                    TT.UTILITIES.give_tooltip($train_button.get(0), "Click to stop training this robot.");
                } else {
                    if (robot.get_body().is_empty()) {
                        $train_button.button("option", "label", "Train");
                        TT.UTILITIES.give_tooltip($train_button.get(0), "Click to start training this robot.");
                    } else {
                        $train_button.button("option", "label", "Re-train " + robot.get_name());
                        TT.UTILITIES.give_tooltip($train_button.get(0), "Click to start training this robot all over again.");
                    }  
                }
                if (TT.UTILITIES.visible_element(backside_element)) {
                    add_conditions_area(backside_element, robot);
                }
            };
            backside.change_label_and_title_of_train_button(training);
            $train_button.get(0).addEventListener('click', train_button_clicked);
            return $train_button.get(0);
        }
        
    };
}(window.TOONTALK));

}());