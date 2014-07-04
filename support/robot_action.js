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
        {"copy": function (widget, context, top_level_context, robot) {
            robot.add_newly_created_widget(widget.copy());
            return true;
         },
         "pick up": function (widget, context, top_level_context, robot) {
             robot.set_thing_in_hand(widget);
             return true;
         },
         "pick up a copy of": function (widget, context, top_level_context, robot) {
             var widget_copy = widget.copy();
             robot.add_newly_created_widget(widget_copy);
             robot.set_thing_in_hand(widget_copy);
             return true;
         },
         "drop it on": function (target, context, top_level_context, robot) {
             var thing_in_hand, thing_in_hand_frontside_element, context_frontside_position;
             if (target) {
                 thing_in_hand = robot.get_thing_in_hand();
                 if (thing_in_hand) {
                     if (thing_in_hand.drop_on) {
                         if (target instanceof jQuery) {
                             // e.g. dropped on top-level backside
                             thing_in_hand_frontside_element = thing_in_hand.get_frontside_element();
                             target.append(thing_in_hand_frontside_element);
                             robot.set_thing_in_hand(undefined);
                         } else {
                             if (target.visible && target.visible()) {
                                 target.render();
                             }
                             // remove it from the robot's hand since the drop can take a few seconds
                             // and we don't want to see it in the robot's hand
                             if (thing_in_hand.get_type_name() !== 'nest') {
                                 // a nest may take some time because the egg hatches
                                 // but the robot is still holding it
                                 robot.set_thing_in_hand(undefined);
                             }
                             // update this when robots can drop backsides as well
                             thing_in_hand.drop_on(target, false, undefined, robot);
//                              target.widget_dropped_on_me(thing_in_hand, false, undefined, robot);
                             robot.rerender();
                         }
                     } else {
                         console.log("Thing in robot's hand (" + thing_in_hand.toString() + ") doesn't handle 'drop_on'. Robot that " + robot.toString());
                         return false;
                     }
                     return true;
                 }
                 console.log("The robot that '" + robot.toString() + "' is executing drop_on but has nothing in its hand.");
            }
            return false;
         },
         "remove": function (widget, context, top_level_context, robot) {
             widget.remove(); 
             return true;
         },
         "edit": function (widget, context, top_level_context, robot, additional_info) {
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
         "set_erased": function (widget, context, top_level_context, robot, additional_info) {
             widget.set_erased(additional_info.erased);
             return true;
         },
         "add to the top-level backside": function (widget, context, top_level_context, robot, additional_info) {
             var context_frontside_position, widget_frontside_element, top_level_element;
             if (!robot.visible()) {
                 widget_frontside_element = widget.get_frontside_element(true);
                 context_frontside_position = $(context.get_frontside_element()).position();
                 top_level_element = $(".toontalk-top-level-backside").get(0);
                 $(widget_frontside_element).css({left: context_frontside_position.left,
                                                  top:  context_frontside_position.top});
                 top_level_element.appendChild(widget_frontside_element);
                 $(top_level_element).data("owner").add_backside_widget(widget);
                 widget.animate_to_element(top_level_element);
             }
         }
    };
    var move_robot_animation = function (widget, context, top_level_context, robot, continuation) {
        var thing_in_hand = robot.get_thing_in_hand();
        var robot_frontside_element = robot.get_frontside_element();
        var widget_frontside_element, left_offset, top_offset;
        if (widget instanceof jQuery) {
            // top-level backside
            widget = widget.data("owner");
        } else {
            if (widget.get_frontside_element) {
                widget_frontside_element = widget.get_frontside_element();
            } else if (widget.get_side_element) {
                widget_frontside_element = widget.get_side_element();
            } else {
                console.log("Unable to find element corresponding to widget " + widget);
                continuation();
                return;
            }
            left_offset = $(widget_frontside_element).width()/2;
            top_offset = $(widget_frontside_element).height()/-2;
        }
        // robots move at 1/4 pixel per millisecond for clarity
        robot.animate_to_widget(widget, continuation, .25, left_offset, top_offset);
        if (thing_in_hand) {
            // so robot displays what he's holding
            robot.render();
        }
    };
    var pick_up_animation = function (widget, context, top_level_context, robot, continuation) {
        var frontside_element = widget.get_frontside_element();
        $(frontside_element).css({width:  frontside_element.offsetWidth + "px",
                                  height: frontside_element.offsetHeight + "px"});
        move_robot_animation(widget, context, top_level_context, robot, continuation);
    };
    var drop_it_on_animation = function (widget, context, top_level_context, robot, continuation) {
        var thing_in_hand = robot.get_thing_in_hand();
        var $thing_in_hand_frontside_element, adjust_dropped_location_continuation;
        if (!thing_in_hand) {
            console.log("Expected " + robot + " to have thing_in_hand.");
            move_robot_animation(widget, context, top_level_context, robot, continuation);
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
        move_robot_animation(widget, context, top_level_context, robot, adjust_dropped_location_continuation);
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
    var button_use_animation = function (widget, context, top_level_context, robot, continuation, class_name_selector) {
        var button_element = find_backside_element(widget, class_name_selector);
        var robot_frontside_element = robot.get_frontside_element();
        var button_visible = button_element && $(button_element).is(":visible");
        var new_continuation = function () {
            continuation();
            $(button_element).addClass("ui-state-active");
            setTimeout(function () {
                    $(button_element).removeClass("ui-state-active");
                    if (!button_visible && widget.get_backside()) {
                        // restore things so button is hidden
                        widget.get_backside().hide_backside();
                    }
                },
                500);
        };
        var animation_continuation = function () {
            // robots move at 1/4 pixel per millisecond for clarity
            robot.animate_to_element(button_element, new_continuation, .25, 0, -$(robot_frontside_element).height());
        }
        if (!button_visible && widget.open_backside) {
            widget.open_backside(animation_continuation);
        } else {
            animation_continuation();
        } 
    };
    var copy_animation = function (widget, context, top_level_context, robot, continuation) {
        var new_continuation = function () {
            continuation();
            widget.add_copy_to_container(robot.get_recently_created_widget());
        };
        button_use_animation(widget, context, top_level_context, robot, new_continuation, ".toontalk-copy-backside-button");
    };
    var remove_animation = function (widget, context, top_level_context, robot, continuation) {
        button_use_animation(widget, context, top_level_context, robot, continuation, ".toontalk-remove-backside-button");
    };
    var edit_animation = function (widget, context, top_level_context, robot, continuation, additional_info) {
        var new_continuation = function () {
            var widget_backside = widget.get_backside();
            if (widget_backside) {
                // maybe this should have been created and displayed
                widget.get_backside().update_display();
            }
            continuation();
        };
        button_use_animation(widget, context, top_level_context, robot, new_continuation, additional_info.button_selector);
    };
    var watched_run_functions = 
        {"copy": copy_animation,
         "pick up": pick_up_animation,
         "pick up a copy of": move_robot_animation,
         "drop it on": drop_it_on_animation,
         "remove": remove_animation,
         "edit": edit_animation,
         "add to the top-level backside": function (widget, context, top_level_context, robot, continuation) {
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
                watched_run_function = function (referenced, context, top_level_context, robot, continuation, additional_info) {
                    setTimeout(function () {
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
            new_action.run_unwatched = function (context, top_level_context, robot) {
                var referenced = TT.path.dereference_path(path, context, top_level_context, robot);
                if (!referenced) {
                    console.log("Unable to dereference path: " + TT.path.toString(path) + " in context: " + context.toString());
                    return false;
                }
//                 console.log("running " + this + " of robot#" + robot.debug_id + " on " + referenced.debug_id);
                return unwatched_run_function(referenced, context, top_level_context, robot, additional_info);
            };
            new_action.do_step = function (referenced, context, top_level_context, robot) {
                 return unwatched_run_function(referenced, context, top_level_context, robot, additional_info);
            };
            new_action.run_watched = function (context, top_level_context, robot, continuation) {
                var referenced = TT.path.dereference_path(path, context, top_level_context, robot);
                var new_continuation = function () {
                    continuation(referenced);
                };
                if (!referenced) {
                    console.log("Unable to dereference the path: " + TT.path.toString(path) + " in context: " + context.toString());
                    return false;
                }
                return watched_run_function(referenced, context, top_level_context, robot, new_continuation, additional_info);
            };
            new_action.toString = function () {
                var action = additional_info && additional_info.toString ? additional_info.toString : action_name;
                return action + " " + TT.path.toString(path);
            };
            new_action.get_json = function (json_history) {
                return {type: "robot_action",
                        action_name: action_name,
                        path: TT.path.get_json(path, json_history),
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