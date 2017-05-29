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
                 if (TT.logging && TT.logging.indexOf("newly-created") >= 0) {
                     console.log("Reset newly_created_widgets. Length was " + newly_created_widgets.length);
                 }
                newly_created_widgets = [];
            };
            new_actions.add_step = function (step, new_widget) {
                if (!step) {
                    TT.UTILITIES.report_internal_error("Attempt to add an undefined step.");
                    return;
                }
                steps.push(step);
                if (new_widget) {
                    this.add_newly_created_widget_if_new(new_widget);
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
                if (TT.logging && TT.logging.indexOf("newly-created") >= 0) {
                    console.log("Added " + new_widget.to_debug_string(50) +
                                 " to list of newly_created_widgets. Length is " + newly_created_widgets.length);
                }
            };
            new_actions.is_newly_created = function (widget) {
                return newly_created_widgets.indexOf(widget) >= 0;
            };
            new_actions.get_newly_created_widgets = function () {
                return newly_created_widgets;
            };
            new_actions.get_path_to = function (widget, robot, or_any_backside_of_widget) {
                var path, sub_path, children;
                newly_created_widgets.some(function (newly_created_widget, index) {
                    // following used to be newly_created_widget.get_widget() but then path to front side when backside was manipulated and vice versa
                    if (newly_created_widget === widget || (or_any_backside_of_widget && newly_created_widget === widget)) {
                        // might be a backside of the widget that was referenced
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
            new_actions.dereference_path = function (index) {
                if (TT.debugging && !newly_created_widgets[index]) {
                    TT.UTILITIES.report_internal_error("Expected to find the " + TT.UTILITIES.ordinal(index) + " newly created widget.");
                }
                return newly_created_widgets[index];
            }
            return new_actions;
        },

        run_unwatched: function (robot, step_number) {
            var steps = this.get_steps();
            var step;
            if (TT.logging && TT.logging.indexOf('run') >= 0) {
                console.log(robot.to_debug_string(50) + " running unwatched");
            }
            if (!step_number) {
                // step_number may already be bound if called when a watched robot was hidden while running
                step_number = 0;
            }
            robot.run_next_step = function (now_visible) {
                // stopping mid-cycle can leave things that break subsequent runs (e.g. leaving extra stuff on workspace)
//                 if (this.stopped()) {
//                     return;
//                 }
                if (step_number < steps.length) {
                    var step = steps[step_number];
                    step_number++;
                    if (TT.logging && TT.logging.indexOf('event') >= 0) {
                        console.log(step + " (unwatched) at " + Date.now() + " by robot " + robot.get_name() + " " + robot._debug_id);
                    }
                    // each step needs to call robot.run_next_step
                    if (now_visible) {
                        robot.run_watched_step_end_listeners();
                        step.run_watched(robot);
                    } else {
                        step.run_unwatched(robot);
                    }
                } else if (!this.stopped()) {
                    // currently only watched robots use these listeners
                    // if that is always the case no need calling the following
                    robot.set_running_or_in_run_queue(false);
                    robot.run_body_finished_listeners();
                    if (robot.get_run_once()) {
                        robot.get_first_in_team().set_running(false);
                    } else {
                        robot.get_first_in_team().run();
                    }
                }
            };
            robot.run_next_step(); // do first step
        },

        run_watched: function (robot) {
            var steps = this.get_steps();
            var frontside_element = robot.get_frontside_element();
            var saved_parent_element = frontside_element.parentElement;
            var first_robot = robot.get_first_in_team();
            var restore_after_last_event = function () {
                var first_robot_still_visible = first_robot.visible();
                var continuation = function () {
                    // robot was added to top-level backside so z-index will work as desired (robot on top of everything)
                    // the following restores it
                    if (first_robot_still_visible) {
                        if (saved_parent_element) {
                            saved_parent_element.appendChild(frontside_element);
                            robot.set_parent_of_frontside(TT.UTILITIES.widget_side_of_element(saved_parent_element));
                        }
                        robot.set_animating(false);
                    }
                    if (first_robot === robot) {
                        TT.UTILITIES.set_absolute_position(frontside_element, robot_home);
                    } else {
                        TT.UTILITIES.set_css(frontside_element, {position: 'static'});
                        if ($home_element && $home_element.length > 0) {
                            $home_element.append(frontside_element);
                        }
                    }
                    if (robot.get_run_once()) {
                        first_robot.set_running(false);
                    } else if (robot.stopped()) {
                        $(frontside_element).removeClass(".toontalk-side-animating");
                    } else {
                        first_robot.run();
                    }
                    robot.rerender();
                };
                if (first_robot_still_visible) {
                    if (!frontside_element.parentElement && robot.get_parent_of_frontside()) {
                        // can happen if window is minimised and then restored
                        // may not have parent if stopped
                        robot.get_parent_of_frontside().get_frontside_element(true).appendChild(frontside_element);
                    }
                    TT.UTILITIES.animate_to_absolute_position(frontside_element,
                                                              robot_home,
                                                              continuation,
                                                              robot && robot.transform_animation_speed(TT.animation_settings.ROBOT_ANIMATION_SPEED));
                } else {
                    robot.set_animating(false);
                    continuation();
                    if (robot === first_robot) {
                        // put first robot back on the backside of the context
                        robot.get_context().add_backside_widget(robot);
                    }
                    $(robot.get_frontside_element()).remove();
                }
            };
            var step_number = 0;
            var robot_home         = $(frontside_element).offset();
            // need a fresh copy since robot_home will be modified later
            var robot_start_offset = $(frontside_element).offset();
            var robot_width        = $(frontside_element).width();
            var robot_height       = $(frontside_element).height();
            // only the first in team is certain to already have its frontside_element attached
            var top_level_widget = robot.get_first_in_team().top_level_widget();
            // TODO: determine if the following should be replaced by top_level_widget.get_backside(true)...
            var top_level_position = $(frontside_element).closest(".toontalk-backside-of-top-level").offset();
            var context_backside = robot.get_context().get_backside();
            var parent = robot.get_parent();
            var original_parent_element, previous_robot, previous_robot_backside_element,
                $home_element, backside_rectangle, team_member, team_member_frontside;
            if (TT.logging && TT.logging.indexOf('run') >= 0) {
                console.log(robot.to_debug_string(50) + " running watched");
            }
            previous_robot = robot.get_previous_robot();
            if (previous_robot) {
                $home_element = $(previous_robot.get_backside(true).get_next_robot_area());
            } else {
                $home_element = context_backside && $(context_backside.get_backside_element(true));
            }
            if (!TT.UTILITIES.is_attached(frontside_element) && previous_robot) {
                // could be a 'next robot' that hasn't been opened
                original_parent_element = frontside_element.parentElement;
                if (!original_parent_element && $home_element) {
                    // if no original_parent_element then find where it should be
                    original_parent_element = $home_element.get(0);
                }
                team_member = previous_robot.get_first_in_team();
                while (team_member !== robot) {
                    // open the backside to indicate where the team mate came from but remove it after a couple seconds
                    team_member.open_backside();
                    team_member.get_backside().set_advanced_settings_showing(true);
                    (function () {
                         // since team_member is updated in this loop close over the current value
                         var robot_whose_backside_was_opened = team_member;
                         setTimeout(function () {
                                        if (robot_whose_backside_was_opened.get_backside()) {
                                            robot_whose_backside_was_opened.get_backside().set_advanced_settings_showing(false);
                                            robot_whose_backside_was_opened.hide_backside();
                                        }
                                    },
                                    2000);
                    }());
                    team_member_frontside = team_member.get_frontside_element();
                    // if robot has no position use its previous_robot going back until someone has a position
                    robot_home = $(team_member_frontside).offset();
                    if (robot_home.left !== 0 && robot_home.top !== 0 && top_level_position === undefined) {
                        // update start location with a fresh copy
                        robot_start_offset = {left: robot_home.left,
                                              top:  robot_home.top};
                        top_level_position = robot_home;
                    }
                    team_member = team_member.get_next_robot();
                }
                robot.set_visible(true);
                // need the robot's element to be initialised since will start animating very soon
                robot.update_display();
                // put the robot back when finished
                // maybe a better name is add_cycle_finished_listener...
                robot.add_body_finished_listener(function () {
                                                     if (original_parent_element && TOONTALK.UTILITIES.is_attached(original_parent_element)) {
                                                         original_parent_element.appendChild(frontside_element);
                                                     } else if (!parent) {
                                                         robot.remove({do_not_remove_frontside: true});
                                                     }
                                                     // let CSS position it
                                                     $(frontside_element).css({left:      '',
                                                                               top:       '',
                                                                               position:  '',
                                                                               "z-index": ''});
                                                 });
            }
            robot.add_body_finished_listener(restore_after_last_event);
            if (robot_width === 0) {
                $(frontside_element).css({width:  '',
                                          height: ''});
                robot_width  = robot.saved_width  || $(frontside_element).width();
                robot_height = robot.saved_height || $(frontside_element).height();
            }
            if (!top_level_position) {
                top_level_position = {left: 0, top: 0};
            }
            if ($home_element && $home_element.length > 0 && TT.UTILITIES.is_attached($home_element.get(0))) {
                backside_rectangle = $home_element.get(0).getBoundingClientRect();
                if (robot_home.left < backside_rectangle.left-top_level_position.left ||
                    robot_home.top  < backside_rectangle.top -top_level_position.top ||
                    robot_home.left+robot_width  > backside_rectangle.right +top_level_position.left ||
                    robot_home.top +robot_height > backside_rectangle.bottom+top_level_position.top) {
                    // robot isn't within the backside so reset its home to bottom centre of its home element
                    robot_home = $home_element.offset();
                    robot_home.left += $home_element.width()/2;
                    robot_home.top  += $home_element.height()-robot_height;
                    robot_start_offset = robot_home;
                }
            }
            // store this so that if the backside is closed while it is running its position is restored
            robot.start_offset = robot_start_offset;
            // make sure the robot is a child of the top-level widget backside
            robot.add_to_top_level_backside();
            TT.UTILITIES.set_absolute_position(frontside_element, robot_home);
            robot.run_next_step = function () {
                if (context_backside &&
                    !document.hidden &&
                    (context_backside.visible() || TT.UTILITIES.visible_element(context_backside.get_element())) &&
                    !robot.stopped()) {
                    // TODO: determine how context_backside.visible() can be false and
                    // $(context_backside.get_element()).is(":visible") true (test-programs.html has an example)
                    // pause between steps and give the previous step a chance to update the DOM
                    setTimeout(function () {
                                   var step;
                                   robot.run_watched_step_end_listeners();
                                   if (step_number < steps.length) {
                                        step = steps[step_number];
                                        step_number++;
                                        if (TT.logging && TT.logging.indexOf('event') >= 0) {
                                            console.log(step + " (watched)");
                                        }
                                        step.run_watched(robot);
                                    } else {
                                        robot.set_running_or_in_run_queue(false);
                                        // following may finally close backside if close during cycle
                                        // so best to restore position first
                                        robot.run_body_finished_listeners();
                                    }
                               },
                               robot.transform_step_duration(TT.animation_settings.PAUSE_BETWEEN_STEPS));
                } else {
                   // e.g. user hid the robot while running the final step
                   robot.set_running_or_in_run_queue(false);
                   // first restore robot to its 'home'
                   robot.set_animating(false);
                   // since not visible using set_absolute_position to robot_home doesn't work
                   $(frontside_element).css({width:  '',
                                             height: ''});
                   frontside_element.style.transitionDuration = '';
                   if (saved_parent_element) {
                       saved_parent_element.appendChild(frontside_element);
                   }
                   this.run_unwatched(robot, step_number);
                }
            }.bind(this);
            robot.set_animating(true, robot_home);
            robot.run_next_step();
            return true;
        },

        toString: function (to_string_info) {
            var description = "";
            var steps = this.get_steps();
            var step_descriptions = steps.map(function (step) {
                return step && step.toString(to_string_info);
            });
            while (step_descriptions[step_descriptions.length-1] === "") {
                step_descriptions.pop();
            }
            step_descriptions.forEach(function (step_description, index) {
                if (!step_description) {
                    // e.g. an empty string -- ignore it
                    return;
                }
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
        get_json: function (json_history, callback, start_time, depth) {
            var json_array = [];
            var new_callback = function () {
                callback({type: "body",
                          steps: json_array},
                         start_time,
                         depth+1);
            };
            TT.UTILITIES.get_json_of_array(this.get_steps(), json_array, 0, json_history, new_callback, start_time, depth+1);
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
                dereference_path: function (robot) {
                    var widget = robot.get_body().dereference_path(index);
                    var container;
                    if (this.next) {
                        // there is more to the path so compute the part of the widget referenced
                        return TT.path.dereference_path(this.next, robot, widget);
                    }
                    if (this.removing_widget && widget) {
                        container = widget.get_parent_of_frontside();
                        if (container && container.is_hole()) {
                            container = container.get_parent_of_frontside();
                        }
                        if (container && container.removed_from_container) {
                            robot.remove_from_container(widget, container);
                        }
                    }
                    return widget;
                },
                toString: function () {
                    return "the " + TT.UTILITIES.ordinal(index) + " new widget";
                },
                get_json: function (json_history, callback, start_time, depth) {
                    callback({type: "newly_created_widgets_path",
                              index: index},
                             start_time,
                             depth+1);
                }
            };
        }

    };

}(window.TOONTALK));
