 /**
 * Implements ToonTalk's action of a robot copying something
 * Authors: Ken Kahn
 */

window.TOONTALK.copy = 
(function () {
    "use strict";
    return {
        create: function (robot, path_or_object) {
            // delegate to share this with other actions???
            var result = Object.create(this);
            result.robot = robot;
            result.path = path_or_object;
            return result;
        },
        
        run: function (context) {
            this.robot.thing_in_hand = this.path.dereference(context).copy();
            return true;
        }

    };
}());