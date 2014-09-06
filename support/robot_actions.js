 /**
 * Implements ToonTalk's actions for running robots
 * Authors: Ken Kahn
 * License: New BSD
 */
 
/*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */

window.TOONTALK.actions = 
(function (TT) {
    "use strict";
    return {
        create: function (steps) {
            var new_actions = Object.create(this);
            var newly_created_widgets = [];
            if (!steps) {
                steps = [];
            }
            new_actions.copy = function () {
                return TT.actions.create(TT.UTILITIES.copy_array(steps));
            };
            new_actions.get_steps = function () {
                return steps;
            };
            new_actions.initialise_steps = function (initial_steps) {
                steps = initial_steps;
            };
            new_actions.is_empty = function () {
                return steps.length === 0;
            };
            new_actions.reset_steps = function () {
                steps = [];
                this.reset_newly_created_widgets();
            };
            new_actions.reset_newly_created_widgets = function () {
//                 console.log("reset newly_created_widgets. Length was " + newly_created_widgets.length);
                newly_created_widgets = [];
            };
            new_actions.add_step = function (step, new_widget) {
                steps.push(step);
                if (new_widget) {
                    this.add_newly_created_widget(new_widget);
                }
            };
            new_actions.add_newly_created_widget_if_new = function (new_widget) {
                // some callers don't know if the widget is really new
                if (newly_created_widgets.indexOf(new_widget) >= 0) {
                    return;
                }
                this.add_newly_created_widget(new_widget);
            };                
            new_actions.add_newly_created_widget = function (new_widget) {
                 if (TT.debugging && newly_created_widgets.indexOf(new_widget) >= 0) {
                     console.log("add_newly_created_widget called with not new widget.");
                     return;
                }
                newly_created_widgets.push(new_widget);
//                 console.log("Added " + new_widget + " (" + new_widget.debug_id + ") to list of newly_created_widgets. Length is " + newly_created_widgets.length);
            };
            new_actions.get_newly_created_widgets = function () {
                return newly_created_widgets;
            };
            new_actions.get_path_to = function (widget, robot) {
                var path, sub_path, children;
                newly_created_widgets.some(function (newly_created_widget, index) {
                    if (newly_created_widget === widget) {
                        path = TT.newly_created_widgets_path.create(index);
                        return true;
                    } else if (newly_created_widget.get_path_to) {
                        sub_path = newly_created_widget.get_path_to(widget, robot);
                        if (sub_path) {
                            path = TT.newly_created_widgets_path.create(index);
                            path.next = sub_path;
                            return true;
                        }
                    }
                });
                return path;
            };
            new_actions.dereference = function (index) {
                if (TT.debugging && !newly_created_widgets[index]) {
                    console.log("Expected to find the " + (index+1) + "th newly created widget.");
                }
                return newly_created_widgets[index];
            }
            return new_actions;
        },
        
        run_unwatched: function (context, top_level_context, queue, robot) {
            var steps = this.get_steps();
            steps.forEach(function (step) {
                step.run_unwatched(context, top_level_context, robot);
            });
            if (!robot.get_run_once()) {
                robot.get_first_in_team().run(context, top_level_context, queue);
            }
        },
        
        run_watched: function (context, top_level_context, queue, robot) {
            var steps = this.get_steps();
            var frontside_element = robot.get_frontside_element();
            var robot_start_position = $(frontside_element).position();
            var robot_parent_position = $(frontside_element.parentElement).position();
            var saved_parent_element = frontside_element.parentElement;
            var restore_after_last_event = function () {
                $(frontside_element).addClass("toontalk-side-animating");
                frontside_element.style.left = (robot_start_position.left + robot_parent_position.left) + "px";
                frontside_element.style.top  = (robot_start_position.top  + robot_parent_position.top)  + "px";
                // delay so there is some animation of returning 'home'
                setTimeout(function () {
                        // robot was added to top-level backside so z-index will work properly
                        // the following restores it
                        frontside_element.style.left = robot_start_position.left + "px";
                        frontside_element.style.top  = robot_start_position.top  + "px";
                        saved_parent_element.appendChild(frontside_element);
                        $(frontside_element).removeClass("toontalk-side-animating");
                        robot.set_animating(false);
                        if (!robot.get_run_once()) {
                            robot.get_first_in_team().run(context, top_level_context, queue);
                        }
                        robot.render();
                    },
                    1000);
            };
            var run_watched_step = function (i) {
                var continuation = function (referenced) {
                    var do_next_step = 
                        function () {
                            if (robot.wait_before_next_step) {
                                // wait a bit until OK to run
                                setTimeout(do_next_step, 500);
                            } else if (robot.visible()) {
//                                 // I inspected the elements and this ensures that the robot is on top of everything
//                                 // but at least in Chrome it isn't displayed that way in all situations            
//                                 $(frontside_element).css({"z-index": TT.UTILITIES.next_z_index()});
                                run_watched_step(i+1);
                            } else {
                                // maybe user hid the robot while running
                                // first restore robot to its 'home'
                                frontside_element.style.left = robot_start_position.left + "px";
                                frontside_element.style.top =  robot_start_position.top  + "px";
                                for (i = i+1; i < steps.length; i++) {
                                    steps[i].run_unwatched(context, top_level_context, robot);
                                }
                                if (!robot.get_run_once()) {
                                    robot.get_first_in_team().run(context, top_level_context, queue);
                                }
                            }
                    };
                    steps[i].do_step(referenced, context, top_level_context, robot);
                    if (robot.get_thing_in_hand()) {
                        robot.get_thing_in_hand().save_dimensions();
                        robot.render();
                    }
                    // pause between steps and give the previous step a chance to update the DOM
                    setTimeout(do_next_step, 500);
                };
                if (i < steps.length) {
                    steps[i].run_watched(context, top_level_context, robot, continuation);
                } else {
                    // restore position
                    restore_after_last_event();
//                     $(frontside_element).addClass("toontalk-side-animating");
//                     frontside_element.style.left = robot_start_position.left + "px";
//                     frontside_element.style.top = robot_start_position.top + "px";
//                     TT.UTILITIES.add_one_shot_event_handler(frontside_element, "transitionend", 2500, restore_after_last_event);
                }
            }.bind(this);
            if (robot.get_animating()) {
                // is animating so is running a step while watched
                return true;
            }
            robot.set_animating(true);
            run_watched_step(0);
            return true;             
        },
        
        toString: function () {
            var description = "";
            var steps = this.get_steps();
            steps.forEach(function (step, index) {
                description += step.toString();
                if (index === steps.length-2) {
                    description += " and \n";
                } else if (index < steps.length-2) {
                    description += ", \n";
                } else {
                    description += ".";
                }
            });
            return description;
        },
        
        get_json: function (json_history) {
            return {type: "body",
                    steps: TT.UTILITIES.get_json_of_array(this.get_steps(), json_history)};
        },
        
        create_from_json: function (json) {
            var actions = TT.actions.create();
            // some steps need to refer back to this (i.e. the body)
            actions.initialise_steps(TT.UTILITIES.create_array_from_json(json.steps, {body: actions}));
            return actions;
        }
        
    };
}(window.TOONTALK));

window.TOONTALK.newly_created_widgets_path =
// paths to widgets created by previous steps
(function (TT) {
    "use strict";
    return {
        create: function (index) {
            return {
                dereference: function (context, top_level_context, robot) {
                    var widget = robot.get_body().dereference(index);
                    if (this.next) {
                        // there is more to the path so compute the part of the widget referenced
                        return TT.path.dereference_path(this.next, widget, top_level_context, robot);
                    }
                    return widget;
                },
                toString: function () {
                    var ordinal;
                    switch (index) {
                        case 0:
                        ordinal = "first";
                        break;
                        case 1:
                        ordinal = "second";
                        break;
                        case 2:
                        ordinal = "third";
                        break;
                        default:
                        ordinal = (index + 1) + "th";
                    }
                    return "the " + ordinal + " widget he created";
                },
                get_json: function () {
                    return {type: "newly_created_widgets_path",
                            index: index};
                }
            };
        },
        create_from_json: function (json) {
            return TT.newly_created_widgets_path.create(json.index);
        }
    };
}(window.TOONTALK));