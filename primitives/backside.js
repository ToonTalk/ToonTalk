 /**
 * Implements ToonTalk's backside of a widget
 * Authors: Ken Kahn
 * License: New BSD
 */
 
/*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */

window.TOONTALK.backside = 
(function (TT) {
    "use strict";
    var record_backside_widget_positions = function (backside) {
        var widget = backside.get_widget();
        var backside_widgets = widget.get_backside_widgets();
        var backside_widgets_json_views = widget.get_backside_widgets_json_views(true);
        var backside_dimensions = backside.get_backside_dimensions();
        var backside_element = backside.get_element();
        var x_scale = backside_dimensions ? backside_dimensions.x_scale : 1;
        var y_scale = backside_dimensions ? backside_dimensions.y_scale : 1;
        backside_widgets.forEach(function (backside_widget_side, index) {
            var backside_widget_side_element = backside_widget_side.get_element();
            var position;
            if (backside_widget_side_element) {
                if (!backside_widgets_json_views[index]) {
                    backside_widgets_json_views[index] = {};
                }
                if (backside_widget_side.start_offset && backside_widget_side_element.parentElement) {
                    position = TT.UTILITIES.relative_position_from_absolute_position(backside_widget_side_element.parentElement, backside_widget_side.start_offset);
                    backside_widget_side.start_offset = undefined;
                } else {
                    position = $(backside_widget_side_element).position();
                }
                if (backside_widget_side.is_backside()) {
                    backside_widgets_json_views[index].backside_left = TT.UTILITIES.left_as_percent(position.left, backside_widget_side_element);
                    backside_widgets_json_views[index].backside_top  = TT.UTILITIES.top_as_percent (position.top,  backside_widget_side_element);
                    record_backside_widget_positions(backside_widget_side);
                } else {
                    backside_widgets_json_views[index].frontside_left = TT.UTILITIES.left_as_percent(position.left, backside_widget_side_element, backside_element);
                    backside_widgets_json_views[index].frontside_top  = TT.UTILITIES.top_as_percent (position.top,  backside_widget_side_element, backside_element);     
                }
            }
        });
    };
    return {
        create: function (widget) {
            var backside = Object.create(this);
            var backside_element = document.createElement('div');
            var $backside_element = $(backside_element);
            var x_scale = 1; // so can shrink this down
            var y_scale = 1;
            var green_flag_element = document.createElement('div');
            var stop_sign_element  = document.createElement('div');
            var help_URL = widget.get_help_URL && widget.get_help_URL();
            var erased, parent, parent_is_backside, settings_button, visible,
                original_width, original_height, original_x_scale, original_y_scale, width_at_resize_start, height_at_resize_start, 
                close_button, backside_widgets, help_button, help_frame, close_help_button;
            var update_flag_and_stop_sign_classes = function (running) {
                if (running) {
                    $(green_flag_element).addClass   ("toontalk-green-flag-active toontalk-button")
                                         .removeClass("toontalk-green-flag-inactive toontalk-button");
                    $(stop_sign_element) .addClass   ("toontalk-stop-sign-inactive toontalk-button")
                                         .removeClass("toontalk-stop-sign-active toontalk-button");
                } else {
                    $(green_flag_element).addClass   ("toontalk-green-flag-inactive toontalk-button")
                                         .removeClass("toontalk-green-flag-active toontalk-button");
                    $(stop_sign_element) .addClass   ("toontalk-stop-sign-active toontalk-button")
                                         .removeClass("toontalk-stop-sign-inactive toontalk-button");
                }
            };
            var description_label = this.create_description_label(backside, widget);
            var update_green_flag_title = function () {
                                              var title;
                                              if (widget.get_running()) {
                                                  title = "To stop this click on the stop sign " + 
                                                          TT.UTILITIES.encode_HTML_for_title("<span class='toontalk-stop-sign-icon'></span>");
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
                                                 title = "This has stopped. Click on the flag " +
                                                         TT.UTILITIES.encode_HTML_for_title("<span class='toontalk-green-flag-icon'></span>") + 
                                                         " to start running it."; 
                                             } else {
                                                 title = "There is nothing to run here.";
                                             }
                                             TT.UTILITIES.give_tooltip(stop_sign_element, title);
                                         };
            var green_flag_clicked = function (event) {
                                         if (widget.can_run()) {
                                             update_flag_and_stop_sign_classes(true);
                                             widget.set_running(true);
                                             update_stop_sign_title();
                                             TT.DEFAULT_QUEUE.start();
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
                                     };
            var stop_sign_clicked = function (event) {
                                        update_flag_and_stop_sign_classes(false);
                                        widget.set_running(false);
                                        update_green_flag_title();
                                        if (widget.robot_in_training()) {
                                            widget.robot_in_training().button_clicked(".toontalk-stop-sign", widget);
                                        }  
                                        event.stopPropagation();
                                        if (widget.is_top_level()) {
                                            TT.UTILITIES.stop_audio_objects();
                                        }                                                                    
                                    };
            var help_button_clicked = function (event) {
                                          if (relative_URL) {
                                              // is a relative path so no problem with iframes
                                              help_frame = document.createElement("iframe");
                                              $(help_frame).addClass("toontalk-help-frame");
                                              help_frame.src = help_URL;
                                              document.body.appendChild(close_help_button);
                                              document.body.appendChild(help_frame);
                                              event.stopPropagation();
                                          } else {
                                              // need to work around:
                                              // Refused to display 'https://developer.mozilla.org/en-US/docs/Web/CSS/transform#rotate' in a frame because it set 'X-Frame-Options' to 'DENY'.
                                              help_button.href = help_URL;
                                              help_button.target = '_blank';
                                          }
                                      };
            var close_title, close_handler, description_text_area, name_text_input, relative_URL, widget_HTML;
            if (TT.TRANSLATION_ENABLED && help_URL) {
                help_URL = TT.UTILITIES.add_URL_parameter(help_URL, "translate", "1");
            }
            if (widget.close_button_ok(backside_element)) {
                close_handler =
                    function (event) {
                        var do_after_closing = 
                            function () { 
                                if (widget.robot_in_training() && widget.robot_in_training() !== widget) {
                                    // ignore a robot training a robot that closes the trainee's backside
                                    widget.robot_in_training().backside_closed(backside);
                                }
                                if (backside.is_primary_backside()) {
                                    backside.hide_backside(event);
                                } else {
                                    backside.remove();
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
                                   robot_found = backside_widget;
                                   return true;
                                }
                            });
                            if (robot_found) {   
                                // restore visibility after robot is finished
                                robot_found.add_body_finished_listener(function () {
                                       if (robot_found.visible()) {
                                           $backside_element.css({opacity: 1});
                                       } else {
                                           widget.forget_backside();
                                           // backside closed while robot was running so make sure queue is still active
                                           TT.DEFAULT_QUEUE.start();
                                       }
                                       do_after_closing();
                                });
                                // but let robots and birds "know" that this is "hidden"
                                backside.set_visible(false);
                            } else {
                                do_after_closing();
                            }
                            $backside_element.css({opacity: 1});
                            // animate it becoming invisible
                            $backside_element.addClass("toontalk-animating-element");
                            $backside_element.css({opacity: 0});
                            TT.UTILITIES.add_one_shot_event_handler(backside_element,
                                                                    'transitionend',
                                                                    2000,
                                                                    function () {
                                                                        widget.forget_backside();
                                                                    });
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
                close_title = "Click to remove this backside of " + close_title + ".";
                close_button = TT.UTILITIES.create_close_button(close_handler, close_title);
                backside_element.appendChild(close_button);
            }
            $(green_flag_element).addClass("toontalk-green-flag toontalk-green-flag-inactive");
            green_flag_element.addEventListener('click', green_flag_clicked);
            green_flag_element.addEventListener('mouseenter', update_stop_sign_title);
            $(stop_sign_element).addClass("toontalk-stop-sign toontalk-stop-sign-active");
            stop_sign_element.addEventListener('click', stop_sign_clicked);
            stop_sign_element.addEventListener('mouseenter', update_green_flag_title);
            backside_element.appendChild(green_flag_element);
            backside_element.appendChild(stop_sign_element);
            TT.UTILITIES.use_custom_tooltip(green_flag_element);
            TT.UTILITIES.use_custom_tooltip(stop_sign_element);
            if (help_URL) {
                relative_URL = help_URL.indexOf("://") < 0;
                help_button = document.createElement(relative_URL ? 'div' : "a");
                // notranslate shouldn't be needed and is the older way of avoiding translation
                // see http://www.w3.org/International/questions/qa-translate-flag
                $(help_button).addClass("toontalk-help-button notranslate toontalk-widget-help-button");
                help_button.addEventListener('click', help_button_clicked);
                help_button.innerHTML = 'i'; // like tourist info -- alternatively could use a question mark
                help_button.translate = false; // should not be translated
                TT.UTILITIES.give_tooltip(help_button, "Click to learn more about " + widget.get_type_name(true, true) + ".");
                close_help_button = document.createElement('div');
                $(close_help_button).addClass("toontalk-close-help-frame-button")
                                    .button();
                close_help_button.addEventListener('click',
                                                   function (event) {
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
                settings_button = document.createElement('div');
                $(settings_button).addClass("toontalk-settings-button");
                settings_button.addEventListener('click', 
                                                 function (event) {
                                                      widget.open_settings();
                                                      event.stopPropagation();
                                                 });  
                backside_element.appendChild(settings_button); 
                TT.UTILITIES.give_tooltip(settings_button, "Click to change settings or open a different program.");        
            }
            $backside_element.addClass("toontalk-backside toontalk-side " + "toontalk-backside-of-" + widget.get_type_name());
            $backside_element.css({"z-index": TT.UTILITIES.next_z_index()});
            TT.UTILITIES.when_attached(backside_element,
                                       function () {
                                            var new_title, container;
                                            if (backside.inside_conditions_container()) {
                                                // if in a condition then hide my buttons
                                                $(green_flag_element).hide();
                                                $(stop_sign_element).hide();
                                                $(help_button).hide();
                                                $(close_button).hide();
                                                // and use my description as the tool tip
                                                new_title = "This will match " + backside.toString() + ".";
                                                backside.rerender();                                                       
                                            } else if (widget.is_robot()) {
                                                new_title = "On the back of the robot you can change the conditions and setting of the robot.";
                                            } else if (widget.is_top_level()) {
                                                new_title = "This is a work area where you can drag things.";     
                                            } else {
                                                widget_HTML = widget.toString({inside_tool_tip: true}); 
                                                new_title = "You are pointing to the back of " + TT.UTILITIES.add_a_or_an(widget_HTML) + 
                                                            ". You can put robots on the back to make it come 'alive'."; 
                                            }
                                            TT.UTILITIES.give_tooltip(backside_element, new_title);
                                       });
            backside.get_element = function () {
                return backside_element;
            };
            backside.get_backside_element = function () {
                return backside_element; 
            };
            backside.get_widget = function () {
                return widget;
            };
            backside.visible = function () {
                if (document.hidden) {
                    // e.g. window is minimised
                    return false;
                }
                return visible;
            };
            backside.set_visible = function (new_value) {
                // tried to return if no change if visibility but then loading backside of robot lost its conditions
                visible = new_value;
                if (widget.is_top_level()) {
                    // no point doing the rest for top-level backsides
                    return;
                }
                if (!this.is_primary_backside()) {
                    return;
                }
                this.get_widget().get_backside_widgets().forEach(function (backside_widget) {
                        if (backside_widget && backside_widget !== this) {
                            backside_widget.set_visible(new_value);
                        }
                }.bind(this));
                if (visible) {
                    this.render();
                }
            };
            backside.get_erased = function () {
                return erased;
            };
            backside.set_erased = function (new_value, update_now, dont_ignore_conditions) {
                if (new_value && !dont_ignore_conditions && !this.inside_conditions_container()) {
                    // ignore erasures if not in a condition container
                    return;
                }
                erased = new_value;
                if (update_now) {
                    this.rerender();
                }
            };
            if (!widget.get_backside) {
                // e.g. top-level backside
                widget.get_backside = function () {
                    return backside;
                };
            };
            backside.is_primary_backside = function () {
                return this === this.get_widget().get_backside();
            };
            backside.inside_conditions_container = function () {
                return $(this.get_element()).closest(".toontalk-conditions-panel, .toontalk-conditions-container").is("*");
            };
            backside.get_width = function () {
                return TT.UTILITIES.get_element_width (this.get_element());
            };
            backside.get_height = function () {
                return TT.UTILITIES.get_element_height(this.get_element());
            };
            backside.is_widget = true; // perhaps should be renamed is_widget_side
            backside.get_parent_of_backside = function () {
                // the primary backside is the one created by clicking on a widget
                // in order for robots to run efficiently unwatched some widgets have never created their backside
                // and yet it is the parent of backside widgets so the widget itself keeps track of backside parents
                // non-primary backsides can be created by sensors or the magic wand and they know their parent via the 'parent' closure variable
                if (this.is_primary_backside()) {
                    return widget.get_parent_of_backside();
                }
                if (parent_is_backside && parent) {
                    return parent.get_backside(true);
                }
                return parent;
            };
            backside.set_parent_of_backside = function (new_parent, is_backside) {
                if (!new_parent && parent && parent_is_backside) {
                    parent.remove_backside_widget(this, true);
                }
                if (this.is_primary_backside()) {
                    // widget needs to keep track of backside parent in case backside doesn't need to be instantiated 
                    widget.set_parent_of_backside(new_parent, is_backside);
                }
                parent = new_parent;
                parent_is_backside = is_backside;
            };
            backside.get_parent_of_frontside = function () {  
                return widget.get_parent_of_frontside();
            };
            backside.is_parent_backside = function () {
                return widget.is_parent_backside();
            };
            backside.get_frontside = function (create) {
                return widget.get_frontside(create);
            };
            backside.get_frontside_element = function (create) {
                return widget.get_frontside_element(create);
            };
            backside.get_description_text_area = function () {
                return description_text_area;
            };
            backside.set_description_text_area = function (new_value) {
                description_text_area = new_value;
            };
            backside.get_name_text_input = function () {
                return name_text_input;
            };
            backside.set_name_text_input = function (new_value) {
                name_text_input = new_value;
            };
            backside.removed_from_container = function (side_of_other, event, index, ignore_if_not_on_backside) {
                if (!backside.get_widget().robot_in_training()) {
                    // robots in training take care of this (and need to record things properly)
                    this.remove_backside_widget(side_of_other, ignore_if_not_on_backside);
                }
            };
            backside.drop_on = function (side_of_other, event, robot) {
                return side_of_other.widget_side_dropped_on_me(this, event, robot);
            };
            backside.widget_side_dropped_on_me = 
                function (side_of_other, event, robot, ignore_training) {
                    // event serves 2 functions: info for adjusting for scrolling and whether to update the display
                    // undefined if this is done by a robot
                    var other, side_of_other_element, backside_of_other, widget_offset;
                    if (robot && !robot.visible() && !this.visible()) {
                        this.add_backside_widget(side_of_other);
                        if (side_of_other.dropped_on_other) {
                            side_of_other.dropped_on_other(this, event, robot);
                        }
                        return; 
                    }
                    if (this.visible()) {
                        if (TT.sounds && event) {
                            TT.sounds.drop.play();
                        }
                        side_of_other_element = side_of_other.get_element(this.visible());
                        side_of_other.rerender();
                        if (event) {
                            backside_element.appendChild(side_of_other_element);
                            TT.UTILITIES.set_position_is_absolute(side_of_other_element, true, event); // when on the backside
                        } else {
                            if (robot) {
                                widget_offset = $(robot.get_frontside_element()).offset();
                            }
                            if (!widget_offset) {
                                // no robot or robot not visible
                                widget_offset = $(side_of_other_element).offset();
                            }
                            backside_element.appendChild(side_of_other_element);
                            if (widget_offset && (widget_offset.left !== 0 || widget_offset.top !== 0)) {
                                TT.UTILITIES.set_absolute_position(side_of_other_element, widget_offset);
                            }
                        }
                    }
                    if (this.get_widget().is_top_level()) {
                        if (robot && !robot.visible()) {
                            // TODO: determine if this is not visible when side_of_other_element is undefined
                            $(side_of_other_element).addClass("toontalk-widget-added-to-backside-by-unwatched-robot");
                        }
                        if (event && !side_of_other.is_backside() && !side_of_other.is_sensor()) {
                            window.dispatchEvent(TT.UTILITIES.create_event('widget added', {element_widget: side_of_other_element,
                                                                                            here: 'back'}));
                        }
                    }
                    if (widget.robot_in_training() && !ignore_training && event) {
                        // delay this so it can record where the other was dropped
                        setTimeout(function () {
                             widget.robot_in_training().dropped_on(side_of_other, this, event); 
                        }.bind(this)) ;      
                    }
                    if (side_of_other.is_backside() && side_of_other.get_widget().is_element() && widget.is_element()) {
                        // When an element backside is dropped on another element backside it is treated as an "anima-gadget"
                        // where its properties apply to the widget whose back it was dropped on
                        // We need to remove the front of side_of_other since it is being used as an anima-gadget
                        // This is not permanent since it can be recreated by removing the backside from this backside
                        other = side_of_other.get_widget();
                        other.set_backside(undefined); // don't remove side_of_other
                        // following does too much if the widget knows its backside
                        // so temporarily removed
                        other.remove(event);
                        other.set_backside(side_of_other);
                    }
                    this.add_backside_widget(side_of_other);
                    if (side_of_other.dropped_on_other) {
                        side_of_other.dropped_on_other(this, event, robot);
                    }
                    if (event && side_of_other.get_body && side_of_other.get_body().is_empty() && !side_of_other.being_trained) {
                        // automate the start of training
                        // delayed so position settles down (needed for touch events)
                        setTimeout(function () {
                                       backside_of_other = side_of_other.open_backside();
                                       if (backside_of_other) {
                                           $(backside_of_other.get_element()).find(".toontalk-train-backside-button").click();
                                       }    
                                   });           
                    } else if (event && !side_of_other.is_backside() && this.get_frontside_element() && !side_of_other.is_sensor()) {
                        // don't dispatch when a fresh robot is dropped since the robot may be working with the sensor nest
                        this.get_frontside_element().dispatchEvent(TT.UTILITIES.create_event('widget added', {element_widget: side_of_other_element,
                                                                                                              where: 'back'}));
                    }
                    if (event) {
                        side_of_other.get_widget().backup_all();
                    }
//                     if (this.get_widget().is_ok_to_run() && !this.get_widget().get_running() && !this.get_widget().is_top_level()) {
//                         // if a robot or widget with robots on the back is dropped on the back of something that has been told to run
//                         // (but perhaps had nothing to run)
//                         // so run the widget who just got a robot or widget on the back
//                         this.get_widget().set_running(true);
//                     }
                    if (!side_of_other.is_backside() && side_of_other.is_robot() && this.get_widget().get_running() && !this.is_top_level()) {
                        this.get_widget().set_running(true);
                    }
                    return true;
                };
            backside.add_backside_widget = function (widget_side) {
                return this.get_widget().add_backside_widget(widget_side);
            };
            backside.add_backside_widgets = function (backside_widgets, json_array)  {
                var current_backside_widgets;
                if (backside_widgets.length === 0) {
                    return;
                }
                // create a copy of the list since it will be reset by the time the time out runs
                current_backside_widgets = backside_widgets.slice();
                // too soon to add these widgets so delay slightly
                // with no delay or too small a delay then sometimes things on nests are displayed without the correct z-index
                // so the nest name is drawn on top of the nest contents
                TT.UTILITIES.set_timeout(
                    function () {
                        var backside_visible = this.visible();
                        var backside_element = this.get_element();
                        var widget_side_element, backside, json_view, css;
                        current_backside_widgets.forEach(function (backside_widget_side, index) {
                            if (!backside_widget_side) {
                                return;
                            }
                            if (TT.debugging && backside_widget_side.get_widget() === widget) {
                                TT.UTILITIES.report_internal_error("Adding to backside itself or its backside!");
                                // try to repair things
                                backside_widgets.splice(index, 1);
                                return;
                            }
                            if (json_array) {
                                json_view = json_array[index];
                            }
                             // true was backside_visible but this meant that the layout of widgets on the backside of a backside wasn't recreated
                             // creating these elements on load time is small constant overhead -- it when robots are running unwatched that we need to be sure
                             // that front or backsides are created only if needed
                            widget_side_element = backside_widget_side.get_element(true);
                            if (!widget_side_element.parentElement) {
                                // needs to be added to backside element
                                backside_element.appendChild(widget_side_element);
                            }
                            widget_side_element.toontalk_widget_side = backside_widget_side;
                            if (json_view) {
                                if (backside_widget_side.is_backside()) {
                                    backside = backside_widget_side.get_widget().get_backside(true);
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
                                           // if dimensions set by transforms then don't explicitly set width and height here
                                           // perhaps should check that transforms include scaling transforms
                                           width:  widget_side_element.style.transform ? "" : (json_view.frontside_width  || json_view.saved_width),
                                           height: widget_side_element.style.transform ? "" : (json_view.frontside_height || json_view.saved_height)};
                                }
                                TT.UTILITIES.constrain_css_to_fit_inside(backside_element, css);
                                $(widget_side_element).css(css);                              
                            }
                            backside_widget_side.set_visible(backside_visible);
                            backside_widget_side.get_widget().rerender();
                        });
                    }.bind(this),
                    100);
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
                // if CSS of toontalk-backside changes then change the following numbers
                var scales = TT.UTILITIES.scale_to_fit(this_element, other_element, 550, 200);
                x_scale = scales.x_scale;
                y_scale = scales.y_scale;
            };
            backside.scale_to = function (new_width, new_height) {
                // if CSS of toontalk-backside changes then change the following numbers
                var scales = TT.UTILITIES.scale_element(this.get_element(true), new_width, new_height, 550, 200);
                x_scale = scales.x_scale;
                y_scale = scales.y_scale;  
            };
            backside.get_original_width = function () {
                return original_width;
            };
            backside.get_original_height = function () {
                return original_height;
            };
            backside.run_status_changed = function (running) {
                update_flag_and_stop_sign_classes(running);
            };
            TT.UTILITIES.when_attached(backside_element, 
                                       function () {
                                            var backside_width, backside_height, sign_width, close_button_width, green_flag_width, help_button_width;
                                            backside_width  = TT.UTILITIES.get_element_width (backside_element);
                                            backside_height = TT.UTILITIES.get_element_height(backside_element);
                                            // following used for CSS so use CSS width rather than true width (if scaled)
                                            sign_width = $(stop_sign_element).width();
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
                                                TT.UTILITIES.use_custom_tooltip(help_button);
                                            }
                                            if (settings_button) {
                                                help_button_width = $(help_button).width() || 0;
                                                $(settings_button).css({right: close_button_width+sign_width+green_flag_width+help_button_width+12});
                                            }
                                            if (close_button) {
                                                TT.UTILITIES.use_custom_tooltip(close_button);
                                            }
                                       });
//             backside.update_flag_and_sign_position = function (call_count) {
//                 var backside_width, backside_height, sign_width, close_button_width, green_flag_width, help_button_width;
//                 if (!TOONTALK.UTILITIES.visible_element(backside_element)) {
//                     // backside_element not yet added to the DOM
//                     // TODO: should really listen to an event when it is added to the DOM
//                     if (call_count === undefined) {
//                         call_count = 1;
//                     }
//                     if (call_count < 100) {
//                         // othewise give up -- can't take 10 seconds to be added to DOM
//                         setTimeout(function () {
//                                         this.update_flag_and_sign_position(call_count+1);
//                                    }.bind(this), 
//                                    100);
//                     }
//                 } else {
//                     backside_width  = $backside_element.width();
//                     backside_height = $backside_element.height();
//                     sign_width = $(stop_sign_element) .width();
//                     close_button_width = $(close_button).width();
//                     if (close_button_width) {
//                         close_button_width += 14; // needs a gap
//                     } else {
//                         close_button_width = 0; // width() may have returned null
//                     }
//                     $(stop_sign_element) .css({right: close_button_width});
//                     $(green_flag_element).css({right: close_button_width+sign_width+6}); // smaller gap needed
//                     green_flag_width = $(green_flag_element).width();
//                     if (help_button) {          
//                         $(help_button).css({right: close_button_width+sign_width+green_flag_width+12});
//                     }
//                     if (settings_button) {
//                         help_button_width = $(help_button).width() || 0;
//                         $(settings_button).css({right: close_button_width+sign_width+green_flag_width+help_button_width+12});
//                     }
//                 }
//             };
            backside.save_dimensions = function () {
                original_x_scale = x_scale;
                original_y_scale = y_scale;
                return true; 
            };
            backside.restore_dimensions = function () {
                var backside_element = this.get_element();
                if (original_x_scale) {
                    x_scale = original_x_scale;
                }
                if (original_y_scale) {
                    y_scale = original_y_scale;
                }
                this.render_current_scale();
            };
            backside.render_current_scale = function () {
                this.scale_backside(backside_element, x_scale, y_scale, original_width, original_height);
                // not clear why these input areas lose their JQuery UI attributes -- e.g. when delivered by a sensor bird
                $(".toontalk-text-area, .toontalk-radio-button, .toontalk-text-input").button();
                // also not clear why the custom tooltips disappear
                $(backside_element).find("[title]").each(function (index, element) {
                                                             TT.UTILITIES.use_custom_tooltip(element);
	            });
            };
            backside.compare_with = function (other) {
                return this.get_widget().compare_with && this.get_widget().compare_with(other);
            };
            if (TT.debugging || TT.logging) {
                backside.to_debug_string = function (max_length) {
                    return ("backside of " + this.get_widget().to_debug_string()).substring(0, max_length);
                };
            }
            backside_element.toontalk_widget_side = backside;
            TT.UTILITIES.drag_and_drop(backside_element);
            $backside_element.resizable(
                {start: function () {
                    width_at_resize_start  = TT.UTILITIES.get_element_width (backside_element);
                    height_at_resize_start = TT.UTILITIES.get_element_height(backside_element);
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
                    backside.render_current_scale();
                },
                handles: "e,s,se"}); // was "n,e,s,w,se,ne,sw,nw" but interfered with buttons
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
                var name_text_input = this.get_name_text_input();
                var bounding_box = backside_element.getBoundingClientRect();
                var description;
                if (description_text_area) {
                    description = this.get_widget().get_description();
                    if (description) {
                        description_text_area.button.value = description;
                    }
                }
                if (name_text_input) {
                    name_text_input.button.value = this.get_widget().get_name();
                }
                if (this.get_erased()) {
                    $(backside_element).find(":not(.ui-resizable-handle, .toontalk-green-flag, .toontalk-stop-sign, .toontalk-close-button, .toontalk-help-button)").hide(); 
                } else {
                    $(backside_element).find().show();      
                }
                // look for new backside widgets that need to be added to DOM tree
                this.get_widget().get_backside_widgets().forEach(function (widget) {
                            var element;
                            if (widget.get_frontside()) {
                                // is not new
                                return;
                            }
                            element = widget.get_element(true);
                            TT.UTILITIES.set_css(element,
                                                 {left: bounding_box.width *Math.random(),
                                                  top:  bounding_box.height*Math.random()});
                            backside_element.appendChild(element);
                            widget.update_display();
                });
                backside.display_updated();
            };
            backside.display_updated = function () {
                var $backside_element = $(this.get_element());
                if (!original_width) {
                    original_width  = TT.UTILITIES.get_element_width (backside_element);
                }
                if (!original_height) {
                    original_height = TT.UTILITIES.get_element_height(backside_element);
                }
            };
            backside.add_to_top_level_backside = function (widget_side, train) {
                return this.get_widget().add_to_top_level_backside(widget_side, train);
            };
            if (widget.get_backside_widgets) {
                backside_widgets = widget.get_backside_widgets();
                backside.add_backside_widgets(backside_widgets, widget.get_backside_widgets_json_views());
            }
            if (TT.debugging) {
                backside_element.id = widget._debug_id;
                backside._debug_id =  widget._debug_id;
                backside._debug_string = "backside of " + widget._debug_string;
            }
            return backside;
        },

        toString: function () {
            if (this.get_erased()) {
                return "any backside";
            }
            return "backside of " + this.get_widget();
        },

        get_full_description: function (to_string_info) {
            if (this.get_erased()) {
                return "any backside";
            }
            return "backside of " + this.get_widget().get_full_description(to_string_info);
        },
                
        remove_element: function () {
            $(this.get_element()).remove();
        },
        
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
            var check_box_clicked = function (event) {
                var infinite_stack = !widget.get_infinite_stack();
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
            };
            check_box.button.addEventListener('click', check_box_clicked);
            check_box.button.addEventListener('touchstart', check_box_clicked);
            return check_box;
        },

        create_parent_selection_check_box: function (backside, widget) {
            var get_parent = function () {
                var parent = widget.get_parent();
                if (!parent) {
                    return;
                }
                if (!(parent.is_nest() ||
                      parent.is_hole() ||
                      parent.is_element())) {
                    return;      
                }
                if (parent.is_hole()) {
                    return parent.get_parent_of_frontside();
                }
                return parent;
            }
            var parent = get_parent();
            var label = function (parent) {
                 return "Drag the " + parent.get_type_name() + " I'm on when dragging";
            };
            var title = function (parent) {
                return "Check this if you want to drag the " + parent.get_type_name() + " when you move this widget.";
            };
            var check_box, check_box_clicked;
            if (!parent) {
                return;
            }
            check_box = TT.UTILITIES.create_check_box(widget.get_infinite_stack(), 
                                                      "toontalk-parent-selection-check-box",
                                                      label(parent),
                                                      title(parent));
            var update_or_disable_check_box = function (parent) {
                var current_parent = get_parent();
                if (!current_parent) {
                    disable_check_box();
                    return;
                }
                if (current_parent !== parent) {
                    update_check_box(current_parent);
                }
                enable_check_box(current_parent);
            };
            var update_check_box = function (parent) {
                check_box.label.innerHTML = label(parent);
                check_box.button.innerHTML = title(parent);     
            };
            var get_selection_without_parent = function () {
                update_or_disable_check_box();
                return widget;
            };
            var disable_check_box = function () {
                check_box.button.checked = false;
                check_box.button.disabled = true;
                $(check_box.label).addClass("ui-state-disabled");
                check_box.container.title = "Widget moved so this has been disabled. Close and re-open the backside to refresh.";
            }
            var enable_check_box = function (parent) {
                check_box.button.disabled = false;
                $(check_box.label).removeClass("ui-state-disabled");
                check_box.container.title = title(parent);     
            };
            check_box_clicked = function (event) {
                var current_parent = get_parent();
                if (!get_parent()) {
                    disable_check_box();
                    return;
                }
                if (current_parent !== parent) {
                    update_check_box(current_parent);
                }
                if (check_box.button.checked) {
                    widget.get_selection = function () {
                        // compute the parent again since it may have changed
                        var current_parent = get_parent();
                        update_or_disable_check_box();
                        if (current_parent) {
                            return current_parent.get_selection();
                        }
                        return widget;
                    }
                } else {
                    widget.get_selection = get_selection_without_parent;        
                }                
                event.stopPropagation();
            };
            check_box.button.checked = widget !== widget.get_selection();
            if (!check_box.button.checked) {
                widget.get_selection = get_selection_without_parent; 
            }
            check_box.button.addEventListener('click', check_box_clicked);
            return check_box;
        },      

        create_click_opens_backside_check_box: function (backside, widget) {
            var check_box = TT.UTILITIES.create_check_box(widget.get_open_backside_only_if_stopped(), 
                                                          "toontalk-click-opens-backside-check-box",
                                                          "Mouse click opens this backside only if I'm stopped.",
                                                          "Check this if you want my backside to open only when I'm stopped. Really useful if there are robots using click sensors.");
            var check_box_clicked = function (event) {
                var open_backside_only_if_stopped = !widget.get_open_backside_only_if_stopped();
                var action_string;
                widget.set_open_backside_only_if_stopped(open_backside_only_if_stopped);
                check_box.button.checked = open_backside_only_if_stopped;
                if (widget.robot_in_training()) {
                    if (open_backside_only_if_stopped) {
                        action_string = "change the response to a mouse click to open only if stopped the backside of ";
                    } else {
                        action_string = "change the response to a mouse click to always open the backside of ";
                    }
                    widget.robot_in_training().edited(widget, {setter_name: "set_open_backside_only_if_stopped",
                                                               argument_1: open_backside_only_if_stopped,
                                                               toString: action_string,
                                                               button_selector: ".toontalk-click-opens-backside-check-box"});
                }
                event.stopPropagation();
            };
            check_box.button.addEventListener('click', check_box_clicked);
            check_box.button.addEventListener('touchstart', check_box_clicked);
            return check_box;
        },
        
        create_description_label: function (backside, widget) {
            var description = widget.get_description();
            if (description) {
               return TT.UTILITIES.create_text_element("I'm the backside of a " + widget.get_type_name() + " that is " + description);
            }
        },

        add_description_setting: function (container_element) {
            var widget = this.get_widget();
            var type_name = widget.get_type_name();
            var description_drop_handler = 
                function (event) {
                    var dropped = TT.UTILITIES.input_area_drop_handler(event, widget.receive_description_from_dropped.bind(widget), widget);
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
                                                                      description_drop_handler);
            var description_change = 
                function () {
                    var description = description_text_area.button.value.trim();
                    if (widget.set_description(description, true) && widget.robot_in_training()) {
                        widget.robot_in_training().edited(widget, {setter_name: "set_description",
                                                                   argument_1: description,
                                                                   toString: "change the description to '" + description + "'' of the " + type_name,
                                                                   button_selector: ".toontalk-description-input"});
                    }
                };
            $(description_text_area.button).val(widget.get_description());
            description_text_area.button.addEventListener('change',   description_change);
            description_text_area.button.addEventListener('mouseout', description_change);
            this.set_description_text_area(description_text_area);
            (container_element || this.get_backside_element(true)).appendChild(TT.UTILITIES.create_row(description_text_area.container));
            if (!widget.get_description()) {
                description_text_area.button.setAttribute('placeholder', widget.get_default_description());
            }                                                 
        },

        add_name_setting: function (container_element) {
            var widget = this.get_widget();
            var type_name = widget.get_type_name();
            var name_drop_handler = 
                function (event) {
                    var dropped = widget.receive_name_from_dropped && TT.UTILITIES.input_area_drop_handler(event, widget.receive_name_from_dropped.bind(widget), widget);
                    if (dropped && widget.robot_in_training()) {
                        widget.robot_in_training().dropped_on_text_area(dropped, widget, {area_selector: ".toontalk-name-input",
                                                                                          setter: 'receive_name_from_dropped',
                                                                                          toString: "for a widget's name"});
                     }
                };
            var name_text_input = TT.UTILITIES.create_text_input(widget.get_name(), 
                                                                 "toontalk-name-input", 
                                                                 widget.get_name_input_label ? widget.get_name_input_label() : "My name is ",
                                                                 widget.get_name_input_title ? widget.get_name_input_title() : 
                                                                                               "Edit the name of this " + type_name + ". There is not much room so keep it short.",
                                                                 undefined,
                                                                 'text',
                                                                 name_drop_handler);
            var name_change = function () {
                    var name = name_text_input.button.value.trim();
                    if (widget.set_name && widget.set_name(name, true) && widget.robot_in_training()) {
                        widget.robot_in_training().edited(widget, {setter_name: "set_name",
                                                                   argument_1: name,
                                                                   toString: "change the name to '" + name + "'' of the " + type_name,
                                                                   button_selector: ".toontalk-name-input"});
                    }
                };
            name_text_input.button.addEventListener('change',   name_change);
            name_text_input.button.addEventListener('mouseout', name_change);
            this.set_name_text_input(name_text_input);
            (container_element || this.get_backside_element(true)).appendChild(TT.UTILITIES.create_row(name_text_input.container));
        },

        add_advanced_settings: function () {
            // advanced options not visible by default
            var widget = this.get_widget();
            var infinite_stack_check_box = this.create_infinite_stack_check_box(this, widget);
            var parent_selection_check_box = this.create_parent_selection_check_box(this, widget);
            var click_opens_backside_check_box = this.create_click_opens_backside_check_box(this, widget);
            var type_name = widget.get_type_name();
            var $make_sensor_nest_button   = $("<button>Make a sensor nest</button>")  .button();
            var $make_function_bird_button = $("<button>Make a function bird</button>").button();
            var $create_remove_widget_button;
            var settings = document.createElement("table");
            var backside_element = this.get_element();
            var add_new_widget_to_backside = function (new_widget, $button) {
                var parent_backside = widget.get_parent_of_frontside();
                var widget_frontside_element = new_widget.get_frontside_element(true);
                var initial_location, parent_backside_element;
                if (parent_backside && parent_backside.add_backside_widget && !parent_backside.get_widget().is_top_level()) {
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
                TT.UTILITIES.set_absolute_position(widget_frontside_element, initial_location); 
            };
            var make_sensor_nest_button_clicked = 
                function (event) {
                    var sensor = TT.sensor.create('click', 'which', undefined, undefined, true, widget);
                    add_new_widget_to_backside(sensor, $make_sensor_nest_button);
                    if (widget.robot_in_training()) {
                        widget.robot_in_training().created_widget(sensor, widget, ".toontalk-make-sensor_nest_button");
                    }
                    event.stopPropagation();
            };
            var make_function_bird_button_clicked = 
                function (event) {
                           var function_type = widget.get_function_type && widget.get_function_type();
                           var function_bird = TT.bird.create_function(function_type || type_name);
                           add_new_widget_to_backside(function_bird, $make_function_bird_button);
                           if (widget.robot_in_training()) {
                               widget.robot_in_training().created_widget(function_bird, widget, ".toontalk-make-function_bird_button");
                           }
                           event.stopPropagation();
            };
            var advanced_settings_button = $(backside_element).find(".toontalk-settings-backside-button").get(0);
            var i;
            $(settings).addClass("toontalk-advanced-settings-table");
            $make_sensor_nest_button.addClass("toontalk-make-sensor_nest_button toontalk-button");
            $make_sensor_nest_button.get(0).addEventListener('click', make_sensor_nest_button_clicked);
            $make_sensor_nest_button.attr('title', "Click to create a nest which receives messages when events happen to this " + widget.get_type_name() + ".");
            $make_function_bird_button.addClass("toontalk-make-function_bird_button toontalk-button");
            $make_function_bird_button.get(0).addEventListener('click', make_function_bird_button_clicked);
            if (widget.is_number() || widget.is_box() || widget.is_element()) {
                // will implement more functions (e.g. for string elements and boxes)
                $make_function_bird_button.attr('title', "Click to get a bird that flies to functions of " + widget.get_type_name(true) + ".");
            } else {
                $make_function_bird_button.attr('title', "There are no functions that operate on " + widget.get_type_name(true) + " (yet).");
                $make_function_bird_button.button("option", "disabled", true);  
            }
            if (arguments.length > 0) {
                for (i = 0; i < arguments.length; i++) {
                    settings.appendChild(arguments[i]);
                }
            }
            if (!this.get_description_text_area()) {
                this.add_description_setting(settings);
            }
            if (widget.set_name && !this.get_name_text_input()) {
                this.add_name_setting(settings);
            }
            settings.appendChild(TT.UTILITIES.create_row($make_sensor_nest_button.get(0),
                                                         $make_function_bird_button.get(0),
                                                         infinite_stack_check_box.container,
                                                         (parent_selection_check_box && parent_selection_check_box.container),
                                                         click_opens_backside_check_box.container));
            if (!this.is_primary_backside()) {
                $create_remove_widget_button = $("<button>Remove me and my widget</button>").button();
                // TODO: decide if more buttons are needed -- e.g. to copy the widget
                $create_remove_widget_button.get(0).addEventListener('click',
                                                                     function () {                                 
                                                                         if (widget.robot_in_training()) {
                                                                             widget.robot_in_training().removed(widget);
                                                                             widget.robot_in_training().removed(this);
                                                                         }
                                                                         // TODO: determine if this should work more like vacuuming?
                                                                         // and maybe can undo by spitting them out again
                                                                         // note robots animate this as if the vacuum was used
                                                                         this.remove();
                                                                         widget.remove();
                                                                     }.bind(this));
                $create_remove_widget_button.attr('title', "Click to remove this " + widget.get_type_name() + " and its backside.");
                $create_remove_widget_button.addClass("toontalk-remove-backside-and-widget-buttton");
                TT.UTILITIES.use_custom_tooltip($create_remove_widget_button.get(0));
                settings.appendChild($create_remove_widget_button.get(0));
            }
            TT.UTILITIES.use_custom_tooltip($make_sensor_nest_button.get(0));
            TT.UTILITIES.use_custom_tooltip($make_function_bird_button.get(0));
            backside_element.appendChild(settings);
        },

       get_type_name: function () {
           return "backside of " + TT.UTILITIES.add_a_or_an(this.get_widget().get_type_name());
       },
        
       hide_backside: function (event) {
            var widget, robot_in_training, frontside_element, $backside_element, backside_position, $backside_container,
                animate_disappearance, parent_of_backside, container_widget;
            if (!this.visible()) {
                return;
            }
            widget = this.get_widget();
            robot_in_training = widget.robot_in_training();
            $backside_element = $(this.get_element());
            if (robot_in_training && robot_in_training.get_training_context() === widget) {
               // closing the backside of a context while a robot is being trained to work on it
               robot_in_training.hide_backside();
               $backside_element.find(".toontalk-train-backside-button").click();
               // firing click also updates the label of the button and also does robot_in_training.training_finished();       
            }
            // create the frontside_element if needed if on the back of a top-level backside
            frontside_element = widget.get_frontside_element(event && widget.get_parent_of_frontside() && widget.get_parent_of_frontside().is_top_level());
            backside_position = $backside_element.position();
            $backside_container = $backside_element.parent().closest(".toontalk-backside");
            animate_disappearance = 
                function ($element) {
                    var frontside_offset = $(frontside_element).position();
                    var remove_backside = 
                        function () {
                            if (parent_of_backside) {
                                this.set_parent_of_backside(undefined, true);
                                if (!parent_of_backside.is_backside()) {
                                     parent_of_backside.removed_from_container(this, event, undefined, true);
                                }
                                // important to run the above before the following since otherwise backsides won't be there to remove
                                if (widget.forget_backside) {
                                    widget.forget_backside();
                                }
                            }
                            $element.remove();
                        }.bind(this);
                    if (!TT.UTILITIES.visible_element($element)) {
                        // robot may have opened the backside and then removed the widget itself
                        remove_backside();
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
                    TT.UTILITIES.add_one_shot_event_handler($element.get(0), 'transitionend', 2500, remove_backside);
                    TT.UTILITIES.set_css($element,
                                         {left: frontside_offset && frontside_offset.left,
                                          top:  frontside_offset && frontside_offset.top,
                                          opacity: .1});      
            }.bind(this);
            parent_of_backside = widget.get_parent_of_backside();
            TT.UTILITIES.remove_highlight();
            record_backside_widget_positions(this);
            widget.backside_geometry = this.get_backside_dimensions();
            animate_disappearance($backside_element);
            this.set_visible(false); // semantic side of things needs to know this backside isn't being watched any more
            if (event && frontside_element && !TT.UTILITIES.visible_element(frontside_element)) {
                // don't do any of this if robot is responsible
                // in particular don't add widget back -- not as clear about updating CSS below
                if (backside_position) {
                    TT.UTILITIES.set_css(frontside_element,
                                         {left:  backside_position.left,
                                          top:   backside_position.top});
                }
                // frontside needs to be added to backside container
                container_widget = TT.UTILITIES.widget_side_of_jquery($backside_container);
                if (container_widget && !(widget.is_robot() && container_widget.get_widget().is_robot() && widget.get_first_in_team() === container_widget.get_widget().get_first_in_team())) {
                    container_widget.widget_side_dropped_on_me(widget);
                    widget.render();
                }
            }
            if (widget.get_backside_widgets()) {
                widget.get_backside_widgets().forEach(function (widget_side) {
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
            var settings_button_clicked = 
                function (event) {
                    settings_showing = !settings_showing;
                    backside.set_advanced_settings_showing(settings_showing, backside.get_element(), $settings_button);
                    event.stopPropagation();
                    if (widget.robot_in_training()) {
                        widget.robot_in_training().button_clicked(".toontalk-settings-backside-button", widget);   
                    }
                };
            buuton.innerHTML = '&gt;';
            $settings_button.addClass("toontalk-settings-backside-button toontalk-button");
            $settings_button.css({"z-index": TT.UTILITIES.next_z_index()});
            $settings_button.get(0).addEventListener('click', settings_button_clicked);
            TT.UTILITIES.give_tooltip($settings_button.get(0), "Click to see the advanced settings of this " + widget.get_type_name() + ".");
            return $settings_button.get(0);
        },

        set_advanced_settings_showing: function (show) {
            var backside_element = this.get_element();
            var $settings_button = $(backside_element).children(".toontalk-settings-backside-button");
            var $advanced_settings = $(backside_element).children(".toontalk-advanced-settings-table");
            if ($advanced_settings.length === 0 && this.add_advanced_settings) {
                this.add_advanced_settings();
                $advanced_settings = $(backside_element).children(".toontalk-advanced-settings-table");
            }
            if (show) {
                $advanced_settings.show();
                $settings_button.html("<");
                TT.UTILITIES.give_tooltip($settings_button.get(0), "Click to hide the advanced settings.");  
            } else {
                $advanced_settings.hide();
                $settings_button.html(">");
                TT.UTILITIES.give_tooltip($settings_button.get(0), "Click to show the advanced settings.");    
            }
        },
        
        scale_backside: function (backside_element, x_scale, y_scale, original_width, original_height) {
            var scale = Math.min(1, x_scale, y_scale);
            if (x_scale === 1 && y_scale === 1) {
               if (!this.get_parent() || this.get_parent().is_backside()) {
                   // dimensions are not constrained so use original dimensions
                   TT.UTILITIES.set_css(backside_element,
                                        {width:  original_width,
                                         height: original_height,
                                         transform:          '',
                                         "transform-origin": ''});
               } else {
                   // if not scaling let the browser decide the dimensions
                   TT.UTILITIES.set_css(backside_element,
                                        {width:  '',
                                         height: ''});
               }
            } else {
               TT.UTILITIES.set_css(backside_element,
                                    {transform: "scale(" + scale + ", " + scale + ")",
                                     "transform-origin": "left top", 
                                     width:  original_width  * x_scale / scale,
                                     height: original_height * y_scale / scale});
            }
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

        remove_backside_widget: function (widget_side, ignore_if_not_on_backside) {
            return this.get_widget().remove_backside_widget(widget_side, ignore_if_not_on_backside);
        },

        top_level_widget: function () {
            return this.get_widget().top_level_widget();
        },

        robot_in_training: function () {
            return this.get_widget().robot_in_training();
        },

        remove: function (event) {
            var parent, backside_element;
            if (this.is_primary_backside()) {
                this.get_widget().remove();
            } else {
                parent = this.get_parent_of_backside();
                if (parent) {
                    if (parent.is_backside()) {
                        // !event because if a robot is doing this no warning if already removed
                        parent.remove_backside_widget(this, !event);
                    } else if (parent.removed_from_container) {
                        if (parent.is_backside()) {
                            parent.remove_backside_widget(this, true);
                        } else {
                           parent.removed_from_container(this, event);
                        }
                    }
                }
                this.set_parent_of_backside(undefined);
                backside_element = this.get_element();
                if (backside_element) {
                   $(backside_element).remove();
                }
            }
        },

        match: function (other) {
            // matches if both are backsides and corresponding widgets match
            var this_widget, match_status;
            if (other.is_backside()) {
                if (this.get_erased()) {
                    // used to match any backside of the same widget type
                    // but any backside should match any backside
//                     if (this.get_widget().get_type_name() === other.get_widget().get_type_name()) {
                        return 'matched';
//                     }
//                     return this;
                }
                this_widget = this.get_widget();
                match_status = this_widget.match(other.get_widget());
                if (match_status === this_widget) {
                   // other widget failed to match so the problem is this backside not the front side
                   return this;
                }
                return match_status;
            }
            other.last_match = this;
            return other;
        },

        add_copy_to_container: function (widget_copy, x_offset, y_offset) {
            return this.get_widget().add_copy_to_container(widget_copy || this.copy(), x_offset, y_offset);
        },

        has_ancestor: function (other) {
            // goes up the ancestor tree following backside or frontside parent as appropriate
            var parent;
            if (this === other) {
                return true;
            }
            parent = this.get_parent_of_backside();
            if (parent) {
                return parent.has_ancestor(other);
            }
            return false;
        },

        get_backside: function () {
            // e.g. a path to the backside of a widget and already have the backside
            return this;
        },

        copy: function () {
            return this.get_widget().create_backside();
        },

        is_backside: function () {
            return true;
        },

        get_parent: function () {
            return this.get_parent_of_backside();
        },

        set_parent: function (new_parent) {
            this.set_parent_of_backside(new_parent);
        },

        maintain_proportional_dimensions: function () {
            return false;
        },

        location_constrained_by_container: function () {
            return false;
        },

        set_running: function () {
            // ignore it since only frontsides "run"
        },

        can_run: function () {
            // while the backside can't run its contents may be able to
            return this.get_widget().can_run();   
        },

        dereference: function () {
            return this;
        },

        is_of_type: function (type_name) {
            return this.get_widget().is_of_type(type_name);
        },

        is_top_level: function () {
            return this.get_widget().is_top_level();
        },

        ok_to_set_dimensions: function () {
            return false;
        },
        
        add_listener: function (type, listener) {
            this.get_widget().add_listener(type, listener);     
        },

        remove_listener: function (type, listener, ok_if_not_there) {
            this.get_widget().remove_listener(type, listener, ok_if_not_there);     
        },

        get_listeners: function (type) {
            return this.get_widget().get_listeners(typee);     
        },

        is_hole: function () {
            return false;
        },

        is_box: function () {
            return false;
        },

        is_element: function () {
            return false;
        },

        is_sensor: function () {
            return false;
        },

        is_plain_text_element: function () {
            return false;
        },

        is_nest: function () {
            return false;
        },

        is_robot: function () {
            return false;
        },

        // TODO: more is_* and return false

        save_dimensions: function () {
            // TODO: later support robots moving around backsides
            return false;
        },

        show: function () {
            $(this.get_element()).show();
        },

        hide: function () {
            $(this.get_element()).hide();
        },

        get_infinite_stack: function () {
            return false;
        },

        drag_started: function (json, is_resource) {
            if (this.robot_in_training()) {
                this.robot_in_training().picked_up(this, json, is_resource);
            }
        },

        get_json: function (json_history, callback, start_time) {
            var dimensions = this.get_backside_dimensions();
            var position = $(this.get_element()).position();
            var css, new_callback;
            record_backside_widget_positions(this);
            if (dimensions) {
                css = {width:  dimensions.original_width,
                       height: dimensions.original_height,
                       transform: "scale(" + dimensions.x_scale + ", " + dimensions.y_scale + ")",
                       "transform-origin": "left top 0px",
                       left: position.left,
                       top:  position.top};
            } else {
                css = position;
            }
            new_callback = function (json, start_time) {
                              callback({type: "backside",
                                        my_widget: json,
                                        css: css,
                                        erased: this.get_erased(),
                                        view: {}},
                                       start_time);
            }.bind(this);
            TT.UTILITIES.get_json(this.get_widget(), json_history, new_callback, start_time);
        },

        get_selection: function () {
            return this;
        }

    };
    
}(window.TOONTALK));

TOONTALK.creators_from_json['backside'] = function (json, additional_info) {
    var widget = TOONTALK.UTILITIES.create_from_json(json.my_widget, additional_info);
    var backside = widget.create_backside();
    var backside_element = backside.get_element();
    TOONTALK.UTILITIES.set_css(backside_element, json.css);
    if (json.erased) {
        // following should be set even if not yet part of a condition
        backside.set_erased(json.erased, false, true);
    }
    return backside;
};
