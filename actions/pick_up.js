 /**
 * Implements ToonTalk's action of a robot picking something up
 * Authors: Ken Kahn
 */

window.TOONTALK.pick_up = 
(function () {
    "use strict";
    return {
        create: function (robot, path_or_object) {
            var result = Object.create(this);
            result.robot = robot;
            result.path = path_or_object;
            return result;
        },
        
        run: function (context) {
            this.robot.thing_in_hand = this.path.dereference(context);
            return true;
        }

    };
}());