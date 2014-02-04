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
            var optimized_steps = []; // when not being watched -- is this a good idea???
            var robot;
            var result = Object.create(this);
            result.get_steps = function (optimized) {
                if (optimized) {
                    return optimized_steps;
                }
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
        
        add: function(step, optimized) {
            this.get_steps(optimized)[this.get_steps().length] = step;
        },
        
        run: function(context, optimized) {
            var i;
            var steps = this.get_steps(optimized);
            for (i = 0; i < steps.length; i++) {
                steps[i].run(context);
            }
            this.get_robot().run(context);
        }
        
    };
}());