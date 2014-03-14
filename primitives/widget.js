 /**
 * Implements shared methods of ToonTalk's widgets
 * Authors: Ken Kahn
 * License: New BSD
 */

 /*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */

window.TOONTALK.widget = (function (TT) {
    "use strict";
    
    var erased;

    return {
        
        get_erased: function () {
            return erased;
        },
        
        set_erased: function (new_value) {
            erased = new_value;
        },
        
        add_sides_functionality: function (widget) {
            var frontside, backside;
            widget.get_frontside =
                function (create) {
                    if (create && !frontside) {
                        // all frontsides are the same
                        frontside = TT.frontside.create(widget);
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
            widget.forget_backside =
                function () {
                    backside = undefined;
                };
            return widget;
        },
        
        remove: function () {
            var backside = this.get_backside();
            var frontside = this.get_frontside();
            if (backside) {
                backside.remove();
            }
            if (frontside) {
                frontside.remove();
            }
        },
        
        get_frontside_element: function (update) {
            var frontside = this.get_frontside(true);
            if (update) {
                this.update_display();
            }
            return frontside.get_element();
        },
        
        dereference: function () {
            // is already dereferenced when used as part of a path
            return this;
        },
        
        get_json: function (json) {
            if (json) {
                if (this.get_erased()) {
                    json.erased = true;
                }
                return json;
            } else {
                console.log("get_json not defined");
                return {};
            }
        },
        
        copy: function () {
            console.assert(false, "copy not implemented");
        },
        
        visible: function () {
            var frontside = this.get_frontside();
            if (!frontside) {
               return false;
            }
            return $(frontside.get_element()).is(":visible");
        },
        
        equals: function (other) {
            console.assert(false, "equals not implemented");
        },
        
        match: function (context) {
            // should return 'matched', 'not-matched', or an array of nests waiting for objects to arrive
            console.assert(false, "copy not implemented");
        },
        
        drop_on: function (other, side_of_other, event) {
            console.log("drop_on not implemented; this is " + this.toString() + " and other is " + other.toString());
            return false;
        },
                   
        removed: function (part) {
            // part should be a ToonTalk widget that is part of this
            console.log("removed not implemented");
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
        }
        
    };
}(window.TOONTALK));