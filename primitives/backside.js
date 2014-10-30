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
            var green_flag_element = document.createElement("div");
            var stop_sign_element  = document.createElement("div");
            var help_URL = widget.get_help_URL && widget.get_help_URL();
            var visible, original_width, original_height, width_at_resize_start, height_at_resize_start, 
                close_button, backside_widgets, help_button, help_frame, close_help_button;
            var update_flag_and_stop_sign_classes = function (running) {
                    if (running) {
                        $(green_flag_element).addClass   ("toontalk-green-flag-active")
                                             .removeClass("toontalk-green-flag-inactive");
                        $(stop_sign_element) .addClass   ("toontalk-stop-sign-inactive")
                                             .removeClass("toontalk-stop-sign-active");
                    } else {
                        $(green_flag_element).addClass   ("toontalk-green-flag-inactive")
                                             .removeClass("toontalk-green-flag-active");
                        $(stop_sign_element) .addClass   ("toontalk-stop-sign-active")
                                             .removeClass("toontalk-stop-sign-inactive");
                    }
            };
            var update_flag_and_sign_position = function () {
                    var backside_width  = $backside_element.width();
                    var backside_height = $backside_element.height();
                    var sign_width, close_button_width, green_flag_width;
                    if (backside_width === 0) {
                        // backside_element not yet added to the DOM
                        // should really listen to an event that it has been
                        setTimeout(update_flag_and_sign_position, 100);
                    } else {
                        sign_width = $(stop_sign_element) .width();
                        close_button_width = $(close_button).width();
                        if (close_button_width) {
                            close_button_width += 14; // needs a gap
                        } else {
                            close_button_width = 0; // width() may have returned null
                        }
                        $(stop_sign_element) .css({right: close_button_width});
                        $(green_flag_element).css({right: close_button_width+sign_width+6}); // smaller gap needed
                        if (help_button) {
                            green_flag_width = $(green_flag_element).width();
                            $(help_button).css({right: close_button_width+sign_width+green_flag_width+12});
                        }
                    }
            };
            var description_label = this.create_description_label(backside, widget);
            var close_title, close_handler;
            if (widget.close_button_ok(backside_element)) {
                close_handler = function (event) {
                                    backside.hide_backside(event);
                                    event.stopPropagation();
                };
                // title should be re-computed on mouseenter
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
            $(green_flag_element).addClass("toontalk-green-flag toontalk-green-flag-inactive")
                                 .click(function (event) {
                                            if (widget.can_run()) {
                                                update_flag_and_stop_sign_classes(true);
                                                widget.set_running(true);
                                            } else {
                                                if (widget.is_of_type('top-level')) {
                                                    TT.UTILITIES.display_message("There is nothing to run.");
                                                } else {
                                                    TT.UTILITIES.display_message("This " + widget + " has nothing to run. Add some robots on the back.");
                                                }
                                            }                                                                       
                                        })
                                 .on('mouseenter', function (event) {
                                                          var title;
                                                          if (widget.get_running()) {
                                                              title = "Click to stop this from running.";
                                                          } else if (widget.can_run()) {
                                                              title = "This has stopped. Click on the flag to start running it."; 
                                                          } else {
                                                              title = "There is nothing to run here.";
                                                          }
                                                          stop_sign_element.title = title;
                                                  });
            $(stop_sign_element) .addClass("toontalk-stop-sign toontalk-stop-sign-active")
                                 .click(function (event) {
                                            update_flag_and_stop_sign_classes(false);
                                            widget.set_running(false);                                                                          
                                        })
                                 .on('mouseenter', function (event) {
                                                          var title;
                                                          if (widget.get_running()) {
                                                              title = "To stop this click on the stop sign.";
                                                          } else if (widget.can_run()) {
                                                              title = "Click this to start this running."; 
                                                          } else {
                                                              title = "There is nothing to run on this.";
                                                          }
                                                          green_flag_element.title = title;
                                                  });
            backside_element.appendChild(green_flag_element);
            backside_element.appendChild(stop_sign_element);
            if (help_URL) {
                help_button = document.createElement("div");
                $(help_button).addClass("toontalk-help-button toontalk-widget-help-button")
                              .click(function (event) {
                                         help_frame = document.createElement("iframe");
                                         $(help_frame).addClass("toontalk-help-frame");
                                         help_frame.src = help_URL;
                                         document.body.appendChild(help_frame);
                                         document.body.appendChild(close_help_button);
                                     });
                help_button.innerHTML = 'i'; // like tourist info -- alternatively could use a question mark
                help_button.title = "Click to learn more about " + widget.get_type_name() + ".";
                close_help_button = document.createElement("div");
                $(close_help_button).addClass("toontalk-close-help-frame-button")
                                    .button()
                                    .click(function (event) {
                                               $(help_frame).remove();
                                               $(close_help_button).remove();
                                           });
                close_help_button.innerHTML = "Return to ToonTalk";
                backside_element.appendChild(help_button);
            };        
            if (description_label) {
                backside_element.appendChild(description_label); 
            }
            // wait for DOM to settle down
            TT.UTILITIES.set_timeout(update_flag_and_sign_position);
            $backside_element.addClass("toontalk-backside toontalk-side " + "toontalk-backside-of-" + widget.get_type_name());
            $backside_element.css({"z-index": TT.UTILITIES.next_z_index()});
            backside.get_element = function () {
                return backside_element;
            };
            backside.get_widget = function () {
                return widget;
            };
            backside.visible = function () {
                return visible;
            };
            backside.set_visible = function (new_value) {
                var backside_widgets = this.get_widget().get_backside_widgets();
                visible = new_value;
                backside_widgets.forEach(function (backside_widget) {
                        backside_widget.set_visible(new_value);
                });
            };
            if (!widget.get_backside) {
                // e.g. top-level backside
                widget.get_backside = function () {
                    return backside;
                };
            }
            if (!widget.removed_from_container) {
                widget.removed_from_container = function (other, backside_removed, event, ignore_if_not_on_backside) {
                    if (!TT.robot.in_training) {
                       // robots in training take care of this (and need to to record things properly)
                       this.remove_backside_widget(other, backside_removed, ignore_if_not_on_backside);
                    }
                };
            }
            backside.widget_dropped_on_me = 
                function (other, other_is_backside, event, robot, ignore_training) {
                    // event serves 2 functions: info for adjusting for scrolling and whether to update the display
                    // TODO: avoid all this work when not watched
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
                    if (this.is_of_type('top-level')) {
                        if (robot && !robot.visible()) {
                           $other_side_element.addClass("toontalk-widget-added-to-backside-by-unwatched-robot");
                        }   
                    } else if (!event) {
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
                    if (other.get_body && other.get_body().is_empty()) {
                        // automate the start of training
                        backside_of_other = other.open_backside();
                        if (backside_of_other) {
                            $(backside_of_other.get_element()).find(".toontalk-train-backside-button").click();
                        }
                    }
                    if (event) {
                        other.get_widget().backup_all();
                    }
                    return true;
                };
            backside.add_backside_widgets = function (backside_widgets, json_array)  {
                if (backside_widgets.length === 0) {
                    return;
                }
                // too soon to add these widgets so delay slightly
                TT.UTILITIES.set_timeout(
                    function () {
                        var widget_side_element, json_view;
                        var backside_visible = this.visible();
                        backside_widgets.forEach(function (backside_widget_side, index) {
                            var backside = backside_widget_side.get_widget().get_backside();
                            widget_side_element = backside_widget_side.get_element(true);
                            widget_side_element.toontalk_widget = backside_widget_side.get_widget();
                            if (json_array) {
                                json_view = json_array[index];
                                if (json_view) {
                                    if (backside_widget_side.is_backside()) {
                                        $(widget_side_element).css({left:   json_view.backside_left,
                                                                    top:    json_view.backside_top,
                                                                    width:  json_view.backside_width,
                                                                    height: json_view.backside_height});
                                        backside_widget_side.get_widget().apply_backside_geometry();
                                        if (json_view.advanced_settings_open) {
                                            backside.set_advanced_settings_showing(true, backside.get_element());
                                        } 
                                    } else {
                                        if (json_view.frontside_width  === 0) {
                                            json_view.frontside_width  = '';
                                        }
                                        if (json_view.frontside_height === 0) {
                                            json_view.frontside_height = '';
                                        }                                        
                                        $(widget_side_element).css({left:   json_view.frontside_left,
                                                                    top:    json_view.frontside_top,
                                                                    width:  json_view.frontside_width,
                                                                    height: json_view.frontside_height});
                                    }
                                }
                            }
                            $backside_element.append(widget_side_element);
                            backside_widget_side.set_visible(backside_visible);
                            backside_widget_side.get_widget().rerender();
                        });
                    }.bind(this));
            };
            backside.get_backside_dimensions = function () {
                if (x_scale) {
                    return {x_scale: x_scale, 
                            y_scale: y_scale, 
                            original_width:  original_width, 
                            original_height: original_height};
                }
            };
            backside.set_dimensions = function (dimensions) {
                x_scale = dimensions.x_scale;
                y_scale = dimensions.y_scale;
                original_width  = dimensions.original_width;
                original_height = dimensions.original_height;
            };
            backside.scale_to_fit = function (this_element, other_element) {
                var scales;
                if (!original_width && this.get_widget().backside_geometry) {
                    original_width  = this.get_widget().backside_geometry.original_width;
                    original_height = this.get_widget().backside_geometry.original_height;  
                }
                scales = TT.UTILITIES.scale_to_fit(this_element, other_element, original_width, original_height);
                x_scale = scales.x_scale;
                y_scale = scales.y_scale;
            };
            backside.run_status_changed = function (running) {
                update_flag_and_stop_sign_classes(running);
            };
            backside_element.toontalk_widget = widget;
            TT.UTILITIES.drag_and_drop(backside_element);
            $backside_element.resizable(
                {start: function () {
                    width_at_resize_start  = $backside_element.width();
                    height_at_resize_start = $backside_element.height();
                    if (!original_width) {
                        original_width  = width_at_resize_start;
                    }
                    if (!original_height) {
                        original_height = height_at_resize_start;
                    }
                },
                resize: function (event, ui) {
                    var current_width  = ui.size.width; 
                    var current_height = ui.size.height;
                    if ($backside_element.is(".toontalk-top-level-backside")) {
                        // top-level backside is not scaled
                        return;
                    }
//                  console.log({x_scale_change: current_width / width_at_resize_start,
//                               y_scale_change: current_height / height_at_resize_start});
                    x_scale *= current_width  / width_at_resize_start;
                    y_scale *= current_height / height_at_resize_start;
                    width_at_resize_start  = current_width;
                    height_at_resize_start = current_height;
//                     console.log(current_width + "x" + current_height + " and scale is " + x_scale + "x" + y_scale);
                    TT.backside.scale_backside($backside_element, x_scale, y_scale, original_width, original_height);
                },
                handles: "e,s,se"}); // was "n,e,s,w,se,ne,sw,nw" but interfered with buttons
            // following should be done by something like GWT's onLoad...
            // but DOMNodeInserted is deprecated and MutationObserver is only in IE11.
            // giving up on pre IE11 so use https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver
//             $backside_element.on('DOMNodeInserted', function (event) {
//                 var $source = $(event.originalEvent.srcElement);
//                 var owner_widget;
//                 if ($source.is(".toontalk-frontside") && $source.parent().is(".toontalk-backside")) {
//                     $source.addClass("toontalk-frontside-on-backside");
//                     if ($source.is(".ui-resizable")) {
//                         $source.resizable("enable");
//                     }
//                     owner_widget = TT.UTILITIES.widget_from_jquery($source);
//                     if (owner_widget) {
//                         owner_widget.render();
//                     }
//                 }
//                 event.stopPropagation();
//             });
//             $backside_element.on('DOMNodeRemoved', function (event) {
//                 var $source = $(event.originalEvent.srcElement);
//                 if ($source.is(".toontalk-frontside")) {
//                     $source.removeClass("toontalk-frontside-on-backside");
//                 }
//                 event.stopPropagation();
//             });
            backside_element.addEventListener("mouseenter", function (event) {
               var frontside = widget.get_frontside();
               var parent_of_backside = widget.get_parent_of_backside();
               if (frontside && (!parent_of_backside || parent_of_backside.get_widget().is_of_type('top-level'))) {
                   TT.UTILITIES.highlight_element(frontside.get_element(), event);
               }
            });
            backside_element.addEventListener("mouseout", function (event) {
               var frontside = widget.get_frontside();
               if (frontside) {
                   TT.UTILITIES.remove_highlight();
               }
            });
            backside.update_display = function () {
                // default -- some backsides do more and call this
                backside.display_updated();
            };
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

        toString: function () {
            return "backside of " + this.get_widget();
        },
                
        remove_element: function () {
            $(this.get_element()).remove();
        },
        
//         visible: function () {
//             var backside_element = this.get_element();
//             return (backside_element && $(backside_element).is(":visible"));
//         },
        
//         update_run_button_disabled_attribute: function () {
//             var backside_element = this.get_element();
//             var $run_button;
//             if (!backside_element) {
//                 return;
//             }
//             if ($(backside_element).is(".toontalk-top-level-backside")) {
//                 // has no buttons
//                 return;
//             }
//             $run_button = $(backside_element).find(".toontalk-run-backside-button");
//             $run_button.button("option", "disabled", !this.get_widget().can_run());
//             TT.backside.update_run_button($run_button);
//             return this;
//         },
        
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
        
        create_description_label: function (backside, widget) {
            var description = widget.get_description();
            if (description) {
               return TT.UTILITIES.create_text_element("Back side of a " + widget.get_type_name() + " that " + description);
            }
        },

        add_advanced_settings: function (always_show_advanced_settings) {
            var widget = this.get_widget();
            var check_box = this.create_infinite_stack_check_box(this, widget);
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
                                                             button_selector: ".toontalk-description-input"});
                    }
            };
            var settings = document.createElement("table");
            var backside_element = this.get_element();
            $(settings).addClass("toontalk-advanced-setting");
            $(description_text_area.button).val(widget.get_description());
            description_text_area.button.addEventListener('change', description_change);
            description_text_area.button.addEventListener('mouseout', description_change);
            $create_sensor_button.click(function (event) {
                    var sensor = TT.sensor.create('click', 'which', undefined, undefined, true, widget);
                    var sensor_frontside_element = sensor.get_frontside_element(true);
                    var initial_location = $create_sensor_button.offset();
                    widget.add_to_top_level_backside(sensor, true);
                    initial_location.left -= 120; // to the left of the button
                    TT.UTILITIES.set_absolute_position($(sensor_frontside_element), initial_location);
            });
            $create_sensor_button.attr('title', "Click to create a nest which receives messages when events happen to this " + widget.get_type_name() + ".");
            settings.appendChild(TT.UTILITIES.create_row(description_text_area.container));
            settings.appendChild(TT.UTILITIES.create_row($create_sensor_button.get(0), check_box.container));
            backside_element.appendChild(settings);
            if (always_show_advanced_settings) {
                $(backside_element).find(".toontalk-settings-backside-button").remove();
            } else {            
                $(backside_element).find(".toontalk-advanced-setting").hide();
            }
        },

       get_type_name: function () {
           return "the backside of " + TT.UTILITIES.add_a_or_an(this.get_widget().get_type_name());
       },
        
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
                                  top:  frontside_offset.top  - container_position.top,
                                  opacity: .1});                   
            };
            var record_backside_widget_positions = function () {
                var backside_widgets = widget.get_backside_widgets();
                var backside_widgets_json_views = widget.get_backside_widgets_json_views(true);
                var backside_widget_side_element;
                backside_widgets.forEach(function (backside_widget_side, index) {
                    var backside_widget = backside_widget_side.get_widget();
                    var position;
                    backside_widget_side_element = backside_widget.get_element();
                    if (backside_widget_side_element) {
                        if (!backside_widgets_json_views[index]) {
                            backside_widgets_json_views[index] = {};
                        }
                        if (backside_widget_side.start_position) {
                            position = backside_widget_side.start_position;
                            backside_widget_side.start_position = undefined;
                        } else {
                            position = $(backside_widget_side_element).position();
                        }
                        if (backside_widget_side.is_backside()) {
                            backside_widgets_json_views[index].backside_left = position.left;
                            backside_widgets_json_views[index].backside_top  = position.top;
                        } else {
                            backside_widgets_json_views[index].frontside_left = position.left;
                            backside_widgets_json_views[index].frontside_top  = position.top;                               
                        }
                    }
                });
            };
            var parent_of_backside = widget.get_parent_of_backside();
            TT.UTILITIES.remove_highlight();
            if (parent_of_backside) {
                if (parent_of_backside.is_backside()) {
                    widget.set_parent_of_backside(undefined, true);
                } else {
                    parent_of_backside.removed_from_container(widget, true, event, true);
                }
                // important to run the above before the following since otherwise backsides won't be there to remove
                if (widget.forget_backside) {
                    widget.forget_backside();
                }
            }
            record_backside_widget_positions();
            widget.backside_geometry = this.get_backside_dimensions();
            animate_disappearance($backside_element)
            if (!$(frontside_element).is(":visible")) {
                if (backside_position) {
                    $(frontside_element).css({left:  backside_position.left,
                                               top:  backside_position.top});
                }
                // needs to added to backside_widgets of top_level and parent links updated
                TT.UTILITIES.widget_from_jquery($backside_container).add_backside_widget(widget);
                $backside_container.append(frontside_element);
                widget.render();
            }
            if (widget.backside_widgets) {
                widget.backside_widgets.forEach(function (widget_side) {
                        widget_side.set_visible(false);
                });
            }
        },
        
        create_advanced_settings_button: function (backside, widget) {
            var buuton = document.createElement('div');
            var $settings_button = $(buuton);
            var settings_showing = false;
            buuton.innerHTML = '&gt;';
            $settings_button.addClass("toontalk-settings-backside-button");
            $settings_button.css({"z-index": TT.UTILITIES.next_z_index()});
            $settings_button.click(function (event) {
                    settings_showing = !settings_showing;
                    this.set_advanced_settings_showing(settings_showing, backside.get_element(), $settings_button);
                    event.stopPropagation();
            }.bind(this));
            $settings_button.attr("title", "Click to see the advanced settings of this " + widget.get_type_name() + ".");
            return $settings_button.get(0);
        },

        set_advanced_settings_showing: function (show, backside_element, $settings_button) {
            if (!$settings_button) {
                $settings_button = $(backside_element).find(".toontalk-settings-backside-button");  
            } 
            if (show) {
                $(backside_element).find(".toontalk-advanced-setting").show();
                $settings_button.html("<");
                $settings_button.attr("title", "Click to hide the advanced settings.");  
            } else {
                $(backside_element).find(".toontalk-advanced-setting").hide();
                $settings_button.html(">");
                $settings_button.attr("title", "Click to show the advanced settings.");    
            }
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
        },

        remove_backside_widget: function (widget, is_backside, ignore_if_not_on_backside) {
            return this.get_widget().remove_backside_widget(widget, is_backside, ignore_if_not_on_backside);
        },

        remove: function () {
            this.get_widget().remove();
        },

        is_backside: function () {
            return true;
        },

        is_of_type: function (type_name) {
            return this.get_widget().is_of_type(type_name);
        }

    };
}(window.TOONTALK));