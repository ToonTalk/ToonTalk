 /**
 * Implements ToonTalk's action of a robot copying something
 * Authors: Ken Kahn
 * License: New BSD
 */

window.TOONTALK.copy = 
(function () {
    "use strict";
    return {
        create: function (robot, path) {
            var result = Object.create(this);
            result.robot = robot;
            result.path = path;
            return result;
        },
        
        run: function (context) {
            var referenced = window.TOONTALK.UTILITIES.dereference_path(this.path, context);
            if (!referenced) {
                return false;
            }
            this.robot.thing_in_hand = referenced.copy();
            return true;
        }

    };
}());