 /**
 * Implements ToonTalk's action of a robot copying a constant
 * Authors: Ken Kahn
 * License: New BSD
 */
 
/*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */

window.TOONTALK.copy_constant = 
(function (TT) {
    "use strict";
    return {
        create: function (robot, constant_object) {
            var result = Object.create(this);
            result.robot = robot;
            result.constant_object = constant_object;
            return result;
        },
        
        run: function (context) {
            this.robot.thing_in_hand = this.constant_object.copy();
            return true;
        },
        
        toString: function () {
            return "copy " + this.constant_object.toString();
        },
        
        get_json: function () {
            return {type: "copy_constant_action",
                    constant_object: this.constant_object.get_json()
                    };
        },
        
        create_from_json: function (json) {
            return TT.copy_constant.create(TT.UTILITIES.create_from_json(json.constant_object));
        }

    };
}(window.TOONTALK));