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
            console.log("add_listeners called");
            var home_position, drag_x_offset, drag_y_offset, tool_height, highlighted_element;

            var mouse_down = function (event) {
                // should this check which mouse button? (event.button)
                var bounding_rect = element.getBoundingClientRect();
                console.log("mouse down start");
                drag_x_offset = event.clientX - bounding_rect.left;
                drag_y_offset = event.clientY - bounding_rect.top;
                tool_height = bounding_rect.height;
                event.preventDefault();
                $(element).addClass("toontalk-tool-held");
                home_position = $(element).offset();
                document.addEventListener('mousemove', mouse_move);
                document.addEventListener('mouseup',   mouse_up);
                console.log("mouse down end");
            };

            var mouse_move = function (event) {
                console.log("mouse move start");
                var widget_under_tool = find_widget_under_tool(event);
                var new_highlighted_element;
                event.preventDefault();
                element.style.left = (event.pageX - drag_x_offset) + "px";
                element.style.top  = (event.pageY - drag_y_offset) + "px";
                if (widget_under_tool && widget_under_tool.is_of_type('top-level')) {
                    if (highlighted_element) { // remove old highlighting
                        TT.UTILITIES.remove_highlight();
                        highlighted_element = undefined;
                    }
                    console.log("mouse move end 2");
                    return;
                }
                if (widget_under_tool) {
                    new_highlighted_element = widget_under_tool.get_frontside_element();
                    if (new_highlighted_element === highlighted_element) {
                        console.log("mouse move end 3");
                        return; // no change
                    }
                }
                highlighted_element = new_highlighted_element;
                TT.UTILITIES.highlight_element(highlighted_element);
                console.log("mouse move end");
            };

            var mouse_up = function (event) {
                console.log("mouse up start");
                var widget_under_tool = find_widget_under_tool(event);
                event.preventDefault();
                if (highlighted_element) { // remove old highlighting
                    TT.UTILITIES.remove_highlight();
                }
                if (widget_under_tool && widget_under_tool.add_copy_to_container) {
                    tool.apply_tool(widget_under_tool, event);
                    widget_under_tool.backup_all();
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
                setTimeout(function () {
                               // using style.left and style.top to faciliate CSS animation
                               element.style.left = home_position.left + "px";
                               element.style.top  = home_position.top  + "px";
                    },
                    1);
                document.removeEventListener('mousemove',    mouse_move);
                document.removeEventListener('mouseup',      mouse_up);
                console.log("mouse up end");
            };

            var find_widget_under_tool = function (event) {
                console.log("find_widget_under_tool called");
                // return what is under the tool
                var element_under_tool, widget_under_tool, widget_type;
                // hide the tool so it is not under itself
                $(element).hide();
                // select using the leftmost part of tool and vertical center
                console.log("find_widget_under_tool 2");
                console.log("find_widget_under_tool 2 at point " + (event.pageX - (window.pageXOffset + drag_x_offset)) + "," + 
                                                                   (event.pageY - (window.pageYOffset + drag_y_offset)) + tool_height/2);
                 console.log("find_widget_under_tool document.elementFromPoint: " + document.elementFromPoint); 
                element_under_tool = document.elementFromPoint(event.pageX - (window.pageXOffset + drag_x_offset), (event.pageY - (window.pageYOffset + drag_y_offset)) + tool_height/2);
                console.log("find_widget_under_tool 3");
                $(element).show();
                while (element_under_tool && !element_under_tool.toontalk_widget && 
                       (!$(element_under_tool).is(".toontalk-backside") || $(element_under_tool).is(".toontalk-top-level-backside"))) {
                    // element might be a 'sub-element' so go up parent links to find ToonTalk widget
                    console.log("find_widget_under_tool 4");
                    element_under_tool = element_under_tool.parentElement;
                }
                console.log("find_widget_under_tool 53");
                if (element_under_tool) {
                    console.log("find_widget_under_tool 6");
                    widget_under_tool = element_under_tool.toontalk_widget;
                    console.log("find_widget_under_tool 6: " + widget_under_tool);
                }
                if (!widget_under_tool) {
                    console.log("find_widget_under_tool nothing");
                    return;
                }
                console.log("find_widget_under_tool 7");
                widget_type = widget_under_tool.get_type_name();
                if (widget_under_tool && widget_type === "empty hole") {
                     console.log("find_widget_under_tool 8");
                    return widget_under_tool.get_parent_of_frontside();
                }
                console.log("find_widget_under_tool 9");
                return widget_under_tool;
            };   
            console.log("add_listeners before mousedown addEventListener");         
            element.addEventListener('mousedown', mouse_down);
            console.log("add_listeners end");
       }
    };

}(window.TOONTALK));