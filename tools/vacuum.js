 /**
 * Implements ToonTalk's vacuum for removing and erasing widgets
 * Authors: Ken Kahn
 * License: New BSD
 */

/*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */

window.TOONTALK.vacuum = (function (TT) {
    "use strict";

    var vacuum = Object.create(null); 
    var titles = {suck:     "I'm a vacuum. Drag me over the thing you want to remove.\nType 'e' to switch to erasing, type 'r' to swich to restoring, or 'a' for removing all.\nOr click to switch modes.",
                  erase:    "I'm a vacuum. Drag me over the thing you want to erase (or un-erase).\nType 's' to switch to sucking, type 'r' to switch to restoring, or 'a' for removing all.\nOr click to switch modes.",
                  restore:  "Drag me over the work area. Each time you release me I'll restore a widget.\nType 's' to switch to sucking, type 'e' to swich to erasing, or 'a' for removing all.\nOr click to switch modes.",
                  suck_all: "Drag me over the work area and click. Everything will be removed.\nType 'r' to switch to restoring, type 'e' to switch to erasing, or type 's' to switch to sucking.\nOr click to switch modes."};
    var mode_classes = {suck:     "toontalk-vacuum-s",
                        erase:    "toontalk-vacuum-e",
                        restore:  "toontalk-vacuum-r",
                        suck_all: "toontalk-vacuum-a"};
    var next_mode    = {suck:     'erase',
                        erase:    'restore',
                        restore:  'suck_all',
                        suck_all: 'suck'};
    var held = false;
    var pick_me_up;
    vacuum.create = function () {
        var element, mode_class;
        var mode; // mode is either 'suck', 'erase', 'restore', or 'suck_all'
        var removed_items = [];
        var set_mode = function (new_value) {
            if (mode !== new_value) {
                mode = new_value;
                if (TT.sounds) {
                    TT.sounds.click.play();
                }
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
                TT.UTILITIES.give_tooltip(element, "I'm empty.\nType 's' to switch to sucking, or type 'e' to switch to erasing, or 'a' to remove all.");
            } else {
                TT.UTILITIES.give_tooltip(element, titles[mode]);
            }
        };

        document.addEventListener('keyup', function (event) {
            var character = String.fromCharCode(event.keyCode);
            // control keys are used by browser
            if (event.altKey) {
                if (!element) {
                    vacuum.the_vacuum.get_element(); // this sets element since should only be one vacuum
                    $(element).css({left: TT.tool.pageX,
                                    top:  TT.tool.pageY});
                    document.body.appendChild(element);
                }
                pick_me_up();
            }
            if (!vacuum.the_vacuum.held()) {
                return;
            }
            if (character === 's' || character === 'S') {
                set_mode('suck');
            } else if (character === 'e' || character === 'E') {
                set_mode('erase');
            } else if (character === 'r' || character === 'R') {
                 set_mode('restore');
            } else if (character === 'a' || character === 'A') {
                 set_mode('suck_all');
            } else if (TT.sounds) {
                 TT.sounds.event_ignored.play();
            }
            event.preventDefault();
            event.stopPropagation();
       });
       document.addEventListener('keydown', function (event) {
            if (vacuum.the_vacuum.held()) {
                event.preventDefault();
                event.stopPropagation();
            }
       });
       // so initialisation can access the vacuum
       TT.vacuum.the_vacuum = 
           {apply_tool: function (widget_side, event) {
                var widget = widget_side.get_widget();
                var remove_widget = function (widget_side) {  
                    var copy;
                    if (event && widget.robot_in_training()) {
                        widget.robot_in_training().removed(widget_side);
                    }
                    if (widget_side.is_primary_backside && widget_side.is_primary_backside()) {
                        widget_side.hide_backside();
                        return;
                    }
                    if (widget_side === widget.robot_in_training()) {
                        // vacuuming himself so automatically finish training
                        widget_side.training_finished();
                        widget_side.set_run_once(true); // since removes itself can iterate
                        return;
                    }
                    if (widget.is_bird() && TT.sounds) {
                        // if it was flying stop making the flying sounds
                        // TODO: introduce a removed listener and use that instead
                        TT.sounds.bird_fly.pause();
                    }
                    // save a copy for restoring since the following clobbers the original -- e.g. removing contents from boxes
                    copy = widget_side.copy();
                    if (!copy.is_backside()) {
                        copy.save_dimensions_of(widget_side);
                        // inactive any active sensors but need to re-activate if restored
                        copy.this_and_walk_children(function (child) {
                            if (child.is_sensor() && child.get_active()) {
                                child.set_active('temporarily false');
                            }
                            return true;
                        });
                    }
                    removed_items.push(copy);
                    if (widget_side.set_running) {
                        widget_side.set_running(false);
                    }
                    if (!copy.is_backside()) {
                        widget_side.this_and_walk_children(function (child) {
                            if (!child.is_backside() && child.is_sensor() && child.get_active()) {
                                child.set_active(false);
                            }
                            return true;
                        });
                    }
                    widget_side.remove(event);
                };
                var restoring, initial_location, restored_front_side_element, new_erased, top_level_backside, backside_widgets;
                if (mode === 'suck') {
                    if (widget_side.remove && !widget_side.get_widget().is_top_level()) {
                        remove_widget(widget_side);
                        if (TT.sounds) {
                            TT.sounds.vacuum_suck.play();
                        }
                     } // else warn??
                } else if (mode === 'erase' || (mode === 'restore' && widget_side.get_erased && widget_side.get_erased())) {
                    // erase mode toggles and restore mode unerases if erased
                    if (widget_side.get_type_name() !== 'top-level') {
                        new_erased = !widget_side.get_erased();
                        if (TT.sounds) {
                            if (new_erased) {
                                TT.sounds.vacuum_suck.play();
                            } else {
                                TT.sounds.vacuum_spit.play();
                            }
                        }
                        widget_side.set_erased(new_erased, true);
                        if (event && widget.robot_in_training()) {
                            widget.robot_in_training().erased_widget(widget_side, new_erased);
                        }
                    }
                } else if (mode === 'restore') {
                    // doesn't matter what the widget is
                    if (removed_items.length > 0) {
                        restoring = removed_items.pop();
                        restoring.restore_dimensions();
                        restored_front_side_element = widget_side.add_to_top_level_backside(restoring, true);
                        initial_location = $(element).offset();
                        initial_location.left -= $(restored_front_side_element).width(); // left of vacuum
                        TT.UTILITIES.set_absolute_position(restored_front_side_element, initial_location);
                        restoring.this_and_walk_children(function (child) {
                            if (child.is_sensor()) {
                                child.restore_active();
                            }
                            return true;
                        });
                        if (TT.sounds) {
                            TT.sounds.vacuum_spit.play();
                        }
                    }
                } else if (mode === 'suck_all') {
                    top_level_backside = widget_side.top_level_widget();
                    // need to copy the list since removing will alter the list
                    backside_widgets = top_level_backside.get_backside_widgets().slice();
                    if (backside_widgets.length > 0 && TT.sounds) {
                        TT.sounds.vacuum_suck.play();
                        TT.sounds.bird_fly.pause(); // just in case
                    }
                    backside_widgets.forEach(function (widget_side) {
                                                 if (widget_side && widget !== widget.robot_in_training()) {
                                                     remove_widget(widget_side);
                                                 }
                                             });
                    top_level_backside.set_backside_widgets([]);
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
                    pick_me_up = TT.tool.add_listeners(element, this);
                    set_mode('suck');
                    update_title();
                }      
                return element;
            },
            held: function () {
                return held;
            },
            set_held: function(new_value) {
                held = new_value;
            }
        };
        return TT.vacuum.the_vacuum;
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