 /**
 * Implements ToonTalk's robots
 * Authors = Ken Kahn
 * License: New BSD
 */
 
 /*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */


(function () {
    "use strict";
    // for robots to train robot need a stack of robots
    // this in the scope where both robots and their backsides have access
    var stack_of_robots_in_training = [];

window.TOONTALK.robot = (function (TT) {

    var add_step_to_robot = function (widget, action_name, robot, additional_info, new_widget) {
        var path;
        robot.current_action_name = action_name;
        // following relies on current_action_name being set
        path = TT.path.get_path_to(widget, robot);
        if (path) {
            robot.add_step(TT.robot_action.create(path, action_name, additional_info), new_widget);
        }
        robot.current_action_name = undefined;
    };
   
    var robot = Object.create(TT.widget);

    robot.in_training = function () {
        if (stack_of_robots_in_training.length > 0) {
            return stack_of_robots_in_training[stack_of_robots_in_training.length-1];
        }
    };

    robot.robot_training_this_robot = function () {
        if (stack_of_robots_in_training.length > 1) {
            return stack_of_robots_in_training[stack_of_robots_in_training.length-2];
        }
    };
 
    robot.create = function (frontside_conditions, backside_conditions, body, description, thing_in_hand, run_once, next_robot) {
        // frontside_conditions holds a widget that needs to be matched against the frontside of the widget to run
        // backside_conditions holds an object whose keys are type_names of required widgets on the backside
        // and whose values are widgets that need to match backside widgets of that type
        // body holds the actions the robot does when it runs
        var new_robot = Object.create(robot);
        // who should do the 'repeating'
        var first_in_team;
         // true if animating due to being run while watched
        var animating = false;
        // callbacks to run at the end of each cycle
        var body_finished_listeners = []; 
        var running_or_waiting, stopped;
        var original_backside_widgets_of_context;
        if (!body) {
            body = TT.actions.create();
        }
        if (!first_in_team) {
            first_in_team = new_robot;
        }
        new_robot.is_robot = function () {
            return true;
        };
        new_robot.get_frontside_conditions = function () {
            return frontside_conditions;
        };
        new_robot.set_frontside_conditions = function (new_value) {
            frontside_conditions = new_value;
            frontside_conditions.set_parent_of_frontside(this);
        };
        if (frontside_conditions) {
            frontside_conditions.set_parent_of_frontside(this);
        };
        new_robot.get_backside_conditions = function () {
            return backside_conditions;
        }; 
        new_robot.set_backside_conditions = function (new_value) {
            backside_conditions = new_value;
            if (backside_conditions) {
                // only makes sense to erase frontsides of backside_conditions
                TT.UTILITIES.available_types.forEach(function (type) {
                    if (backside_conditions[type]) {
                        TT.widget.erasable(backside_conditions[type]);
                        backside_conditions[type].set_parent_of_frontside(this);
                    }
                }.bind(this)); 
            }
        };
        // TODO: get this working
//         if (backside_conditions) {
//             this.set_backside_conditions(backside_conditions);
//         }
        new_robot.add_to_backside_conditions = function (widget) {
            var widget_copy, widget_type;
            if (this.get_newly_created_widgets().indexOf(widget) >= 0) {
                // this isn't a condition since robot just added or created it
                return;
            }
            widget_type = widget.get_type_name();
            if (backside_conditions) {
                if (backside_conditions[widget_type]) {
                    return; // already has one
                }
            } else {
                backside_conditions = {};
            }
            // the condition is what the widget was like when training started
            // but no need to consider all backside widgets as backside conditions
            // only those that are "used"
            original_backside_widgets_of_context.some(function (widget) {
                if (widget.is_of_type(widget_type)) {
                    widget_copy = widget;
                    return true;
                }
            });
            if (!widget_copy) {
                return;
            }
            // note that if widget is a covered nest then the type below is nest but the copy is of the nest contents 
            // TODO: is this comment still true??
            backside_conditions[widget_type] = widget_copy;
            TT.widget.erasable(widget_copy);
        };
        new_robot.get_body = function () {
            return body;
        };
        new_robot.running_or_waiting = function () {
            return running_or_waiting;
        };
        new_robot.set_running_or_waiting = function (new_value) {
            running_or_waiting = new_value;
        };
        new_robot.stopped = function () {
            return stopped;
        };
        new_robot.set_stopped = function (new_value) {
            stopped = new_value;
            if (stopped) {
                if (this.visible()) {
                    $(this.get_frontside_element()).removeClass("toontalk-robot-waiting");
                }
            }
            if (this.get_next_robot()) {
                this.get_next_robot().set_stopped(new_value);
            }
        };
        new_robot.get_animating = function () {
            return animating;
        };
        new_robot.set_animating = function (new_value, robot_position) {
            var frontside_element = this.get_frontside_element();
            var robot_position;
            animating = new_value;
            if (animating) {
                if (!robot_position) {
                    robot_position = $(frontside_element).offset();
                }
                $(frontside_element).addClass("toontalk-robot-animating toontalk-side-animating");
                // z ordering (z-index) doesn't work unless the robot is a child of the top-level backside while animating
                // need to change its relative coordinates so it doesn't move
                $(frontside_element).css({width:  '', // rely upon toontalk-robot-animating for dimensions
                                          height: '', // otherwise doesn't animate well
                                          "z-index": TT.UTILITIES.next_z_index()});
                TT.UTILITIES.set_position_relative_to_top_level_backside($(frontside_element), robot_position);
                $(frontside_element).closest(".toontalk-top-level-backside").append(frontside_element);
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
        new_robot.get_thing_in_hand = function () {
            return thing_in_hand;
        };
        new_robot.set_thing_in_hand = function (new_value) {
            if (TT.debugging && new_value && new_value.get_type_name() === 'empty hole') {
                TT.UTILITIES.report_internal_error("Robot trying to pick up an empty hole.");
                return;
            }
            thing_in_hand = new_value;
            if (thing_in_hand && !TT.robot.in_training() && this.visible()) {
                // update display immediately so thing in hand is in the DOM
                // while training need to wait if resource for it to be copied when dropped
                this.update_display();
            }
        };
        new_robot.get_next_robot = function () {
            return next_robot;
        };
        new_robot.set_next_robot = function (new_value) {
            var backside_element = this.get_backside_element();
            var drop_area_instructions;
            if (new_value) {
                new_value.set_first_in_team(this.get_first_in_team());
            }
            if (!new_value && next_robot) {
                // next guy is no longer in this team
                next_robot.set_first_in_team(next_robot);
            }
            next_robot = new_value;
            if (backside_element) {
                if (new_value) {
                    drop_area_instructions = "When the robot can't run then this one will try: ";
                } else {
                    drop_area_instructions = window.TOONTALK.robot.empty_drop_area_instructions;
                }
                $(backside_element).find(".toontalk-drop-area-instructions").get(0).innerHTML = drop_area_instructions;
            }
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
        };
        new_robot.get_run_once = function () {
            return run_once;
        };
        new_robot.set_run_once = function (new_value) {
            run_once = new_value;
        };
        new_robot.training_started = function (robot_training_this_robot) {
            var context = this.get_context();
            var backside_element;
            if (!context) {
                TT.UTILITIES.report_internal_error("Robot started training but can't find its 'context'.");
                return;
            }
            if (this.being_trained) {
                // could be robot is training this robot and both called this and clicked the button
                return;
            }
            this.being_trained = true;
            this.set_frontside_conditions(context.copy({just_value: true}));
            if (!robot_training_this_robot) {
                // use miniature robot image for cursor
                $("*").css({cursor: 'url(' + TT.UTILITIES.absolute_file_path("images/RB19.32x32.PNG") + '), default'});
            }
            TT.UTILITIES.give_tooltip(this.get_frontside_element(), this.get_title());
            backside_element = this.get_backside_element();
            $(backside_element).find(".toontalk-conditions-panel").remove();
            original_backside_widgets_of_context = TT.UTILITIES.copy_widget_sides(context.get_backside_widgets(), {just_value: true});
            if (TT.robot.robot_training_this_robot()) {
                TT.robot.robot_training_this_robot().started_training_another(this);
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
            this.rerender();
            this.being_trained = false;
            TT.UTILITIES.give_tooltip(this.get_frontside_element(), this.get_title());
            this.backup_all();
            stack_of_robots_in_training.pop();
            if (TT.robot.in_training()) {
                // robot finished training a robot
                TT.robot.in_training().finished_training_another(this);
            } else {
                $("*").css({cursor: ''}); // restore cursor
            }
        };  
        if (next_robot) {
            // this will update first_in_team for subsequent robots
            new_robot.set_next_robot(next_robot);
        }
        new_robot = new_robot.add_standard_widget_functionality(new_robot);
        new_robot.set_description(description);
        if (TT.debugging) {
            new_robot.debug_id = TT.UTILITIES.generate_unique_id();
        }
        return new_robot;
    };
    
    robot.create_backside = function () {
        return TT.robot_backside.create(this); //.update_run_button_disabled_attribute();
    };
    
    robot.copy = function (parameters) {
        var frontside_conditions = this.get_frontside_conditions();
        var backside_conditions = this.get_backside_conditions();
        var frontside_conditions_copy = frontside_conditions ? frontside_conditions.copy({just_value: true}) : undefined;
        var next_robot = this.get_next_robot();
        var next_robot_copy = next_robot ? next_robot.copy(parameters) : undefined;
        var backside_conditions_copy;
        if (backside_conditions) {
            backside_conditions_copy = {};
            TT.UTILITIES.available_types.forEach(function (type) {
                if (backside_conditions_copy[type]) {
                    backside_conditions_copy[type] = backside_conditions_copy[type].copy({just_value: true});
                }
            });
        }
        var copy = this.create(// this.get_image_url(), 
                               frontside_conditions_copy,
                               backside_conditions_copy,
                               this.get_body().copy(),
                               this.get_description(),
                               this.get_thing_in_hand(),
                               this.get_run_once(),
                               next_robot_copy);
        return this.add_to_copy(copy, parameters);
    };
    
    robot.match = function (other) {
        // no need to do more -- any robot matches any other
        if (other.is_robot()) {
            return "matched";
        }
        return this;
    };
    
    robot.run = function (context, top_level_context, queue) {
        var frontside_condition_widget = this.get_frontside_conditions();
        var backside_conditions, backside_widgets, condition_frontside_element, to_run_when_non_empty, next_robot_match_status, clear_all_mismatch_displays;
        if (this.being_trained || !frontside_condition_widget || this.get_first_in_team().running_or_waiting()) {
            // should not run if being trained, has no conditions (TODO: really?), or is already running or waiting to
            return this;
        }
        clear_all_mismatch_displays = function (widget) {
            if (widget.visible()) {
                $(widget.get_frontside_element()).removeClass("toontalk-conditions-not-matched toontalk-conditions-waiting")
                                                 // clear all the mismatch displays from descendants
                                                 .find(".toontalk-conditions-not-matched, .toontalk-conditions-waiting").removeClass("toontalk-conditions-not-matched toontalk-conditions-waiting");
            }
        };
        clear_all_mismatch_displays(frontside_condition_widget);
        this.rerender();
//      console.log("Match is " + TT.UTILITIES.match(frontside_condition_widget, context) + " for condition " + frontside_condition_widget + " with " + context);
        this.match_status = TT.UTILITIES.match(frontside_condition_widget, context);
        if (this.match_status === 'matched') {
            backside_conditions = this.get_backside_conditions();
            if (backside_conditions) {
                backside_widgets = context.get_backside_widgets();
                if (backside_widgets) {
                    backside_widgets.some(function (backside_widget_side) {
                        var backside_condition_widget_of_type = !backside_widget_side.is_backside() && backside_conditions[backside_widget_side.get_widget().get_type_name()];
                        var sub_match_status;
                        if (backside_condition_widget_of_type) {
                            clear_all_mismatch_displays(backside_condition_widget_of_type);
                            sub_match_status = TT.UTILITIES.match(backside_condition_widget_of_type, backside_widget_side.get_widget());
                            if (sub_match_status !== 'matched') {
                                this.match_status = sub_match_status;
                                // stop going through backside_widgets
                                return true;
                            }
                        }
                    }.bind(this));
                }
            }
        }
//      console.log("robot#" + this.debug_id + " match_status is " + this.match_status);
        if (this.match_status === 'matched') {
            if (!queue) {
                queue = TT.QUEUE;
            }
            this.get_body().reset_newly_created_widgets();
            this.get_first_in_team().set_running_or_waiting(true);
            // TODO: determine if the queue: queue passed in is always the queue who enqueues it
            queue.enqueue({robot: this, context: context, top_level_context: top_level_context, queue: queue});
            return this.match_status;
        }
        if (this.match_status.is_widget) { // failed to match - this.match_status is the cause
            $(this.match_status.get_frontside_element()).addClass("toontalk-conditions-not-matched");
            this.rerender();
            if (this.get_next_robot()) {
                return this.get_next_robot().run(context, top_level_context, queue);
            }
            return this.match_status;
        }
        // suspended waiting on a nest
        this.match_status.forEach(function (waiting_widget) {
            if (waiting_widget[1]) {
                // true for nests but not birds busy delivering
                $(waiting_widget[1].get_frontside_element()).addClass("toontalk-conditions-waiting");
            }
        });
        if (this.get_next_robot()) {
            next_robot_match_status = this.get_next_robot().run(context, top_level_context, queue);
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
                 this.run(context, top_level_context, queue);
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
        if (waiting) {
            TT.UTILITIES.add_animation_class(frontside_element, "toontalk-robot-waiting");
            TT.UTILITIES.give_tooltip(frontside_element, "This robot is waiting for a bird to deliver something.");
        } else {
            $(frontside_element).removeClass("toontalk-robot-waiting");
            TT.UTILITIES.give_tooltip(frontside_element, this.get_title());
        }
    };
    
    robot.run_actions = function (context, top_level_context, queue) {
        if (this.stopped()) { 
            this.get_first_in_team().set_running_or_waiting(false);
            return false;
        }
        if (this.visible()) {
            return this.get_body().run_watched(context, top_level_context, queue, this);
        }
        return this.get_body().run_unwatched(context, top_level_context, queue, this);
    };
    
    robot.picked_up = function (widget, json, is_resource) {
        var path, step, action_name, widget_copy, new_widget;
        if (this === widget) {
            // robot picked up its frontside or backside -- so ignore this
            return;
        }
        if (widget.is_top_level()) {
            // doesn't make sense and easy to do by mistake
            return;
        }
        if (json.view.backside) {
            // at least for now ignore picking up of the backside of a widget
            return;
        }
        // current_action_name is used to distinguish between removing something from its container versus referring to it
        if (widget.get_infinite_stack && widget.get_infinite_stack()) {
            // does this cause an addition to newly created backside widgets?
            this.current_action_name = "pick up a copy of";
        } else {
            this.current_action_name = "pick up";
        }
        if (is_resource) {
            new_widget = widget; // this widget was just created
            // robot needs a copy of the resource to avoid sharing it with training widget
            widget_copy = widget.copy();
            path = TT.path.get_path_to_resource(widget_copy);
        } else {
            path = TT.path.get_path_to(widget, this);
        }
        if (path) {
            step = TT.robot_action.create(path, this.current_action_name);
            this.add_step(step, new_widget);
        }
        widget.last_action = this.current_action_name;
        this.current_action_name = undefined;
        this.set_thing_in_hand(widget);
    };
    
    robot.dropped_on = function (source_widget, target_widget_side, event) {
        // need to support dropping on backside of a widget as well as which side of a box 
        var path, step, additional_info, $target_element,
            target_location, source_location,
            target_width, target_height;
        if (this === source_widget) {
            // robot dropped its frontside or backside -- so ignore this
            return;
        }
        if (this.get_parent_of_frontside().get_widget() === source_widget) {
            // robot dropped the backside of what it is working on -- so ignore this
            return;
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
                // store the drop location as a fraction of width and height of target so does something sensible when run on different size target
                additional_info = {left_offset_fraction: (source_location.left-target_location.left)/target_width,
                                   top_offset_fraction:  (source_location.top -target_location.top) /target_height};
            }
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
        if (this.get_parent_of_frontside()) {
            context = this.get_parent_of_frontside().get_widget();
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
            // this way the robot could restore things using the robot
            this.add_newly_created_widget_if_new(widget);
        }
    };
    
    robot.edited = function (widget, details) {
        var action_name = "edit";
        add_step_to_robot(widget, action_name, this, details);
    };
    
    robot.erased_widget = function (widget) {
        var action_name = "change whether erased";
        add_step_to_robot(widget, action_name, this);
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

    robot.backside_closed = function (widget) {
        var action_name = "close the backside";
        add_step_to_robot(widget, action_name, this);
    };

    robot.button_clicked = function (selector, widget_side) {
        var action_name = "click the button";
        add_step_to_robot(widget_side.get_widget(), action_name, this, {button_selector: selector});
    };
   
    robot.created_widget = function (new_widget, source_widget, button_selector) {
        this.add_newly_created_widget(new_widget);
        this.add_to_top_level_backside(new_widget, false);
        this.add_step(TT.robot_action.create(TT.path.get_path_to_resource(new_widget.copy()), 
                                             "add a new widget to the work space",
                                             {button_selector: button_selector,
                                              path_to_source: TT.path.get_path_to(source_widget, this)}));
    };

    robot.get_newly_created_widgets = function () {
        return this.get_body().get_newly_created_widgets();
    };
    
    robot.remove_from_container = function (part, container) {
        // this is used when running a robot -- not training
        // need to compute index now since parent may have changed by the time this runs
        // or perhaps not and a different bug was making it appear to be so
        var index = container.get_index_of && part.get_parent_of_frontside() && container.get_index_of(part);
        var do_removal =
            function () {
                // if part has already been removed from a nest in another container
                // the following will ignore this due to the last argument being false
                container.removed_from_container(part, false, true, index, false);
        };
        if (this.get_animating()) {
            // if animating then delay removing it
            // otherwise hole empties before the robot gets there
            TT.UTILITIES.add_one_shot_event_handler(this.get_frontside_element(), "transitionend", 2500, do_removal);
        } else {
            do_removal();
        }
        // might be new -- following does nothing if already known
        this.add_newly_created_widget_if_new(part);
    };
    
    robot.add_step = function (step, new_widget) {
        this.get_body().add_step(step, new_widget);
        TT.UTILITIES.give_tooltip(this.get_frontside_element(), this.get_title());
        if (step.get_action_name() !== 'train' && step.get_action_name() !== 'start training' && TT.robot.robot_training_this_robot()) {
            // this limits training to two levels -- could have more but must limit it
            TT.robot.robot_training_this_robot().trained(this, step);
        }
    };
    
    robot.get_context = function () {
        var frontside_element = this.get_frontside_element();
        var $parent_element = $(frontside_element).parent();
        var widget = TT.UTILITIES.widget_from_jquery($parent_element);
        var previous_robot;
        if (!widget) {
            // check if robot is in the 'next robot' area
            previous_robot = TT.UTILITIES.widget_from_jquery($parent_element.closest(".toontalk-backside-of-robot"));
            if (previous_robot) {
                return previous_robot.get_context();
            }
        }
        return widget;
    };
    
    robot.update_display = function () {
        var frontside = this.get_frontside(true);
        var backside = this.get_backside(); 
        var thing_in_hand = this.get_thing_in_hand();
        var frontside_element, thing_in_hand_frontside_element;
        if (TT.debugging) {
            // this can't be done during robot creation since robot actions references to newly_created_widgets is premature
            this.debug_string = this.toString();
        }
        frontside_element = frontside.get_element();
        if (thing_in_hand) {
            thing_in_hand_frontside_element = thing_in_hand.get_frontside_element();
        }
        if (!thing_in_hand_frontside_element && this.carrying_tool) {
            thing_in_hand_frontside_element = document.createElement("div");
            $(thing_in_hand_frontside_element).addClass(this.carrying_tool);
        }
        TT.UTILITIES.give_tooltip(frontside_element, this.get_title());
        $(frontside_element).addClass("toontalk-robot");
        $(frontside_element).children(".toontalk-side, .toontalk-held-by-robot").remove();
        if (thing_in_hand_frontside_element) {
            frontside_element.appendChild(thing_in_hand_frontside_element);
        }
        if (this.match_status) {
            if (this.match_status.is_widget) { // didn't match
                $(frontside_element).addClass("toontalk-side-animating toontalk-robot-not-matched");
            } else {
                $(frontside_element).removeClass("toontalk-robot-not-matched");
            }
        }
        TT.UTILITIES.set_timeout( // wait for layout to settle down
            function () {
                var relative_left, relative_top, thing_in_hand_width, thing_in_hand_height, robot_width, robot_height, css;
                if (thing_in_hand_frontside_element) {
                    css = {position: "absolute"};
                    // tried to add position: absolute to toontalk-held-by-robot CSS but didn't work
                    $(thing_in_hand_frontside_element).addClass("toontalk-held-by-robot");
                    // compute where the thing should be to be centred over the robot
                    thing_in_hand_width  = $(thing_in_hand_frontside_element).width();
                    thing_in_hand_height = $(thing_in_hand_frontside_element).height();
                    robot_width  = $(frontside_element).width();
                    robot_height = $(frontside_element).height();
                    if (thing_in_hand_width === 0) {
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
                    $(thing_in_hand_frontside_element).css(css);
                    if (thing_in_hand) {
                        thing_in_hand.render(); // or should it be rerender -- could it be invisible?
                    }
                }
            });
    };
    
    robot.add_newly_created_widget = function (new_widget) {
        return this.get_body().add_newly_created_widget(new_widget);
    };
    
    robot.add_newly_created_widget_if_new = function (new_widget) {
        if (new_widget !== this.get_context()) {
            return this.get_body().add_newly_created_widget_if_new(new_widget);
        }
    };
    
    robot.get_recently_created_widget = function () {
        var newly_created_widgets = this.get_body().get_newly_created_widgets();
        return newly_created_widgets[newly_created_widgets.length-1];
    };
    
    robot.get_title = function () {
        var description = this.get_description();
        var frontside_element;
        if (description) {
            description = "This robot " + description;
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
        var frontside_conditions, backside_conditions, backside_conditions_defined, body, prefix, postfix,
            frontside_conditions_string, next_robot, robot_description, robot_conditions_description;
        if (to_string_info && to_string_info.role === "conditions") {
            return "any robot";
        }
        frontside_conditions = this.get_frontside_conditions();
        if (!frontside_conditions) {
            return "an untrained robot";
        }
        backside_conditions = this.get_backside_conditions();
        body = this.get_body();
        prefix = "";
        postfix = "";
        next_robot = this.get_next_robot();
        if (frontside_conditions.is_top_level()) {
            robot_conditions_description = "When the workspace's green flag is pressed";
        } else {
            frontside_conditions_string = TT.UTILITIES.add_a_or_an(frontside_conditions.get_full_description({role: "conditions"}));
            robot_conditions_description = "When working on something that matches " + frontside_conditions_string;
        }
        if (backside_conditions) {
            Object.keys(backside_conditions).forEach(function (key) {
                var condition = backside_conditions[key];
                if (condition) {
                    robot_conditions_description += " and\nif on the back is " + TT.UTILITIES.add_a_or_an(key) +
                    " that matches " + TT.UTILITIES.add_a_or_an(condition.get_full_description({role: "conditions"}));
                }
                backside_conditions_defined = true;
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
                            " I will \n" + body.toString({robot: this}) + postfix;
        if (this.match_status) {
            if (this.match_status.is_widget) {
                robot_description = "I'm not running because the " + this.match_status + 
                                   " in my conditions (highlighted in red) doesn't match the corresponding widget. Perhaps editing my conditions will help.\n" + 
                                   robot_description;
            } else if (this.match_status !== 'matched') {
                robot_description = "I'm waiting for something to be delivered to the nest that matches the " + this.match_status[0][1] +
                                    "in my conditions (highlighted in yellow).\n" + robot_description;
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

    robot.matching_resource = function (other) {
        // untrained robots match each other
        return other.is_robot() &&
               !this .get_frontside_conditions() &&
               !other.get_frontside_conditions();
    };

    robot.get_top_level_context_description = function (toString_info) {
        var frontside_conditions = this.get_frontside_conditions();
        var type = frontside_conditions.get_type_name();
        if (type === 'top-level') {
            return "his workspace";
        }
        if (toString_info && toString_info.person === "third") {
            return "the " + type + " he's working on";
        }
        return "the " + type + " I'm working on";
    };

    robot.get_help_URL = function () {
        return "docs/manual/robots.html";
    };
    
    robot.get_json = function (json_history) {
        var frontside_conditions = this.get_frontside_conditions();
        var backside_conditions = this.get_backside_conditions();
        var frontside_conditions_json, backside_conditions_json, next_robot_json;
        if (frontside_conditions) {
            if (frontside_conditions.is_top_level()) {
                frontside_conditions_json = {type: "top_level"};
            } else {
                frontside_conditions_json = TT.UTILITIES.get_json(frontside_conditions, json_history);
            }
        }
        if (backside_conditions) {
            TT.UTILITIES.available_types.forEach(function (type) {
                if (backside_conditions[type]) {
                    if (!backside_conditions_json) {
                        backside_conditions_json = {};
                    }
                    backside_conditions_json[type] = TT.UTILITIES.get_json(backside_conditions[type], json_history);
                }
            });
        }
        if (this.get_next_robot()) {
            next_robot_json = TT.UTILITIES.get_json(this.get_next_robot(), json_history);
        }
        return {type: "robot",
                frontside_conditions: frontside_conditions_json,
                backside_conditions: backside_conditions_json,
                body: this.get_body().get_json(json_history),
                run_once: this.get_run_once(),
                next_robot: next_robot_json
               };
    };
    
    TT.creators_from_json["robot"] = function (json, additional_info) {
        var next_robot, thing_in_hand, backside_conditions;
        if (json.thing_in_hand) {
            thing_in_hand = TT.UTILITIES.create_from_json(json.thing_in_hand, additional_info);
        }
        if (json.next_robot) {
            next_robot = TT.UTILITIES.create_from_json(json.next_robot, additional_info);
        }
        if (json.backside_conditions) {
            backside_conditions = {};
            TT.UTILITIES.available_types.forEach(function (type) {
                    backside_conditions[type] = TT.UTILITIES.create_from_json(json.backside_conditions[type], additional_info);
            });
        }
        return TT.robot.create(TT.UTILITIES.create_from_json(json.frontside_conditions || json.bubble, additional_info),
                               backside_conditions,
                               TT.UTILITIES.create_from_json(json.body, additional_info),
                               json.description,
                               thing_in_hand,
                               json.run_once,
                               next_robot);
    };

    robot.find_conditions_path = function (widget, robot_with_widget_in_conditions, robot) {
         var frontside_conditions = robot_with_widget_in_conditions.get_frontside_conditions();
         var path_within_conditions = frontside_conditions === widget ? 'entire_condition' : frontside_conditions.get_path_to && frontside_conditions.get_path_to(widget, robot);
         var path_to_robot = TT.path.get_path_to(robot_with_widget_in_conditions, robot);
         var backside_conditions, backside_conditions_type;
         if (!path_within_conditions) {
             backside_conditions = robot_with_widget_in_conditions.get_backside_conditions();
             TT.UTILITIES.available_types.some(function (type) {
                                                   if (backside_conditions[type]) {
                                                       path_within_conditions = backside_conditions[type].get_path_to(widget, robot);
                                                       if (path_within_conditions) {
                                                           backside_conditions_type = type;
                                                           return;
                                                       }
                                                   }
                                               });
         }
         if (!path_within_conditions) {
             TT.UTILITIES.report_internal_error("Robot has widget in its conditions but unable to construct the path.");
             return;
         }
         return TT.robot.create_conditions_path (path_within_conditions, path_to_robot, backside_conditions_type);
    };

    robot.create_conditions_path = function (path_within_conditions, path_to_robot, backside_conditions_type) {
         return {dereference_path: function (context, top_level_context, robot) {
                     var robot_with_widget_in_conditions = TT.path.dereference_path(path_to_robot, context, top_level_context, robot);
                     var conditions;
                     if (backside_conditions_type) {
                         conditions = robot_with_widget_in_conditions.get_backside_conditions()[backside_conditions_type];
                     } else {
                         conditions = robot_with_widget_in_conditions.get_frontside_conditions();
                     }
                     if (path_within_conditions === 'entire_condition') {
                         return conditions;
                     }
                     return TT.path.dereference_path(path_within_conditions, conditions, top_level_context, robot);
                 },
                 toString: function () {
                     var path_to_condition_description = (path_within_conditions === 'entire_condition') ?
                                                         "the " : TT.path.toString(path_within_conditions) + " of the ";
                                                         
                     if (backside_conditions_type) {
                         return path_to_condition_description + backside_conditions_type + " backside condition of " + TT.path.toString(path_to_robot);
                     }
                     return path_to_condition_description + " front side condition of " + TT.path.toString(path_to_robot);
                 },
                 get_json: function () {
                     return {type: "path_to_robot_conditions",
                             backside_conditions_type: backside_conditions_type,
                             path_to_robot: path_to_robot.get_json(),
                             path_within_conditions: (path_within_conditions === 'entire_condition') ? 'entire_condition' : path_within_conditions.get_json()};
                 }};
    };

    TT.creators_from_json["path_to_robot_conditions"] = function (json) {
            var path_to_robot = TT.UTILITIES.create_from_json(json.path_to_robot);
            var path_within_conditions = (json.path_within_conditions === 'entire_condition') ? 
                                         json.path_within_conditions : TT.UTILITIES.create_from_json(json.path_within_conditions);
            return TT.robot.create_conditions_path(path_within_conditions, path_to_robot, json.backside_conditions_type);
    };
    
    return robot;
}(window.TOONTALK));

window.TOONTALK.robot_backside = 
(function (TT) {
    "use strict";
    var create_conditions_area = function (text, condition_widget, robot, class_name) {
        var description = TT.UTILITIES.create_text_element(text);
        var condition_element = condition_widget.get_frontside_element(true);
        var condition_element_div_parent = document.createElement('div');
        var conditions_panel;
//      TT.UTILITIES.set_position_is_absolute(condition_element, false);
        $(condition_element).addClass("toontalk-conditions-contents " + class_name);
        TT.UTILITIES.set_timeout(function () {
                // this is needed since the element may be transparent and yet need to see the border
                // should really wait until condition_element is attached to the DOM
                $(condition_element).parent().addClass("toontalk-conditions-contents-container");
                $(condition_element).css({left:   'inherit',
                // following caused all conditions to be at the top 
//                                        top:    '4%', // unclear why this works but 0 or inherit leaves element too high
                                          width:  'inherit',
                                          height: 'inherit'});
                condition_widget.render();
            });
        if (robot.match_status) {
            if (robot.match_status.is_widget) {
                $(robot.match_status.get_frontside_element()).addClass("toontalk-conditions-not-matched");
            } else if (robot.match_status !== 'matched') {
                robot.match_status.forEach(function (waiting_widget) {
                    // waiting_widget is [widget, pattern]
                    $(waiting_widget[1].get_frontside_element()).addClass("toontalk-conditions-waiting");
                });
            }
        }
        // wrapping the condition_element in a div forces it to be in the right place in the table
        condition_element_div_parent.appendChild(condition_element);
        conditions_panel = TT.UTILITIES.create_horizontal_table(description, condition_element_div_parent);
        $(conditions_panel).addClass("toontalk-conditions-panel");
        return conditions_panel;
    };
    var add_conditions_area = function (backside_element, robot) {
        var frontside_condition_widget = robot.get_frontside_conditions();
        var backside_conditions = robot.get_backside_conditions();
        var robot_visible = robot.visible();
        var green_flag_message = "This robot always runs when the workspace green flag is clicked.";
        var backside_condition_widget, area_class_name;
        if (frontside_condition_widget) {
            if (frontside_condition_widget.is_top_level()) {
                if (backside_element.firstChild.textContent !== green_flag_message) {
                    backside_element.insertBefore(TT.UTILITIES.create_text_element(green_flag_message),
                                                  backside_element.firstChild);
                }
            } else if ($(backside_element).find(".toontalk-frontside-conditions-area").length === 0) {
                // and not already added
                backside_element.insertBefore(create_conditions_area("Runs only if the widget matches: ", 
                                                                     frontside_condition_widget, 
                                                                     robot,
                                                                     "toontalk-frontside-conditions-area"), 
                                              backside_element.firstChild);
            }
            frontside_condition_widget.set_visible(robot_visible);
            frontside_condition_widget.rerender();
        }
        if (backside_conditions) {
            Object.keys(backside_conditions).forEach(function (type) {
                var condition_element;
                backside_condition_widget = backside_conditions[type];
                if (backside_condition_widget) {
                    area_class_name = "toontalk-backside-" + type + "-conditions-area";
                    if ($(backside_element).find("." + area_class_name).length === 0) {
                        if (type === 'bird') {
                            condition_element = TT.UTILITIES.create_text_element("And there is a bird on the back.");
                        } else {
                            condition_element = create_conditions_area("Runs only if the " + type + " on the backside matches: ", 
                                                                       backside_condition_widget, 
                                                                       robot,
                                                                       area_class_name);
                        }
                        backside_element.insertBefore(condition_element, backside_element.firstChild.nextSibling);
                        backside_condition_widget.set_visible(robot_visible);
                        backside_condition_widget.rerender();
                    }
                }
            });
        }
    };
    return {
        create: function (robot) {
            var backside = TT.backside.create(robot);
            var backside_element = backside.get_element();
            var run_once_input = TT.UTILITIES.create_check_box(!robot.get_run_once(),
                                                               "toontalk-run-once-check-box",
                                                               "When finished start again",
                                                               "Check this if you want the robot to start over again after finishing what he was trained to do.");
            var $next_robot_area = TT.UTILITIES.create_drop_area(window.TOONTALK.robot.empty_drop_area_instructions);
            var next_robot = robot.get_next_robot();
            var advanced_settings_button = TT.backside.create_advanced_settings_button(backside, robot);
            var generic_backside_update = backside.update_display.bind(backside);
            $next_robot_area.data("drop_area_owner", robot);
            $(run_once_input.button).click(function (event) {
                var keep_running = run_once_input.button.checked;
                robot.set_run_once(!keep_running);
                if (TT.robot.in_training()) {
                    TT.robot.in_training().edited(robot, {setter_name: "set_run_once",
                                                          argument_1: !keep_running,
                                                          toString: "change to " + (keep_running ? "run again" : "run once") + " of the robot",
                                                          button_selector: ".toontalk-run-once-check-box"});
                }
                event.stopPropagation();
            });
            if (next_robot) {
                $next_robot_area.append(next_robot.get_frontside_element(true));
            }
            $next_robot_area.get(0).addEventListener('drop', function (event) {
                // start training when robot is dropped here
                var dragee = TT.UTILITIES.get_dragee();
                var widget = TT.UTILITIES.widget_from_jquery(dragee);
                var backside;
                if (widget && widget.is_robot()) {
                    if (widget.get_body().is_empty()) {
                        backside = widget.open_backside();
                        $(backside.get_element()).find(".toontalk-train-backside-button").click();
                    } else {
                        robot.set_next_robot(widget);
                    }
                }
            });
            backside.update_display = function () {
                var frontside_element = robot.get_frontside_element();
                if (frontside_element) {
                    TT.UTILITIES.give_tooltip(frontside_element, robot.get_title());                    
                }
                generic_backside_update();
            };
            backside_element.appendChild(this.create_train_button(backside, robot));
            backside_element.appendChild(advanced_settings_button);
            $(run_once_input.container).addClass("toontalk-advanced-setting");
            $next_robot_area           .addClass("toontalk-advanced-setting");
            backside_element.appendChild(run_once_input.container);
            backside_element.appendChild($next_robot_area.get(0));
            add_conditions_area(backside_element, robot);
            backside.add_advanced_settings();
            return backside;
        },
        
        create_train_button: function (backside, robot) {
            var backside_element = backside.get_element();
            var $backside_element = $(backside_element);
            var $train_button = $("<button>Train</button>").button();
            $train_button.addClass("toontalk-train-backside-button");
            var training = false;
            backside.change_label_and_title_of_train_button = function (training_started) {
                if (training_started) {
                    $train_button.button("option", "label", "Stop training");
                    TT.UTILITIES.give_tooltip($train_button.get(0), "Click to stop training this robot.");
                } else {
                    if (robot.get_body().is_empty()) {
                        $train_button.button("option", "label", "Train");
                        TT.UTILITIES.give_tooltip($train_button.get(0), "Click to start training this robot.");
                    } else {
                        $train_button.button("option", "label", "Re-train");
                        TT.UTILITIES.give_tooltip($train_button.get(0), "Click to start training this robot all over again.");
                    }  
                }
                if ($(backside_element).is(":visible")) {
                    add_conditions_area(backside_element, robot);
                }
            };
            backside.change_label_and_title_of_train_button(training);
            $train_button.click(function (event) {
                training = !training;
                backside.change_label_and_title_of_train_button(training);
                if (training) {
                    robot.get_body().reset_steps();
                    stack_of_robots_in_training.push(robot);
                    robot.training_started();
                } else {
                    robot.training_finished();
                }
                event.stopPropagation();
            });
            return $train_button.get(0);
        }
        
    };
}(window.TOONTALK));


window.TOONTALK.robot.empty_drop_area_instructions = "Drop a robot here who will try to run when this robot can't run."

}());