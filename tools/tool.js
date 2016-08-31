 /**
 * Implements ToonTalk's code that is shared between all tools
 * Authors: Ken Kahn
 * License: New BSD
 */

/*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */

window.TOONTALK.tool = (function (TT) {
    "use strict";
    // tools need to know mouse location if they are called via keyboard
    document.addEventListener('mousemove', function (event) {
        TT.tool.pageX = event.pageX;
        TT.tool.pageY = event.pageY;
    });

    return {
        add_listeners: function (element, tool) {
            var home_position, drag_x_offset, drag_y_offset, tool_height, highlighted_element;

            var pick_up = function (event) {
                var bounding_rect = element.getBoundingClientRect();
                if (tool.set_held) {
                    tool.set_held(true);
                }
                tool_height = bounding_rect.height;
                if (event) {
                    event.preventDefault();
                }
                // don't change CSS if just clicked upon (held for less than 200 milliseconds)
                setTimeout(function () {
                               // if tool doesn't support held() or is still held then change its CSS 
                               if (!tool.held || tool.held()) {
                                   $(element).addClass("toontalk-tool-held");
                               } 
                           },
                           200);
                home_position = $(element).offset();
                document.addEventListener('mousemove', mouse_move);
                document.addEventListener('touchmove', mouse_move);
                document.addEventListener('mouseup',   mouse_up);
                document.addEventListener('touchend',  mouse_up);
                // rewrite using startsWith in ECMAScript version 6
                if (TT.logging && TT.logging.indexOf('touch') === 0) {
                    TT.debugging += "\nmouse_down at " + Date.now();
                }
                // might be picked up by control key or button so need the set offsets
                // but mouse down will reset them
                drag_x_offset = 0;
                drag_y_offset = 0;
                // not sure why the tool tip doesn't go away but force it here
                $(".ui-tooltip").each(function () {
                                          $(this).hide();
                                      }); 
            };

            var mouse_down = function (event) {
                // should this check which mouse button? (event.button)
                var bounding_rect = element.getBoundingClientRect();
                if (!tool.held || !tool.held()) {
                    pick_up(event);
                }
                drag_x_offset = TT.UTILITIES.get_mouse_or_first_touch_event_attribute('clientX', event) - bounding_rect.left;
                drag_y_offset = TT.UTILITIES.get_mouse_or_first_touch_event_attribute('clientY', event) - bounding_rect.top;
            };

            var mouse_move = function (event) {
                var widget_side_under_tool = TT.UTILITIES.find_widget_side_on_page(event, element, drag_x_offset, drag_y_offset-tool_height/2);
                var new_highlighted_element, scroll_adjustment;
                var point = {};
                event.preventDefault();
                if (widget_side_under_tool && widget_side_under_tool.is_of_type("empty hole")) {
                    widget_side_under_tool = widget_side_under_tool.get_parent_of_frontside();
                }
                // not sure why the tool tip doesn't got away but force it here
                $(".ui-tooltip").each(function () {
                                          $(this).hide();
                                      });
                scroll_adjustment = scroll_if_needed(event);
                // using clientX and clientY so can pass event as point when appropriate
                point.clientX = TT.UTILITIES.get_mouse_or_first_touch_event_attribute('pageX', event) -scroll_adjustment.deltaX-drag_x_offset;
                point.clientY = TT.UTILITIES.get_mouse_or_first_touch_event_attribute('pageY', event) -scroll_adjustment.deltaY-drag_y_offset;
                element.style.left = point.clientX + "px";
                element.style.top  = point.clientY + "px";
                // rewrite using startsWith in ECMAScript version 6
                if (TT.logging && TT.logging.indexOf('touch') === 0) {
                    TT.debugging += "\nmouse_move at " + Date.now() + " now at " + element.style.left + ", " + element.style.top;
                }
                if (widget_side_under_tool && widget_side_under_tool.get_widget().is_top_level()) {
                    if (highlighted_element) { // remove old highlighting
                        TT.UTILITIES.remove_highlight();
                        highlighted_element = undefined;
                    }
                    return;
                }
                if (widget_side_under_tool) {
                    new_highlighted_element = widget_side_under_tool.get_element();
                    if (new_highlighted_element === highlighted_element) {
                        return; // no change
                    }
                }
                highlighted_element = new_highlighted_element;
                TT.UTILITIES.highlight_element(highlighted_element);
            };

            var mouse_up = function (event) {
                this.release_tool(TT.UTILITIES.find_widget_side_on_page(event, element, drag_x_offset, drag_y_offset-tool_height/2));
                event.preventDefault();
            }.bind(this);

            var scroll_if_needed = function (event) {
                var margin = 20;
                var deltaX = 0, 
                    deltaY = 0;
                if (event.clientX < margin) {
                    deltaX = -margin;
                } else if (event.clientX+margin > window.innerWidth) {
                    deltaX = margin;
                }
                if (event.clientY < margin) {
                    deltaY = -margin;
                } else if (event.clientY+margin > window.innerHeight) {
                    deltaY = margin;
                }
                window.scrollBy(deltaX, deltaY);
                return {deltaX: deltaX,
                        deltaY: deltaY};
            };

            this.release_tool = function (widget_side_under_tool) {
                // defined so that this can be called by tool "sub-classes"
                var top_level_widget;
                if (widget_side_under_tool && widget_side_under_tool.is_of_type("empty hole")) {
                    widget_side_under_tool = widget_side_under_tool.get_parent_of_frontside();
                }
                if (tool.set_held) {
                    tool.set_held(false);
                }
                if (highlighted_element) { // remove old highlighting
                    TT.UTILITIES.remove_highlight();
                }
                if (widget_side_under_tool && widget_side_under_tool.top_level_widget) {
                    // need to determine the top_level_widget first since if tool is vacuum
                    // it will be removed
                    top_level_widget = widget_side_under_tool.top_level_widget();
                    tool.apply_tool(widget_side_under_tool, event);
                    top_level_widget.backup_all();
                }
                if (!widget_side_under_tool && tool.nothing_under_tool) {
                    tool.nothing_under_tool();
                }
                $(element).removeClass("toontalk-tool-held"); 
                $(element).addClass("toontalk-tool-returning");
                // returning for one second
                TT.UTILITIES.add_one_shot_event_handler(element, "transitionend", 1000, 
                                                        function () {
                                                            $(element).removeClass("toontalk-tool-returning");                      
                                                        });
                // return animation depends upon this delay
                if (home_position) {
                    TT.UTILITIES.set_timeout(function () {
                                                 // using style.left and style.top to faciliate CSS animation
                                                 element.style.left = home_position.left + "px";
                                                 element.style.top  = home_position.top  + "px";
                                             });
                }
                document.removeEventListener('mousemove',    mouse_move);
                document.removeEventListener('touchmove',    mouse_move);
                document.removeEventListener('mouseup',      mouse_up);
                document.removeEventListener('touchend',     mouse_up);
                // rewrite using startsWith in ECMAScript version 6
                if (TT.logging && TT.logging.indexOf('touch') === 0) {
                    TT.debugging += "\nmouse_up at " + Date.now();
                    alert(TT.debugging);
                    TT.debugging = 'touch';
                }
            };
                
            
            element.addEventListener('mousedown',  mouse_down);
            element.addEventListener('touchstart', mouse_down);
            return pick_up;
       }
    };

}(window.TOONTALK));