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
                newly_created_widgets = [];
            };
            new_actions.add_step = function (step, new_widget) {
                steps[steps.length] = step;
                if (new_widget) {
                    this.add_newly_created_widget(new_widget);
                }
            };
            new_actions.add_newly_created_widget = function (new_widget) {
                newly_created_widgets[newly_created_widgets.length] = new_widget;
            };
            new_actions.get_newly_created_widgets = function () {
                return newly_created_widgets;
            };
            new_actions.get_path_to = function (widget) {
                var i, j, path, sub_path, children;
                for (i = 0; i < newly_created_widgets.length; i++) {
                    if (newly_created_widgets[i] === widget) {
                        return TT.newly_created_widgets_path.create(i, new_actions);
                    } else if (newly_created_widgets[i].get_path_to) {
                        sub_path = newly_created_widgets[i].get_path_to(widget);
                        if (sub_path) {
                            path = TT.newly_created_widgets_path.create(i, new_actions);
                            path.next = sub_path;
                            return path;
                        }
                    }
                }
            };
            new_actions.dereference = function (index) {
                return newly_created_widgets[index];
            }
            return new_actions;
        },
        
        run_unwatched: function(context, queue, robot) {
            var i;
            var steps = this.get_steps();
            for (i = 0; i < steps.length; i++) {
                steps[i].run_unwatched(context, robot);
            }
            if (!robot.get_run_once()) {
                robot.get_first_in_team().run(context, queue);
            }
        },
        
        run_watched: function(context, queue, robot) {
            var steps = this.get_steps();
            var frontside_element = robot.get_frontside_element();
            var robot_start_position = $(frontside_element).position();
            var restore_after_last_event = function () {
                $(frontside_element).removeClass("toontalk-side-animating");
                robot.set_animating(false);
                if (!robot.get_run_once()) {
                    robot.get_first_in_team().run(context, queue);
                }
            };
            var run_watched_step = function (i) {
                var continuation = function (referenced) {
                    steps[i].do_step(referenced, context, robot);
                    if (robot.get_thing_in_hand()) {
                        TT.DISPLAY_UPDATES.pending_update(robot);
                    }
                    setTimeout(function () {
                        run_watched_step(i+1);
                        },
                        500); // pause between steps and give the previous step a chance to update the DOM
                };
                if (i < steps.length) {
                    steps[i].run_watched(context, robot, continuation);
                } else {
                    // restore position
                    $(frontside_element).addClass("toontalk-side-animating");
                    frontside_element.style.left = robot_start_position.left + "px";
                    frontside_element.style.top = robot_start_position.top + "px";
                    TT.UTILITIES.add_one_shot_transition_end_handler(frontside_element, restore_after_last_event);
                }
            }.bind(this);
            if (robot.get_animating()) {
                // is animating to run a step while watched
                return true;
            }
            robot.set_animating(true);
            run_watched_step(0);
            return true;             
        },
        
        toString: function () {
            var description = "";
            var i;
            var steps = this.get_steps();
            for (i = 0; i < steps.length; i++) {
                description += steps[i].toString();
                if (i === steps.length-2) {
                    description += " and \n";
                } else if (i < steps.length-2) {
                    description += ", \n";
                } else {
                    description += ".";
                }
            }
            return description;
        },
        
        get_json: function () {
            return {type: "body",
                    steps: TT.UTILITIES.get_json_of_array(this.get_steps())};
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
        create: function (index, actions) {
            return {
                dereference: function () {
                    return actions.dereference(index);
                },
                toString: function () {
                    var n = actions.get_newly_created_widgets().length - index;
                    if (n <= 0) {
                        console.log("Expected to have more newly_created_widgets than " + actions.get_newly_created_widgets().length);
                    }
                    var ordinal;
                    switch (n) {
                        case 1:
                        ordinal = "last";
                        break;
                        case 2:
                        ordinal = "second to last";
                        break;
                        case 3:
                        ordinal = "third to last";
                        break;
                        default:
                        ordinal = n + "th to last";
                    }
                    return "the " + ordinal + " widget he created";
                },
                get_json: function () {
                    return {type: "newly_created_widgets_path",
                            index: index};
                }
            };
        },
        create_from_json: function (json, ignore_view, additional_info) {
            return TT.newly_created_widgets_path.create(json.index, additional_info.body);
        }
    };
}(window.TOONTALK));