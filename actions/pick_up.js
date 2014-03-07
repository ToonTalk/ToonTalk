 /**
 * Implements ToonTalk's action of a robot picking something up
 * Authors: Ken Kahn
 * License: New BSD
 */

 /**
 * Implements ToonTalk's action of a robot picking something up
 * Authors: Ken Kahn
 * License: New BSD
 */
 
 window.TOONTALK.pick_up = 
(function (TT) {
    "use strict";
    return {
        create: function (path) {
            var result = Object.create(this);
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
        },
        
        toString: function () {
            return "pick up " + this.path.toString();
        },
        
        get_json: function () {
            return {type: "pick_up_action",
                    path: this.path.get_json(),
                    };
        },
        
        create_from_json: function (json) {
            return TT.pick_up.create(TT.UTILITIES.create_from_json(json.path));
        },

    };
}(window.TOONTALK));