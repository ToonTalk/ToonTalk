 /**
 * Implements ToonTalk's action of a robot droping what it is holding
 * Authors: Ken Kahn
 * License: New BSD
 */

window.TOONTALK.drop_on = 
(function (TT) {
    "use strict";
    return {
        create: function (path) {
            var result = Object.create(this);
            // worth making this state private?
            // maybe not since this is more like a data structure
            result.path = path;
            return result;
        },
        
        run: function (context) {
            var target = TT.UTILITIES.dereference_path(this.path, context);
            if (target) {
                this.robot.thing_in_hand.drop_on(target);
                return true;
            }
            return false;
        },
        
        toString: function () {
            return "drop on " + this.path.toString();
        },
        
        get_json: function () {
            return {type: "drop_on_action",
                    path: this.path.get_json(),
                    };
        },
        
        create_from_json: function (json) {
            return TT.drop_on.create(TT.UTILITIES.create_from_json(json.path));
        },

    };
}(window.TOONTALK));