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
            var click_handler = function (event) {
                if ($(event.target).is('.ui-resizable-handle')) { 
                    // don't let resize events cause click response
                    // see http://stackoverflow.com/questions/5709220/how-to-cancel-click-after-resizable-events
                    return;
                }
                if (event.type === 'click' && event.which !== 1) {
                    // only left button opens it
                    return;
                }
                if ($frontside_element.is(".toontalk-top-level-resource")) {
                    widget.set_running(!widget.get_running());
                } else if (widget.get_running() && !TT.robot.in_training()) {
                    if (TT.debugging) {
                        TT.UTILITIES.display_message("Clicks on running widgets are ignored. If you wish to see its backside then stop it and click again.");
                    }
                } else {
                    widget.open_backside();
                }
                event.stopPropagation();
            };
            var visible;
            $(frontside_element).addClass("toontalk-frontside toontalk-side");
            frontside_element.toontalk_widget = widget;
//          console.log(widget + " with " + widget.debug_id + " associated with " + frontside_element.className);
            TT.UTILITIES.drag_and_drop(frontside_element);
            frontside.get_element = function () {
                return frontside_element;
            };
            frontside.get_widget = function () {
                return widget;
            };
            frontside.visible = function () {
                return visible;
            };
            frontside.set_visible = function (new_value) {
                var widget;
                if (visible === new_value) {
                    return;
                }
                visible = new_value;
                widget = this.get_widget();
                if (widget.walk_children) {
                    widget.walk_children(function (child_side) {
                                             child_side.set_visible(new_value);
                                             return true; // continue to next child
                    });
                }
            };
            // prefer addEventListener over JQuery's equivalent since when I inspect listeners I get a link to this code
            frontside_element.addEventListener('click',      click_handler);
            frontside_element.addEventListener('touchstart', click_handler);
            frontside_element.addEventListener("mouseenter", function (event) {
                var backside = widget.get_backside();
                var wiggling_widget = widget.is_empty_hole() ? wiget.get_parent_of_frontside() : widget;
                var frontside_element = wiggling_widget.get_frontside_element();
                if (backside) {
                    TT.UTILITIES.highlight_element(backside.get_element());
                }
                $(".toontalk-wiggle").removeClass("toontalk-wiggle");
                if (!$(frontside_element).is(".toontalk-top-level-resource")) {
                    $(frontside_element).addClass("toontalk-wiggle");
                }
                event.stopPropagation(); 
            });
            frontside_element.addEventListener("mouseleave", function (event) {
                var backside = widget.get_backside();
                var wiggling_widget = widget.is_empty_hole() ? wiget.get_parent_of_frontside() : widget;
//              console.log("remove " + wiggling_widget.debug_string);
                if (backside) {
                    TT.UTILITIES.remove_highlight();
                }
                $(wiggling_widget.get_frontside_element()).removeClass("toontalk-wiggle");
            });
            if (TT.debugging) {
                frontside_element.id = widget.debug_id;
            }
            return frontside;
        },
        
        update_display: function () {
            return this.get_widget().update_display();
        },
        
//         visible: function () {
//             return $(this.get_element()).is(":visible"); 
//         },
        
        remove: function () {
            // used to have debugging code that checked if was still attached
            // but when running unwatched might never have been attached
            $(this.get_element()).remove();
        }

    };
}(window.TOONTALK));