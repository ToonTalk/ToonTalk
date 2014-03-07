 /**
 * Implements ToonTalk's list of updates to the HTML of elements
 * Authors: Ken Kahn
 * License: New BSD
 */

window.TOONTALK.DISPLAY_UPDATES = 
(function (TT) {
    "use strict";
    // for now only backsides and frontsides can be 'dirty'
    var dirty_sides = [];
    return {
        add_dirty_side: function (side) {
            var i;
            if (!side.update_display) {
                return;
            }
            for (i = 0; i < dirty_sides.length; i += 1) {
                if (dirty_sides[i] === side) {
                    return;
                }
            }
            dirty_sides.push(side);
        },
        
        update_display: function () {
            var i;
            for (i = 0; i < dirty_sides.length; i += 1) {
                dirty_sides[i].update_display();
            }
            dirty_sides = [];
        }
    };
}(window.TOONTALK));

        