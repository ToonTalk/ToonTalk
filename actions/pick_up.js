 /**
 * Implements ToonTalk's action of a robot picking something up
 * Authors: Ken Kahn
 * License: New BSD
 */

window.TOONTALK.pick_up = 
(function (TT) {
    "use strict";
    return {
        create: function (robot, path) {
            var result = Object.create(this);
            result.robot = robot;
            result.path = path;
            return result;
        },
        
        run: function (context) {
            var referenced = TT.UTILITIES.dereference_path(this.path, context);
            if (!referenced) {
                return false;
            }
            this.robot.thing_in_hand = referenced;
            return true;
        }

    };
}(window.TOONTALK));