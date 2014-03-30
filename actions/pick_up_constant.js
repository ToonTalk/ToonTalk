 /**
 * Implements ToonTalk's action of a robot picking up a constant object
 * Authors: Ken Kahn
 * License: New BSD
 */
 
 /*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */

window.TOONTALK.pick_up_constant = 
(function (TT) {
    "use strict";
    return {
        create: function (constant_object) {
            var result = Object.create(this);
            result.constant_object = constant_object;
            return result;
        },
        run: function (context, robot) {
            robot.set_thing_in_hand(this.constant_object);
            return true;
        },
        toString: function () {
            return "pick up " + this.constant_object.toString();
        },
        get_json: function () {
            return {type: "pick_up_constant_action",
                    object: this.constant_object.get_json()
                    };
        },
        create_from_json: function (json) {
            return TT.pick_up_constant.create(TT.UTILITIES.create_from_json(json.object));
        }

    };
}(window.TOONTALK));