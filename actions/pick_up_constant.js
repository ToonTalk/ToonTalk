 /**
 * Implements ToonTalk's action of a robot picking up a constant object
 * Authors: Ken Kahn
 * License: New BSD
 */

window.TOONTALK.pick_up_constant = 
(function (TT) {
    "use strict";
    return {
        create: function (robot, constant_object) {
            var result = Object.create(this);
            result.robot = robot;
            result.constant_object = constant_object;
            return result;
        },
        
        run: function (context) {
            this.robot.thing_in_hand = this.constant_object;
            return true;
        }

    };
}(window.TOONTALK));