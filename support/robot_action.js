 /**
 * Implements ToonTalk's generic action of a robot
 * Authors: Ken Kahn
 * License: New BSD
 */
 
 /*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */

window.TOONTALK.robot_action = 
(function (TT) {
    "use strict";
    var unwatched_run_functions =
        {"copy": function (widget, context, robot) {
            robot.add_newly_created_widget(widget.copy());
            return true;
         },
         "pick up": function (widget, context, robot) {
             robot.set_thing_in_hand(widget);
             return true;
         },
         "pick up a copy": function (widget, context, robot) {
             var widget_copy = widget.copy();
             robot.add_newly_created_widget(widget_copy);
             robot.set_thing_in_hand(widget_copy);
             return true;
         },
         "drop it on": function (target_element, context, robot) {
             var thing_in_hand, thing_in_hand_frontside_element, context_frontside_position;
             if (target_element) {
                 thing_in_hand = robot.get_thing_in_hand();
                 if (thing_in_hand) {
                     if (thing_in_hand.drop_on) {
                         if (target_element instanceof jQuery) {
                             // e.g. dropped on top-level backside
                             thing_in_hand_frontside_element = thing_in_hand.get_frontside_element();
                             target_element.append(thing_in_hand_frontside_element);
                         } else {
                             if (target_element.visible && target_element.visible()) {
                                 TT.DISPLAY_UPDATES.pending_update(target_element);
                             }
                             thing_in_hand.drop_on(target_element);
                         }
                         robot.set_thing_in_hand(undefined);
                     } else {
                         console.log("Thing in robot's hand doesn't handle 'drop_on': "  + thing_in_hand.toString() + ". Robot that " + robot.toString());
                         return false;
                     }
                     return true;
                 }
                 console.log("The robot that " + robot.toString() + " is executing drop_on but has nothing in its hand.");
            }
            return false;
         },
         "remove": function (widget, context, robot) {
             widget.remove(); 
             return true;
         },
         "edit": function (widget, context, robot, additional_info) {
             // uses setter_name instead of the function itself so can be JSONified
             // could replace with function on first use if this is a performance issue
             if (!widget[additional_info.setter_name]) {
                 console.log(widget + " can be edited.");
                 return;
             }
             if (additional_info.argument_2) {
                 widget[additional_info.setter_name].call(widget, additional_info.argument_1, additional_info.argument_2, widget.visible());
             } else {
                 widget[additional_info.setter_name].call(widget, additional_info.argument_1, widget.visible());
             }
             return true;
         },
         "set_erased": function (widget, context, robot, additional_info) {
             widget.set_erased(additional_info.erased);
             return true;
         },
         "add to the top-level backside": function (widget, context, robot, additional_info) {
             var context_frontside_position, widget_frontside_element, top_level_element;
             if (!robot.visible()) {
                 widget_frontside_element = widget.get_frontside_element(true);
                 context_frontside_position = $(context.get_frontside_element()).position();
                 top_level_element = $(".toontalk-top-level-backside").get(0);
                 $(widget_frontside_element).css({left: context_frontside_position.left,
                                                  top:  context_frontside_position.top});
                 top_level_element.appendChild(widget_frontside_element);
                 $(top_level_element).data("owner").add_backside_widget(widget);
                 // pick a random spot to move to within the top-level element
                 widget.animate_to_element(top_level_element);
             }
         }
    };
    var move_robot_animation = function (widget, context, robot, continuation) {
        var thing_in_hand = robot.get_thing_in_hand();
        var robot_frontside_element = robot.get_frontside_element();
        var left_offset, top_offset;
        if (widget instanceof jQuery) {
            // top-level backside
            widget = widget.data("owner");
        } else {
            left_offset = 0;
            top_offset = -$(robot_frontside_element).height();
        }
        robot.animate_to_widget(widget, continuation, left_offset, top_offset);
        if (thing_in_hand) {
            // so robot displays what he's holding
            TT.DISPLAY_UPDATES.pending_update(robot);
        }
    };
    var pick_up_animation = function (widget, context, robot, continuation) {
        var frontside_element = widget.get_frontside_element();
        $(frontside_element).css({width:  frontside_element.offsetWidth + "px",
                                  height: frontside_element.offsetHeight + "px"});
        move_robot_animation(widget, context, robot, continuation);
    };
    var drop_it_on_animation = function (widget, context, robot, continuation) {
        var thing_in_hand = robot.get_thing_in_hand();
        var $thing_in_hand_frontside_element, adjust_dropped_location_continuation;
        if (!thing_in_hand) {
            console.log("Expected " + robot + " to have thing_in_hand.");
            move_robot_animation(widget, context, robot, continuation);
            return;
        }
        $thing_in_hand_frontside_element = $(thing_in_hand.get_frontside_element());
        adjust_dropped_location_continuation = function () {
            var thing_in_hand_position = $thing_in_hand_frontside_element.offset();
            $thing_in_hand_frontside_element.removeClass("toontalk-held-by-robot");
            continuation();
            if ($thing_in_hand_frontside_element.is(":visible")) {
                TT.UTILITIES.set_absolute_position($thing_in_hand_frontside_element, thing_in_hand_position);
            }
        };
        move_robot_animation(widget, context, robot, adjust_dropped_location_continuation);
    };
    var find_sibling = function (widget, class_name_selector) {
        // move this to UTILITIES?
        var frontside_element = widget.get_frontside_element(true);
        var $container_element = $(frontside_element).closest(".toontalk-backside");
        return $container_element.find(class_name_selector).get(0);
    };
    var find_backside_element = function (widget, class_name_selector) {
        var backside_element = widget.get_backside_element(true);
        return $(backside_element).find(class_name_selector).get(0);
    };
    var button_use_animation = function (widget, context, robot, continuation, class_name_selector) {
        var button_element = find_backside_element(widget, class_name_selector);
        var robot_frontside_element = robot.get_frontside_element();
        var new_continuation = function () {
            continuation();
            $(button_element).addClass("ui-state-active");
            setTimeout(function () {
                $(button_element).removeClass("ui-state-active");
                },
                500);
        };
        robot.animate_to_element(button_element, new_continuation, 0, -$(robot_frontside_element).height());
    };
    var copy_animation = function (widget, context, robot, continuation) {
        var new_continuation = function () {
            continuation();
            widget.add_copy_to_container(robot.get_recently_created_widget());
        };
        button_use_animation(widget, context, robot, new_continuation, ".toontalk-copy-backside-button");
    };
    var remove_animation = function (widget, context, robot, continuation) {
        button_use_animation(widget, context, robot, continuation, ".toontalk-remove-backside-button");
    };
    var edit_animation = function (widget, context, robot, continuation, additional_info) {
        var new_continuation = function () {
            var widget_backside = widget.get_backside();
            if (widget_backside) {
                // maybe this should have been created and displayed
                widget.get_backside().update_display();
            }
            continuation();
        };
        button_use_animation(widget, context, robot, new_continuation, additional_info.button_selector);
    };
    var watched_run_functions = 
        {"copy": copy_animation,
         "pick up": pick_up_animation,
         "pick up a copy": move_robot_animation,
         "drop it on": drop_it_on_animation,
         "remove": remove_animation,
         "edit": edit_animation,
         "add to the top-level backside": function (widget, context, robot, continuation) {
             // do nothing -- this action is only needed if unwatched
             continuation();
         } 
    };
    return {
        create: function (path, action_name, additional_info) {
            var new_action = Object.create(this);
            var unwatched_run_function = unwatched_run_functions[action_name];
            var watched_run_function = watched_run_functions[action_name];
            if (!watched_run_function) {
                watched_run_function = function (referenced, context, robot, continuation, additional_info) {
                    setTimeout(function ()  {
//                         unwatched_run_function(referenced, context, robot, additional_info);
                        continuation(referenced);
                        },
                        3000);
                };
            }
            if (!path) {
                console.log("path undefined in " + action_name + " action");
            }
            if (!unwatched_run_function) {
                console.log("no run_function for " + action_name);
            }
            new_action.run_unwatched = function (context, robot) {
                var referenced = TT.path.dereference_path(path, context, robot);
                if (!referenced) {
                    console.log("Unable to dereference path: " + TT.path.toString(path) + " in context: " + context.toString());
                    return false;
                }
                return unwatched_run_function(referenced, context, robot, additional_info);
            };
            new_action.do_step = function (referenced, context, robot) {
                 return unwatched_run_function(referenced, context, robot, additional_info);
            };
            new_action.run_watched = function (context, robot, continuation) {
                var referenced = TT.path.dereference_path(path, context, robot);
                var new_continuation = function () {
                    continuation(referenced);
                };
                if (!referenced) {
                    console.log("Unable to dereference the path: " + TT.path.toString(path) + " in context: " + context.toString());
                    return false;
                }
                return watched_run_function(referenced, context, robot, new_continuation, additional_info);
            };
            new_action.toString = function () {
                var action = additional_info && additional_info.toString ? additional_info.toString : action_name;
                return action + " " + TT.path.toString(path);
            };
            new_action.get_json = function () {
                return {type: "robot_action",
                        action_name: action_name,
                        path: TT.path.get_json(path),
                        additional_info: additional_info};        
            };
            return new_action;  
        },
        create_from_json: function (json, ignore_view, additional_info) {
            if (json.additional_info) {
                return TT.robot_action.create(TT.path.create_from_json(json.path, additional_info), json.action_name, json.additional_info);
            } else {
                return TT.robot_action.create(TT.path.create_from_json(json.path, additional_info), json.action_name);
            }
        }};
}(window.TOONTALK));