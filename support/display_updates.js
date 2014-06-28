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
                // already scheduled to be rendered
                return;
            }
            pending_updates.push(x);
        },
        
        update_display: function () {
            var updates = pending_updates;
            pending_updates = [];
            if (updates.length === 0) {
                // does this save the work of creating the closure in the forEach?
                return;
            }
            updates.forEach(function (pending_update) {
                var frontside_element = pending_update.get_frontside_element && pending_update.get_frontside_element();
                pending_update.update_display();
                if (frontside_element && !$(frontside_element).is(".toontalk-top-level-resource, .ui-resizable, .toontalk-bird, .toontalk-widget-on-nest, .toontalk-nest, .toontalk-plain-text-element, .toontalk-conditions-contents, .toontalk-robot, .toontalk-widget, .toontalk-held-by-robot")) {
                    // need to delay in order for the DOM to settle down with the changes caused by update_display
                    setTimeout(function () {
                            TT.UTILITIES.make_resizable($(frontside_element), pending_update);
                        },
                        1);   
                }                  
            });
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

        