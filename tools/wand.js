 /**
 * Implements ToonTalk's magic wand used for copying widgets
 * Authors: Ken Kahn
 * License: New BSD
 */

/*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */

window.TOONTALK.wand = (function (TT) {
    "use strict";

    var wand_instance = Object.create(TT.tool);

    var element, home_position, drag_x_offset, drag_y_offset, highlighted_element;

    var mouse_move = function (event) {
        var widget_under_tool = find_widget_under_tool();
        var new_highlighted_element;
        event.preventDefault();
        element.style.left = (event.clientX - drag_x_offset) + "px";
        element.style.top  = (event.clientY - drag_y_offset) + "px";
        if (widget_under_tool) {
            new_highlighted_element = widget_under_tool.get_frontside_element();
            if (new_highlighted_element === highlighted_element) {
                return; // no change
            }
        }
        if (highlighted_element) { // remove old highlighting
            TT.UTILITIES.remove_highlight_from_element(highlighted_element);
        }
        highlighted_element = new_highlighted_element;
        TT.UTILITIES.highlight_element(highlighted_element);
    };

    var find_widget_under_tool = function () {
        // return what is under the tool not counting the tool itself)
        var element_under_tool, widget_under_tool, widget_type;
        // hide the tool so it is not under itself
        $(element).hide();
        element_under_tool = document.elementFromPoint(event.pageX - drag_x_offset, event.pageY - drag_y_offset);
        $(element).show();
        while (element_under_tool && !element_under_tool.toontalk_widget) {
            // element might be a 'sub-element' so go up parent links to find ToonTalk widget
            element_under_tool = element_under_tool.parentElement;
        }
        if (element_under_tool) {
            widget_under_tool = element_under_tool.toontalk_widget;
        }
        if (!widget_under_tool) {
            return;
        }
        widget_type = widget_under_tool.get_type_name();
        if (widget_type === 'top-level') {
            return;
        }
        if (widget_under_tool && widget_type === "empty hole") {
            return widget_under_tool.get_parent_of_frontside().widget;
        }
        return widget_under_tool;
    };

    var mouse_up = function (event) {
        var widget_under_tool = find_widget_under_tool();
        event.preventDefault();
        if (highlighted_element) { // remove old highlighting
            TT.UTILITIES.remove_highlight_from_element(highlighted_element);
        }
        $(element).addClass("toontalk-tool-returning");    
        if (widget_under_tool && widget_under_tool.add_copy_to_container) {
            wand_instance.apply_tool(widget_under_tool);
            TT.UTILITIES.backup_all();
        }
        // using style.left and style.top to faciliate CSS animation
        element.style.left = home_position.left + "px";
        element.style.top  = home_position.top  + "px";
        document.removeEventListener('mousemove',    mouse_move);
        document.removeEventListener('mouseup',      mouse_up);
    };

    wand_instance.apply_tool = function (widget) {
        widget.add_copy_to_container();
    };

    wand_instance.get_element = function () {
        if (!element) {
            element = document.createElement("div");
            $(element).addClass("toontalk-wand");
        }
        element.title = "Drag this magic wand over the thing you want to copy.";
        element.addEventListener('mousedown', function (event) {
            // should I check which mouse button? (event.button)
            var bounding_rect = element.getBoundingClientRect();
            drag_x_offset = event.clientX - bounding_rect.left;
            drag_y_offset = event.clientY - bounding_rect.top;
            event.preventDefault();
            $(element).removeClass("toontalk-tool-returning");
            home_position = $(element).offset();
            document.addEventListener('mousemove',    mouse_move);
            document.addEventListener('mouseup',      mouse_up);
        });
        return element;
    };

    return {create_from_json: function () {
                                  return wand_instance;
                              },
            instance: wand_instance};

}(window.TOONTALK));