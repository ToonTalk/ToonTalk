 /**
 * Implements ToonTalk's boxes
 * Authors: Ken Kahn
 * License: New BSD
 */

/*jslint browser: true, devel: true, vars: true */

window.TOONTALK.box = (function () {
    "use strict";
    
    var TT = window.TOONTALK; // for convenience and more legible code
    var box = Object.create(TT.widget);

    box.create = function (size, horizontal) {
        var box = Object.create(box);
        box.get_size = function () {
            return size;
        };
        box.set_size = function (new_size) {
            size = new_size;
            return this;
        };
        box.get_horizontal = function () {
            return horizontal;
        };
        box.set_horizontal = function (new_horizontal) {
            horizontal = new_horizontal;
            return this;
        };
        
    };
    return box;
}());