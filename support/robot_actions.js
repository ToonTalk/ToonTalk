 /**
 * Implements ToonTalk's actions for running robots
 * Authors: Ken Kahn
 * License: New BSD
 */
 
/*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */

window.TOONTALK.actions = 
(function (TT) {
    "use strict";
    // public methods
    return {
        create: function (steps) {
            var robot;
            var result = Object.create(this);
            if (!steps) {
                steps = [];
            }
            result.get_steps = function () {
                return steps;
            };
            result.get_robot = function () {
                return robot;
            };
            result.set_robot = function (robot_parameter) {
                var i;
                robot = robot_parameter;
                for (i = 0; i < steps.length; i += 1) {
                    steps[i].robot = robot;
                }
            };
            return result;
        },
        
        add: function(step) {
            step.robot = this.get_robot();
            this.get_steps()[this.get_steps().length] = step;
        },
        
        run: function(context, queue) {
            var i;
            var steps = this.get_steps();
            for (i = 0; i < steps.length; i++) {
                steps[i].run(context);
            }
            this.get_robot().run(context, queue);
        },
        
        toString: function () {
            var description = "";
            var i;
            var steps = this.get_steps();
            for (i = 0; i < steps.length; i++) {
                description += steps[i].toString();
                if (i === steps.length-2) {
                    description += " and ";
                } else if (i < steps.length-2) {
                    description += ", ";
                }
            }
            return description;
        },
        
        get_json: function () {
            return {type: "body",
                    steps: TT.UTILITIES.get_json_of_array(this.get_steps())};
        },
        
        create_from_json: function (json) {
            return TT.actions.create(TT.UTILITIES.create_array_from_json(json.steps));
        }
        
    };
}(window.TOONTALK));