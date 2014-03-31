 /**
 * Implements ToonTalk's action of a robot picking something up
 * Authors: Ken Kahn
 * License: New BSD
 */

/*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */
 
 window.TOONTALK.pick_up = 
(function (TT) {
    "use strict";
    return {
        create: function (path) {
            var result = Object.create(this);
            result.path = path;
            return result;
        },
        
        run: function (context, robot) {
            var referenced = TT.path.dereference_path(this.path, context);
            if (!referenced) {
                return false;
            }
            robot.set_thing_in_hand(referenced);
            return true;
        },
        
        toString: function () {
            return "pick up " + TT.path.toString(this.path);
        },
        
        get_json: function () {
            return {type: "pick_up_action",
                    path: this.path.get_json && this.path.get_json()
                    };
        },
        
        create_from_json: function (json) {
            return TT.pick_up.create(TT.UTILITIES.create_from_json(json.path));
        }

    };
}(window.TOONTALK));