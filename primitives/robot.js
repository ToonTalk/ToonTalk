 /**
 * Implements ToonTalk's robots
 * box.Authors = Ken Kahn
 * License: New BSD
 */
 
 /*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */

window.TOONTALK.robot = (function (TT) {
    "use strict";
    var robot = Object.create(TT.widget);
    
    robot.create = function (frontside_conditions, backside_conditions, body, description, thing_in_hand, run_once, next_robot) { // image_url removed
        // frontside_conditions holds a widget that needs to be matched against the frontside of the widget to run
        // backside_conditions holds an object whose keys are type_names of required widgets on the backside
        // and whose values are widgets that need to match backside widgets of that type
        // body holds the actions the robot does when it runs
        var new_robot = Object.create(robot);
        var first_in_team; // who should do the 'repeating'
        var animating = false; // true if animating due to being run while watched
//         if (!image_url) {
//             image_url = "images/RB00.PNG";
//         }
        if (!body) {
            body = TT.actions.create();
        }
        if (!first_in_team) {
            first_in_team = new_robot;
        }
        new_robot.get_frontside_conditions = function () {
            return frontside_conditions;
        };
        new_robot.set_frontside_conditions = function (new_value) {
            frontside_conditions = new_value;
            if (frontside_conditions) {
                // only makes sense to erase things in frontside_conditions
                TT.widget.erasable(frontside_conditions);
            }
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
                    }
                }); 
            }
        };
        new_robot.add_to_backside_conditions = function (widget) {
            var widget_copy = widget.copy(true);
            if (!backside_conditions) {
                backside_conditions = {};
            }
            backside_conditions[widget.get_type_name()] = widget_copy;
            TT.widget.erasable(widget_copy);
        };
        new_robot.get_body = function () {
            return body;
        };
