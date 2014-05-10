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
//             var $frontside_container = $frontside_element.parents(".toontalk-frontside:first");
            $(frontside_element).addClass("toontalk-frontside toontalk-side");
            $frontside_element.data("owner", widget);
//             console.log("frontside associated with " + widget.debug_id);
            TT.UTILITIES.drag_and_drop($frontside_element);
            frontside.get_element = function () {
                return frontside_element;
            };
            frontside.get_widget = function () {
                return widget;
            };
            frontside_element.addEventListener('click', function (event) {
                if ($(event.target).is('.ui-resizable-handle')) { 
                    // don't let resize events cause click response
                    // see http://stackoverflow.com/questions/5709220/how-to-cancel-click-after-resizable-events
                    return;
                }
                widget.open_backside();
                event.stopPropagation();
            });
            if (TT.debugging) {
                frontside_element.id = widget.debug_id;
            }
            return frontside;
        },
        
        update_display: function () {
            return this.get_widget().update_display();
        },
        
        remove: function() {
            $(this.get_element()).remove();
        }

    };
}(window.TOONTALK));