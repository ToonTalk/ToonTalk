 /**
 * Implements ToonTalk's vacuum for removing and erasing widgets
 * Authors: Ken Kahn
 * License: New BSD
 */

/*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */

window.TOONTALK.vacuum = (function (TT) {
    "use strict";

    var vacuum = Object.create(null);
  
    var titles = {suck:     "Drag this vacuum over the thing you want to remove. Type 'e' to switch to erasing, type 'r' to swich to restoring, or 'a' for removing all. Or click to switch modes.",
                  erase:    "Drag this vacuum over the thing you want to erase (or un-erase). Type 's' to switch to sucking, type 'e' to switch to erasing, or 'a' for removing all. Or click to switch modes.",
                  restore:  "Drag this over the work area. Each time you release it a widget is restored. Type 's' to switch to sucking, type 'r' to swich to restoring, or 'a' for removing all. Or click to switch modes.",
                  suck_all: "Drag this over the work area and click. Everything will be removed. Type 'r' to switch to restoring, type 'e' to switch to erasing, or type 's' to switch to sucking. Or click to switch modes."};

    var mode_classes = {suck:     "toontalk-vacuum-s",
                        erase:    "toontalk-vacuum-e",
                        restore:  "toontalk-vacuum-r",
                        suck_all: "toontalk-vacuum-a"};

    var next_mode    = {suck:     'erase',
                        erase:    'restore',
                        restore:  'suck',
                        suck_all: 'suck_all'};

    vacuum.create = function () {
        var element, mode_class;
        var mode; // mode is either 'suck', 'erase', 'restore', or 'suck_all'
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
                var remove_widget = function (widget) {
                    if (TT.robot.in_training && event) {
                        TT.robot.in_training.removed(widget);
                    }
                    if (widget.set_running) {
                        widget.set_running(false);
                    }
                    widget.remove(event);
                    removed_items.push(widget);
                };
                var restoring, initial_location, restored_front_side_element, new_erased, top_level_backside, backside_widgets;
                if (mode === 'suck') {
                    if (widget.remove && widget.get_type_name() !== 'top-level') {
                       remove_widget(widget);
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
                } else if (mode === 'suck_all') {
                    top_level_backside = widget.top_level_widget();
                    // need to copy the list since removing will alter the list
                    backside_widgets = top_level_backside.get_backside_widgets().slice();
                    backside_widgets.forEach(remove_widget);
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
                        } else if (character === 'a' || character === 'A') {
                            set_mode('suck_all');
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