 /**
 * Implements ToonTalk's actions for running robots
 * Authors: Ken Kahn
 * License: New BSD
 */
 
/*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */

window.TOONTALK.actions = 
(function (TT) {
    "use strict";

    TT.creators_from_json["body"] = function (json, additional_info) {
        var actions = TT.actions.create();
        // some steps need to refer back to this (i.e. the body)
        additional_info.body = actions;
        actions.initialise_steps(TT.UTILITIES.create_array_from_json(json.steps, additional_info));
        return actions;
    };
    
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
//              console.log("Added " + new_widget + " (" + new_widget.debug_id + ") to list of newly_created_widgets. Length is " + newly_created_widgets.length);
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
                        // might be a part of a newly created widget
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
                    TT.UTILITIES.report_internal_error("Expected to find the " + TT.UTILITIES.ordinal(index) + " newly created widget.");
                }
                return newly_created_widgets[index];
            }
            return new_actions;
        },
        
        run_unwatched: function (context, top_level_context, queue, robot, step_number) {
            var steps = this.get_steps();
            var step;
            if (!step_number) {
                // step_number may already be bound if called when a watched robot was hidden while running
                step_number = 0;
            }
            robot.run_next_step = function () {
                if (step_number < steps.length) {
                    var step = steps[step_number];
                    step_number++;
                    // each step needs to call robot.run_next_step
                    step.run_unwatched(context, top_level_context, robot);
                } else {
                    robot.get_first_in_team().set_running_or_waiting(false);
                    if (robot.get_run_once()) {
                        robot.set_running(false);
                    } else {
                        robot.get_first_in_team().run(context, top_level_context, queue);
                    }
                }
            };
            robot.run_next_step(); // do first step             
        },
        
        run_watched: function (context, top_level_context, queue, robot) {
            var steps = this.get_steps();
            var frontside_element = robot.get_frontside_element();
            if (!robot.get_parent_of_frontside()) {
                // could be a 'next robot' that hasn't been opened
                context.get_backside_element().appendChild(frontside_element);
                context.add_backside_widget(robot);
                robot.update_display();        
            }
            var saved_parent_element = frontside_element.parentElement;
            var restore_after_last_event = function () {
                $(frontside_element).addClass("toontalk-side-animating");
                TT.UTILITIES.set_position_relative_to_top_level_backside($(frontside_element), robot_home);
                // delay so there is some animation of returning 'home'
                setTimeout(function () {
                        // robot was added to top-level backside so z-index will work as desired (robot on top of everything)
                        // the following restores it
                        saved_parent_element.appendChild(frontside_element);
                        TT.UTILITIES.set_absolute_position($(frontside_element), robot_home);
                        robot.set_animating(false);
                        robot.get_first_in_team().set_running_or_waiting(false);
                        if (robot.get_run_once()) {
                            robot.set_running(false);
                        } else {
                            robot.get_first_in_team().run(context, top_level_context, queue);
                        }
                        robot.render();
                    },
                    1000);
            };
            var step_number = 0;
            var robot_home = $(frontside_element).offset();
            var robot_start_position = $(frontside_element).position();
            var robot_width  = $(frontside_element).width();
            var robot_height = $(frontside_element).height();
            var $backside_element = $(frontside_element).closest(".toontalk-backside");
            var backside_rectangle = $backside_element.get(0).getBoundingClientRect();
            var top_level_position = $(frontside_element).closest(".toontalk-top-level-backside").offset();
            var context_backside = context.get_backside();
            if (robot_width === 0) {
                $(frontside_element).css({width:  '',
                                          height: ''});
                robot_width  = $(frontside_element).width();
                robot_height = $(frontside_element).height();
            }
            if (!top_level_position) {
                console.log("Unable to find top-level backside. Perhaps is 'visible' but not attached.");
                top_level_position = {left: 0, top: 0};
            }
            if (robot_home.left < backside_rectangle.left-top_level_position.left ||
                robot_home.top  < backside_rectangle.top -top_level_position.top  ||
                robot_home.left+robot_width  > backside_rectangle.right +top_level_position.left ||
                robot_home.top +robot_height > backside_rectangle.bottom+top_level_position.top) {
                // robot isn't within the backside so reset its home to bottom centre of backside parent
                robot_home = $backside_element.offset();
                robot_home.left += $backside_element.width()/2;
                robot_home.top  += $backside_element.height()-robot_height;
            }
            // store this so that if the backside is closed while it is running its position is restored
            robot.start_position = robot_start_position;
            robot.run_next_step = function () {
                if (context_backside && context_backside.visible()) {
                    // pause between steps and give the previous step a chance to update the DOM     
                    setTimeout(function () {
                            if (step_number < steps.length) {
                                var step = steps[step_number];
                                step_number++;
                                step.run_watched(context, top_level_context, robot);
                                if (robot.get_thing_in_hand()) {
                                    robot.get_thing_in_hand().save_dimensions();
                                    robot.render();
                                }
                            } else {
                                // restore position
                                restore_after_last_event();        
                            }
                        },
                        500);
                } else {
                   // e.g. user hid the robot while running
                   // first restore robot to its 'home'
                   robot.set_animating(false);
                   // since not visible using set_absolute_position to robot_home doesn't work
                   $(frontside_element).css({width:  '',
                                             height: ''});
                   // following doesn't use JQuery since it wasn't working
                   frontside_element.style.left =  robot_start_position.left+"px";
                   frontside_element.style.top  =  robot_start_position.top +"px";
                   saved_parent_element.appendChild(frontside_element);
                   this.run_unwatched(context, top_level_context, queue, robot, step_number)
                }
            }.bind(this);
            robot.set_animating(true, robot_home);
            robot.run_next_step();
            return true;             
        },
        
        toString: function (toString_info) {
            var description = "";
            var steps = this.get_steps();
            var step_descriptions = steps.map(function (step) {
                return step.toString(toString_info);
            });
            while (step_descriptions[step_descriptions.length-1] === "") {
                step_descriptions.pop();
            }
            step_descriptions.forEach(function (step_description, index) {
                description += step_description;
                if (index === step_descriptions.length-2) {
                    description += " and \n";
                } else if (index < step_descriptions.length-2) {
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
        }
        
    };

}(window.TOONTALK));

window.TOONTALK.newly_created_widgets_path =
// paths to widgets created by previous steps
(function (TT) {
    "use strict";

    TT.creators_from_json["newly_created_widgets_path"] =  function (json) {
        return TT.newly_created_widgets_path.create(json.index);
    };
    
    return {
        create: function (index) {
            return {
                dereference: function (context, top_level_context, robot) {
                    var widget = robot.get_body().dereference(index);
                    var container;
                    if (this.next) {
                        // there is more to the path so compute the part of the widget referenced
                        return TT.path.dereference_path(this.next, widget, top_level_context, robot);
                    }
                    if (this.removing_widget) {
                        container = widget.get_parent_of_frontside();
                        if (container && container.removed_from_container) {
                            robot.remove_from_container(widget, container);
                        }
                    }
                    return widget;
                },
                toString: function () {
                    return "the " + TT.UTILITIES.ordinal(index) + " new widget";
                },
                get_json: function () {
                    return {type: "newly_created_widgets_path",
                            index: index};
                }
            };
        }
        
    };

}(window.TOONTALK));