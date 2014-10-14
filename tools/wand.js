 /**
 * Implements ToonTalk's magic wand used for copying widgets
 * Authors: Ken Kahn
 * License: New BSD
 */

/*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */

window.TOONTALK.wand = (function (TT) {
    "use strict";

    var wand = Object.create(null);

    wand.create = function () {
        var element;
        return  {
            apply_tool: function (widget) {
                            if (widget.get_type_name() !== 'top-level') {
                                widget.add_copy_to_container();
                            }
                        },
            get_element: function () {
                            if (!element) {
                                element = document.createElement("div");
                                $(element).addClass("toontalk-wand");
                                element.title = "Drag this magic wand over the thing you want to copy.";
                                TT.tool.add_listeners(element, this);
                            }
                            return element;
                        }
            };
    };

    TT.creators_from_json["wand"] = function () {
        return TT.wand.create();
    };

    return wand;

}(window.TOONTALK));