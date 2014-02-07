 /**
 * Implements shared methods of ToonTalk's widgets
 * Authors: Ken Kahn
 * License: New BSD
 */

/*jslint browser: true, devel: true, vars: true */

window.TOONTALK.widget = (function () {
    "use strict";

    return {
        
        dereference: function () {
            // is already dereferenced when used as part of a path
            return this;
        }
    };
}());