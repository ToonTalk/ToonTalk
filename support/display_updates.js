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
    var time_of_next_update = 0;
    var minimum_delay_between_updates = 50;
    var updating = false;
    var update_scheduled = false;
    return {
        pending_update: function (x) {   
            if (pending_updates.indexOf(x) >= 0) {
                // already scheduled to be rendered
                return;
            }
            pending_updates.push(x);
            this.update_display();
        },

        update_display: function () {
            var now;
            if (update_scheduled || document.hidden || pending_updates.length === 0) {
                // updated already scheduled, tab is hidden, or nothing queued
                return;
            }
            now = Date.now();
            if (now < time_of_next_update) {
                // too soon after last call
                update_scheduled = true;
                setTimeout(this.update_display_workhorse.bind(this), time_of_next_update-now);
                return;
            }
            if (updating) {
                // this has been called recursively  
                return;
            }
            update_scheduled = true;
            TT.UTILITIES.set_timeout(function () {
                // delay until others have chance to add to the queue (e.g. contents of box holes)  
                this.update_display_workhorse(now);
            }.bind(this));
        },

        update_display_workhorse: function (now) {
            var updates = pending_updates;
            var ensure_childen_have_higer_z_index = function (element, z_index) {
                $(element).children().each(function (index, child_element) {
                        if ($(child_element).is(".toontalk-side")) {
                            $(child_element).css({"z-index": z_index+1});
                            ensure_childen_have_higer_z_index(child_element, z_index+1);
                        }
                });
            };
            pending_updates = [];
            updating = true;
            update_scheduled = false;   
            time_of_next_update = (now | Date.now())+minimum_delay_between_updates;
            updates.forEach(function (pending_update) {
                var element = pending_update.get_element && pending_update.get_element();
                var $parent_side_element, z_index, parent_z_index, backside;
                if (!pending_update.visible() && !$(element).is(".toontalk-top-level-resource")) {
                    // became invisible after being queued
                    return;
                }
                // if window was hidden and then shown elements might be stuck hidden
                // perhaps worth calling the following only when needed
                $(element).show(); 
                pending_update.update_display();
                if (pending_update.get_backside) {
                    backside = pending_update.get_backside();
                    if (backside && backside.visible()) {
                        backside.update_display();
                    }
                }
                setTimeout(function () {
                               TT.UTILITIES.use_custom_tooltip(element);
                           });
                // ensure that children have higher z-index than parent (unless some children are animating)
                $parent_side_element = $(element).parent().closest(".toontalk-side");
                if ($parent_side_element.is('*') && $parent_side_element.find(".toontalk-side-animating, .toontalk-side-appearing").length === 0) {
                    z_index = TT.UTILITIES.get_style_numeric_property(element, 'z-index');
                    parent_z_index = TT.UTILITIES.get_style_numeric_property($parent_side_element.get(0), "z-index");
                    if (!parent_z_index) {
                        parent_z_index = TT.UTILITIES.next_z_index();
                        $parent_side_element.css({'z-index': parent_z_index});
                    }
                    if (!z_index || $parent_side_element.is(".toontalk-top-level-backside")) {
                        z_index = TT.UTILITIES.next_z_index();
                        $(element).css({'z-index': z_index});
                    } else if (z_index >= parent_z_index) {
                        z_index = parent_z_index+1;
                        $(element).css({'z-index': z_index});
                    }
                    ensure_childen_have_higer_z_index(element, z_index);
                }
                // ensure that it is resizable if appropriate
                if (element && !$(element).is(".toontalk-top-level-resource, .toontalk-bird, .toontalk-nest, .toontalk-box-hole, .toontalk-plain-text-element, .toontalk-conditions-contents, .toontalk-robot, .toontalk-widget, .toontalk-held-by-robot")) {
                    // need to delay in order for the DOM to settle down with the changes caused by update_display
                    TT.UTILITIES.set_timeout(function () {
                                                 if ($parent_side_element.is('.toontalk-box-hole')) {
                                                     // not resizable while in a box hole
                                                     if ($(element).is(".ui-resizable")) {
                                                         $(element).resizable('destroy');
                                                     }
                                                 } else if (!$(element).is(".ui-resizable")) {
                                                     TT.UTILITIES.make_resizable($(element), pending_update);
                                                 }
                                             });   
                }                  
            });
            updating = false;
            if (pending_updates.length > 0) {
                // new updates scheduled while running this
                update_scheduled = true;
                setTimeout(function () {
                               this.update_display_workhorse();
                           }.bind(this),
                           minimum_delay_between_updates);
            }
        }
    };
}(window.TOONTALK));

        