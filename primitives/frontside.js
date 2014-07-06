 /**
 * Implements ToonTalk's frontside of a widget
 * Authors: Ken Kahn
 * License: New BSD
 */
 
/*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */

window.TOONTALK.frontside = 
(function (TT) {
    "use strict";
    return {
        create: function (widget) {
            // where widget is a ToonTalk widget like a number or a box
            var frontside = Object.create(this);
            var frontside_element = document.createElement('div');
            var $frontside_element = $(frontside_element);
            var close_handler = function (event) {
                if (widget.remove) {
                    if (TT.robot.in_training) {
                        TT.robot.in_training.removed(widget);
                    }
                    widget.remove(event);
                    TT.UTILITIES.backup_all();
                } // else warn??
                event.stopPropagation();
            };
            var close_button;
            $(frontside_element).addClass("toontalk-frontside toontalk-side");
            $frontside_element.data("owner", widget);
//          console.log("frontside associated with " + widget.debug_id);
            TT.UTILITIES.drag_and_drop($frontside_element);
            frontside.get_element = function () {
                if (frontside_element && !close_button && $(frontside_element).is(":visible") && widget.close_button_ok(frontside_element)) {
                    // wait for DOM to settle down
                        setTimeout(function () {
                            if (close_button) {
                                // was triggered multiple times
                                return;
                            }
                            close_button = TT.UTILITIES.create_close_button(close_handler, "Click to remove this " + widget.get_type_name() + ".");
                            frontside_element.appendChild(close_button);
                            $(close_button).hide(); // until hover over widget
                        },
                        1);        
                }
                return frontside_element;
            };
            frontside.get_widget = function () {
                return widget;
            };
            // prefer addEventListener over JQuery's since when I inspect listeners I get a link to this code
            frontside_element.addEventListener('click', function (event) {
                if ($(event.target).is('.ui-resizable-handle')) { 
                    // don't let resize events cause click response
                    // see http://stackoverflow.com/questions/5709220/how-to-cancel-click-after-resizable-events
                    return;
                }
                if ($frontside_element.is(".toontalk-top-level-resource")) {
                    widget.set_running(!widget.get_running());
                } else {
                    widget.open_backside();
                }
                event.stopPropagation();
            });
            frontside_element.addEventListener("mouseover", function (event) {
                var backside = widget.get_backside();
                if (backside) {
                    $(backside.get_element()).addClass("toontalk-highlight");
                }
                $(close_button).show();
            });
            frontside_element.addEventListener("mouseout", function (event) {
                var backside = widget.get_backside();
                if (backside) {
                    $(backside.get_element()).removeClass("toontalk-highlight");
                }
                $(close_button).hide();
            });
            if (TT.debugging) {
                frontside_element.id = widget.debug_id;
            }
            return frontside;
        },
        
        update_display: function () {
            return this.get_widget().update_display();
        },
        
        visible: function () {
            return $(this.get_element()).is(":visible"); 
        },
        
        remove: function() {
            $(this.get_element()).remove();
        }

    };
}(window.TOONTALK));