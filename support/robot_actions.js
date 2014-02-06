 /**
 * Implements ToonTalk's actions for running robots
 * Authors: Ken Kahn
 * License: New BSD
 */

window.TOONTALK.actions = 
(function () {
    "use strict";
    // public methods
    return {
        create: function () {
            var steps = [];
            var robot;
            var result = Object.create(this);
            result.get_steps = function () {
                return steps;
            };
            result.get_robot = function () {
                return robot;
            };
            result.set_robot = function (robot_parameter) {
                robot = robot_parameter;
            };
            return result;
        },
        
        add: function(step) {
            this.get_steps()[this.get_steps().length] = step;
        },
        
        run: function(context, queue) {
            var i;
            var steps = this.get_steps();
            for (i = 0; i < steps.length; i++) {
                steps[i].run(context);
            }
            this.get_robot().run(context, queue);
        }
        
    };
}());