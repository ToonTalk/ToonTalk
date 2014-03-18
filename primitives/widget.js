 /**
 * Implements shared methods of ToonTalk's widgets
 * Authors: Ken Kahn
 * License: New BSD
 */

 /*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */

window.TOONTALK.widget = (function (TT) {
    "use strict";

    return {
        
        erasable: function (widget) {
            var erased;
            widget.get_erased = function () {
                return erased;
            };
            widget.set_erased = function (new_value) {
                erased = new_value;
            };
            return widget;
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
            var frontside = this.get_frontside && this.get_frontside(true);
            if (!frontside) {
                return;
            }
            if (update) {
                this.update_display();
            }
            return frontside.get_element();
        },
        
        dereference: function () {
            // is already dereferenced when used as part of a path
            return this;
        },
        
        add_to_json: function (json) {
            var frontside_element, backside_widgets;
            if (json) {
                if (this.get_erased()) {
                    json.erased = true;
                }
                frontside_element = this.get_frontside_element && this.get_frontside_element();
                if (frontside_element) {
                    json.width = $(frontside_element).width();
                    json.height = $(frontside_element).height();
                }
                backside_widgets = this.get_backside_widgets();
                if (backside_widgets.length > 0) {
                    json.backside_widgets = TT.UTILITIES.get_json_of_array(backside_widgets);
                }
                return json;
            } else {
                console.log("get_json not defined");
                return {};
            }
        },
        
        get_backside_widgets: function () {
            var backside = this.get_backside();
            var backside_element;
            if (!backside) {
                if (this.backside_widgets) {
                    // backside never displayed so use widgets added by copy or drop
                    return this.backside_widgets;
                }
                return [];
            }
            return backside.get_widgets();
        },
        
        set_backside_widgets: function (backside_widgets) {
            this.backside_widgets = backside_widgets;
        },
        
        add_to_copy: function (copy) {
            var backside_widgets = this.get_backside_widgets();
            if (this.get_erased()) {
                copy.set_erased(this.get_erased());
            }
            if (backside_widgets.length > 0) {
                copy.set_backside_widgets(TT.UTILITIES.copy_widgets(backside_widgets));
            }
            return copy;
        },
        
        get_type_name: function () {
            // only used for informative purposes so ignore if not overridden 
            return "";
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
        
//         to_HTML: function () {
//             // should this be given the dimensions (in pixels) available? 
//             console.assert(false, "to_HTML not implemented");
//         },
        
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