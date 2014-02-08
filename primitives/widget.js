 /**
 * Implements shared methods of ToonTalk's widgets
 * Authors: Ken Kahn
 * License: New BSD
 */

/*jslint browser: true, devel: true, vars: true */

window.TOONTALK.widget = (function () {
    "use strict";

    return {
        
        add_sides_functionality: function (widget) {
            var frontside, backside;
            widget.get_frontside =
                function (create) {
                    if (create && !frontside) {
                        // all frontsides are the same
                        frontside = window.TOONTALK.frontside.create(widget);
                    }
                    return frontside;
                };
            widget.get_backside =
                function (create) {
                    if (create && !backside) {
                        // backides are customised by each kind of widget
                        backside = widget.create_backside();
                    }
                    return backside;
                };
            return widget;
        },
        
        dereference: function () {
            // is already dereferenced when used as part of a path
            return this;
        },
        
        copy: function () {
            console.assert(false, "copy not implemented");
        },
        
        equals: function (other) {
            console.assert(false, "equals not implemented");
        },
        
        match: function (context) {
            // should return 'matched', 'not-matched', or an array of nests waiting for objects to arrive
            console.assert(false, "copy not implemented");
        },
        
        drop_on: function (other, location) {
            console.assert(false, "drop_on not implemented");
        },
        
        update_display: function () {
            console.assert(false, "update_display not implemented");
        },
        
        to_HTML: function () {
            // should this be given the dimensions (in pixels) available? 
            console.assert(false, "to_HTML not implemented");
        },
        
        equals_box: function () {
            // if a box didn't respond to this then not equal
            return false;
        },
        
        equals_number: function () {
            // if a number didn't respond to this then not equal
            return false;
        },
        
        match_box: function () {
            // if a box didn't respond to this then not matched
            return 'not matched';
        },
        
        match_number: function () {
            // if a number didn't respond to this then not matched
            return 'not matched';
        },
        
        number_dropped_on_me: function (other) {
            console.assert("No handler for drop of " + this.toString() + " on " + other.toString());
        }
        
    };
}());