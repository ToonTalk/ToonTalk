 /**
 * Implements ToonTalk's list of updates to the HTML of elements
 * Authors: Ken Kahn
 */

window.TOONTALK.DISPLAY_UPDATES = 
(function () {
    "use strict";
    var dirty_numbers = [];
    var dirty_backsides = [];
    return {
        add_dirty_number: function (number) {
            var i;
            for (i = 0; i < dirty_numbers.length; i += 1) {
                if (dirty_numbers[i].get_frontside() === number.get_frontside()) {
                    return;
                }
            }
            dirty_numbers.push(number);
        },
        
        add_dirty_backside: function (backside) {
            var i;
            for (i = 0; i < dirty_backsides.length; i += 1) {
                if (dirty_backsides[i] === backside) {
                    return;
                }
            }
            dirty_backsides.push(backside);
        },
        
        update_display: function () {
            var i;
            for (i = 0; i < dirty_numbers.length; i += 1) {
                dirty_numbers[i].update_display();
            }
            dirty_numbers = [];
            for (i = 0; i < dirty_backsides.length; i += 1) {
                dirty_backsides[i].update_display();
            }
            dirty_backsides = [];
        }
    };
}());

        