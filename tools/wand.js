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
        var widget_under_wand_tip = find_widget_under_wand();
        var new_highlighted_element;
        event.preventDefault();
        element.style.left = (event.clientX - drag_x_offset) + "px";
        element.style.top  = (event.clientY - drag_y_offset) + "px";
        if (widget_under_wand_tip) {
            new_highlighted_element = widget_under_wand_tip.get_frontside_element();
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

    var find_widget_under_wand = function () {
        // what is under the wand top (not counting the wand itself)
        var element_under_wand_tip, widget_under_wand_tip, widget_type;
        // hide the wand so it is under itself
        $(element).hide();
        element_under_wand_tip = document.elementFromPoint(event.pageX - drag_x_offset, event.pageY - drag_y_offset);
        $(element).show();
        while (element_under_wand_tip && !element_under_wand_tip.toontalk_widget) {
            // element might be a 'sub-element' so go up parent links to find ToonTalk widget
            element_under_wand_tip = element_under_wand_tip.parentElement;
        }
        if (element_under_wand_tip) {
            widget_under_wand_tip = element_under_wand_tip.toontalk_widget;
        }
        if (!widget_under_wand_tip) {
            return;
        }
        widget_type = widget_under_wand_tip.get_type_name();
        if (widget_type === 'top-level') {
            return;
        }
        if (widget_under_wand_tip && widget_type === "empty hole") {
            return widget_under_wand_tip.get_parent_of_frontside().widget;
        }
        return widget_under_wand_tip;
    };

    var mouse_up = function (event) {
        var widget_under_wand_tip = find_widget_under_wand();
        event.preventDefault();
        if (highlighted_element) { // remove old highlighting
            TT.UTILITIES.remove_highlight_from_element(highlighted_element);
        }
        $(element).addClass("toontalk-wand-returning");    
        if (widget_under_wand_tip && widget_under_wand_tip.add_copy_to_container) {
            widget_under_wand_tip.add_copy_to_container();
            TT.UTILITIES.backup_all();
        }
        // using style.left and style.top to faciliate CSS animation
        element.style.left = home_position.left + "px";
        element.style.top  = home_position.top  + "px";
        document.removeEventListener('mousemove',    mouse_move);
        document.removeEventListener('mouseup',      mouse_up);
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
            $(element).removeClass("toontalk-wand-returning");
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