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
    var time_of_last_update = 0;
    return {
        pending_update: function (x) {
            if (!x.update_display) {
                return;
            }
            if (pending_updates.indexOf(x) >= 0) {
                return;
            }
            pending_updates.push(x);
        },
        
        update_display: function () {
            if (pending_updates.length === 0) {
                return;
            }
            pending_updates.forEach(function (pending_update) {
                pending_update.update_display();
            });
            pending_updates = [];
        },
        
        run_cycle_is_over: function () {
            var now = new Date().getTime();
            if (now-time_of_last_update >= 20) {
                // every 20ms but rather than use setInterval this way
                // updates don't happen while a robot is running
                this.update_display();
                time_of_last_update = now;
            }  
        }
    };
}(window.TOONTALK));

        