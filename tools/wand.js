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
        var held = false;
        var element;
        var wand =
            {apply_tool: function (widget) {
                            var widget_copy;
                            if (!widget.is_top_level()) {
                                if (TT.sounds) {
                                    TT.sounds.magic.play();
                                }
                                widget_copy = widget.add_copy_to_container();
                                widget_copy.update_display();
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
                                element.toontalk_tool = wand;
                            }
                            return element;
                        },
            held: function () {
                return held;
            },
            set_held: function(new_value) {
                var listen_for_command = function () {
                    TT.UTILITIES.listen_for_speech({commands: 'copy | abracadabra',
                                                    success_callback: function (command, event) {
                                                       var $highlighted_element, widget_side_under_tool, top_level_widget;
                                                       $highlighted_element = $(".toontalk-highlight");
                                                       if ($highlighted_element.length > 0) {
                                                           widget_side_under_tool = TT.UTILITIES.widget_side_of_jquery($highlighted_element);
                                                           if (widget_side_under_tool && widget_side_under_tool.top_level_widget) {
                                                               // need to determine the top_level_widget first since if tool is vacuum
                                                               // it will be removed
                                                               top_level_widget = widget_side_under_tool.top_level_widget();
                                                               this.apply_tool(widget_side_under_tool, event);
                                                               top_level_widget.backup_all();
                                                               listen_for_command(); // listen for next command
                                                           }
                                                       }
                                                       return true;  
                                                   }.bind(this)});
                }.bind(this);
                held = new_value;
                if (held) {
                    listen_for_command();
                } else {
                    TT.UTILITIES.stop_listening_for_speech();
                }
            }
        };
        return wand;
    };

    TT.creators_from_json["wand"] = function () {
        return TT.wand.create();
    };

    return wand;

}(window.TOONTALK));