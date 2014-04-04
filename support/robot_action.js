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
        };            
    return {
        create: function (path, action_name) {
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
                return run_function(referenced, context, robot);
            };
            new_action.toString = function () {
                return action_name + " " + TT.path.toString(path);
            };
            new_action.get_json = function () {
                return {type: "robot_action",
                        action_name: action_name,
                        path: path.get_json()
                        };
            };
            return new_action;  
        },
        create_from_json: function (json) {
            return TT.robot_action.create(TT.UTILITIES.create_from_json(json.path), json.action_name);
        }};
}(window.TOONTALK));