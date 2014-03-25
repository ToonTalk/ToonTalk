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
            var new_actions = Object.create(this);
            if (!steps) {
                steps = [];
            }
            new_actions.copy = function () {
                return TT.actions.create(TT.UTILITIES.copy_array(steps));
            };
            new_actions.get_steps = function () {
                return steps;
            };
            new_actions.is_empty = function () {
                return steps.length === 0;
            };
            new_actions.reset_steps = function () {
                steps = [];
            };
            new_actions.add_step = function (step) {
                step.robot = robot;
                steps[steps.length] = step;
            };
            new_actions.get_robot = function () {
                return robot;
            };
            new_actions.set_robot = function (robot_parameter) {
                var i;
                robot = robot_parameter;
                for (i = 0; i < steps.length; i += 1) {
                    steps[i].robot = robot;
                }
            };
            return new_actions;
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