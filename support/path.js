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
        
        dereference: function (context) {
            if (this.context) {
                // to do
                return 'not yet implemented';
            }
            // no path means entire context
            return context;
        }

    };
}());