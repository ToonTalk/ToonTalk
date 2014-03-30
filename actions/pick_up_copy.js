 /**
 * Implements ToonTalk's action of a robot copying something that ends up in its 'hand'
 * Authors: Ken Kahn
 * License: New BSD
 */
 
 /*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */

window.TOONTALK.pick_up_copy = 
(function (TT) {
    "use strict";
    return {
        create: function (path) {
            var result = Object.create(this);
            if (!path) {
                console.log("path undefined in pick_up_copy action");
            }
            result.path = path;
            return result;
        },
        
        run: function (context, robot) {
            var referenced = TT.path.dereference_path(this.path, context);
            if (!referenced) {
                return false;
            }
            robot.set_thing_in_hand(referenced.copy(true));
            return true;
        },
        
        toString: function () {
            return "pick_up_copy " + this.path.toString();
        },
        
        get_json: function () {
            return {type: "pick_up_copy_action",
                    path: this.path.get_json()
                    };
        },
        
        create_from_json: function (json) {
            return TT.pick_up_copy.create(TT.UTILITIES.create_from_json(json.path));
        }

    };
}(window.TOONTALK));