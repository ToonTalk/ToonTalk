 /**
 * Implements ToonTalk's action of a robot removing something
 * Authors: Ken Kahn
 * License: New BSD
 */
 
 /*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */

window.TOONTALK.remove = 
(function (TT) {
    "use strict";
    return {
        create: function (path) {
            var result = Object.create(this);
            if (!path) {
                console.log("path undefined in remove action");
            }
            result.path = path;
            return result;
        },
        
        run: function (context, robot) {
            var referenced = TT.path.dereference_path(this.path, context);
            if (!referenced) {
                return false;
            }
            referenced.remove();
            return true;
        },
        
        toString: function () {
            return "remove " + TT.path.toString(this.path);
        },
        
        get_json: function () {
            return {type: "remove_action",
                    path: this.path.get_json()
                    };
        },
        
        create_from_json: function (json) {
            return TT.remove.create(TT.UTILITIES.create_from_json(json.path));
        }

    };
}(window.TOONTALK));