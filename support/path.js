 /**
 * Implements ToonTalk's path description that refers to something in the robot's context
 * Authors: Ken Kahn
 * License: New BSD
 */

window.TOONTALK.path = 
(function () {
    "use strict";
    return {
        create: function (path) {
            var result = Object.create(this);
            result.path = path;
            return result;
        },
        
        add_path_functionality: function (path) {
            path.dereference = 
                function (context) {
                    if (this.path) {
                        return context.dereference(path);
                    }
                    // no path means entire context
                    return context;
                };
        } 

    };
}());