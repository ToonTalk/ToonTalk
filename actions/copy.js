 /**
 * Implements ToonTalk's action of a robot copying something
 * Authors: Ken Kahn
 * License: New BSD
 */

window.TOONTALK.copy = 
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
            this.robot.thing_in_hand = referenced.copy();
            return true;
        },
        
        toString: function () {
            return "copy " + this.path.toString();
        },
        
        get_json: function () {
            return {type: "copy_action",
                    path: this.path.get_json(),
                    };
        },
        
        create_from_json: function (json) {
            return TT.copy.create(TT.UTILITIES.create_from_json(json.path));
        },

    };
}(window.TOONTALK));