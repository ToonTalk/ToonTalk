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
        var new_box = Object.create(box);
        var contents = [];
        new_box.get_size = function () {
            return size;
        };
        new_box.set_size = function (new_size) {
            size = new_size;
            return this;
        };
        new_box.get_horizontal = function () {
            // since horizontal is a boolean should this be called is_horizontal?
            return horizontal;
        };
        new_box.set_horizontal = function (new_horizontal) {
            horizontal = new_horizontal;
            return this;
        };
        new_box.get_hole = function (n) {
            return contents[n];
        };
        new_box.set_hole = function (n, new_value) {
            contents[n] = new_value;
        };
        return new_box.add_sides_functionality(new_box);
    };
    
    box.copy = function () {
        var copy = box.create(this.get_size(), this.get_horizontal());
        var size = this.get_size();
        var i, hole;
        for (i = 0; i < size; i += 1) {
            hole = this.get_hole(i);
            if (hole) {
                copy.set_hole(i, hole.copy());
            }
        }
        if (this.erased) {
            copy.erased = this.erased;
        }
        return copy;
    };
    
    box.equals = function (other) {
        return other.equals_box(this);
    };
    
    box.equals_box = function (other_box) {
        // what should this do if either or both are erased?
        var size = this.get_size();
        var i, my_hole, pattern_hole;
        if (size != other_box.get_size()) {
            return false;
        }
        for (i = 0; i < size; i += 1) {
            my_hole = this.get_hole(i);
            pattern_hole = other_box.get_hole(i);
            if ((!my_hole && pattern_hole) || (my_hole && !pattern_hole)) {
                return false;
            }
            if (my_hole && pattern_hole && !my_hole.equals(pattern_hole)) {
                return false;
            }
        }
        return true;
    };
    
    box.match = function (context) {
        if (this.erased) {
            return context.match_with_any_box();
        }
        return context.match_with_this_box(this);
    };
    
    box.match_with_any_box = function () {
        return 'matched';
    };

    box.match_with_this_box = function (pattern_box) {
        var size = this.get_size();
        var waiting_nests = [];
        var i, my_hole, pattern_hole, hole_match;
        if (size != pattern_box.get_size()) {
            return 'not matched';
        }
        for (i = 0; i < size; i += 1) {
            pattern_hole = pattern_box.get_hole(i);
            if (pattern_hole) {
                my_hole = this.get_hole(i);
                if (!my_hole) {
                    // expected something -- not an empty hole
                    return 'not matched';
                }
                hole_match = pattern_hole.match(my_hole);
                if (hole_match === 'not matched') {
                    return 'not matched';
                }
                if (hole_match != 'matched') {
                    if (waiting_nests.length === 0) {
                        waiting_nests = hole_match;
                    } else {
                        waiting_nests = waiting_nests.concat(hole_match);
                    }
                }
            }
        }
        if (waiting_nests.length > 0) {
            return waiting_nests;
        }
        return 'matched';
    };
    
    box.toString = function () {
        var contents = "";
        var size = this.get_size();
        var i, hole;
        for (i = 0; i < size; i += 1) {
            hole = this.get_hole(i);
            contents += hole ? hole.toString() : '_';
            if (i < size - 1) {
                contents += " | ";
            }
        }
        return '[' + contents + ']';
    };
    
    box.dereference = function (path) {
        var index, hole;
        if (path) {
            index = path.get_index && path.get_index();
            if (typeof index === 'number') {
                hole = this.get_hole(index);
                return hole.dereference(path.next);
            }
            console.log("box " + this.toString() + " unable to dereference path " + path.toString());
        } else {
            return this;
        }
    };
    
    box.create_path = function (index) {
        return {
            get_index: function () {
                return index;
            },
            
            toString: function () {
                return "Box hole " + index + (this.next ? "; " + next.toString() : "");
            }
        };
    };
    
    return box;
}());