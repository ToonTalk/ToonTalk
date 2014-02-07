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
        },
        copy: function () {
            console.assert(true, "copy not implemented");
        },
        equals: function (other) {
            console.assert(true, "equals not implemented");
        },
        update_display: function () {
            console.assert(true, "update_display not implemented");
        },
        drop_on: function (other, location) {
            console.assert(true, "drop_on not implemented");
        },
        to_HTML: function () {
            console.assert(true, "to_HTML not implemented");
        },
        match: function (context) {
            console.assert(true, "copy not implemented");
        }
        
    };
}());