//         new_robot.get_image_url = function () {
//             return image_url;
//         };
//         new_robot.set_image_url = function (new_value, update_display) {
//             if (image_url === new_value) {
//                 return false;
//             }
//             image_url = new_value;
//             if (update_display) {
//                 this.rerender();
//             }
//             return true;
//         };
        new_robot.get_animating = function () {
            return animating;
        };
        new_robot.set_animating = function (new_value) {
            var frontside_element = this.get_frontside_element();
            animating = new_value;
            if (animating) {
                // the following didn't work when added to the CSS of toontalk-side-animating
                frontside_element.style["z-index"] = TT.UTILITIES.next_z_index(); // 1000;
                $(frontside_element).addClass("toontalk-robot-animating");
            } else {
                frontside_element.style["z-index"] = TT.UTILITIES.next_z_index(); // 'auto';
                $(frontside_element).removeClass("toontalk-robot-animating");
            }
        };
        new_robot.get_thing_in_hand = function () {
            return thing_in_hand;
        };
        new_robot.set_thing_in_hand = function (new_value) {
            thing_in_hand = new_value;
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
        new_robot.get_run_once = function () {
            return run_once;
        };
        new_robot.set_run_once = function (new_value) {
            run_once = new_value;
        };
        new_robot = new_robot.add_standard_widget_functionality(new_robot);
        new_robot.set_description(description);
        if (TT.debugging) {
            this.debug_id = TT.UTILITIES.generate_unique_id();
        }
        return new_robot;
    };
    
    robot.create_backside = function () {
        return TT.robot_backside.create(this).update_run_button_disabled_attribute();
    };
    
    robot.copy = function (just_value) {
        var frontside_conditions = this.get_frontside_conditions();
        var backside_conditions = this.get_backside_conditions();
        var frontside_conditions_copy = frontside_conditions ? frontside_conditions.copy(true) : undefined;
        var next_robot = this.get_next_robot();
        var next_robot_copy = next_robot ? next_robot.copy(just_value) : undefined;
        var backside_conditions_copy;
        if (backside_conditions) {
            backside_conditions_copy = {};
            TT.UTILITIES.available_types.forEach(function (type) {
                if (backside_conditions_copy[type]) {
                    backside_conditions_copy[type] = backside_conditions_copy[type].copy(true);
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
        return this.add_to_copy(copy, just_value);
    };
    
    robot.match = function () {
        console.log("Robot-to-robot matching could be more sophisticated.");
        return "matched";
    };
    
    robot.run = function (context, top_level_context, queue) {
        var frontside_condition_widget = this.get_frontside_conditions();
        var backside_conditions, backside_widgets, condition_frontside_element, to_run_when_non_empty;
        if (this.being_trained || !frontside_condition_widget) {
            return 'not matched';
        }
        this.match_status = TT.UTILITIES.match(frontside_condition_widget, context);
        condition_frontside_element = frontside_condition_widget.get_frontside_element();
        if (condition_frontside_element) {
            if (this.match_status === 'matched') {
                $(condition_frontside_element).removeClass("toontalk-conditions-not-matched");
            } else {
                $(condition_frontside_element).addClass("toontalk-conditions-not-matched");
            }
        }
        if (this.match_status === 'matched') {
            backside_conditions = this.get_backside_conditions();
            if (backside_conditions) {
                backside_widgets = context.get_backside_widgets();
                if (backside_widgets) {
                    backside_widgets.some(function (backside_widget_side) {
                        var backside_condition_widget_of_type = !backside_widget_side.is_backside && backside_conditions[backside_widget_side.widget.get_type_name()];
                        var sub_match_status;
                        if (backside_condition_widget_of_type) {
                            sub_match_status = TT.UTILITIES.match(backside_condition_widget_of_type, backside_widget_side.widget);
                            condition_frontside_element = backside_condition_widget_of_type.get_frontside_element();
                            if (condition_frontside_element) {
                                if (this.match_status === 'matched') {
                                    $(condition_frontside_element).removeClass("toontalk-conditions-not-matched");
                                } else {
                                    $(condition_frontside_element).addClass("toontalk-conditions-not-matched");
                                }
                            }
                            if (sub_match_status !== 'matched') {
                                this.match_status = sub_match_status;
                                // stop going through backside_widgets
                                return true;
                            }
                        }
                    }.bind(this));
                }
            }
        } else if (!this.match_status) {
            this.match_status = 'not matched';
        }
//      console.log("robot#" + this.debug_id + " match_status is " + this.match_status);
        switch (this.match_status) {
        case 'matched':
            if (!queue) {
                queue = TT.QUEUE;
            }
            this.get_body().reset_newly_created_widgets();
            queue.enqueue({robot: this, context: context, top_level_context: top_level_context, queue: queue});
            return this.match_status;
        case 'not matched':
            if (this.get_next_robot()) {
                return this.get_next_robot().run(context, top_level_context, queue);
            }
            return this.match_status;
        default:
            to_run_when_non_empty = {robot: this,
                                     context: context,
                                     top_level_context: top_level_context,
                                     queue: queue};
            this.match_status.forEach(function (sub_match_status) {
                sub_match_status.run_when_non_empty(to_run_when_non_empty);
            });
            return this.match_status;                    
        }
    };
    
    robot.set_stopped = function (new_value) {
        this.stopped = new_value;
        if (this.stopped) {
            // this is needed because a robot won't start running if it is animating
            // and the animating flag isn't always reset
            this.set_animating(false);
        }
    };
    
    robot.run_actions = function(context, top_level_context, queue) {
        if (this.stopped) { // replace with a method?
            return false;
        }
        if (this.visible()) {
            return this.get_body().run_watched(context, top_level_context, queue, this);
        }
        return this.get_body().run_unwatched(context, top_level_context, queue, this);
    };
    
    robot.picked_up = function (widget, json, is_resource) {
        var path, action_name, widget_copy, new_widget;
        if (this === widget) {
            // robot picked up its frontside or backside -- so ignore this
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
            this.add_step(TT.robot_action.create(path, this.current_action_name), new_widget);
        }
        widget.last_action = this.current_action_name;
        this.current_action_name = undefined;
        this.set_thing_in_hand(widget);
    };
    
    robot.dropped_on = function (source_widget, target_widget) {
        // need to support dropping on backside of a widget as well as which side of a box 
        var path;
        if (this === source_widget) {
            // robot dropped its frontside or backside -- so ignore this
            return;
        }
        this.current_action_name = "drop it on";
        path = TT.path.get_path_to(target_widget, this);
        if (path) {
            this.add_step(TT.robot_action.create(path, this.current_action_name));
        }
        source_widget.last_action = this.current_action_name + " " + target_widget.get_type_name();
        this.current_action_name = undefined;
        this.set_thing_in_hand(undefined);
    };
    
    robot.copied = function (widget, widget_copy, picked_up) {
        var path;
        if (picked_up) {
            this.current_action_name = "pick up a copy of";
        } else {
            this.current_action_name = "copy";
        }
        path = TT.path.get_path_to(widget, this);
        if (path) {
            this.add_step(TT.robot_action.create(path, this.current_action_name), widget_copy);
        }
        widget_copy.last_action = this.current_action_name;
        this.current_action_name = undefined;
    };
    
    robot.removed = function (widget) {
        var path;
        this.current_action_name = "remove";
        path = TT.path.get_path_to(widget, this);
        if (path) {
            this.add_step(TT.robot_action.create(path, this.current_action_name));
        }
        widget.last_action = this.current_action_name;
        this.current_action_name = undefined;
    };
    
    robot.edited = function (widget, details) {
        var path;
        this.current_action_name = "edit";
        path = TT.path.get_path_to(widget, this);
        if (path) {
            this.add_step(TT.robot_action.create(path, this.current_action_name, details));
        }
        // no need to update widget.last_action = this.current_action_name;
        this.current_action_name = undefined;
    };
    
    robot.set_erased = function (widget, erased) {
        var path;
        this.current_action_name = "set_erased";
        path = TT.path.get_path_to(widget, this);
        if (path) {
            this.add_step(TT.robot_action.create(path, this.current_action_name, {erased: erased,
                                                                                  toString: erased ? "erase" : "un-erase"}));
        }
        // no need to update widget.last_action = this.current_action_name;
        this.current_action_name = undefined;
    };
    
    robot.remove_from_container = function (part, container) {
        // this is used when running a robot -- not training
        if (this.get_animating()) {
            // if animating then delay removing it
            // otherwise hole empties before the robot gets there
            TT.UTILITIES.add_one_shot_event_handler(this.get_frontside_element(), "transitionend", 2500, function () {
                container.removed_from_container(part, false, true);
                });
        } else {
            container.removed_from_container(part);
        }
        // might be new -- following does nothing if already known
        this.add_newly_created_widget(part);
    };
    
    robot.add_step = function (step, new_widget) {
        this.get_body().add_step(step, new_widget);
        this.get_frontside_element().title = this.get_title();
    };
    
    robot.get_context = function () {
        var frontside_element = this.get_frontside_element();
        var $parent_element = $(frontside_element).parent();
        return $parent_element.data("owner");
    };
    
    robot.training_started = function () {
        var context = this.get_context();
        var backside_element;
        if (!context) {
            console.log("Robot started training but can't find its 'context'.");
            return;
        }
        this.being_trained = true;
        this.set_frontside_conditions(context.copy(true));
//   //    use minature image as cursor (if there is one)
//         $("div").css({cursor: 'url(' + TT.UTILITIES.cursor_of_image(this.get_image_url()) + '), default'});
        $("div").css({cursor: 'url("images/RB19.32x32.PNG"), default'});
        this.get_frontside_element().title = this.get_title();
        backside_element = this.get_backside_element();
        $(backside_element).find(".toontalk-conditions-panel").remove();
    };
    
    robot.training_finished = function () {
        var newly_created_widgets = this.get_body().get_newly_created_widgets();
        var i, widget;
        $("div").css({cursor: ''}); // restore cursor
        for (i = 0; i < newly_created_widgets.length; i++) {
            widget = newly_created_widgets[i];
            if (widget.last_action === "drop it on top-level" || widget.last_action === "copy") {
                this.add_step(TT.robot_action.create(TT.newly_created_widgets_path.create(i), "add to the top-level backside"));
            }
        }
        this.rerender();
        this.being_trained = false;
        this.get_frontside_element().title = this.get_title();
        TT.UTILITIES.backup_all();
    };
    
    robot.update_display = function() {
        var frontside = this.get_frontside(true);
        var backside = this.get_backside(); 
        var frontside_element, resource_becoming_instance;
        var thing_in_hand = this.get_thing_in_hand();
        var thing_in_hand_frontside_element;
        if (TT.debugging) {
            // this can't be done during robot creation since robot actions references to newly_created_widgets is premature
            this.debug_string = this.toString();
        }
        frontside_element = frontside.get_element();
//         robot_image = this.image();
        if (thing_in_hand) {
            thing_in_hand_frontside_element = thing_in_hand.get_frontside_element();
        }
        resource_becoming_instance = frontside_element.firstChild && $(frontside_element.firstChild).is(".toontalk-robot-image");
        // remove what's there currently before adding new elements
//         while (frontside_element.firstChild) {
//             if (!$(frontside_element.firstChild).is(".toontalk-close-button")) {
//                 frontside_element.removeChild(frontside_element.firstChild);
//             }
//         }
        frontside_element.title = this.get_title();
        $(frontside_element).addClass("toontalk-robot");
//         frontside_element.appendChild(robot_image);
        if (thing_in_hand_frontside_element) {
            frontside_element.appendChild(thing_in_hand_frontside_element);
        }
        if (this.match_status === 'not matched') {
            $(frontside_element).addClass("toontalk-side-animating toontalk-robot-not-matched");
        } else {
            $(frontside_element).removeClass("toontalk-robot-not-matched");
        }
        setTimeout( // wait for layout to settle down
            function () {
                var relative_left, relative_top, thing_in_hand_width, thing_in_hand_height, robot_width, robot_height, css;
                if (thing_in_hand) {
                    css = {position: "absolute"};
                    $(thing_in_hand_frontside_element).addClass("toontalk-held-by-robot");
                    // compute where the thing should be to be centred over the robot
                    thing_in_hand_width = $(thing_in_hand_frontside_element).width();
                    thing_in_hand_height = $(thing_in_hand_frontside_element).height();
                    robot_width = $(frontside_element).width();
                    robot_height = $(frontside_element).height();
//                     robot_width = $(robot_image).width();
//                     robot_height = $(robot_image).height();
                    if (thing_in_hand_width === 0) {
                        thing_in_hand_width = robot_width*2;
                        thing_in_hand_height = robot_height/2;
                        css['width'] = thing_in_hand_width;
                        css['height'] = thing_in_hand_height;
                    }
                    relative_left = (robot_width - thing_in_hand_width)/2;
                    relative_top = (robot_height - thing_in_hand_height)/2;
                    css['left'] = relative_left;
                    css['top'] = relative_top;
                    $(thing_in_hand_frontside_element).css(css);
                    thing_in_hand.render(); // or should it be rerender -- could it be invisible?
                }
            },
            1);
        if (backside) {
            backside.rerender();
        }
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
    
    robot.get_title = function() {
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
    
//     robot.image = function () {
//         return TT.UTILITIES.create_image(this.get_image_url(), "toontalk-robot-image"); 
//     };
    
//     robot.frontside_conditions_div = function () {
//         var frontside_conditions = document.createElement("div");
//         $(frontside_conditions).addClass("toontalk-frontside-conditions");
//         if (this.match_status === 'not matched') {
//             $(frontside_conditions).addClass("toontalk-frontside-conditions-not-matched");
//         }
//         return frontside_conditions;
//     };
    
    robot.toString = function () {
        var frontside_conditions = this.get_frontside_conditions();
        var body = this.get_body();
        var prefix = "";
        var postfix = "";
        var frontside_conditions_string;
        var next_robot = this.get_next_robot();
        var robot_description;
        if (!frontside_conditions) {
            return "has yet to be trained.";
        }
        frontside_conditions_string = frontside_conditions.get_full_description();
        if (this.being_trained) {
            prefix = "is being trained.\n";
            postfix = "\n..."; // to indicates still being constructed
        }
        frontside_conditions_string = TT.UTILITIES.add_a_or_an(frontside_conditions_string);
        robot_description = prefix + "When working on something that matches " + frontside_conditions_string + " he will \n" + body.toString() + postfix;
        if (this.match_status === 'not matched') {
            robot_description = "He isn't running because his conditions don't match. Click to edit his conditions.\n" + robot_description;
        }
        if (next_robot) {
            robot_description += "\nIf it doesn't match then the next robot will try to run.\n" + next_robot.toString();
        }
        return robot_description;
    };
    
    robot.get_type_name = function () {
        return "robot";
    };
    
    robot.get_json = function (json_history) {
        var frontside_conditions = this.get_frontside_conditions();
        var backside_conditions = this.get_backside_conditions();
        var frontside_conditions_json, backside_conditions_json, next_robot_json;
        if (frontside_conditions) {
            if (frontside_conditions.get_type_name() === 'top-level') {
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
    
    robot.create_from_json = function (json, additional_info) {
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
        return TT.robot.create(// json_view.image_url,
                               // bubble for backwards compatibility -- should be able to remove in the future
                               TT.UTILITIES.create_from_json(json.frontside_conditions || json.bubble, additional_info),
                               backside_conditions,
                               TT.UTILITIES.create_from_json(json.body, additional_info),
                               json.description,
                               thing_in_hand,
                               json.run_once,
                               next_robot);
    };
    
    return robot;
}(window.TOONTALK));

window.TOONTALK.robot_backside = 
(function (TT) {
    "use strict";
    var create_conditions_area = function (text, condition_widget, robot, class_name) {
        var description = TT.UTILITIES.create_text_element(text);
        var condition_element = condition_widget.get_frontside_element(true);
        var conditions_panel;
        TT.UTILITIES.set_position_is_absolute(condition_element, false);
        $(condition_element).addClass("toontalk-conditions-contents " + class_name);
        setTimeout(function () {
                // this is needed since the element may be transparent and yet need to see the border
                // should really wait until condition_element is attached to the DOM
                $(condition_element).parent().addClass("toontalk-conditions-contents-container");
                condition_widget.render();
            },
            1);        
        if (robot.match_status === 'not matched') {
            $(condition_element).addClass("toontalk-conditions-not-matched");
        } else {
            $(condition_element).removeClass("toontalk-conditions-not-matched");
        }
        conditions_panel = TT.UTILITIES.create_horizontal_table(description, condition_element);
        $(conditions_panel).addClass("toontalk-conditions-panel");
        return conditions_panel;
    };
    var add_conditions_area = function (backside_element, robot) {
        var frontside_condition_widget = robot.get_frontside_conditions();
        var backside_conditions = robot.get_backside_conditions();
        var backside_condition_widget, area_class_name;
        if (frontside_condition_widget && $(backside_element).find(".toontalk-frontside-conditions-area").length === 0) {
            // and not already added
            backside_element.insertBefore(create_conditions_area("Runs only if the widget matches: ", 
                                                                 frontside_condition_widget, 
                                                                 robot,
                                                                 "toontalk-frontside-conditions-area"), 
                                          backside_element.firstChild);
        }
        if (backside_conditions) {
            Object.keys(backside_conditions).forEach(function (type) {
                backside_condition_widget = backside_conditions[type];
                if (backside_condition_widget) {
                    area_class_name = "toontalk-backside-" + type + "-conditions-area";
                    if ($(backside_element).find("." + area_class_name).length === 0) {
                        backside_element.insertBefore(create_conditions_area("Runs only if the " + type + " on the backside matches: ", 
                                                                             backside_condition_widget, 
                                                                             robot,
                                                                             area_class_name), 
                                                      backside_element.firstChild.nextSibling);
                        backside_condition_widget.render();
                    }
                }
            });
        }
    };
    return {
        create: function (robot) {
            var backside = TT.backside.create(robot);
            var backside_element = backside.get_element();
//             var image_url_input = TT.UTILITIES.create_text_input(robot.get_image_url(), "toontalk-image-url-input", "Image URL&nbsp;", "Type here to provide a URL for the appearance of this robot.");
            var run_once_input = TT.UTILITIES.create_check_box(!robot.get_run_once(),
                                                               "toontalk-run-once-check-box",
                                                               "When finished start again",
                                                               "Check this if you want the robot to start over again after finishing what he was trained to do.");
            var $next_robot_area = TT.UTILITIES.create_drop_area(window.TOONTALK.robot.empty_drop_area_instructions);
            var next_robot = robot.get_next_robot();
            var extra_settings = function (settings) {
                settings.appendChild(run_once_input.container);
                settings.appendChild($next_robot_area.get(0));
            }
            var standard_buttons = TT.backside.create_standard_buttons(backside, robot, extra_settings, this.create_train_button(backside, robot));
//             var infinite_stack_check_box = TT.backside.create_infinite_stack_check_box(backside, robot);
//             var image_url_change = function () {
//                 var image_url = image_url_input.button.value.trim();
//                 if (robot.set_image_url(image_url, true) && TT.robot.in_training) {
//                     TT.robot.in_training.edited(robot, {setter_name: "set_image_url",
//                                                         argument_1: image_url,
//                                                         toString: "change the image URL to " + image_url + " of the robot",
//                                                         button_selector: ".toontalk-run-once-check-box"});
//                 }
//             };
//             var input_table;
            $next_robot_area.data("drop_area_owner", robot);
            // don't do the following if already trained -- or offer to retrain?
//             standard_buttons.insertBefore(this.create_train_button(backside, robot), standard_buttons.firstChild);
//             image_url_input.button.addEventListener('change', image_url_change);
//             image_url_input.button.addEventListener('mouseout', image_url_change);
            $(run_once_input.button).click(function (event) {
                var keep_running = run_once_input.button.checked;
                robot.set_run_once(!keep_running);
                if (TT.robot.in_training) {
                    TT.robot.in_training.edited(robot, {setter_name: "set_run_once",
                                                        argument_1: !keep_running,
                                                        toString: "change to " + (keep_running ? "run again" : "run once") + " of the robot",
                                                        button_selector: ".toontalk-run-once-check-box"});
                }
                event.stopPropagation();
            });
            backside_element.appendChild(standard_buttons);
//             backside_element.appendChild(infinite_stack_check_box.container);
            if (next_robot) {
                $next_robot_area.append(next_robot.get_frontside_element());
            }
//             backside_element.appendChild($next_robot_area.get(0));
            backside.update_display = function () {
                var frontside_element = robot.get_frontside_element();
                var $containing_backside_element;
//                 $(image_url_input.button).val(robot.get_image_url());
//                 $(run_once_input.button).prop("checked", !robot.get_run_once());
                if (frontside_element) {
                    frontside_element.title = robot.get_title();
                    $containing_backside_element = $(frontside_element).closest(".toontalk-backside");
                    if ($containing_backside_element.length > 0) {
                        $containing_backside_element.data("owner").get_backside().update_run_button_disabled_attribute();
                    }                    
                }
                backside.update_run_button_disabled_attribute();
                this.display_updated();
            };
            add_conditions_area(backside_element, robot);
            return backside;
        },
        
        create_train_button: function (backside, robot) {
            var backside_element = backside.get_element();
            var $backside_element = $(backside_element);
            var $train_button = $("<button>Train</button>").button();
            $train_button.addClass("toontalk-train-backside-button");
            var training = false;
            var change_label_and_title = function () {
                if (training) {
                    $train_button.button("option", "label", "Stop training");
                    $train_button.attr("title", "Click to stop training this robot.");
                } else {
                    if (robot.get_body().is_empty()) {
                        $train_button.button("option", "label", "Train");
                        $train_button.attr("title", "Click to start training this robot.");
                    } else {
                        $train_button.button("option", "label", "Re-train");
                        $train_button.attr("title", "Click to start training this robot all over again.");
                    }
                }
                add_conditions_area(backside_element, robot);
            };
            change_label_and_title();
            $train_button.click(function (event) {
                training = !training;
                change_label_and_title();
                if (training) {
                    robot.get_body().reset_steps();
                    TT.robot.in_training = robot;
                    robot.training_started();
                } else {
                    robot.training_finished();
                    TT.robot.in_training = null;
                }
                event.stopPropagation();
            });
            return $train_button.get(0);
        }
        
    };
}(window.TOONTALK));

window.TOONTALK.robot.empty_drop_area_instructions = "Drop a robot here who will try to run when this robot can't run."