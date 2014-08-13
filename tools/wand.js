 /**
 * Implements ToonTalk's magic wand used for copying widgets
 * Authors: Ken Kahn
 * License: New BSD
 */

/*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */

window.TOONTALK.wand = (function (TT) {
    "use strict";

    var wand_instance = Object.create(TT.tool);

    var element, home_position;

    var mouse_move = function (event) {
        event.preventDefault();
        element.style.left = event.clientX + "px";
        element.style.top  = event.clientY + "px";
//      console.log("Moved to " + event.clientX + "," + event.clientY);
    };

    var mouse_up = function (event) {
        var element_under_wand_tip, widget_under_wand_tip;
        event.preventDefault();
        $(element).addClass("toontalk-wand-returning");
        // what is under the wand/mouse (not counting the wand itself)
        $(element).hide();
        element_under_wand_tip = document.elementFromPoint(event.pageX, event.pageY);
        $(element).show();
        while (element_under_wand_tip && !element_under_wand_tip.toontalk_widget) {
            // element might be a 'sub-element' so go up parent links to find ToonTalk widget
            element_under_wand_tip = element_under_wand_tip.parentElement;
        }
        if (element_under_wand_tip) {
            widget_under_wand_tip = element_under_wand_tip.toontalk_widget;
        }
        if (widget_under_wand_tip && widget_under_wand_tip.get_type_name() === "empty hole") {
            widget_under_wand_tip = widget_under_wand_tip.get_parent_of_frontside().widget;
        }
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
        element.addEventListener('mousedown', function (event) {
            // should I check which mouse button? (event.button)
//             console.log("mouse down");
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