 /**
 * Implements ToonTalk's action of a robot droping what it is holding
 * Authors: Ken Kahn
 * License: New BSD
 */

window.TOONTALK.drop_on = 
(function () {
    "use strict";
    return {
        create: function (robot, path) {
            var result = Object.create(this);
            // worth making this state private?
            // maybe not since this is more like a data structure
            result.robot = robot;
            result.path = path;
            return result;
        },
        
        run: function (context) {
            var target = window.TOONTALK.UTILITIES.dereference_path(this.path, context);
            if (target) {
                this.robot.thing_in_hand.drop_on(target);
                return true;
            }
            return false;
        }

    };
}());