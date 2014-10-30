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
//             if (TT.debugging && x.visible && !x.visible()) {
//                 TT.UTILITIES.report_internal_error(x + " is invisible and yet is pending a display update");
//             }
            pending_updates.push(x);
        },
        
        update_display: function () {
            var updates = pending_updates;
            var ensure_childen_have_higer_z_index = function (element, z_index) {
                $(element).children().each(function (index, child_element) {
                        $(child_element).css({"z-index": z_index+1});
                        ensure_childen_have_higer_z_index(child_element, z_index+1);
                });
            }
            pending_updates = [];
            if (updates.length === 0) {
                // does this save the work of creating the closure in the forEach?
                return;
            }
            updates.forEach(function (pending_update) {
                var frontside_element = pending_update.get_frontside_element && pending_update.get_frontside_element();
                var $parent_side_element, z_index, parent_z_index;
                pending_update.update_display();
                // ensure that children have higher z-index than parent
                $parent_side_element = $(frontside_element).parent().closest(".toontalk-side");
                if ($parent_side_element.is('*')) {
                    z_index = TT.UTILITIES.get_style_numeric_property(frontside_element, 'z-index');
                    parent_z_index = TT.UTILITIES.get_style_numeric_property($parent_side_element.get(0), "z-index");
                    if (!parent_z_index) {
                        parent_z_index = TT.UTILITIES.next_z_index();
                        $parent_side_element.css({'z-index': parent_z_index});
                    }
                    if (!z_index || $parent_side_element.is(".toontalk-top-level-backside")) {
                        z_index = TT.UTILITIES.next_z_index();
                        $(frontside_element).css({'z-index': z_index});
                    } else if (z_index >= parent_z_index) {
                        z_index = parent_z_index+1;
                        $(frontside_element).css({'z-index': z_index});
                    }
                    ensure_childen_have_higer_z_index(frontside_element, z_index);
                }
                // ensure that it is resizable if appropriate
                if (frontside_element && !$(frontside_element).is(".toontalk-top-level-resource, .toontalk-bird, .toontalk-nest, .toontalk-box-hole, .toontalk-plain-text-element, .toontalk-conditions-contents, .toontalk-robot, .toontalk-widget, .toontalk-held-by-robot")) {
                    // need to delay in order for the DOM to settle down with the changes caused by update_display
                    TT.UTILITIES.set_timeout(function () {
                                   if ($parent_side_element.is('.toontalk-box-hole')) {
                                       if ($(frontside_element).is(".ui-resizable")) {
                                           $(frontside_element).resizable('destroy');
                                       }
                                   } else if (!$(frontside_element).is(".ui-resizable")) {
                                       TT.UTILITIES.make_resizable($(frontside_element), pending_update);
                                   }
                              });   
                }                  
            });
        },
        
        run_cycle_is_over: function () {
            var now = Date.now();
            if (now-time_of_last_update >= 20) {
                // every 20ms but rather than use setInterval this way
                // updates don't happen while a robot is running
                this.update_display();
                time_of_last_update = now;
            }  
        }
    };
}(window.TOONTALK));

        