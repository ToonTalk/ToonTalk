 /**
 * Implements ToonTalk's list of pending updates to the appearance of widgets
 * Authors: Ken Kahn
 * License: New BSD
 */

window.TOONTALK.DISPLAY_UPDATES = 
(function (TT) {
    "use strict";
    // backsides, frontsides, and widgets (typically both sides) can be 'dirty'
    var pending_updates = [];
    return {
        pending_update: function (x) {
            var i;
            if (!x.update_display) {
                return;
            }
            if (pending_updates.indexOf(x) >= 0) {
                return;
            }
            pending_updates.push(x);
        },
        
        update_display: function () {
            var i;
            for (i = 0; i < pending_updates.length; i++) {
                pending_updates[i].update_display();
            }
            pending_updates = [];
        }
    };
}(window.TOONTALK));

        