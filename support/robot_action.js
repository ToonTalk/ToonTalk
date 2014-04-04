 /**
 * Implements ToonTalk's generic action of a robot
 * Authors: Ken Kahn
 * License: New BSD
 */
 
 /*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */

window.TOONTALK.robot_action = 
(function (TT) {
    "use strict";
    var run_functions =
        {"copy": function (widget, context, robot) {
                     robot.get_body().add_newly_created_widget(widget.copy(true));
                     return true;
          },
//          "copy_constant": function (widget, context, robot) {
//                               robot.set_thing_in_hand(widget.copy(true));
//                               return true;
//          },
         "pick_up": function (widget, context, robot) {
                        robot.set_thing_in_hand(widget);
                        return true;
         },
         "pick_up_copy": function (widget, context, robot) {
                             robot.set_thing_in_hand(widget.copy(true));
                             return true;
         },
         "drop_on": function (target, context, robot) {
                        var thing_in_hand;
                        if (target) {
                            thing_in_hand = robot.get_thing_in_hand();
                            if (thing_in_hand) {
                                if (thing_in_hand.drop_on) {
                                    if (target instanceof jQuery) {
                                        // e.g. dropped on top-level backside
                                        target.append(thing_in_hand.get_frontside_element());
                                    } else {
                                        thing_in_hand.drop_on(target);
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
    return {
        create: function (path, action_name, additional_info) {
            var new_action = Object.create(this);
            var run_function = run_functions[action_name];
            if (!path) {
                console.log("path undefined in " + action_name + " action");
            }
            if (!run_function) {
                console.log("no run_function for " + action_name);
            }
            new_action.run = function (context, robot) {
                var referenced = TT.path.dereference_path(path, context);
                if (!referenced) {
                    return false;
                }
                return run_function(referenced, context, robot, additional_info);
            };
            new_action.toString = function () {
                var action = additional_info && additional_info.toString ? additional_info.toString : action_name;
                return action + " " + TT.path.toString(path);
            };
            new_action.get_json = function () {
                var json = {type: "robot_action",
                            action_name: action_name,
                            path: path.get_json()
                };
                if (additional_info) {
                    json.additional_info = additional_info;
                }
                return json;                           
            };
            return new_action;  
        },
        create_from_json: function (json) {
            if (json.additional_info) {
                return TT.robot_action.create(TT.UTILITIES.create_from_json(json.path), json.action_name, json.additional_info);
            } else {
                return TT.robot_action.create(TT.UTILITIES.create_from_json(json.path), json.action_name);
            }
        }};
}(window.TOONTALK));