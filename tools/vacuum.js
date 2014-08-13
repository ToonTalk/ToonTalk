 /**
 * Implements ToonTalk's vacuum for removing and erasing widgets
 * Authors: Ken Kahn
 * License: New BSD
 */

/*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */

window.TOONTALK.vacuum = (function (TT) {
    "use strict";

    var element;

    var instance = {
        apply_tool: function (widget) {
            if (widget.remove) {
                if (TT.robot.in_training) {
                    TT.robot.in_training.removed(widget);
                }
                widget.remove(event);
                TT.UTILITIES.backup_all();
             } // else warn??
        },
        get_element: function () {
            if (!element) {
                element = document.createElement("div");
                $(element).addClass("toontalk-vacuum");
            }
            element.title = "Drag this vacuum over the thing you want to remove.";
            TT.tool.add_listeners(element, instance);
            return element;
        }
    };

    return {create_from_json: function () {
                                  return instance;
                              },
            instance: instance};

}(window.TOONTALK));