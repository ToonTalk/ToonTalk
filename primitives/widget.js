 /**
 * Implements shared methods of ToonTalk's widgets
 * Authors: Ken Kahn
 * License: New BSD
 */

/*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */

window.TOONTALK.widget = (function (TT) {
    "use strict";
    // following definition is used for two different methods
    var get_frontside_element_function = function (create) {
        var frontside = this.get_frontside && this.get_frontside(create);
        if (!frontside) {
            return;
        }
        return frontside.get_element();
    };
                
    TT.creators_from_json["top_level"] = function (json) {
        var widget = TT.widget.create_top_level_widget(json.settings);
        var $backside_element = $(widget.get_backside(true).get_element());
        $backside_element.addClass("toontalk-top-level-backside");
        return widget;
    };
    
    return {
        
        add_standard_widget_functionality: function (widget) {
            var return_false = function () {
                return false;
            };
            // TODO: simplify this since widget and this should be the same -- always??
            var top_level_widget;
            this.add_sides_functionality(widget);
            this.runnable(widget);
            this.stackable(widget);
            this.animatable(widget);
            this.has_title(widget);
            this.has_parent(widget);
            this.has_backside_widgets(widget);
            this.has_description(widget);
            this.has_listeners(widget);
            this.droppable(widget);
            // erasability will eventually will be used for type conversions
            // currently only for conditions
            this.erasable(widget);
            widget.this_and_walk_children = function (action) {
                // convenient to apply action to this and its descendants
                if (!action(widget)) {
                    return;
                }
                if (widget.walk_children) {
                    widget.walk_children(action);
                }
            };
            widget.top_level_widget = function () {
                var parent, $top_level_backsides;
                if (top_level_widget) {
                    return top_level_widget;
                }
                if (this.is_top_level()) {
                    return this;
                }
                top_level_widget = TT.UTILITIES.widget_side_of_jquery($(this.get_frontside_element()).closest(".toontalk-top-level-backside"));
                if (top_level_widget) {
                    top_level_widget = top_level_widget.get_widget();
                    return top_level_widget;
                }
                parent = this.get_parent_of_frontside() || this.get_parent_of_backside();
                if (parent) {
                    top_level_widget = parent.get_widget().top_level_widget();
                    return top_level_widget;
                }
                $top_level_backsides = $(".toontalk-top-level-backside");
                if ($top_level_backsides.length > 0) {
                    if ($top_level_backsides.length > 1) {
                       console.log("Cannot find the top-level widget of " + this + " but found " + $top_level_backsides.length + " top-level backsides so picked one.");
                    }
                    top_level_widget = TT.UTILITIES.widget_side_of_jquery($top_level_backsides).get_widget();
                    return top_level_widget;
                }
                console.log("Could not find top_level_widget of " + this + ". Created one instead");
                top_level_widget = this.create_top_level_widget();
                return top_level_widget;
            };
            if (!widget.is_of_type) {
                // may be overridden by a sub-class
                widget.is_of_type = function (type_name) {
                    return this.get_type_name() === type_name;
                };
            }
            if (!widget.dereference) {
                widget.dereference = function () {
                    // unlike covered nests that dereference to their top element
                    return this;
                };
            }
            if (!widget.get_default_description) {
                 widget.get_default_description = function () {
                     return TT.UTILITIES.add_a_or_an(this.get_type_name()) + ".";
                 };  
            }
            if (!widget.is_number) {
                widget.is_number = return_false;
            }
            if (!widget.is_box) {
                widget.is_box = return_false;
            }
            if (!widget.is_empty_hole) {
                widget.is_empty_hole = return_false;
            }
            if (!widget.is_hole) {
                widget.is_hole = return_false;
            }
            if (!widget.is_scale) {
                widget.is_scale = return_false;
            }
            if (!widget.is_bird) {
                widget.is_bird = return_false;
            }
            if (!widget.is_nest) {
                widget.is_nest = return_false;
            }
            if (!widget.is_robot) {
                widget.is_robot = return_false;
            }
            if (!widget.is_element) {
                widget.is_element = return_false;
            }
            if (!widget.is_sensor) {
                widget.is_sensor = return_false;
            }
            if (!widget.is_function_nest) {
                widget.is_function_nest = return_false;
            }
            if (!widget.is_plain_text_element) {
               widget.is_plain_text_element = return_false;
            }
            if (!widget.is_attribute_widget) {
                widget.is_attribute_widget = return_false;
            }
            if (!widget.maintain_proportional_dimensions) {
               widget.maintain_proportional_dimensions = return_false;
            }
            widget.ok_to_set_dimensions = function () {
                return !this.is_plain_text_element();
                // OK unless is plain text element widget that isn't in a container (e.g. a box hole)
//                 if (!this.is_plain_text_element()) {
//                     return true;
//                 }
//                 return !this.get_parent_of_frontside() || !this.get_parent_of_frontside().is_backside();
            }
            if (widget.set_name) {
                widget.receive_name_from_dropped = 
                    function (dropped) {
                        var new_text;
                        if (dropped.get_text) {
                            new_text = dropped.get_text();
                            if (this.set_name(new_text, true)) {
                                return this.get_name();
                            }    
                        };
                    };
            }
            if (!widget.get_width) {
               widget.get_width = function () {
                   return $(widget.get_frontside_element()).width();
               }
            }
            if (!widget.get_height) {
               widget.get_height = function () {
                   return $(widget.get_frontside_element()).height();
               }
            }
            if ((TT.debugging  || TT.logging) && !widget.to_debug_string) {
                widget.to_debug_string = function () {
                    var parent = this.get_parent_widget_of_frontside();
                    var id = this._debug_id;
                    var description = this.get_description();
                    if (description) {
                        description += " ";
                    } else {
                        description = "";
                    }
                    if (!id) {
                       // might be a hole or top-level widget
                       if (parent && parent.id) {
                          id = "id of parent is " + parent.id;
                       } else {
                          id = "";
                       }
                    }
                    if (description) {
                       description += " "; // space before next item
                    }
                    return this.toString({plain_text: true}) + " (" + description + ((this.get_name && (this.get_name() + " ")) || "") + id + ")";
                };
            }
            widget.is_top_level = return_false;
            widget.is_widget = true;
        },
        
        erasable: function (widget) {
            var erased;
            if (!widget.get_erased) {
                widget.get_erased = function () {
                    return erased;
                };
            }
            if (!widget.set_erased) {
                widget.set_erased = function (new_value, update_now) {
                    erased = new_value;
                    if (update_now) {
                        this.rerender();
                    }
                };
            }
        },
        
        add_sides_functionality: function (widget) {
            var frontside, backside, open_backside_only_if_stopped;
            if (!widget.get_frontside) {
                widget.get_frontside = function (create) {
                    if (create && !frontside) {
                        frontside = TT.frontside.create(widget);
                    }
                    return frontside;
                };
                widget.save_dimensions = function () {
                    return this.save_dimensions_of(this);
                };
                widget.save_dimensions_of = function (other) {
                    var width,
                        height, 
                        other_frontside_element;
                    if (other.is_element()) {
                        if (!this.get_original_width()) {
                            return;
                        }
                        width  = other.get_attribute('width');
                        height = other.get_attribute('height');
                    } else {
                        // elements have clientWidth and clientHeight
                        // used to use $(...).width() but that returns 0 during a drop
                        other_frontside_element = other.get_frontside_element();
                        width  = $(other_frontside_element).width();
                        height = $(other_frontside_element).height();
                    }
                    if (width > 0) {
                        this.saved_width  = width;
                    }
                    if (height > 0) {
                        this.saved_height =height;
                    }
                    return true;
                }
                widget.restore_dimensions = function () {
                    var frontside_element, css;
                    if (this.saved_width > 0) {
                       frontside_element = this.get_frontside_element(true);
                       if (this.use_scaling_transform) {
                           this.use_scaling_transform({width:  this.saved_width,
                                                       height: this.saved_height});  
                       } else if (!this.ok_to_set_dimensions()) {
                           css = {width:  '',
                                  height: ''};
                           // remove transforms as well
                           TT.UTILITIES.set_css_transform(css, '');
                           TT.UTILITIES.set_css(frontside_element, css);                          
                        } else if (this.set_size_attributes) {
                            // e.g. element widgets need to update their attributes
                            this.set_size_attributes(this.saved_width, this.saved_height);
                        } else {
                            TT.UTILITIES.set_css(frontside_element,
                                                 {width:  this.saved_width,
                                                  height: this.saved_height});                                 
                        }
                        this.saved_width =  undefined;
                        this.saved_height = undefined;
                    }
                };
            }
            if (!widget.get_backside) {
                widget.get_backside = function (create) {
                    if (create && !backside) {
                        // backsides are customised by each kind of widget
                        backside = this.create_backside();
                        if (this.backside_widgets_json_views) {
                            backside.add_backside_widgets(this.get_backside_widgets(), this.backside_widgets_json_views);
                            this.backside_widgets_json_views = undefined;
                        }
                    }
                    return backside;
                };
            }
            if (!widget.set_backside) {
                widget.set_backside = function (new_value) {
                    backside = new_value;
                };
            }
            if (!widget.forget_backside) {
                widget.forget_backside = function () {
                    var element;
                    if (!backside) {
                        return;
                    }
                    element = backside.get_element();
                    if (element) {
                        $(element).remove();
                        element.toontalk_widget_side = undefined;
                    }
                    backside = undefined;
                };
            }
            if (!widget.create_backside) {
                widget.create_backside = function () {
                    return TT.backside.create(widget);
                };
            }
            if (!widget.get_open_backside_only_if_stopped) {
                widget.get_open_backside_only_if_stopped = function () {
                    return open_backside_only_if_stopped;
                };
            }
            if (!widget.set_open_backside_only_if_stopped) {
                widget.set_open_backside_only_if_stopped = function (new_value) {
                    open_backside_only_if_stopped = new_value;
                };
            }
        },
        
        runnable: function (widget) {
            var running   = false;
            var ok_to_run = false;
            if (!widget.get_running) {
                widget.get_running = function (ignore_ancestors_and_backside_widgets) {
                    var some_backside_widgets_running = false;
                    var backside_widgets, ancestor;
                    if (ignore_ancestors_and_backside_widgets) {
                        return running;
                    }
                    if (running) {
                        // see if it is really running
                        backside_widgets = this.get_backside_widgets();
                        if (backside_widgets.length === 0) {
                            running = false;
                        } else {
                            backside_widgets.some(function (widget_side) {
                                                      var widget;
                                                      if (!widget_side) {
                                                          // TODO: never add null widgets to this list of backside_widgets
                                                          return;
                                                      }
                                                      widget = widget_side.get_widget();
                                                      if (widget.get_running()) {
                                                          some_backside_widgets_running = true;
                                                          return true;
                                                      }
                            });
                            ancestor = this.get_parent_of_frontside();
                            while (ancestor) {
                                if (ancestor.is_backside()) {
                                    return ancestor.get_widget().get_running(true);
                                }
                                if (ancestor.get_running && ancestor.get_running(true)) {
                                    return true;
                                }
                                ancestor = ancestor.get_parent_of_frontside();
                            }
                            // TODO: see why caching this if false didn't work
//                          running = some_backside_widgets_running;
                        }
                    }
                    return some_backside_widgets_running;
                };
            }
            if (!widget.is_ok_to_run) {
                // perhaps this should have a better name
                // it really whether it has been "told" to run whether or not it could
                widget.is_ok_to_run = function () {
                    return ok_to_run;
                };
                widget.set_ok_to_run = function (new_value) {
                    ok_to_run = new_value;
                };
            }
            if (!widget.set_running) {
                widget.set_running = function (new_value, top_level_context, is_backside) {
                    var unchanged_value = (running === new_value);
                    var backside_widgets, backside_widget, backside_element;
                    ok_to_run = new_value;
//                     if (unchanged_value && running) {
//                         // even if not running some part might be running and should be turned off
//                         return;
//                     }
                    backside_widgets = this.get_backside_widgets();
                    running = new_value;
                    if (this.get_backside() && !unchanged_value) {
                        this.get_backside().run_status_changed(running);
                    }
                    backside_widgets.forEach(function (backside_widget_side) {
                        if (!backside_widget_side) {
                            return;
                        }
                        backside_widget = backside_widget_side.get_widget();
                        if (backside_widget_side.is_backside()) {
                           // make sure that the frontside isn't also running
                           if (this.get_backside_widgets().indexOf(backside_widget) >= 0) {
                               return;
                           }
                        }
                        if (backside_widget.is_robot() && !backside_widget.being_trained && !backside_widget.get_body().is_empty()) {
                            // could this set_stopped stuff be combined with set_running?
                            if (running) {
                                backside_widget.set_stopped(false);
                                // no need to create backside to run the robot but the robot needs to know if the backside of the widget is running
                                // e.g. to act like an "anima-gadget" if is a backside on a backside
                                backside_widget.run(widget, is_backside, top_level_context);
                                backside_widget.set_ok_to_run(true);
                            } else {
                                backside_widget.set_stopped(true);
                                backside_widget.set_running(false);
                            }
                        } else if (backside_widget.set_running) {
                            if (!top_level_context && backside_widget_side.is_backside() && widget.get_type_name() !== "top-level") {
                                // a robot is on the backside of a widget that is on the backside of another
                                // then its context is the containing widget
                                backside_widget.set_running(new_value, widget, true);
                            } else {
                                // if frontside then its context is the widget of the frontside (i.e. backside_widget)
                                backside_widget.set_running(new_value);
                            }
                        }
                        backside_widget.rerender();
                    }.bind(this));
                    if (this.walk_children) {
                        this.walk_children(function (child) {
                                if (child.set_running) {
                                    child.set_running(running);
                                }
                                return true; // continue to next child
                        });
                    }
                    if (this.is_robot()) {
                        // this is here to support clicking on the green flag of a robot that works on the top-level backside
                        // this way one can run just those robots on the backside one wants rather than use the backside's green flag
                        if (running) {
                            if (widget.get_parent_of_backside()) {
                                this.set_stopped(false);
                                this.run(widget.get_parent_of_backside().get_widget());
                            }
                        } else {
                            this.set_stopped(true);
                        }
                    }
                    if (!unchanged_value) {
                        this.rerender();
                    }
                };
            }
        },

        droppable: function (widget) {
            if (!widget.drop_on) {
                widget.drop_on = function (side_of_other, event, robot) {
                    if (side_of_other.widget_side_dropped_on_me) {
                        return side_of_other.widget_side_dropped_on_me(this, event, robot);
                    }
                    console.log("No handler for drop of '" + this + "' on '" + side_of_other + "'");
                    return;
                }
            }
        },
        
        stackable: function (widget) {
            var infinite_stack = false;
            if (!widget.get_infinite_stack) {
                widget.get_infinite_stack = function () {
                    return infinite_stack;
                };
            }
            if (!widget.set_infinite_stack) {
                widget.set_infinite_stack = function (new_value) {
                    var backside_element = widget.get_backside_element();
                    var frontside_element = widget.get_frontside_element();
                    infinite_stack = new_value;
                    if (backside_element) {
                        $(backside_element).find(".toontalk-infinite-stack-check-box").prop("checked", new_value);
                    }
                    if (frontside_element) {
                        if (new_value) {
                            $(frontside_element).addClass("toontalk-infinite-stack");
                        } else {
                            $(frontside_element).removeClass("toontalk-infinite-stack");   
                        }
                    }
                };
            }
        },
        
        animatable: function (widget) {
            var find_widget_element;
            if (!widget.animate_to_widget) {
                find_widget_element = function (widget) {
                    var widget_element = widget.get_element();
                    if (!widget_element || (!widget.is_backside() && !TT.UTILITIES.visible_element(widget_element))) {        
                        // widget is assumed to be a fresh copy of a resource that has yet to be added to anything
                        widget_element = TT.UTILITIES.find_resource_equal_to_widget(widget);
                    }
                    return widget_element;
                };
                widget.animate_to_widget = function (target_widget, continuation, speed, left_offset, top_offset, more_animation_follows, duration) {
                    // delay for DOM to settle down in case target_widget is brand new
                    var new_continuation = 
                        function () {
                             this.animate_to_element(find_widget_element(target_widget), continuation, speed, left_offset, top_offset, more_animation_follows, duration && Math.max(0, duration-100));
                             this.rerender();
                         }.bind(this);
                    if (duration === 0) {
                        new_continuation();
                    } else {
                        setTimeout(new_continuation, 100);
                    }           
                };
            }
            if (!widget.animate_to_element) {
                widget.animate_to_element = function (target_element, continuation, speed, left_offset, top_offset, more_animation_follows, duration) {
                    var target_absolute_position = $(target_element).offset();
                    var $frontside_element = $(this.get_frontside_element());
                    var target_is_backside = $(target_element).is(".toontalk-backside");
                    if (!target_element || !TT.UTILITIES.visible_element(target_element)) {
                        // don't know where to go so just start doing the next thing
                        if (continuation) {
                            continuation();
                        }
                        return;
                    }
                    if (typeof target_element.animation_left_offset === 'number') {
                        left_offset = target_element.animation_left_offset;
                    } else if (typeof left_offset === "undefined" || target_is_backside) {
                        // pick a random location completely inside the target
                        left_offset = ($(target_element).width()-$frontside_element.width())  * Math.random();
                    }
                    if (typeof target_element.animation_top_offset  === 'number') {
                        top_offset = target_element.animation_top_offset;
                    } else  if (typeof top_offset === "undefined" || target_is_backside) {
                        top_offset = ($(target_element).height()-$frontside_element.height()) * Math.random();
                    }
                    if (target_absolute_position) {
                        target_absolute_position.left += left_offset;
                        target_absolute_position.top  += top_offset;
                    } else {
                        // can happen if a user picks up the target while this is running
                        target_absolute_position = {left: 0, top: 0};
                    }
                    this.animate_to_absolute_position(target_absolute_position, continuation, speed, more_animation_follows, duration);
                };
            }
            if (!widget.animate_to_absolute_position) {
                widget.animate_to_absolute_position = function (target_absolute_position, continuation, speed, more_animation_follows, duration) {
                    TT.UTILITIES.animate_to_absolute_position(this.get_frontside_element(), target_absolute_position, continuation, speed, more_animation_follows, duration);
                };
            }
        },
        
        has_title: function (widget) {
            if (!widget.get_title) {
                widget.get_title = function () {
                    var type_name = this.get_type_name();
                    var backside = this.get_backside();
                    var frontside_element = this.get_frontside_element();
                    var description = this.get_description();
                    var title = "";
                    if ($(frontside_element).is(".toontalk-top-level-resource")) {
                        if (this.can_run && this.can_run()) {
                            if (this.get_running()) {
                                title = "Click elsewhere to stop me from running. Click on it to start me up again.";
                            } else {
                                title = "Click to start me running. Click elsewhere to stop me.";
                            }
                        } else {
                            title = "Drag me to a work area.";
                        }   
                    } else if (!backside || !backside.get_element() || !TT.UTILITIES.visible_element(backside.get_element())) {
                        if (this.can_run && this.can_run()) {
                            if (this.get_running()) {
                                title = "Robots on my back are running (or waiting to run).\nTo see them click the stop sign " +
                                        TT.UTILITIES.encode_HTML_for_title("<span class='toontalk-stop-sign-icon'></span>") +
                                        " and then click on me.";
                            } else {
                                title = "There are robots on my back." + 
                                        "\nTo see them in action click me to open my back side and then click the green flag " +
                                        TT.UTILITIES.encode_HTML_for_title("<span class='toontalk-green-flag-icon'></span>") + ".";
                            }
                        } else {
                            title = "Click to see my back side.";
                        }
                    }
                    if (description) {
                        description = "I'm " + description;
                        if (title) {
                            title = description + "\n" + title;
                        } else {
                            title = description;   
                        }
                    }
                    if (this.get_erased()) {
                        return this.get_title_of_erased_widget();
                    }
                    if (this.get_custom_title_prefix && !$(frontside_element).is(".toontalk-top-level-resource")) {
                        // top-level resources must be dragged to work area so don't add custom description
                        title = this.get_custom_title_prefix() + "\n" + title;
                    } else {
                        title = "I'm " + TT.UTILITIES.add_a_or_an(type_name) + ". " + title;
                    }
                    title = title.trim();
                    if (".?!".indexOf(title[title.length-1]) < 0) {
                        // doesn't end in punctuation so add a period
                        title += ".";
                    }
                    return title;
                };
            }
            widget.update_title = function () {
                var frontside_element = this.get_frontside_element();
                if (frontside_element) {
                    TT.UTILITIES.give_tooltip(frontside_element, this.get_title());
                }
            };
        },

        get_title_of_erased_widget: function () {
            var frontside_element = this.get_frontside_element();
            var type_name = this.get_type_name();
            if (frontside_element && $(frontside_element).closest(".toontalk-conditions-contents-container").is("*")) {
                return "I'm an erased " + type_name + ".\nI'll match with any other " + type_name + ".";
            }
            return "I'm an erased " + type_name + ".\nDusty the Vacuum can restore me to normal.";
        },
        
        has_parent: function (widget) {
            // the parent is either the widget or its backside
            var parent_of_frontside_change_listeners = [];
            var parent_of_frontside, parent_of_backside, parent_of_frontside_is_backside, parent_of_backside_is_backside;
            widget.get_parent_of_frontside = function () {
                if (parent_of_frontside_is_backside && parent_of_frontside) {
                    return parent_of_frontside.get_backside(true);
                }
                return parent_of_frontside;
            };
            widget.get_parent_widget_of_frontside = function () {
                 // returns the widget regardless of which side is the parent
                 return parent_of_frontside;
            }
            widget.parent_of_frontside_is_backside = function () {
                return parent_of_frontside_is_backside;
            };
            widget.set_parent_of_frontside = function (new_parent, parent_is_backside, backside_widget_already_removed) {
                var old_parent_of_frontside = parent_of_frontside;
                var new_parent_backside;
                parent_of_frontside_is_backside = parent_is_backside;
                if (parent_of_frontside === new_parent) {
                    return; // already knew this
                }
                parent_of_frontside = new_parent;
                if (old_parent_of_frontside && !backside_widget_already_removed && !parent_is_backside && old_parent_of_frontside.is_backside()) {
                    old_parent_of_frontside.get_widget().remove_backside_widget(this, true);
                }
                parent_of_frontside_change_listeners.forEach(function (listener) {
                        listener(old_parent_of_frontside, parent_of_frontside);
                });
            };
            widget.add_parent_of_frontside_change_listener = function (listener) {
                parent_of_frontside_change_listeners.push(listener);
            };
            widget.remove_parent_of_frontside_change_listener = function (listener) {
                var index = parent_of_frontside_change_listeners.indexOf(listener);
                if (index >= 0) {
                    parent_of_frontside_change_listeners.splice(index, 1);
                }
            };
            widget.get_parent_of_backside = function () {
                if (parent_of_backside_is_backside && parent_of_backside) {
                    return parent_of_backside.get_backside(true);
                }
                return parent_of_backside;
            };
            widget.set_parent_of_backside = function (widget, new_parent_is_backside, already_removed_from_parent_of_backside) {
                if (widget === undefined && !already_removed_from_parent_of_backside && parent_of_backside_is_backside && parent_of_backside) {
                    parent_of_backside.get_widget().remove_backside_widget(this.get_backside(), true);
                }
                parent_of_backside = widget;
                parent_of_backside_is_backside = new_parent_is_backside;
            };
            widget.parent_of_backside_is_backside = function () {
                return parent_of_backside_is_backside;
            };
            widget.closest_visible_ancestor = function () {
                // returns this if visible
                // otherwise via parent_of_frontside first that is visible
                var ancestor = this;
                while (ancestor && !ancestor.visible()) {
                    if (ancestor.is_backside()) {
                        ancestor = ancestor.get_parent_of_backside();    
                    } else {
                        ancestor = ancestor.get_parent_of_frontside();
                    }
                }
                return ancestor || this;
            };
            widget.closest_visible_ancestor_or_frontside = function () {
                // differs from closest_visible_ancestor in that if a backside has no parent then continues with frontside
                var ancestor = this;
                var previous_ancestor;
                while (ancestor && !TT.UTILITIES.visible_element(ancestor.get_frontside_element())) {
                    previous_ancestor = ancestor;
                    if (ancestor.is_backside()) {
                        ancestor = ancestor.get_parent_of_backside();
                        if (!ancestor) {
                            // widget represents the frontside which may be visible
                            ancestor = previous_ancestor.get_widget();
                        }  
                    } else {
                        ancestor = ancestor.get_parent_of_frontside();
                    }
                }
                return ancestor || this;
            };
            widget.ancestor_of_type = function (type_name) {
                // returns first ancestor whose type is type_name
                var ancestor = this;
                while (ancestor && !ancestor.is_of_type(type_name)) {
                    if (ancestor.is_backside()) {
                        ancestor = ancestor.get_widget().get_parent_of_backside();    
                    } else {
                        ancestor = ancestor.get_parent_of_frontside();
                    }
                }
                return ancestor;
            };
            widget.has_ancestor = function (other) {
                // goes up the ancestor tree following backside or frontside parent as appropriate
                var parent;
                if (this === other) {
                    return true;
                }
                parent = this.get_parent_of_frontside();
                if (parent) {
                    return parent.has_ancestor(other);
                }
                return false;
            };
            widget.remove_from_parent_of_frontside = function (event) {
                 if (parent_of_frontside) {
                     if (parent_of_frontside.is_backside()) {
                         // !event because if a robot is doing this no warning if already removed
                         parent_of_frontside.remove_backside_widget(this, !event);  
                     } else if (parent_of_frontside.removed_from_container) {
                         if (parent_of_frontside_is_backside) {
                            parent_of_frontside.remove_backside_widget(this, true);
                         } else {
                            parent_of_frontside.removed_from_container(this, event);
                         }
                     } else if (parent_of_frontside.get_backside()) {
                         parent_of_frontside.remove_backside_widget(this, !event); 
                     }
                 }
            };
        },
        
        has_description: function (widget) {
            var description;
            if (!widget.get_description) {
                widget.get_description = function () {
                    return description;
                };
            }
            if (!widget.set_description) {
                widget.set_description = function (new_value, update_display) {
                    if (description === new_value || (!description && new_value === "")) {
                        return false;
                    }
                    description = new_value;
                    if (update_display) {
                        this.rerender();
                    }
                    return true;
                };
            }
            widget.receive_description_from_dropped = function (dropped) {
                var new_text;
                if (dropped.get_text) {
                    new_text = dropped.get_text();
                    if (this.set_description(new_text, true)) {
                        return this.get_description();
                    }    
                };
            }
        },

        has_name: function (widget) {
            var name;
            if (!widget.get_name) {
                  widget.get_name = function () {
                    if (typeof name !== 'string' && widget.generate_name) {
                        name = widget.generate_name();
                    }
                    return name;
                };
            }
            if (!widget.set_name) {
                widget.set_name = function (new_value, update_display) {
                    if (name === new_value || typeof new_value !== 'string') {
                        return false;
                    }
                    name = new_value;
                    if (update_display) {
                        this.rerender();
                    }
                    return true;
                };         
            }
        },

        has_listeners: function (widget) {
            var listeners = {};
            if (!widget.add_listener) {
                 widget.add_listener = function (type, listener) {
                    var listeners_for_type = listeners[type];
                    if (listeners_for_type) {
                        if (listeners_for_type.indexOf(listener) < 0) {
                            listeners_for_type.push(listener);   
                        } 
                    } else {
                        listeners[type] = [listener];
                    }        
                 };
            }
            if (!widget.remove_listener) {
                widget.remove_listener = function (type, listener, ok_if_not_there) {
                    var listeners_for_type = listeners[type];
                    var index;
                    if (listeners_for_type) {
                        index = listeners_for_type.indexOf(listener);
                        if (index >= 0) {
                            listeners_for_type.splice(index, 1); 
                            return;  
                        }
                    }
                    if (!ok_if_not_there && TT.debugging) {
                        console.log("Listener of type " + type_name + " could not be removed.");
                    }        
                };
            }
            if (!widget.get_listeners) {
                widget.get_listeners = function (type) {
                    return listeners[type];
                }
            }
        },
        
        get_full_description: function (to_string_info) {
            var description, string;
            if (this.get_erased && this.get_erased()) {
                if (to_string_info && to_string_info.role === "conditions") {
                    return "any " + this.get_type_name();
                }
                return "erased " + this.get_type_name();
            }
            description = this.get_description(to_string_info);
            string = this.toString(to_string_info);
            if (description) {
                return string + " (" + description + ")";
            }
            return string;
        },
        
        remove: function (event, do_not_remove_children) {
            var backside  = this.get_backside();
            var frontside = this.get_frontside();
            var parent_of_frontside = this.get_parent_of_frontside();
            if (backside && this.get_parent_of_backside() && this.get_parent_of_backside().is_top_level()) {
                // remove both front and back if backside is on the top level backside
                backside.hide_backside();
            }
            if (frontside) {
                frontside.remove(); 
            } 
            if (parent_of_frontside) {
                this.remove_from_parent_of_frontside(event);
            }
            if (this.get_running()) {
                this.set_running(false);
            }
            this.set_visible(false); // in case robot vacuumed the widget while it was animating
            if (this.walk_children && !do_not_remove_children) {
                this.walk_children(function (child) {
                                       if (child.remove) {
                                           child.remove();
                                       }
                                       return true; // go on to next child
                                   });
            }
        },

        get_frontside_element: get_frontside_element_function,

        // get_element is generic and caller may be calling a backside
        get_element: get_frontside_element_function,
        
        get_backside_element: function (create) {
            var backside = this.get_backside && this.get_backside(create);
            if (backside) {
                return backside.get_element();
            }
        },
        
        add_to_json: function (json_semantic, json_history) {
            var json_view, json, position, frontside_element, parent_widget_of_frontside, backside, backside_element, frontside_width, backside_parent_view_of_this, index;
            if (json_semantic) {
                if (json_semantic.view) {
                    // already contains both semantic and view
                    json = json_semantic;
                    json_view =     json_semantic.view;
                    json_semantic = json_semantic.semantic;
                } else {
                    json_view = {};
                    json = {semantic: json_semantic,
                            view:     json_view};
                }
                json.version = 1;
                if (this.get_erased && this.get_erased()) {
                    json_semantic.erased = true;
                }
                if (this.get_infinite_stack && this.get_infinite_stack()) {
                    json_semantic.infinite_stack = true;
                }
                if (this.get_open_backside_only_if_stopped && this.get_open_backside_only_if_stopped()) {
                    // default is false  so only add this if true
                    json_semantic.open_backside_only_if_stopped = true;
                }
                if (this.get_running && this.get_running()) {
                    json_semantic.running = true;
                }
                parent_widget_of_frontside = this.get_parent_widget_of_frontside();
                if (!parent_widget_of_frontside || this.parent_of_frontside_is_backside() || parent_widget_of_frontside.is_element()) {
                    // otherwise geometry isn't needed now
                    frontside_element = this.get_frontside_element && this.get_frontside_element();
                    if (frontside_element) {
                        frontside_width = $(frontside_element).width();
                        if (!$(frontside_element).is(".toontalk-plain-text-element")) {
                            if (frontside_width !== 0) {
                                json_view.frontside_width  = $(frontside_element).width();
                                json_view.frontside_height = $(frontside_element).height();
                            }
                        }
                        if (frontside_width !== 0) {
                            // was using $(frontside_element).position() but then the position of rotated elements wasn't reproduced 
                            json_view.frontside_left = TT.UTILITIES.get_style_numeric_property(frontside_element, 'left');
                            json_view.frontside_top  = TT.UTILITIES.get_style_numeric_property(frontside_element, 'top')  || backside_parent_view_of_this && backside_parent_view_of_this.frontside_top;
                            if (json_view.frontside_left === undefined) {
                               backside_parent_view_of_this = parent_widget_of_frontside && parent_widget_of_frontside.get_widget().get_backside_widgets_json_views();
                               if (backside_parent_view_of_this) {
                                   index = this.get_parent_of_frontside().get_widget().get_backside_widgets().indexOf(this);
                                   if (index >= 0) {
                                       json_view.frontside_left = backside_parent_view_of_this[index].frontside_left;
                                       json_view.frontside_top =  backside_parent_view_of_this[index].frontside_top;
                                   }
                               }
                            }
                        }
                    }
                }
                backside = this.get_backside();
                if (backside) {
                    backside_element = backside.get_element();
                    if (backside_element) {
                        if (backside.get_backside_dimensions() || backside.is_top_level()) {
                            // don't add this if not scaled since should adjust to contents
                            json_view.backside_width  = $(backside_element).width();
                            json_view.backside_height = $(backside_element).height();
                        }
                        if (!json_view.backside_left) {
                            position = $(backside_element).position();
                            json_view.backside_left = position.left;
                            json_view.backside_top  = position.top;
                            if ($(backside_element).find(".toontalk-settings-backside-button").html() === '&lt;') {
                                json_view.advanced_settings_open = true;
                            }       
                        }
                    }
                    if (backside.get_backside_dimensions()) {
                        json_view.backside_geometry = backside.get_backside_dimensions();
                    }
                }
                if (!json_view.backside_geometry && this.backside_geometry) {
                    // backside is closed but this was saved when it was hidden
                    json_view.backside_geometry = this.backside_geometry;
                }
                json_semantic.description = this.get_description && this.get_description();
                // following are typically undefined unless in a container
                json_view.saved_width  = this.saved_width;
                json_view.saved_height = this.saved_height;  
                return json;
            }
            console.log("get_json not defined");
            return {};
        },
        
        add_backside_widgets_to_json: function (json, json_history, callback, start_time) {
            var backside_widgets = this.get_backside_widgets(); 
            var backside_widgets_json_views, json_backside_widget_side;
            if (backside_widgets.length > 0) {
                json.semantic.backside_widgets = []; // TT.UTILITIES.get_json_of_array below will push json on to this
                backside_widgets_json_views = this.get_backside_widgets_json_views();
                if (backside_widgets_json_views) {
                    backside_widgets_json_views.forEach(function (backside_widget_view, index) {
                        var json_view, widget_index;
                        json_backside_widget_side = json.semantic.backside_widgets[index];
                        if (!json_backside_widget_side) {
                            return;
                        }
                        if (json_backside_widget_side.widget.shared_widget_index >= 0) {
                            widget_index = json_history.widgets_encountered.indexOf(json_history.shared_widgets[json_backside_widget_side.widget.shared_widget_index]);
                            if (!json_history.json_of_widgets_encountered[widget_index]) {
                               // TODO: determine if this is due to an earlier error
                               return;
                            }
                            json_view = json_history.json_of_widgets_encountered[widget_index].view;
                        } else {
                            json_view = json_backside_widget_side.widget.view;
                        }
                        if (json_backside_widget_side.is_backside) {
                            if (backside_widget_view.backside_left) {
                                json_view.backside_left = backside_widget_view.backside_left;
                                json_view.backside_top  = backside_widget_view.backside_top;
                            }
                        } else {
                            if (backside_widget_view.frontside_left) {
                                json_view.frontside_left = backside_widget_view.frontside_left;
                                json_view.frontside_top  = backside_widget_view.frontside_top;
                            }
                        }
                    });
                }
                TT.UTILITIES.get_json_of_array(backside_widgets, json.semantic.backside_widgets, 0, json_history, callback, start_time);
            } else {
                callback();
            }
        },

        has_backside_widgets: function (widget) {

                var backside_widgets = [];

                widget.get_backside_widgets = function () {
                    // TODO: callers no longer need check if each element is defined since add_backside_widget checks now
                    return backside_widgets;
                };

                widget.add_backside_widget = function (widget_side) {
                    var backside;
                    if (!widget_side) {
                        if (TT.debugging) {
                           TT.UTILITIES.report_internal_error("adding undefined to back side widgets.");
                        }
                        return;
                    }
                    backside = this.get_backside(true);
                    if (TT.debugging) {
                        if (widget_side === this) {
                            TT.UTILITIES.report_internal_error("Adding a widget to the list of its backside widgets!");
                            return;
                        }
                        if (widget_side.get_widget() === this) {
                            TT.UTILITIES.report_internal_error("Adding the backside of a widget to the list of its backside widgets!");
                            return;        
                        }
                    }
                    if (!backside_widgets) {
                        backside_widgets = [widget_side];
                    } else if (backside_widgets.indexOf(widget_side) < 0) {
                        backside_widgets.push(widget_side);                     
                    }
                    if (TT.logging && TT.logging.indexOf('backside-widgets') >= 0) {
                        console.log("Added " + widget_side + " to backside widgets of " + this + ". Number of backside widgets is " + backside_widgets.length);
                    }  
                    if (widget_side.is_backside()) {
                        widget_side.set_parent_of_backside(backside, true);
                    } else {
                        widget_side.set_parent_of_frontside(this, true);
                    }
                    if (backside.visible()) {
                        widget_side.set_visible(true);
                    }
     //             if (this.get_running()) {
     //                 widget.set_running(true);
     //             }
                };

                widget.remove_all_backside_widgets = function () {
                    // this is used to clear a top-level widget before loading new contents
                    if (!backside_widgets) {
                        return;
                    }
                    // slice() is to copy the array since calls to remove() may alter the array
                    backside_widgets.slice().forEach(function (backside_widget) {
                            backside_widget.remove();
                    });
                };

                widget.remove_backside_widget = function (widget_side, ignore_if_not_on_backside) {
                    var widget_index = backside_widgets.indexOf(widget_side);
                    var parent_of_backside, parent_of_frontside;
                    if (widget_index < 0) {
                        if (!ignore_if_not_on_backside) {
                            TT.UTILITIES.report_internal_error("Couldn't find a widget to remove it from backside widgets. " + widget_side.get_widget() + " (" + widget_side.get_widget()._debug_id + ")"); 
                        }
                        return;                        
                    }
                    backside_widgets.splice(widget_index, 1);
                    if (TT.logging && TT.logging.indexOf('backside-widgets') >= 0) {
                        console.log("Removed " + widget_side + " from backside widgets of " + this + ". Number of backside widgets is " + backside_widgets.length);
                    }  
                    if (this.backside_widgets_json_views) {
                        // remove from JSON view info about backside widgets
                        this.backside_widgets_json_views.splice(widget_index, 1);
                    }
                    if (widget_side.is_backside()) {
                        parent_of_backside = widget_side.get_parent();
                        if (parent_of_backside && parent_of_backside.get_widget() === this) {
                            widget_side.set_parent_of_backside(undefined, true, true);
                        }
                    } else {
                        parent_of_frontside = widget_side.get_parent_of_frontside();
                        if (parent_of_frontside && parent_of_frontside.get_widget() === this) {
                            widget_side.set_parent_of_frontside(undefined, undefined, true);
                        }       
                    }
                    widget_side.set_visible(false);
                };
                widget.set_backside_widgets = function (new_backside_widgets, json_views) {
                    var backside = this.get_backside();
                    var backside_visible = backside && backside.visible();
                    backside_widgets = new_backside_widgets;
                    if (backside_widgets.length > 0) {
                        if (backside) {
                            backside.add_backside_widgets(backside_widgets, json_views);
                        } else {
                            // store this for when backside is created 
                            this.backside_widgets_json_views = json_views;
                        }
                        backside_widgets.forEach(function (backside_widget) {
                            if (!backside_widget) {
                                return;
                            }
                            if (backside_widget.is_backside()) {
                                backside_widget.set_parent_of_backside(this, true);
                            } else {
                                backside_widget.set_parent_of_frontside(this, true);
                            }
                            if (backside_visible) {
                                backside_widget.set_visible(backside_visible);
                            }
                        }.bind(this)); 
                    }
                };
        },
              
        get_backside_widgets_json_views: function (create) {
            if (!this.backside_widgets_json_views && create) {
                this.backside_widgets_json_views = [];
            }
            return this.backside_widgets_json_views;
        },
        
        can_run: function () {
            // returns true if a backside element is a trained robot or 
            // or a widget this can_run 
            var backside_widgets = this.get_backside_widgets();
            var can_run = false;
            var backside_widget;
            backside_widgets.some(function (backside_widget_side) {
                if (!backside_widget_side) {
                    return false;
                };
                backside_widget = backside_widget_side.get_widget();
                // probably following should be handled by robot
                // but need to be careful to not confuse running the robot and running the widgets on the back of a robot
                if (backside_widget.get_body && !backside_widget.get_body().is_empty()) {
                    can_run = true;
                    return true;
                }      
                if (backside_widget.can_run()) {
                    can_run = true;
                    return true;
                }
            });
            return can_run;
        },

        add_to_copy: function (copy, parameters) {
            var backside_widgets;
            if (this.get_erased && this.get_erased()) {
                if (!copy.set_erased) {
                    // copy hasn't got get_erased and set_erased so give it to it now
                    TT.widget.erasable(copy);
                }
                copy.set_erased(this.get_erased());
            }
            if (!parameters || !parameters.just_value) {
                backside_widgets = this.get_backside_widgets();
                if (backside_widgets.length > 0) {
                    copy.set_backside_widgets(TT.UTILITIES.copy_widget_sides(backside_widgets, parameters), this.get_backside_widgets_json_views());
                }
            }
            // used to make copy visible if this is but not always appropriate
            // e.g. when a robot on the back is copying resources
            copy.set_running(this.get_running());
            return copy;
        },
        
        get_type_name: function () {
            // only used for informative purposes so ignore if not overridden 
            return "";
        },
        
        copy: function () {
            console.assert(false, "copy not implemented");
        },
        
        add_copy_to_container: function (widget_copy, x_offset, y_offset) {
            var visible = this.visible();
            var frontside_element, frontside_element_copy, $container_element, ok_to_set_dimensions,  position, container_widget;
            if (!widget_copy) {
                widget_copy = this.copy({});
            }
            frontside_element = this.get_frontside_element(visible);
            frontside_element_copy = widget_copy.get_frontside_element(visible);  
            $container_element = $(frontside_element).closest(".toontalk-backside");
            ok_to_set_dimensions = widget_copy.ok_to_set_dimensions();
            if ($container_element.length === 0) {
                $container_element = $(this.top_level_widget().get_backside_element());  
            }
            container_widget = TT.UTILITIES.widget_side_of_jquery($container_element);
            if (visible) {
                if (typeof x_offset === 'undefined') {
                    x_offset = 30;
                }
                if (typeof y_offset === 'undefined') {
                    y_offset = 30;
                }
                position = TT.UTILITIES.relative_position(frontside_element, $container_element.get(0));
                if ($container_element.length > 0) {
                    $container_element.get(0).appendChild(frontside_element_copy);
                }
                // plain text should not have its dimensions set
                TT.UTILITIES.set_css(frontside_element_copy,
                                     {width:  ok_to_set_dimensions ? $(frontside_element).width()  : "",
                                      height: ok_to_set_dimensions ? $(frontside_element).height() : "",
                                      left:   position.left+x_offset,
                                      top:    position.top+y_offset,
                                      "z-index": TT.UTILITIES.next_z_index()});
            }
            if (container_widget) {
                container_widget.add_backside_widget(widget_copy);
//              console.log("Added the copy " + widget_copy + " (" + widget_copy._debug_id + ") to " + container_widget + " (" + container_widget._debug_id + ")");
            }
            return widget_copy;
        },
        
        visible: function () {
            var frontside
            if (document.hidden) {
                // e.g. window is minimised
                return;
            }
            frontside = this.get_frontside();
            if (!frontside) {
                return false;
            }
            return frontside.visible();
        },

        set_visible: function (new_value) {
            var frontside = this.get_frontside(new_value);
            if (frontside) {
                frontside.set_visible(new_value);
            }
        },

        is_backside: function () {
            // only the backside of a widget is backside
            return false;
        },

        get_parent: function () {
            return this.get_parent_of_frontside();
        },

        set_parent: function (new_parent) {
            this.set_parent_of_frontside(new_parent);
        },
        
        drag_started: function (json, is_resource) {
            // by default records this if robot is being trained
            // widgets may override this behaviour
            if (this.robot_in_training()) {
                this.robot_in_training().picked_up(this, json, is_resource);
            }
        },
        
        match: function (context) {
            // should return 'matched', 'not-matched', or an array of nests waiting for objects to arrive
            console.assert(false, "match not implemented for " + context.toString());
        },
                   
        removed: function (part) {
            // part should be a ToonTalk widget that is part of this
            TT.UTILITIES.report_internal_error("removed not implemented");
        },
        
        equals_box: function () {
            // if a box didn't respond to this then not equal
            return false;
        },
        
        equals_number: function () {
            // if a number didn't respond to this then not equal
            return false;
        },
        
        open_backside: function (continuation) {
            // continuation will be run after animation is completed
            var backside = this.get_backside();
            var new_continuation, animate_backside_appearance,
                backside_element, frontside_element, parent, $frontside_ancestor_that_is_backside_element, backside_widgets,
                $frontside_ancestor_before_backside_element, frontside_ancestor_before_backside_element, ancestor_that_owns_backside_element,
                final_left, final_top, 
                frontside_offset, backside_width, frontside_height, 
                container_offset, container_width;
            if (backside && $(backside.get_element()).is(":visible")) {
                // already open
                // make it is opaque
                $(backside.get_element()).css({opacity: 1});
                if (new_continuation) {
                    new_continuation();
                }
                return;
            }
            new_continuation = continuation && function () {
                                                   setTimeout(continuation);
                                               };
            animate_backside_appearance = 
                function (element, final_opacity) {
                    TT.UTILITIES.set_timeout(
                        function ()  {
                            var remove_transition_class = function () {
                                $(element).removeClass("toontalk-side-appearing");
                                if (new_continuation) {
                                    new_continuation();
                                }
                            };
                            $(element).addClass("toontalk-side-appearing");
                            TT.UTILITIES.add_one_shot_event_handler(element, "transitionend", 2500, remove_transition_class);
                            $(element).css({left:    final_left,
                                            top:     final_top,
                                            opacity: final_opacity});
                            this.apply_backside_geometry();
                        }.bind(this));
                }.bind(this);
            frontside_element = this.get_frontside_element();
            // frontside_ancestor_that_is_backside_element is first parent that is a toontalk-backside
            $frontside_ancestor_that_is_backside_element = $(frontside_element).parent();
            $frontside_ancestor_before_backside_element  = $(frontside_element);
            if ($frontside_ancestor_before_backside_element.is(".toontalk-top-level-resource")) {
                if (new_continuation) {
                    new_continuation();
                }
                return;
            }
            while ($frontside_ancestor_that_is_backside_element.length > 0 && !$frontside_ancestor_that_is_backside_element.is(".toontalk-backside")) {
                $frontside_ancestor_before_backside_element  = $frontside_ancestor_that_is_backside_element;
                $frontside_ancestor_that_is_backside_element = $frontside_ancestor_that_is_backside_element.parent();
            }
            frontside_ancestor_before_backside_element = $frontside_ancestor_before_backside_element.get(0);
            backside = this.get_backside(true);
            backside_element = backside.get_element();
            backside_element.toontalk_widget_side = backside;
            // start on the frontside (same upper left corner as frontside)
            frontside_offset = $(frontside_element).offset();
            container_offset = $frontside_ancestor_that_is_backside_element.offset();
            container_width  = $frontside_ancestor_that_is_backside_element.width();
            if (!container_offset) {
                container_offset = {left: 0, 
                                    top:  0};
            }
            $(backside_element).css({left: frontside_offset.left-container_offset.left,
                                     top:  frontside_offset.top -container_offset.top,
                                     opacity: .01});
            if ($frontside_ancestor_that_is_backside_element.length > 0) {
                $frontside_ancestor_that_is_backside_element.get(0).appendChild(backside_element);
            }
            ancestor_that_owns_backside_element = TT.UTILITIES.widget_side_of_jquery($frontside_ancestor_that_is_backside_element);
            if (ancestor_that_owns_backside_element) {
                ancestor_that_owns_backside_element.add_backside_widget(backside);
            }
            // leave a gap between front and backside -- don't want settings, flag, and stop sign to be overlapped
            if (this.is_element()) {
                frontside_height = this.get_attribute('height');
            } else {
                frontside_height = $(frontside_element).height();
            }
            backside_width = $(backside_element).width();
            // put backside under the widget
            final_left = frontside_offset.left-container_offset.left;
            if (final_left+backside_width > container_width) {
                    // goes off the edge of the container
                final_left = Math.max(0, container_width-backside_width);
            }
            final_top = (frontside_offset.top-container_offset.top) + frontside_height + 34;
            if (this.is_box()) {
                // frontside_height doesn't include boxes borders
                // TODO: figure out a better way of dealing with this
                final_top += 28;
            } 
            animate_backside_appearance(backside_element, "inherit");
            backside.set_visible(true);
            backside_widgets = this.get_backside_widgets();
            if (backside_widgets.length > 0) {
                backside_widgets.forEach(function (widget_side) {
                        if (widget_side.is_backside() && backside_widgets.indexOf(widget_side.get_widget()) >= 0) {
                            // hide backside if front side also on the back
                            widget_side.hide_backside();
                        } else {
                            widget_side.set_visible(true);
                            backside_element.appendChild(widget_side.get_element(true));
                        }
                }.bind(this));
            }
            return backside;
        },
                
        hide_backside: function () {
            var backside = this.get_backside()
            if (backside) {
                backside.hide_backside();
            }
        },
                
        apply_backside_geometry: function () {
            var backside = this.get_backside(true);
            var backside_element = backside.get_element();
            if (this.backside_geometry && backside_element) {
                backside.scale_backside(backside_element, this.backside_geometry.x_scale, this.backside_geometry.y_scale, this.backside_geometry.original_width, this.backside_geometry.original_height);
                // backside needs to know its scales when shown again or when creating JSON
                backside.set_dimensions(this.backside_geometry);
            }
        },

        robot_in_training: function () {
            return this.top_level_widget().robot_in_training();
        },

        robot_training_this_robot: function () {
            return this.top_level_widget().robot_training_this_robot();
        },

        robot_started_training: function (robot) {
             this.top_level_widget().robot_started_training(robot);
        },

        robot_finished_training: function () {
             this.top_level_widget().robot_finished_training();
        },

        backup_all: function (immediately) {
            var top_level_widget = this.top_level_widget();
            if (top_level_widget) {
                top_level_widget.save(immediately);
            }
        },

        render: function () {
            // typically first time it is displayed so no check if visible
            TT.DISPLAY_UPDATES.pending_update(this);
        },
        
        rerender: function () {
            // state has changed so needs to be rendered again (if visible)
            if (this.visible()) {
                this.render();
            }
        },
        
        hide: function () {
            $(this.get_frontside_element()).hide();
        },

        location_constrained_by_container: function () {
            var parent = this.get_parent_of_frontside();
            if (parent && (parent.is_hole() || parent.is_nest() || parent.is_robot())) {
                 // TODO: generalise this for other kinds of containers
                 // robot is included since it then a condition contrained to condition area
                return true;
            }
            return false;
        },
        
        close_button_ok: function (element) {
            return this.get_type_name() !== "top-level" &&
                   !$(element).is(".toontalk-top-level-resource") &&
                   !$(element).closest(".toontalk-conditions-panel").is("*");
        },

        get_widget: function () {
            // caller may be asking a parent that could be a backside for its widget
            return this;
        },

        add_to_top_level_backside: function (widget_side, train) {
            var top_level_widget = this.top_level_widget();
            var widget_frontside_element;
            if (!widget_side) {
                widget_side = this;
            }
            widget_frontside_element = widget_side.get_element(true);
            top_level_widget.add_backside_widget(widget_side);
            top_level_widget.get_backside_element().appendChild(widget_frontside_element);
            widget_side.render();
            if (train && this.robot_in_training()) {
                this.robot_in_training().dropped_on(widget_side, top_level_widget);
            }
            return widget_frontside_element;
        },

        create_top_level_widget: function (settings) {
            var top_level_widget = Object.create(TT.widget);
            var stack_of_robots_in_training = [];
            var return_false = function () {
                return false;
            };
            var save_in_progress = false;
            if (!settings) {
                settings = {};  
            }
            top_level_widget.is_top_level = function () {
                 return true;
            };
            top_level_widget.is_number = return_false;
            top_level_widget.is_box = return_false;
            top_level_widget.is_empty_hole = return_false;
            top_level_widget.is_scale = return_false;
            top_level_widget.is_bird = return_false;
            top_level_widget.is_nest = return_false;
            top_level_widget.is_robot = return_false;
            top_level_widget.is_element = return_false;
            top_level_widget.is_sensor = return_false;
            top_level_widget.is_function_nest = return_false;
            top_level_widget.is_hole = return_false;
            top_level_widget.is_plain_text_element = return_false;
            top_level_widget.is_attribute_widget = return_false;
            top_level_widget.ok_to_set_dimensions = return_false;
            top_level_widget.get_json = function (json_history, callback, start_time) {
                var backside = this.get_backside(true);
                var backside_element = backside.get_element();
                var background_color = document.defaultView.getComputedStyle(backside_element, null).getPropertyValue("background-color");
                // don't know why the following returns undefined
//               $backside_element.attr("background-color")};
                callback({semantic: {type: "top_level",
                                     settings: settings},
                          view:     {background_color: background_color}},
                         start_time);
            };
            top_level_widget.get_type_name = function () {
                 return "top-level";
            };
            top_level_widget.is_of_type = function(type_name) {
                    return type_name === "top-level";
            };
            top_level_widget.toString = function () {
                return "top level widget";
            };
            top_level_widget.get_description = function () {
                 // doesn't have one (at least for now)
                 return;
            };
            top_level_widget.match = function () {
                return 'matched';
            };
            top_level_widget.update_display = function () {
                if (this.get_backside_widgets()) {
                    this.get_backside_widgets().forEach(function (widget_side) {
                        if (widget_side && widget_side.visible()) {
                            widget_side.render();
                        }    
                    });
                }
            };
            top_level_widget.copy = function () {
                // revisit this if ever there are multiple top-level backsides
                // copied when training a robot
                return this;
            };
            top_level_widget.visible = function () {
                // might want to be able to make top-level backsides invisible 
                // for a while to run faster
                return true;
            };
            top_level_widget.get_parent_of_frontside = function () {
                return undefined;
            };
            top_level_widget.get_parent_of_backside = function () {
                return undefined;
            };
            top_level_widget.closest_visible_ancestor = function () {
                return this;
            };
            top_level_widget.get_infinite_stack = function () {
                return false;
            };
            top_level_widget.top_level_widget = function () {
                return this;
            };
            if (TT.debugging || TT.logging) {
                top_level_widget.to_debug_string = function () {
                    var location = $(this.get_backside_element()).offset();
                    return "top-level widget at " + Math.round(location.left) + ", " + Math.round(location.top);
                };
            }
            top_level_widget.add_sides_functionality(top_level_widget);
            top_level_widget.runnable(top_level_widget);
            top_level_widget.has_parent(top_level_widget);
            top_level_widget.has_backside_widgets(top_level_widget);
            top_level_widget.removed_from_container = function (side_of_other, event) {
                if (!this.robot_in_training()) {
                   // robots in training take care of this (and need to to record things properly)
                   this.remove_backside_widget(side_of_other, true);
                };
            };
            top_level_widget.widget_side_dropped_on_me = function (side_of_other, event, robot, ignore_training) {
                // why is this the default behaviour?
                return this.get_backside().widget_side_dropped_on_me(side_of_other, event, robot, ignore_training);
            };
            top_level_widget.get_element = function () {
                return this.get_backside().get_element();
            };
            top_level_widget.get_setting = function (option_name, dont_use_default) {
                if (typeof settings[option_name] === 'undefined' && !dont_use_default) {
                    settings[option_name] = TT.DEFAULT_SETTINGS && TT.DEFAULT_SETTINGS[option_name];     
                }
                return settings[option_name];
            };
            top_level_widget.set_setting = function (option_name, new_value) {
                settings[option_name] = new_value;
            };
            top_level_widget.open_settings = function () {
                TT.SETTINGS.open(top_level_widget);
            };
            top_level_widget.robot_in_training = function () {
                // for robots to train robot need a stack of robots
                if (stack_of_robots_in_training.length > 0) {
                    return stack_of_robots_in_training[stack_of_robots_in_training.length-1];
                }
            };
            top_level_widget.robot_training_this_robot = function () {
                if (stack_of_robots_in_training.length > 1) {
                    return stack_of_robots_in_training[stack_of_robots_in_training.length-2];
                }
            };
            top_level_widget.robot_started_training = function (robot) {
                 stack_of_robots_in_training.push(robot);  
            };
            top_level_widget.robot_finished_training = function () {
                 stack_of_robots_in_training.pop();  
            };
            top_level_widget.save = function (immediately, parameters, callback) {
                var program_name = this.get_setting('program_name', true);
                var save_function = function (json) {
                    save_in_progress = false;
                    if (save_to_google_drive) {
                        google_drive_status = TT.google_drive.get_status();
                        if (google_drive_status === "Ready") {
                            TT.google_drive.upload_file(program_name, "json", JSON.stringify(json, TT.UTILITIES.clean_JSON), callback);
                            callback = undefined;
                        } else if (TT.google_drive.connection_to_google_drive_possible()) {
                            if (google_drive_status === 'Need to authorize') {
                                TT.UTILITIES.display_message_if_new("Unable to save to your Google Drive because you need to log in. Click on the settings icon " +
                                                                    TT.UTILITIES.encode_HTML_for_title("<span class='toontalk-settings-icon'></span>") +
                                                                    " to log in.");
                                TT.UTILITIES.display_tooltip($(".toontalk-settings-button"));
                            } else {
                                console.log("Unable to save to Google Drive because: " + google_drive_status);
                            }
                        }    
                    }
                    if (parameters.local_storage) {
                       this.save_to_local_storage(json);
                    }
                    if (callback) {
                        callback();
                    }  
                }.bind(this);
                var save_to_google_drive, google_drive_status;
                if (save_in_progress) {
                    // large saves call timeOut
                    return;
                }
                if (!program_name) {
                    // not saving this -- e.g. an example in a documentation page
                    return;
                }
                if (!parameters) {
                    parameters = {};
                }
                if (typeof parameters.google_drive === 'undefined') {
                    parameters.google_drive = TT.google_drive && this.get_setting('auto_save_to_google_drive');
                }
                if (typeof parameters.local_storage === 'undefined') {
                    parameters.local_storage = this.get_setting('auto_save_to_local_storage');
                };
                if (!immediately) {
                    // delay it so the geometry settles down -- perhaps 0 (i.e. 4ms) is good enough
                    setTimeout(function () {
                                   this.save(true, parameters, callback);
                               }.bind(this),
                               100);
                    return;
                }
                save_to_google_drive = parameters.google_drive && !this.get_setting('google_drive_unavailable');
                if (!save_to_google_drive && !parameters.local_storage) {
                    // nothing to save 
                    if (callback) {
                        callback();
                    }
                    return;
                }
                save_in_progress = true;
                TT.UTILITIES.get_json_top_level(this, save_function, 250);
            };
            top_level_widget.publish = function (callback, as_workspace) {
                TT.publish.publish_widget(this.get_setting('program_name'), this, as_workspace, callback);   
            };
            top_level_widget.save_to_local_storage = function (json, time_stamp) {
                var program_name = this.get_setting('program_name');
                var key =           TT.UTILITIES.local_storage_program_key(program_name);
                var meta_data_key = TT.UTILITIES.local_storage_program_meta_data_key(program_name);
                var all_program_names, meta_data, message, json_string;
                if (!time_stamp) {
                    time_stamp = Date.now();
                }
                try {
                    meta_data = window.localStorage.getItem(meta_data_key);
                    if (meta_data) {
                        meta_data = JSON.parse(meta_data);
                    } else {
                        meta_data = {created: time_stamp};
                    }
                    meta_data.last_modified = time_stamp;
                    json_string = JSON.stringify(json, TT.UTILITIES.clean_json);
                    meta_data.file_size = json_string.length;
                    window.localStorage.setItem(meta_data_key, JSON.stringify(meta_data));
                    window.localStorage.setItem(key, json_string);
                    window.localStorage.setItem("toontalk-last-key", key);
                    all_program_names = TT.UTILITIES.get_all_locally_stored_program_names();
                    if (all_program_names.indexOf(program_name) < 0) {
                        all_program_names.push(program_name);
                        TT.UTILITIES.set_all_locally_stored_program_names(all_program_names);   
                    }
                } catch (error) {
                    if (json_string) {
                        message = "Failed to save state to local storage since it requires " + json_string.length + " bytes. Error message is " + error;
                    } else {
                        message = "Error while saving to local storage. Error message is " + error;
                    }
                    if (TT.UTILITIES.is_internet_explorer()) {
                        console.error("Unresolved difficulties using window.localStorage in IE11: " + message);
                    } else {
                        TT.UTILITIES.display_message(message);
                    }
                    // following could be displayed in the settings panel
                    this.last_local_storage_error = message;
                }
            };
            top_level_widget.load = function (google_drive_first, loaded_callback, nothing_to_load_callback) {
                var program_name = this.get_setting('program_name');
                var file_name = program_name + ".json";
                var key = TT.UTILITIES.local_storage_program_key(program_name);
                var download_callback = 
                    function (json_string) {
                        var json;
                        if (json_string) {
                            try {
                                json = JSON.parse(json_string);
                                top_level_widget.remove_all_backside_widgets();
                                TT.UTILITIES.add_backside_widgets_from_json(top_level_widget,
                                                                            json.semantic.backside_widgets,
                                                                            {json_of_shared_widgets: json.shared_widgets,
                                                                             shared_widgets:         [],
                                                                             shared_html:            json.shared_html});
                                if (loaded_callback) {
                                    loaded_callback();
                                }
                            } catch (e) {
                                TT.UTILITIES.display_message("Error encountered loading " + program_name + " : " + e);
                            }
                        } else if (nothing_to_load_callback) {
                            nothing_to_load_callback();
                        }
                };
                var callback = function (google_file) {   
                     if (google_file) {
                         TT.google_drive.download_file(google_file, download_callback);
                     } else {
                         download_callback(window.localStorage.getItem(key));
                     }
                };
                if (google_drive_first && TT.google_drive && TT.google_drive.get_status() === 'Ready') {
                    TT.google_drive.get_toontalk_program_file(file_name, callback);
                } else {
                    download_callback(window.localStorage.getItem(key));
                }
            };
            top_level_widget.walk_children = function () {
                // ignore since top-level widgets are currently only used for their backside
            };
            top_level_widget.render = function () {
                // ignore
            };
            top_level_widget.location_constrained_by_container = function () {
                return false;
            };
            top_level_widget.is_widget = true;
            if (TT.debugging) {
                top_level_widget._debug_id = TT.UTILITIES.generate_unique_id();
                top_level_widget._debug_string = "Top-level widget"; 
            }
            top_level_widget.get_backside(true).set_visible(true); // top-level backsides are always visible (at least for now)
            return top_level_widget;
        } // ends create_top_level_widget

    };

}(window.TOONTALK));

