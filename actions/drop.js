 /**
 * Implements ToonTalk's action of a robot droping what it is holding
 * Authors: Ken Kahn
 * License: New BSD
 */
 
  /*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */

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
        
        run: function (context, robot) {
            var target = TT.path.dereference_path(this.path, context);
            var thing_in_hand;
            if (target) {
                thing_in_hand = robot.get_thing_in_hand();
                if (thing_in_hand) {
                    if (thing_in_hand.drop_on) {
                        thing_in_hand.drop_on(target);
                    } else {
                        console.log("Thing in robot's hand doesn't handle 'drop_on': "  + thing_in_hand.toString() + ". Robot that " + robot.toString());
                        return false;
                    }
                    return true;
                }
                console.log("The robot that " + robot.toString() + " is executing drop_on but has nothing in its hand.");
            }
            return false;
        },
        
        toString: function () {
            return "drop it on " + this.path.toString();
        },
        
        get_json: function () {
            return {type: "drop_on_action",
                    path: this.path.get_json()
                    };
        },
        
        create_from_json: function (json) {
            return TT.drop_on.create(TT.UTILITIES.create_from_json(json.path));
        }

    };
}(window.TOONTALK));