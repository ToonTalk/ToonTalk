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
	var move_to_widget = function (moving_widget, target_widget) {
		// perhaps move this to widget
		var widget_element = target_widget.get_side_element();
		var mover_frontside = moving_widget.get_frontside_element();
		var widget_absolute_position = TT.UTILITIES.absolute_position($(widget_element));
		var mover_absolute_position = TT.UTILITIES.absolute_position($(mover_frontside));
		var mover_relative_position = $(mover_frontside).position();
		var remove_transition_class = function () {
			$(mover_frontside).removeClass("toontalk-side-animating");
			mover_frontside.removeEventListener("transitionend", remove_transition_class);
		};
		mover_frontside.addEventListener("transitionend", remove_transition_class);
		$(mover_frontside).addClass("toontalk-side-animating");
		mover_frontside.style.left = (mover_relative_position.left + (widget_absolute_position.left - mover_absolute_position.left)) + "px";
	    mover_frontside.style.top = (mover_relative_position.top + (widget_absolute_position.top - mover_absolute_position.top)) + "px";
	};
	var move_robot_animation = function (widget, context, robot, continuation) {
		var robot_frontside_element = robot.get_frontside_element();
		var one_shot_continuation = function () {
			continuation();
			robot_frontside_element.removeEventListener("transitionend", one_shot_continuation);
		};
		var thing_in_hand = robot.get_thing_in_hand();
		if (widget instanceof jQuery) {
			// top-level backside
			widget = widget.data("owner");
		}
		move_to_widget(robot, widget);
		if (thing_in_hand) {
			move_to_widget(thing_in_hand, widget);
		}
		robot_frontside_element.addEventListener("transitionend", one_shot_continuation);
// 		setTimeout(continuation, 3000);
	};
// 	var drop_it_on_animation = function (widget, context, robot, continuation) {
// 		var robot_frontside_element = robot.get_frontside_element();
// 		var one_shot_continuation = function () {
// 			continuation();
// 			robot_frontside_element.removeEventListener("transitionend", one_shot_continuation);
// 		};
// 		move_to_widget(robot, widget);
// 		robot_frontside_element.addEventListener("transitionend", one_shot_continuation);
// 	};
    var watched_run_functions = 
		{"pick up": move_robot_animation,
		 "pick up a copy": move_robot_animation,
		 "drop it on": move_robot_animation
	};
    return {
        create: function (path, action_name, additional_info) {
            var new_action = Object.create(this);
            var unwatched_run_function = unwatched_run_functions[action_name];
            var watched_run_function = watched_run_functions[action_name];
            if (!watched_run_function) {
                watched_run_function = function (referenced, context, robot, continuation, additional_info) {
					setTimeout(function ()  {
						unwatched_run_function(referenced, context, robot, additional_info);
						continuation();
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