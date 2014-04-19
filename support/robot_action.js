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
            robot.add_newly_created_widget(widget.copy(true));
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
         "drop it on": function (target, context, robot) {
             var thing_in_hand;
             if (target) {
                 thing_in_hand = robot.get_thing_in_hand();
                 if (thing_in_hand) {
                     if (thing_in_hand.drop_on) {
                         if (target instanceof jQuery) {
                             // e.g. dropped on top-level backside
                             target.append(thing_in_hand.get_frontside_element());
                             robot.add_newly_created_widget(thing_in_hand);
                         } else {
                             thing_in_hand.drop_on(target);
                             if (target.visible()) {
                                 target.update_display();
                             }
                         }
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
             // user setter_name instead of the function itself so can be JSONified
             // could replace with function on first use if this is a performance issue
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
         }
    };
	var move_to_widget = function (widget) {
		var widget_frontside = widget.get_frontside_element();
		var robot_frontside = robot.get_frontside_element();
		var widget_absolute_position = TT.UTILITIES.absolute_position($(widget_frontside));
		var robot_absolute_position = TT.UTILITIES.absolute_position($(robot_frontside));
		var robot_relative_position = $(robot_frontside).position();
		robot_frontside.style.left = (robot_relative_position.left + (widget_absolute_position.left - robot_absolute_position.left)) + "px";
	    robot_frontside.style.top = (robot_relative_position.top + (widget_absolute_position.top - robot_absolute_position.top)) + "px";
	};
	var pick_up_animation = function (widget, context, robot, continuation) {
		this.move_to_widget(widget);
// 		robot_frontside.addEventListener("transitionend", continuation);
		setTimeout(continuation, 3500);
	};
    var watched_run_functions = 
		{"pick up": pick_up_animation,
		 "pick up a copy": pick_up_animation
	};
    return {
        create: function (path, action_name, additional_info) {
            var new_action = Object.create(this);
            var unwatched_run_function = unwatched_run_functions[action_name];
            var watched_run_function = watched_run_functions[action_name];
            if (!watched_run_function) {
                watched_run_function = function (referenced, context, robot, continuation, additional_info) {
                    unwatched_run_function(referenced, context, robot, additional_info);
                    continuation();
                }
            }
            if (!path) {
                console.log("path undefined in " + action_name + " action");
            }
            if (!unwatched_run_function) {
                console.log("no run_function for " + action_name);
            }
            new_action.run_unwatched = function (context, robot) {
                var referenced = TT.path.dereference_path(path, context);
                if (!referenced) {
			        console.log("Unable to dereference path: " + TT.path.toString(path) + " in context: " + context.toString());
                    return false;
                }
                return unwatched_run_function(referenced, context, robot, additional_info);
            };
            new_action.run_watched = function (context, robot, continuation) {
                var referenced = TT.path.dereference_path(path, context);
                if (!referenced) {
			        console.log("Unable to dereference path: " + TT.path.toString(path) + " in context: " + context.toString());
                    return false;
                }
                return watched_run_function(referenced, context, robot, continuation, additional_info);
            };
            new_action.toString = function () {
                var action = additional_info && additional_info.toString ? additional_info.toString : action_name;
                return action + " " + TT.path.toString(path);
            };
            new_action.get_json = function () {
                var json = {type: "robot_action",
                            action_name: action_name,
                            path: TT.path.get_json(path)};
                if (additional_info) {
                    json.additional_info = additional_info;
                }
                return json;                           
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