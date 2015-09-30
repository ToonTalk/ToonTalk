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
                            var widget_copy;
                            if (widget.get_type_name() !== 'top-level') {
                                if (TT.sounds) {
                                    TT.sounds.magic.play();
                                }
                                widget_copy = widget.add_copy_to_container();
                                if (widget.robot_in_training()) {
                                    widget.robot_in_training().copied(widget, widget_copy, false);
                                }
                            }
                        },
            get_element: function () {
                            if (!element) {
                                element = document.createElement("div");
                                $(element).addClass("toontalk-wand");
                                TT.UTILITIES.give_tooltip(element, "I'm a magic wand. Drag me over the thing you want me to copy.");
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