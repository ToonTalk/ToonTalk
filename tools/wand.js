 /**
 * Implements ToonTalk's magic wand used for copying widgets
 * Authors: Ken Kahn
 * License: New BSD
 */

/*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */

window.TOONTALK.wand = (function (TT) {
    "use strict";

    var element;

    var wand_instance = {
        apply_tool: function (widget) {
                        widget.add_copy_to_container();
                    },
        get_element: function () {
            if (!element) {
                element = document.createElement("div");
                $(element).addClass("toontalk-wand");
            }
            element.title = "Drag this magic wand over the thing you want to copy.";
            TT.tool.add_listeners(element, wand_instance);
            return element;
        }
    };

    return {create_from_json: function () {
                                  return wand_instance;
                              },
            instance: wand_instance};

}(window.TOONTALK));