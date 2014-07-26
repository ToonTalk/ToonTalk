 /**
 * Implements ToonTalk's backside of a widget
 * Authors: Ken Kahn
 * License: New BSD
 */
 
/*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */

window.TOONTALK.backside = 
(function (TT) {
    "use strict";
    return {
        create: function (widget) {
            var backside = Object.create(this);
            var backside_element = document.createElement("div");
            var $backside_element = $(backside_element);
            var x_scale = 1; // so can shrink this down
            var y_scale = 1;
            var original_width, original_height, width_at_resize_start, height_at_resize_start, close_button, backside_widgets;
            $backside_element.addClass("toontalk-backside toontalk-side " + "toontalk-backside-of-" + widget.get_type_name());
            $backside_element.css({"z-index": TT.UTILITIES.next_z_index()});
            backside.get_element = function () {
                return backside_element;
            };
            backside.get_widget = function () {
                return widget;
            };
            if (!widget.get_backside) {
                // e.g. top-level backside
                widget.get_backside = function () {
                    return backside;
                };
            }
//             if (!widget.drop_on) {
//                 // TO DO: determine if this is needed -- top-level backside can't be added to something - can it?
//                 widget.drop_on = function (other, $side_element_of_other, event) {
//                     $backside_element.append($side_element_of_other);
//                     TT.UTILITIES.set_position_is_absolute($side_element_of_other.get(0), true, event); // when on the backside
//                     if ($side_element_of_other.is(".toontalk-frontside")) {
//                         // better to have a preferrred size that it goes to when on backside
//                         // recorded when dropped into something that changes its size -- e.g. a box
//                         $side_element_of_other.addClass("toontalk-frontside-on-backside");
//                         other.rerender();
//                     }
//                     backside.update_run_button_disabled_attribute();
//                     return true;
//                 };
//             }
            if (!widget.removed_from_container) {
                widget.removed_from_container = function (other, backside_removed, event, ignore_if_not_on_backside) {
                    if (!backside_removed) {
                        $(other.get_frontside_element()).removeClass("toontalk-frontside-on-backside");
                    }
                    if (!TT.robot.in_training) {
                       // robots in training take care of this (and need to to record things properly)
                       this.remove_backside_widget(other, backside_removed, ignore_if_not_on_backside);
                    }
                };
            }
            backside.widget_dropped_on_me = 
                function (other, other_is_backside, event, robot, ignore_training) {
                    // event serves 2 functions: info for adjusting for scrolling and whether to update the display
                    var widget = this.get_widget();
                    var other_side, other_side_element, $other_side_element, backside_of_other;
                    if (other_is_backside) {
                        other_side = other.get_backside(true);
                        other_side_element = other_side.get_element();
                        other_side.rerender();
                    } else {
                        other_side = other.get_frontside(true);
                        other_side_element = other_side.get_element();
                        other.rerender();
                    }
                    $other_side_element = $(other_side_element);
                    $backside_element.append($other_side_element);
                    if (!event) {
                        // i.e. by a robot -- then animate to backside element
                        other.animate_to_element(backside_element);
                    }
                    TT.UTILITIES.set_position_is_absolute(other_side_element, true, event); // when on the backside
                    if (TT.robot.in_training && !ignore_training) {
                        TT.robot.in_training.dropped_on(other, this.get_widget());
                    }
                    if (other_is_backside && this.get_widget().get_type_name() != 'top-level') {
                        // remove other since its backside is on another backside (other than top-level) 
                        // can be recreated by removing backside from this backside
                        // drop now ensures the following
//                         parent_of_backside = other.get_parent_of_backside();
//                         if (parent_of_backside && parent_of_backside.widget !== widget) {
//                             // parent backside should no longer hold either front or backside
//                             parent_of_backside.widget.remove_backside_widget(other, true);
//                         }
                        backside_of_other = other.get_backside();
                        other.forget_backside();
                        // following does too much if the widget knows its backside
                        // so temporarily remove it
                        other.remove(event);
                        other.set_backside(backside_of_other);
                    }
                    widget.add_backside_widget(other, other_is_backside);
                    if (other.dropped_on_other) {
                        other.dropped_on_other(this.get_widget(), true, event);
                    }
                    TT.UTILITIES.backup_all();
                    return true;
                };
            backside.add_backside_widgets = function (backside_widgets, json_array)  {
                if (backside_widgets.length === 0) {
                    return;
                }
                // too soon to add these widgets so delay slightly
                setTimeout(
                    function () {
                        var widget_side_element, json_view;
                        backside_widgets.forEach(function (backside_widget_side, index) {
                            if (backside_widget_side.is_backside) {
                                widget_side_element = backside_widget_side.widget.get_backside_element(true);
                            } else {
                                widget_side_element = backside_widget_side.widget.get_frontside_element(true);
                            }
                            widget_side_element.toontalk_widget = backside_widget_side.widget;
                            if (json_array) {
                                json_view = json_array[index];
                                if (json_view) {
                                    if (backside_widget_side.is_backside) {
                                        $(widget_side_element).css({left: json_view.backside_left,
                                                                    top: json_view.backside_top,
                                                                    width: json_view.backside_width,
                                                                    height: json_view.backside_height});
                                        backside_widget_side.widget.apply_backside_geometry();
                                    } else {
                                        $(widget_side_element).css({left: json_view.frontside_left,
                                                                    top: json_view.frontside_top,
                                                                    width: json_view.frontside_width,
                                                                    height: json_view.frontside_height});
                                    }
                                }
                            }
                            $backside_element.append(widget_side_element);
//                             TT.UTILITIES.make_resizable($(widget_side_element), backside_widget_side.widget);
                        });
                    },
                    1);
            };
            backside.get_backside_dimensions = function () {
                if (x_scale) {
                    return {x_scale: x_scale, 
                            y_scale: y_scale, 
                            original_width: original_width, 
                            original_height: original_height};
                }
            };
            backside.set_dimensions = function (dimensions) {
                x_scale = dimensions.x_scale;
                y_scale = dimensions.y_scale;
                original_width = dimensions.original_width;
                original_height = dimensions.original_height;
            };
            backside.scale_to_fit = function (this_element, other_element) {
                var scales;
                if (!original_width && this.get_widget().backside_geometry) {
                    original_width = this.get_widget().backside_geometry.original_width;
                    original_height = this.get_widget().backside_geometry.original_height;  
                }
                scales = TT.UTILITIES.scale_to_fit(this_element, other_element, original_width, original_height);
                x_scale = scales.x_scale;
                y_scale = scales.y_scale;
            };
//             TT.backside.associate_widget_with_backside_element(widget, backside, backside_element);
            backside_element.toontalk_widget = widget;
            TT.UTILITIES.drag_and_drop($backside_element);
            // the following function should apply recursively...
            $backside_element.resizable(
                {start: function () {
                    width_at_resize_start = $backside_element.width();
                    height_at_resize_start = $backside_element.height();
                    if (!original_width) {
                        original_width = width_at_resize_start;
                    }
                    if (!original_height) {
                        original_height = height_at_resize_start;
                    }
                },
                resize: function (event, ui) {
                    var current_width = ui.size.width; 
                    var current_height = ui.size.height;
                    if ($backside_element.is(".toontalk-top-level-backside")) {
                        // top-level backside is not scaled
                        return;
                    }
//                  console.log({x_scale_change: current_width / width_at_resize_start,
//                               y_scale_change: current_height / height_at_resize_start});
                    x_scale *= current_width / width_at_resize_start;
                    y_scale *= current_height / height_at_resize_start;
                    width_at_resize_start = current_width;
                    height_at_resize_start = current_height;
//                     console.log(current_width + "x" + current_height + " and scale is " + x_scale + "x" + y_scale);
                    TT.backside.scale_backside($backside_element, x_scale, y_scale, original_width, original_height);
                },
                handles: "e,s,se"}); // was "n,e,s,w,se,ne,sw,nw" but interfered with buttons
            // following should be done by something like GWT's onLoad...
            // but DOMNodeInserted is deprecated and MutationObserver is only in IE11.
            // giving up on pre IE11 so use https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver
            $backside_element.on('DOMNodeInserted', function (event) {
                var $source = $(event.originalEvent.srcElement);
                var owner_widget;
                if ($source.is(".toontalk-frontside") && $source.parent().is(".toontalk-backside")) {
                    $source.addClass("toontalk-frontside-on-backside");
                    if ($source.is(".ui-resizable")) {
                        $source.resizable("enable");
                    }
                    owner_widget = TT.UTILITIES.get_toontalk_widget_from_jquery($source);
                    if (owner_widget) {
                        owner_widget.render();
                    }
                }
                event.stopPropagation();
            });
            $backside_element.on('DOMNodeRemoved', function (event) {
                var $source = $(event.originalEvent.srcElement);
                if ($source.is(".toontalk-frontside")) {
                    $source.removeClass("toontalk-frontside-on-backside");
                }
                event.stopPropagation();
            });
            backside_element.addEventListener("mouseover", function (event) {
               var frontside = widget.get_frontside();
               var parent_of_backside = widget.get_parent_of_backside();
               var close_title, close_handler;
               if (frontside && (!parent_of_backside || parent_of_backside.widget.get_type_name() === "top-level")) {
                   $(frontside.get_element()).addClass("toontalk-highlight");
               }
               if (widget.close_button_ok(backside_element)) {
                   if (close_button) {
                       $(close_button).show();
                   } else {
                       close_handler = function (event) {
                               backside.hide_backside(event);
                               event.stopPropagation();
                       };
                       close_title = widget.get_description();
                       if (close_title) {
                           close_title = "the " + widget.get_type_name() + " who " + close_title;
                       } else {
                           close_title = "the " + widget.get_type_name();
                       }
                       close_title = "Click to hide this back side of " + close_title + ".";
                       close_button = TT.UTILITIES.create_close_button(close_handler, close_title);
                       backside_element.appendChild(close_button);                
                   }
               }
            });
            backside_element.addEventListener("mouseout", function (event) {
               var frontside = widget.get_frontside();
               if (frontside) {
                   $(frontside.get_element()).removeClass("toontalk-highlight");
               }
               if (close_button) {
                   $(close_button).hide();
               }
            });
            backside.display_updated = function () {
                var $backside_element = $(this.get_element());
                if (!original_width) {
                    original_width = $backside_element.width();
                }
                if (!original_height) {
                    original_height = $backside_element.height();
                }
            };
            if (widget.get_backside_widgets) {
                backside_widgets = widget.get_backside_widgets();
                backside.add_backside_widgets(backside_widgets, widget.get_backside_widgets_json_views());
            }
            if (TT.debugging) {
                backside_element.id = widget.debug_id;
            }
            return backside;
        },
                
        remove: function() {
            $(this.get_element()).remove();
        },
        
        // commented out since callers directly call remove_backside_widget
//         removed_from_container: function (part, is_backside) {
//             this.get_widget().remove_backside_widget(part, is_backside, true);
//         },
        
        visible: function () {
            var backside_element = this.get_element();
            return (backside_element && $(backside_element).is(":visible"));
        },
        
        update_run_button_disabled_attribute: function () {
            var backside_element = this.get_element();
            var $run_button;
            if (!backside_element) {
                return;
            }
            if ($(backside_element).is(".toontalk-top-level-backside")) {
                // has no buttons
                return;
            }
            $run_button = $(backside_element).find(".toontalk-run-backside-button");
            $run_button.button("option", "disabled", !this.get_widget().can_run());
            return this;
        },
        
        create_infinite_stack_check_box: function (backside, widget) {
            var check_box = TT.UTILITIES.create_check_box(widget.get_infinite_stack(), 
                                                          "toontalk-infinite-stack-check-box",
                                                          "Copy when dragged.",
                                                          "Check this if you want the " + widget.get_type_name()
                                                          + " to be copied instead of moved.");
            $(check_box.button).click(function (event)  {
                var infinite_stack = check_box.button.checked;
                var action_string;
                widget.set_infinite_stack(infinite_stack);
                if (TT.robot.in_training) {
                    if (infinite_stack) {
                        action_string = "change dragging to make a copy of ";
                    } else {
                        action_string = "change dragging back to moving for ";
                    }
                    TT.robot.in_training.edited(widget, {setter_name: "set_infinite_stack",
                                                         argument_1: infinite_stack,
                                                         toString: action_string,
                                                         button_selector: ".toontalk-infinite-stack-check-box"});
                }
                event.stopPropagation();
            });
            return check_box;
        },
        
        create_standard_buttons: function (backside, widget, extra_settings_generator) {
            var frontside_element = widget.get_frontside_element();
            var description = widget.get_description();
            var run_or_erase_button, button_set;
            if (!(this.get_erased && widget.get_erased()) && !$(frontside_element).is(".toontalk-conditions-contents") && $(frontside_element).parents(".toontalk-conditions-contents").length === 0) {
                run_or_erase_button = TT.backside.create_run_button(backside, widget);
            } else {
                run_or_erase_button = TT.backside.create_erase_button(backside, widget);
            }
            var copy_button = TT.backside.create_copy_button(backside, widget);
//             var hide_button = TT.backside.create_hide_button(backside, widget);
//             var remove_button = TT.backside.create_remove_button(backside, widget);
            var settings_button = TT.backside.create_settings_button(backside, widget, extra_settings_generator);
            var extra_arguments = [];
            var i;
            for (i = 3; i < arguments.length; i++) {
                extra_arguments[i-3] = arguments[i];
            }
            button_set = TT.UTILITIES.create_button_set(run_or_erase_button, copy_button, settings_button, extra_arguments);
            if (description) {
               return TT.UTILITIES.create_vertical_table(TT.UTILITIES.create_text_element("Back side of a " + widget.get_type_name() + " that " + description), button_set);
            }
            return button_set;
        },
        
//         create_done_button: function (element) {
//             var $done_button = $("<button>Done</button>").button();
//             $done_button.addClass("toontalk-done-backside-button");
//             $done_button.click(function (event) {
//                 $(element).remove();
//                 event.stopPropagation();
//             });
//             $done_button.attr("title", "Click when finished with settings.");
//             return $done_button.get(0); 
//         },
        
//         create_hide_button: function (backside, widget) {
//             var backside_element = backside.get_element();
//             var $backside_element = $(backside_element);
//             var $hide_button = $("<button>Hide</button>").button();
//             $hide_button.addClass("toontalk-hide-backside-button");
//             $hide_button.click(function (event) {
//                 backside.hide_backside(event);
//                 event.stopPropagation();
//             });
//             $hide_button.attr("title", "Click to hide this.");
//             return $hide_button.get(0);
//         },
        
        hide_backside: function (event) {
            var widget = this.get_widget();
            var frontside_element = widget.get_frontside_element();
            var $backside_element = $(widget.get_backside_element());
            var backside_position = $backside_element.position();
            var $backside_container = $backside_element.parent().closest(".toontalk-backside");
            var animate_disappearance = 
                function ($element) {
                    var frontside_offset = $(frontside_element).offset();
                    var container_position = $backside_container.position();
                    var remove_element = 
                        function () {
                            $element.remove();
                        };
                    if (!$element.is(":visible")) {
                        // not sure how this happens -- perhaps only caused by a bug
                        return;
                    }
                    $element.addClass("toontalk-side-appearing");
                    TT.UTILITIES.add_one_shot_event_handler($element.get(0), 'transitionend', 2500, remove_element);
                    if (!container_position) {
                        container_position = {left: 0, 
                                              top: 0};
                    }
                    $element.css({left: frontside_offset.left - container_position.left,
                                  top: frontside_offset.top - container_position.top,
                                  opacity: .1});                   
            };
            var record_backside_widget_positions = function () {
                var backside_widgets = widget.get_backside_widgets();
                var backside_widgets_json_views = widget.get_backside_widgets_json_views();
                var backside_widget_side_element;
                backside_widgets.forEach(function (backside_widget_side, index) {
                    var backside_widget = backside_widget_side.widget;
                    var position;
                    if (backside_widget_side.is_backside) {
                        backside_widget_side_element = backside_widget.get_backside_element();
                    } else {
                        backside_widget_side_element = backside_widget.get_frontside_element();   
                    }
                    if (backside_widget_side_element && backside_widgets_json_views && backside_widgets_json_views[index]) {
                        position = $(backside_widget_side_element).position();
                        if (backside_widget_side.is_backside) {
                            backside_widgets_json_views[index].backside_left = position.left;
                            backside_widgets_json_views[index].backside_top = position.top;
                        } else {
                            backside_widgets_json_views[index].frontside_left = position.left;
                            backside_widgets_json_views[index].frontside_top = position.top;                               
                        }
                    }
                });
            };
            var parent_of_backside = widget.get_parent_of_backside();
            $(frontside_element).removeClass("toontalk-highlight");
            if (widget.forget_backside) {
                widget.forget_backside();
            }
            if (parent_of_backside.is_backside) {
                parent_of_backside.widget.remove_backside_widget(widget, true);
            } else {
                parent_of_backside.widget.removed_from_container(widget, true, event, true);
            }
            record_backside_widget_positions();
            widget.backside_geometry = this.get_backside_dimensions();
            animate_disappearance($backside_element)
            if (!$(frontside_element).is(":visible")) {
                $(frontside_element).css({left: backside_position.left,
                                           top:  backside_position.top});
                $backside_container.append(frontside_element);
            }
        },
        
        create_erase_button: function (backside, widget) {
            var backside_element = backside.get_element();
            var $backside_element = $(backside_element);
            var $erase_button = $("<button>Erase</button>").button();
            $erase_button.addClass("toontalk-erase-backside-button");
            TT.widget.erasable(widget); // should already be so but can't hurt to be sure
            var update_title = function () {
                if (widget.get_erased()) {
                    $erase_button.button("option", "label", "Un-erase");
                    $erase_button.attr("title", "Click to restore this to how it was before it was erased.");
                } else {
                    $erase_button.button("option", "label", "Erase");
                    $erase_button.attr("title", "Click to erase this so the robot won't be so fussy.");
                }
            };
            update_title();
            $erase_button.click(function (event) {
                var frontside_element = widget.get_frontside_element();
                var erased = !widget.get_erased();
                widget.set_erased(erased, true);
                update_title();
                if (TT.robot.in_training) {
                    TT.robot.in_training.set_erased(widget, erased);
                }
                TT.UTILITIES.backup_all();
                event.stopPropagation();
            });
            $erase_button.attr("title", "Click to hide this.");
            return $erase_button.get(0);
        },
        
        create_copy_button: function (backside, widget) {
            var backside_element = backside.get_element();
            var $backside_element = $(backside_element);
            var $copy_button = $("<button>Copy</button>").button();
            $copy_button.addClass("toontalk-copy-backside-button");
            $copy_button.click(function (event) {
                widget.add_copy_to_container();
                TT.UTILITIES.backup_all();
                event.stopPropagation();
            });
            $copy_button.attr("title", "Click to make a copy of this " + widget.get_type_name());
            return $copy_button.get(0);
        },
        
        create_run_button: function (backside, widget) {
            var backside_element = backside.get_element();
            var $backside_element = $(backside_element);
            var $run_button = $("<button>Run</button>").button();
            $run_button.addClass("toontalk-run-backside-button");
            $run_button.get(0).toontalk_widget = widget;
            $run_button.click(function (event) {
                var will_run = !widget.get_running();
                TT.backside.update_run_button($run_button);
                widget.set_running(will_run);
                event.stopPropagation();
            });
            setTimeout(function () {
                    this.update_run_button($run_button);
                }.bind(this),
                1);            
            return $run_button.get(0);
        },
        
        update_run_button: function ($run_button) {
            var widget = $run_button.get(0).toontalk_widget;
            var running = widget.get_running();
            if (!$run_button.is(":enabled")) {
                $run_button.attr("title", "Add robots here to to run on this " + widget.get_type_name());
                return;
            }
            if (!$run_button.is(":visible")) {
                return;
            }
            if (!running) {
                $run_button.button("option", "label", "Run");
                $run_button.attr("title", "Click to run the robots on this " + widget.get_type_name());
            } else {
                $run_button.button("option", "label", "Stop");
                $run_button.attr("title", "Click to stop running the robots on this " + widget.get_type_name());
            }
        },
        
//         create_remove_button: function (backside, widget) {
//             var $remove_button = $("<button>Remove</button>").button();
//             $remove_button.addClass("toontalk-remove-backside-button");
//             $remove_button.click(function (event) {
//                 if (widget.remove) {
//                     if (TT.robot.in_training) {
//                         TT.robot.in_training.removed(widget);
//                     }
//                     widget.remove(event);
//                     TT.UTILITIES.backup_all();
//                 } // else warn??
//                 event.stopPropagation();
//             });
//             $remove_button.attr("title", "Click to remove this " + widget.get_type_name());
//             return $remove_button.get(0);
//         },
        
        create_settings_button: function (backside, widget, extra_settings_generator) {
            var $settings_button = $("<button>Settings</button>").button();
            $settings_button.addClass("toontalk-settings-backside-button");
            $settings_button.css({"z-index": TT.UTILITIES.next_z_index()});
            $settings_button.click(function (event) {
                var settings = document.createElement("table");
                var check_box = this.create_infinite_stack_check_box(backside, widget);
                var type_name = widget.get_type_name();
                var description_text_area = TT.UTILITIES.create_text_area(widget.get_description(), 
                                                                          "toontalk-description-input", 
                                                                          "This&nbsp;" + type_name + "&nbsp;",
                                                                          "Type here to provide additional information about this " + type_name + ".");
                var $create_sensor_button = $("<button>Make a sensor</button>").button();
                var description_change = function () {
                        var description = description_text_area.button.value.trim();
                        if (widget.set_description(description, true) && TT.robot.in_training) {
                            TT.robot.in_training.edited(widget, {setter_name: "set_description",
                                                                 argument_1: description,
                                                                 toString: "change the description to '" + description + "'' of the " + type_name,
                                                                 button_selector: ",toontalk-description-input"});
                        }
                    };
                var close_handler = function (event) {
                    $(settings).remove();
                    event.stopPropagation();
                }
                $(description_text_area.button).val(widget.get_description());
                description_text_area.button.addEventListener('change', description_change);
                description_text_area.button.addEventListener('mouseout', description_change);
                $create_sensor_button.click(function (event) {
                        var sensor = TT.sensor.create('click', 'which', undefined, undefined, true, widget);
                        settings.appendChild(sensor.get_frontside_element(true));
                });
                $create_sensor_button.attr('title', "Click to create a nest which receives messages when events happen to this " + widget.get_type_name() + ".");
                if (extra_settings_generator) {
                    extra_settings_generator(settings);
                }
                settings.appendChild(TT.UTILITIES.create_row(description_text_area.container));
                settings.appendChild(TT.UTILITIES.create_row($create_sensor_button.get(0), check_box.container));
                settings.appendChild(TT.UTILITIES.create_close_button(close_handler, "Click when finished with the settings of this " + widget.get_type_name() + "."));
                backside.get_element().appendChild(settings);
                $(settings).addClass("toontalk-settings");
                event.stopPropagation();
            }.bind(this));
            $settings_button.attr("title", "Click to change properties of this " + widget.get_type_name() + ".");
            return $settings_button.get(0);
        },
        
        get_widgets: function () {
            var widgets = [];
            $(this.get_element()).children().each(function (index, element) {
                var owner = element.toontalk_widget;
                if (owner && widgets.indexOf(owner) < 0) {
                    widgets.push(owner);
                }
            });
            return widgets;
        },
        
        scale_backside: function ($backside_element, x_scale, y_scale, original_width, original_height) {
            var scale = Math.min(1, x_scale, y_scale);
            if (x_scale === 1 && y_scale === 1) {
               // if not scaling let the browser decide the dimensions
               $backside_element.css({width:  '',
                                      height: ''});
            } else {
               $backside_element.css({transform: "scale(" + scale + ", " + scale + ")",
                                      "transform-origin": "top left", 
                                       width:  original_width *  x_scale / scale,
                                       height: original_height * y_scale / scale});
            }
 //         console.log({scale: scale, x_scale: x_scale, y_scale: y_scale});
        },
        
        render: function () {
            // typically first time it is displayed so no check if visible
            TT.DISPLAY_UPDATES.pending_update(this);
        },
        
        rerender: function () {
            // state has changed so needs to be rendered again (if visible)
            if (this.visible()) {
                TT.DISPLAY_UPDATES.pending_update(this);
            }
        }

    };
}(window.TOONTALK));