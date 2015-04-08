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
            var settings_button, visible, original_width, original_height, width_at_resize_start, height_at_resize_start, 
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
                var sign_width, close_button_width, green_flag_width, help_button_width;
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
                    green_flag_width = $(green_flag_element).width();
                    if (help_button) {          
                        $(help_button).css({right: close_button_width+sign_width+green_flag_width+12});
                    }
                    if (settings_button) {
                        help_button_width = $(help_button).width() || 0;
                        $(settings_button).css({right: close_button_width+sign_width+green_flag_width+help_button_width+12});
                    }
                }
            };
            var description_label = this.create_description_label(backside, widget);
            var update_green_flag_title = function () {
                                              var title;
                                              if (widget.get_running()) {
                                                  title = "To stop this click on the stop sign.";
                                              } else if (widget.can_run()) {
                                                  title = "Click this to start this running."; 
                                              } else {
                                                  title = "There is nothing to run on this.";
                                              }
                                              TT.UTILITIES.give_tooltip(green_flag_element, title);
                                          };
            var update_stop_sign_title = function () {
                                             var title;
                                             if (widget.get_running()) {
                                                 title = "Click to stop this from running.";
                                             } else if (widget.can_run()) {
                                                 title = "This has stopped. Click on the flag to start running it."; 
                                             } else {
                                                 title = "There is nothing to run here.";
                                             }
                                             TT.UTILITIES.give_tooltip(stop_sign_element, title);
                                         };
            var close_title, close_handler, description_text_area;
            if (TT.TRANSLATION_ENABLED) {
                help_URL = TT.UTILITIES.add_URL_parameter(help_URL, "translate", "1");
            }
            if (widget.close_button_ok(backside_element)) {
                close_handler =
                    function (event) {
                        var do_after_closing = 
                            function () {
                                backside.hide_backside(event);   
                                if (widget.robot_in_training()) {
                                    widget.robot_in_training().backside_closed(widget);
                                }    
                            };
                        var backside_widgets, robot_found;
                        if (widget.get_running()) {
                            backside_widgets = widget.get_backside_widgets();
                            backside_widgets.some(function (backside_widget_side) {
                                // there should only be one robot running on the back
                                var backside_widget = backside_widget_side.get_widget();
                                if (backside_widget.is_robot()) {
                                   backside_widget.finish_cycle_immediately(do_after_closing);
                                   robot_found = true;
                                   return true;
                                }
                            });
                            if (!robot_found) {
                                console.log("Expected to find a robot on back of " + widget);
                                do_after_closing();
                            }
                            $backside_element.css({opacity: 1});
                            $backside_element.addClass("toontalk-animating-element");
                            $backside_element.css({opacity: 0});
                            // to do restore this
                        } else {
                            do_after_closing();
                        }
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
                                                update_stop_sign_title();
                                            } else {
                                                if (widget.is_top_level()) {
                                                    TT.UTILITIES.display_message("There is nothing to run.");
                                                } else {
                                                    TT.UTILITIES.display_message("This " + widget.get_type_name() + " has nothing to run. Add some robots on the back.");
                                                }
                                            }
                                            if (widget.robot_in_training()) {
                                                widget.robot_in_training().button_clicked(".toontalk-green-flag", widget);
                                            }
                                            event.stopPropagation();                                                                   
                                        })
                                 .on('mouseenter', update_stop_sign_title);
            $(stop_sign_element) .addClass("toontalk-stop-sign toontalk-stop-sign-active")
                                 .click(function (event) {
                                            update_flag_and_stop_sign_classes(false);
                                            widget.set_running(false);
                                            update_green_flag_title();
                                            if (widget.robot_in_training()) {
                                                widget.robot_in_training().button_clicked(".toontalk-stop-sign", widget);
                                            }  
                                            event.stopPropagation();                                                                     
                                        })
                                 .on('mouseenter', update_green_flag_title);
            backside_element.appendChild(green_flag_element);
            backside_element.appendChild(stop_sign_element);
            TT.UTILITIES.use_custom_tooltip(green_flag_element);
            TT.UTILITIES.use_custom_tooltip(stop_sign_element);
            if (help_URL) {
                help_button = document.createElement("div");
                // notranslate shouldn't be needed and is the older way of avoiding translation
                // see http://www.w3.org/International/questions/qa-translate-flag
                $(help_button).addClass("toontalk-help-button notranslate toontalk-widget-help-button")
                              .click(function (event) {
                                         help_frame = document.createElement("iframe");
                                         $(help_frame).addClass("toontalk-help-frame");
                                         help_frame.src = help_URL;
                                         document.body.appendChild(close_help_button);
                                         document.body.appendChild(help_frame);
                                         event.stopPropagation();
                                     });
                help_button.innerHTML = 'i'; // like tourist info -- alternatively could use a question mark
                help_button.translate = false; // should not be translated
                TT.UTILITIES.give_tooltip(help_button, "Click to learn more about " + widget.get_type_name(true, true) + ".");
                close_help_button = document.createElement("div");
                $(close_help_button).addClass("toontalk-close-help-frame-button")
                                    .button()
                                    .click(function (event) {
                                               $(help_frame).remove();
                                               $(close_help_button).remove();
                                               event.stopPropagation();
                                           });
                close_help_button.innerHTML = "Return to ToonTalk";
                backside_element.appendChild(help_button);
            };        
            if (description_label) {
                backside_element.appendChild(description_label); 
            }
            if (widget.is_top_level()) {
                settings_button = document.createElement("div");
                $(settings_button).addClass("toontalk-settings-button")
                                  .click(function (event) {
                                          widget.open_settings();
                                          event.stopPropagation();
                                  });
                TT.UTILITIES.give_tooltip(settings_button, "Click to change settings or open a different program.");   
                backside_element.appendChild(settings_button);         
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
                        if (new_value) {
                            backside_widget.render();
                        }
                });
            };
            if (!widget.get_backside) {
                // e.g. top-level backside
                widget.get_backside = function () {
                    return backside;
                };
            };
            backside.get_parent_of_backside = function () {
                return widget.get_parent_of_backside();
            };
            backside.get_parent_of_frontside = function () {
                return widget.get_parent_of_frontside();
            };
            backside.get_frontside = function () {
                return widget.get_frontside();
            };
            backside.get_frontside_element = function () {
                return widget.get_frontside_element();
            };
            backside.get_description_text_area = function () {
                return description_text_area;
            };
            backside.set_description_text_area = function (new_value) {
                description_text_area = new_value;
            };
            if (!widget.removed_from_container) {
                widget.removed_from_container = function (other, backside_removed, event, index, ignore_if_not_on_backside) {
                    if (!widget.robot_in_training()) {
                       // robots in training take care of this (and need to to record things properly)
                       this.remove_backside_widget(other, backside_removed, ignore_if_not_on_backside);
                    }
                };
            }
            backside.widget_dropped_on_me = 
                function (other, other_is_backside, event, robot, ignore_training) {
                    // event serves 2 functions: info for adjusting for scrolling and whether to update the display
                    // TODO: avoid all this work when not watched
                    var other_side, other_side_element, $other_side_element, backside_of_other;
                    if (TT.sounds && event) {
                        TT.sounds.drop.play();
                    }
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
                    if (this.get_widget().is_top_level()) {
                        if (robot && !robot.visible()) {
                           $other_side_element.addClass("toontalk-widget-added-to-backside-by-unwatched-robot");
                        }
                    }
                    TT.UTILITIES.set_position_is_absolute(other_side_element, true, event); // when on the backside
                    if (widget.robot_in_training() && !ignore_training && event) {
                        // delay this so it can record where the other was dropped
                        setTimeout(function () {
                             widget.robot_in_training().dropped_on(other, this, event); 
                        }.bind(this)) ;      
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
                    this.add_backside_widget(other, other_is_backside);
                    if (other.dropped_on_other) {
                        other.dropped_on_other(this.get_widget(), true, event, robot);
                    }
                    if (event && other.get_body && other.get_body().is_empty() && !other.being_trained) {
                        // automate the start of training
                        // delayed so position settles down (needed for touch events)
                        setTimeout(function () {
                                       backside_of_other = other.open_backside();
                                       if (backside_of_other) {
                                           $(backside_of_other.get_element()).find(".toontalk-train-backside-button").click();
                                       }    
                                   });           
                    }
                    if (event) {
                        other.get_widget().backup_all();
                    }
                    if (this.get_widget().is_ok_to_run() && !this.get_widget().get_running() && !this.get_widget().is_top_level()) {
                        // if a robot or widget with robots on the back is dropped on the back of something that has been told to run
                        // (but perhaps had nothing to run)
                        // so run the widget who just got a robot or widget on the back
                        this.get_widget().set_running(true);
                    }
                    return true;
                };
            backside.add_backside_widget =  
                function (widget, is_backside) {
                        return this.get_widget().add_backside_widget(widget, is_backside);
                };
            backside.add_backside_widgets = function (backside_widgets, json_array)  {
                if (backside_widgets.length === 0) {
                    return;
                }
                // too soon to add these widgets so delay slightly
                TT.UTILITIES.set_timeout(
                    function () {
                        var backside_visible = this.visible();
                        var widget_side_element, json_view, css;
                        backside_widgets.forEach(function (backside_widget_side, index) {
                            var backside = backside_widget_side.get_widget().get_backside();
                            widget_side_element = backside_widget_side.get_element();
                            widget_side_element.toontalk_widget = backside_widget_side.get_widget();
                            if (json_array) {
                                json_view = json_array[index];
                                if (json_view) {
                                    if (backside_widget_side.is_backside()) {
                                        css = {left:   json_view.backside_left,
                                               top:    json_view.backside_top,
                                               width:  json_view.backside_width,
                                               height: json_view.backside_height};
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
                                        css = {left:   json_view.frontside_left,
                                               top:    json_view.frontside_top,
                                               width:  json_view.frontside_width,
                                               height: json_view.frontside_height};
                                    }
                                    TT.UTILITIES.constrain_css_to_fit_inside(backside_element, css);
                                    $(widget_side_element).css(css);
                                }
                            }
                            $backside_element.append(widget_side_element);
                            backside_widget_side.set_visible(backside_visible);
                            backside_widget_side.get_widget().rerender();
                        });
                    }.bind(this));
            };
            backside.get_backside_dimensions = function () {
                if (x_scale !== 1 || y_scale !== 1) {
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
                if (frontside && (!parent_of_backside || parent_of_backside.get_widget().is_top_level())) {
                    TT.UTILITIES.highlight_element(frontside.get_element());
                }
            });
            backside_element.addEventListener("mouseleave", function (event) {
               if (!widget.is_top_level()) {
                   TT.UTILITIES.remove_highlight();
               }
            });
            backside.update_display = function () {
                // default -- some backsides do more and call this
                var description_text_area = this.get_description_text_area();
                var description;
                if (description_text_area) {
                    description = this.get_widget().get_description();
                    if (description) {
                        description_text_area.button.value = description;
                    }
                }
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
            $(check_box.button).click(function (event) {
                var infinite_stack = check_box.button.checked;
                var action_string;
                widget.set_infinite_stack(infinite_stack);
                if (widget.robot_in_training()) {
                    if (infinite_stack) {
                        action_string = "change dragging to make a copy of ";
                    } else {
                        action_string = "change dragging back to moving for ";
                    }
                    widget.robot_in_training().edited(widget, {setter_name: "set_infinite_stack",
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
               return TT.UTILITIES.create_text_element("I'm the back side of a " + widget.get_type_name() + " that is " + description);
            }
        },

        add_advanced_settings: function (always_show_advanced_settings) {
            var widget = this.get_widget();
            var check_box = this.create_infinite_stack_check_box(this, widget);
            var type_name = widget.get_type_name();
            var drop_handler = 
                function (event) {
                    var dropped = TT.UTILITIES.input_area_drop_handler(event, widget.receive_description_from_dropped.bind(widget));
                    if (dropped && widget.robot_in_training()) {
                        widget.robot_in_training().dropped_on_text_area(dropped, widget, {area_selector: ".toontalk-description-input",
                                                                                    setter: 'receive_description_from_dropped',
                                                                                    toString: "for a widget's description"});
                    }
                };
            var description_text_area = TT.UTILITIES.create_text_area(widget.get_description(), 
                                                                      "toontalk-description-input", 
                                                                      "I'm ",
                                                                      "Type here to provide additional information about this " + type_name + ".",
                                                                      drop_handler);
            var $make_sensor_nest_button    = $("<button>Make a sensor nest</button>")  .button();
            var $make_function_bird_button  = $("<button>Make a function bird</button>").button();
            var description_change = function () {
                    var description = description_text_area.button.value.trim();
                    if (widget.set_description(description, true) && widget.robot_in_training()) {
                        widget.robot_in_training().edited(widget, {setter_name: "set_description",
                                                             argument_1: description,
                                                             toString: "change the description to '" + description + "'' of the " + type_name,
                                                             button_selector: ".toontalk-description-input"});
                    }
            };
            var settings = document.createElement("table");
            var backside_element = this.get_element();
            var add_new_widget_to_backside = function (new_widget, $button) {
                var parent_backside = widget.get_parent_of_frontside();
                var widget_frontside_element = new_widget.get_frontside_element(true);
                var initial_location, parent_backside_element;
                if (parent_backside && !parent_backside.get_widget().is_top_level()) {
                    // following works for back of a top-level widget but the placement isn't as good
                    parent_backside.add_backside_widget(new_widget);
                    parent_backside_element = parent_backside.get_element();
                    parent_backside_element.appendChild(widget_frontside_element);
                    initial_location = $(parent_backside_element).offset();
                    initial_location.top += $(parent_backside_element).height()*.6;
                } else {
                    // place the widget near the button
                    widget.add_to_top_level_backside(new_widget, false);
                    initial_location = $button.offset();
                    initial_location.left -= 120; // to the left of the button
                    if (initial_location.left < 0) {
                        // don't go off edge
                        initial_location.left = 0;
                    }
                }
                TT.UTILITIES.set_absolute_position($(widget_frontside_element), initial_location); 
            };
            $(settings).addClass("toontalk-advanced-setting");
            $(description_text_area.button).val(widget.get_description());
            description_text_area.button.addEventListener('change',   description_change);
            description_text_area.button.addEventListener('mouseout', description_change);
            this.set_description_text_area(description_text_area);
            $make_sensor_nest_button
                .addClass("toontalk-make-sensor_nest_button")
                .click(function (event) {
                    var sensor = TT.sensor.create('click', 'which', undefined, undefined, true, widget);
                    add_new_widget_to_backside(sensor, $make_sensor_nest_button);
                    if (widget.robot_in_training()) {
                        widget.robot_in_training().created_widget(sensor, widget, ".toontalk-make-sensor_nest_button");
                    }
                    event.stopPropagation();
            });
            $make_sensor_nest_button.attr('title', "Click to create a nest which receives messages when events happen to this " + widget.get_type_name() + ".");
            $make_function_bird_button
                .addClass("toontalk-make-function_bird_button")
                .click(function (event) {
                    var function_bird = TT.bird.create_function(type_name);
                    add_new_widget_to_backside(function_bird, $make_function_bird_button);
                    if (widget.robot_in_training()) {
                        widget.robot_in_training().created_widget(function_bird, widget, ".toontalk-make-function_bird_button");
                    }
                    event.stopPropagation();
            });
            if (widget.is_number()) {
                // will implement more functions (e.g. for string elements and boxes)
                $make_function_bird_button.attr('title', "Click to get a bird that flies to functions of " + widget.get_type_name(true) + ".");
            } else {
                $make_function_bird_button.attr('title', "There are no functions that operate on " + widget.get_type_name(true) + " (yet).");
                $make_function_bird_button.button("option", "disabled", true);  
            }
            settings.appendChild(TT.UTILITIES.create_row(description_text_area.container));
            settings.appendChild(TT.UTILITIES.create_row($make_sensor_nest_button.get(0), $make_function_bird_button.get(0), check_box.container));
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
                        // robot may have opened the backside and then removed the widget itself
                        return;
                    }
                    if ($element.css('opacity') === "0") {
                        // could be caused by closing while robots were running so
                        // became fully transparent
                        $element.removeClass("toontalk-animating-element");
                        $element.remove();
                        return;
                    }
                    $element.addClass("toontalk-side-appearing");
                    TT.UTILITIES.add_one_shot_event_handler($element.get(0), 'transitionend', 2500, remove_element);
                    if (!container_position) {
                        container_position = {left: 0, 
                                               top: 0};
                    }
                    $element.css({left: frontside_offset.left-container_position.left,
                                  top:  frontside_offset.top -container_position.top,
                                  opacity: .1});                   
            };
            var record_backside_widget_positions = function () {
                var backside_widgets = widget.get_backside_widgets();
                var backside_widgets_json_views = widget.get_backside_widgets_json_views(true);
                var backside_widget_side_element;
                backside_widgets.forEach(function (backside_widget_side, index) {
                    var backside_widget = backside_widget_side.get_widget();
                    var position;
                    backside_widget_side_element = backside_widget_side.get_element();
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
            var container_widget;
            TT.UTILITIES.remove_highlight();
            if (parent_of_backside) {
                if (parent_of_backside.is_backside()) {
                    widget.set_parent_of_backside(undefined, true);
                } else {
                    parent_of_backside.removed_from_container(widget, true, event, undefined, true);
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
                // frontside needs to be added to backside container
                container_widget = TT.UTILITIES.widget_from_jquery($backside_container);
                if (container_widget) {
                    container_widget.add_backside_widget(widget);
                    $backside_container.append(frontside_element);
                    widget.render();
                }
            }
            if (widget.backside_widgets) {
                widget.backside_widgets.forEach(function (widget_side) {
                        widget_side.set_visible(false);
                });
            }
            if (widget.on_backside_hidden) {
                widget.on_backside_hidden();
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
                    if (widget.robot_in_training()) {
                        widget.robot_in_training().button_clicked(".toontalk-settings-backside-button", backside);   
                    }
            }.bind(this));
            TT.UTILITIES.give_tooltip($settings_button.get(0), "Click to see the advanced settings of this " + widget.get_type_name() + ".");
            return $settings_button.get(0);
        },

        set_advanced_settings_showing: function (show, backside_element, $settings_button) {
            if (!$settings_button) {
                $settings_button = $(backside_element).find(".toontalk-settings-backside-button");  
            } 
            if (show) {
                $(backside_element).find(".toontalk-advanced-setting").show();
                $settings_button.html("<");
                TT.UTILITIES.give_tooltip($settings_button.get(0), "Click to hide the advanced settings.");  
            } else {
                $(backside_element).find(".toontalk-advanced-setting").hide();
                $settings_button.html(">");
                TT.UTILITIES.give_tooltip($settings_button.get(0), "Click to show the advanced settings.");    
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
                                      "transform-origin": "left top", 
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

        get_parent: function () {
            return this.get_parent_of_backside();
        },

        is_of_type: function (type_name) {
            return this.get_widget().is_of_type(type_name);
        },

        save_dimensions: function () {
            // TODO: later support robots moving around backsides
            return false;
        }

    };
}(window.TOONTALK));