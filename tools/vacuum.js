 /**
 * Implements ToonTalk's vacuum for removing and erasing widgets
 * Authors: Ken Kahn
 * License: New BSD
 */

/*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */

window.TOONTALK.vacuum = (function (TT) {
    "use strict";

    var vacuum = Object.create(null);
  
    var titles = {suck:    "Drag this vacuum over the thing you want to remove. Click or type 'e' to switch to erasing. Click twice or type 'r' to restore previously removed or erased things.",
                  erase:   "Drag this vacuum over the thing you want to erase (or un-erase). Click twice or type 's' to switch to sucking. Click or type 'r' to restore contents.",
                  restore: "Drag this over the work area. Each time you release it a widget is restored. Click or type 's' to switch to sucking. Click twice or type 'e' to switch to erasing."};

    var mode_classes = {suck:    "toontalk-vacuum-s",
                        erase:   "toontalk-vacuum-e",
                        restore: "toontalk-vacuum-r"};

    var next_mode    = {suck:    'erase',
                        erase:   'restore',
                        restore: 'suck'};

    vacuum.create = function () {
        var element;
        var mode, mode_class; // either 'suck', 'erase', or 'restore'
        var removed_items = [];

        var set_mode = function (new_value) {
            if (mode !== new_value) {
                mode = new_value;
                $(element).removeClass(mode_class);
                mode_class = mode_classes[mode];
                $(element).addClass(mode_class);
                update_title();
            }
        };

        var get_next_mode = function () {
            return next_mode[mode];
        };

        var update_title = function () {
            if (mode === 'restore' && removed_items.length === 0) {
                element.title = "The vacuum is empty. Type 's' to switch to sucking. Type 'e' to switch to erasing.";
            } else {
                element.title = titles[mode];
            }
        };

        return {
            apply_tool: function (widget, event) {
                var restoring, initial_location, restored_front_side_element, new_erased;
                if (mode === 'suck') {
                    if (widget.remove && widget.get_type_name() !== 'top-level') {
                       if (TT.robot.in_training && event) {
                            TT.robot.in_training.removed(widget);
                        }
                        widget.remove(event);
                        removed_items.push(widget);
                     } // else warn??
                } else if (mode === 'erase' || (mode === 'restore' && widget.get_erased && widget.get_erased())) {
                    // erase mode toggles and restore mode unerases if erased
                    if (widget.get_type_name() !== 'top-level') {
                        new_erased = !widget.get_erased();
                        widget.set_erased(new_erased, true);
                        if (TT.robot.in_training && event) {
                            TT.robot.in_training.set_erased(widget, new_erased);
                        }
                    }
                } else if (mode === 'restore') {
                    // doesn't matter what the widget it
                    if (removed_items.length > 0) {
                        restoring = removed_items.pop();
                        restored_front_side_element = widget.add_to_top_level_backside(restoring, true);
                        initial_location = $(element).offset();
                        initial_location.left -= $(restored_front_side_element).width(); // left of vacuum
                        TT.UTILITIES.set_absolute_position($(restored_front_side_element), initial_location);
                    }
                }
            },
            nothing_under_tool: function () {
                set_mode(get_next_mode());
            },
            get_element: function () {
                var vacuum_without_button_element;
                if (!element) {
                    element = document.createElement("div");
                    $(element).addClass("toontalk-vacuum");
                    TT.tool.add_listeners(element, this);
                    set_mode('suck');
                    document.addEventListener('keyup', function (event) {
                        var character = String.fromCharCode(event.keyCode);
                        if (character === 's' || character === 'S') {
                            set_mode('suck');
                        } else if (character === 'e' || character === 'E') {
                            set_mode('erase');
                        } else if (character === 'r' || character === 'R') {
                            set_mode('restore');
                        }
                    });
                    update_title();
                }      
                return element;
            }
        };
    };

    TT.creators_from_json["vacuum"] = function (json, additional_info) {
        var vacuum = TT.vacuum.create();
        if (json.mode) {
            TT.UTILITIES.set_timeout(function () {
                    vacuum.set_mode(json.mode);
                });
        }
        return vacuum;
    };

    return vacuum

}(window.TOONTALK));