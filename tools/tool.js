 /**
 * Implements ToonTalk's code that is shared between all tools
 * Authors: Ken Kahn
 * License: New BSD
 */

/*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */

window.TOONTALK.tool = (function (TT) {
    "use strict";
    return {
        add_listeners: function (element, tool) {
            var home_position, drag_x_offset, drag_y_offset, tool_height, highlighted_element;

            var mouse_down = function (event) {
                // should this check which mouse button? (event.button)
                var bounding_rect = element.getBoundingClientRect();
                drag_x_offset = event.clientX - bounding_rect.left;
                drag_y_offset = event.clientY - bounding_rect.top;
                tool_height = bounding_rect.height;
                event.preventDefault();
                $(element).addClass("toontalk-tool-held");
                home_position = $(element).offset();
                document.addEventListener('mousemove', mouse_move);
                document.addEventListener('mouseup',   mouse_up);
            };

            var mouse_move = function (event) {
                var widget_under_tool = TT.UTILITIES.find_widget_on_page(event, element, drag_x_offset, drag_y_offset-tool_height/2);
                var new_highlighted_element, scroll_adjustment;
                var point = {};
                event.preventDefault();
                scroll_adjustment = scroll_if_needed(event);
                // using clientX and clientY so can pass event as point when appropriate
                point.clientX = event.pageX-scroll_adjustment.deltaX-drag_x_offset;
                point.clientY = event.pageY-scroll_adjustment.deltaY-drag_y_offset;
                element.style.left = point.clientX + "px";
                element.style.top  = point.clientY + "px";
                if (widget_under_tool && widget_under_tool.is_of_type('top-level')) {
                    if (highlighted_element) { // remove old highlighting
                        TT.UTILITIES.remove_highlight();
                        highlighted_element = undefined;
                    }
                    return;
                }
                if (widget_under_tool) {
                    new_highlighted_element = widget_under_tool.get_frontside_element();
                    if (new_highlighted_element === highlighted_element) {
                        return; // no change
                    }
                }
                highlighted_element = new_highlighted_element;
                TT.UTILITIES.highlight_element(highlighted_element, point);
            };

            var mouse_up = function (event) {
                var widget_under_tool = TT.UTILITIES.find_widget_on_page(event, element, drag_x_offset, drag_y_offset);
                var top_level_widget;
                event.preventDefault();
                if (highlighted_element) { // remove old highlighting
                    TT.UTILITIES.remove_highlight();
                }
                if (widget_under_tool && widget_under_tool.add_copy_to_container) {
                    // need to determine the top_level_widget first since if tool is vacuum
                    // it will be removed
                    top_level_widget = widget_under_tool.top_level_widget();
                    tool.apply_tool(widget_under_tool, event);
                    top_level_widget.backup_all();
                }
                if (!widget_under_tool && tool.nothing_under_tool) {
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
                TT.UTILITIES.set_timeout(function () {
                               // using style.left and style.top to faciliate CSS animation
                               element.style.left = home_position.left + "px";
                               element.style.top  = home_position.top  + "px";
                    });
                document.removeEventListener('mousemove',    mouse_move);
                document.removeEventListener('mouseup',      mouse_up);
            };

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
            
            element.addEventListener('mousedown', mouse_down);
       }
    };

}(window.TOONTALK));