 /**
 * Implements shared methods of ToonTalk's widgets
 * Authors: Ken Kahn
 * License: New BSD
 */

/*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */

window.TOONTALK.widget = (function (TT) {
    "use strict";
    // following definition is used for two different methods
    var get_frontside_element_function = function (update) {
        var frontside = this.get_frontside && this.get_frontside(true);
        if (!frontside) {
            return;
        }
        if (update) {
            this.rerender();
        }
        return frontside.get_element();
    };
                
    TT.creators_from_json["top_level"] = function (json) {
        var widget = TT.widget.create_top_level_widget(json.settings);
        var $backside_element = $(widget.get_backside(true).get_element());
        $backside_element.addClass("toontalk-top-level-backside");
//         $backside_element.click(
//             function (event) {
//                 if (event.target === $backside_element.get(0)) {
//                     // only if directly clicked upon
//                     widget.set_running(!widget.get_running());
//                     event.stopPropagation();
//                 }
//             }
//         );
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
            this.has_description(widget);
            this.has_listeners(widget);
            this.droppable(widget);
            // erasability will eventually will be used for type conversions
            // currently only for conditions
            this.erasable(widget);
            widget.top_level_widget = function () {
                var parent, $top_level_backsides;
                if (top_level_widget) {
                    return top_level_widget;
                }
                if (this.is_top_level()) {
                    return this;
                }
                top_level_widget = TT.UTILITIES.widget_from_jquery($(this.get_frontside_element()).closest(".toontalk-top-level-backside"));
                if (top_level_widget) {
                    return top_level_widget;
                }
                // TODO: revisit this -- may end up mixing up front and backsides
                // but only used to find top-level widget if DOM doesn't provide it
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
                    top_level_widget = TT.UTILITIES.widget_from_jquery($top_level_backsides);
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
            if (!widget.is_function_nest) {
                widget.is_function_nest = return_false;
            }
            if (!widget.is_plain_text_element) {
               widget.is_plain_text_element = return_false;
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
            if ((TT.debugging  || TT.logging) && !widget.to_debug_string) {
                widget.to_debug_string = function () {
                    var parent = this.get_parent_of_frontside();
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
                    return this.toString({plain_text: true}) + " (" + description + " " + ((this.get_name && (this.get_name() + " ")) || "") + id + ")";
                };
            }
            widget.is_top_level = return_false;
            widget.is_widget = true;
            return widget;
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
            return widget;
        },
        
        add_sides_functionality: function (widget) {
            var frontside, backside;
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
                       frontside_element = this.get_frontside_element();
                       if (!this.ok_to_set_dimensions()) {
                           css = {width:  '',
                                  height: ''};
                           // remove transforms as well
                           TT.UTILITIES.set_css_transform(css, '');
                           $(frontside_element).css(css);                          
                        } else if (this.set_size_attributes) {
                            // e.g. element widgets need to update their attributes
                            this.set_size_attributes(this.saved_width, this.saved_height);
                        } else {
                            $(frontside_element).css({width:  this.saved_width,
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
                    backside = undefined;
                    // do this recursively so backsides are fully reconstructed
                    // otherwise things like JQuery UI 'button' is not reapplied
//                     this.get_backside_widgets().forEach(function (backside_widget) {
//                             backside_widget.get_widget().forget_backside();
//                     });
                };
            }
            if (!widget.create_backside) {
                widget.create_backside = function () {
                    return TT.backside.create(widget);
                };
            }
            return widget;
        },
        
        runnable: function (widget) {
            var running   = false;
            var ok_to_run = false;
            if (!widget.get_running) {
                widget.get_running = function () {
                    var some_backside_widgets_running = false;
                    var backside_widgets;
                    if (running) {
                        // see if it is really running
                        backside_widgets = this.get_backside_widgets();
                        if (backside_widgets.length === 0) {
                            running = false;
                        } else {
                            backside_widgets.some(function (widget_side) {
                                                      var widget = widget_side.get_widget();
                                                      if (widget.get_running()) {
                                                          some_backside_widgets_running = true;
                                                          return true;
                                                      }
                            });
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
                widget.set_running = function (new_value, top_level_context) {
                    var unchanged_value = (running === new_value);
                    var backside_widgets, backside_widget, backside_element;
                    ok_to_run = new_value;
//                     if (unchanged_value && running) {
//                         // even if not running some part might be running and should be turned off
//                         return;
//                     }
                    backside_widgets = this.get_backside_widgets();
                    running = new_value;
                    if (this.get_backside()) {
                        this.get_backside().run_status_changed(running);
                    }
                    backside_widgets.forEach(function (backside_widget_side) {
                        backside_widget = backside_widget_side.get_widget();
                        if (backside_widget_side.is_backside()) {
                           // make sure that the frontside isn't also running
                           if (this.backside_widgets.indexOf(backside_widget) >= 0) {
                               return;
                           }
                        }
                        if (backside_widget.is_robot()) {
                            // only frontsides of robots run
                            if (!backside_widget_side.is_backside()) {
                                // could this set_stopped stuff be combined with set_running?
                                if (running) {
                                    backside_widget.set_stopped(false);
                                    backside_widget.run(widget, top_level_context);
                                    backside_widget.set_ok_to_run(true);
                                } else {
                                    backside_widget.set_stopped(true);
                                    backside_widget.set_running(false);
                                }
                                backside_widget.rerender();
                            }
                        } else if (backside_widget.set_running) {
                            if (!top_level_context && backside_widget_side.is_backside() && widget.get_type_name() !== "top-level") {
                                // a robot is on the backside of a widget that is on the backside of another
                                // then its context is the containing widget
                                backside_widget.set_running(new_value, widget);
                            } else {
                                // if frontside then its context is the widget of the frontside (i.e. backside_widget)
                                backside_widget.set_running(new_value);
                            }
                        }
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
                                this.run(widget.get_parent_of_backside().get_widget(), top_level_context);
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
            return widget;
        },

        droppable: function (widget) {
            if (!widget.drop_on) {
                widget.drop_on = function (other, is_backside, event, robot) {
                    if (other.widget_dropped_on_me) {
                        return other.widget_dropped_on_me(this, is_backside, event, robot);
                    }
                    console.log("No handler for drop of '" + this + "' on '" + other + "'");
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
            return widget;
        },
        
        animatable: function (widget) {
            var find_widget_element;
            if (!widget.animate_to_widget) {
                find_widget_element = function (widget) {
                    var widget_element = widget.get_element();
                    if (!widget_element || (!widget.is_backside() && !$(widget_element).is(":visible"))) {        
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
                             this.render();
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
                    if (!target_element || !$(target_element).is(":visible")) {
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
            return widget;
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
                    } else if (!backside || !backside.get_element() || !$(backside.get_element()).is(":visible")) {
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
//                     } else if (!description && !this.get_custom_title_prefix) {
//                         title = "I'm " + TT.UTILITIES.add_a_or_an(type_name) + ".";
//                     } else {
//                         title = "";
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
                TT.UTILITIES.give_tooltip(this.get_frontside_element(), this.get_title());
            };
            return widget;
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
            var parent_of_frontside, parent_of_backside;
            widget.get_parent_of_frontside = function () {
                return parent_of_frontside;
            };
            widget.get_parent_of_backside = function () {
                return parent_of_backside;
            };
            widget.set_parent_of_frontside = function (new_parent, parent_is_backside, backside_widget_already_removed) {
                var old_parent_of_frontside = parent_of_frontside;
                var new_parent_backside;
                if (!new_parent || !parent_is_backside) {
                    if (parent_of_frontside === new_parent) {
                        return; // already knew this
                    }
                    parent_of_frontside = new_parent;
                } else {
                    new_parent_backside = new_parent.get_backside(true);
                    if (parent_of_frontside === new_parent_backside) {
                        return; // already knew this
                    }
                    parent_of_frontside = new_parent_backside;
                }
                if (old_parent_of_frontside && !backside_widget_already_removed && old_parent_of_frontside.is_backside()) {
                    old_parent_of_frontside.get_widget().remove_backside_widget(this, false, true);
                }
            };
            widget.set_parent_of_backside = function (widget, parent_is_backside, already_removed_from_parent_of_backside) {
                if (parent_of_backside && !already_removed_from_parent_of_backside && parent_of_backside.is_backside()) {
                    parent_of_backside.get_widget().remove_backside_widget(this, true, true);
                }
                if (!widget || !parent_is_backside) {
                    parent_of_backside = widget;
                    return; 
                }
                parent_of_backside =  widget.get_backside(true);
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
                while (ancestor && !$(ancestor.get_frontside_element()).is(":visible")) {
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
                var ancestor = this;
                while (ancestor) {
                    if (other === ancestor) {
                        return true;
                    }
                    if (ancestor.is_backside()) {
                        ancestor = ancestor.get_widget().get_parent_of_backside();    
                    } else {
                        ancestor = ancestor.get_parent_of_frontside();
                    }
                }
                return false;
            };
            widget.remove_from_parent_of_frontside = function (event) {
                 if (parent_of_frontside) {
                     if (parent_of_frontside.is_backside()) {
                         // !event because if a robot is doing this no warning if already removed
                         parent_of_frontside.remove_backside_widget(this, false, !event);
                     } else if (parent_of_frontside.removed_from_container) {
                         parent_of_frontside.removed_from_container(this, false, event, undefined, true);
                     }
                 }
            };
            return widget;
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
        
        remove: function (event) {
            var backside  = this.get_backside();
            var frontside = this.get_frontside();
            var parent_of_frontside = this.get_parent_of_frontside();
            var parent_of_backside  = this.get_parent_of_backside();
            var backside_of_parent;
            if (backside) {
                backside.hide_backside();
            }
            if (frontside) {
                frontside.remove();
                if (parent_of_frontside) {
                    this.remove_from_parent_of_frontside(event);
                }
            }   
            this.set_running(false);
            this.set_visible(false); // in case robot vacuumed the widget while it was animating
            if (this.walk_children) {
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
        
//         get_side_element: function (create) {
//             // returns frontside if showing otherwise backside
//             if (this.get_frontside().visible()) {
//                 return this.get_frontside_element(create);
//             } else {
//                 return this.get_backside_element(create);
//             }
//         },
        
        add_to_json: function (json_semantic, json_history) {
            var json_view, json, position, frontside_element, backside, backside_element, frontside_width;
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
                if (this.get_running && this.get_running()) {
                    json_semantic.running = true;
                }
                if (!this.get_parent_of_frontside() || this.get_parent_of_frontside().is_backside()) {
                    // otherwise geometry isn't needed
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
                            position = $(frontside_element).position();
                        }
                        if (position) {
                            json_view.frontside_left = position.left;
                            json_view.frontside_top  = position.top;
                        }
                    }
                }
                backside = this.get_backside();
                if (backside) {
                    backside_element = backside.get_element();
                    if (backside_element) {
                        json_view.backside_width  = $(backside_element).width();
                        json_view.backside_height = $(backside_element).height();
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
        
        add_backside_widgets_to_json: function (json, json_history) {
            var backside_widgets = this.get_backside_widgets(); 
            var backside_widgets_json_views, json_backside_widget_side;
            if (backside_widgets.length > 0) {
                json.semantic.backside_widgets = TT.UTILITIES.get_json_of_array(backside_widgets, json_history);
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
            }
        },

        get_backside_widgets: function () {
            return this.backside_widgets || [];
        },
        
        add_backside_widget: function (widget, is_backside) {
            // TODO: clean this up and just pass a widget_side here
            var backside = this.get_backside(true);
            var widget_side = is_backside ? widget.get_backside() : widget;
            if (TT.debugging && widget === this) {
                TT.UTILITIES.report_internal_error("Adding a widget to a list of its backside widgets!");
                return;
            }
            if (!this.backside_widgets) {
                this.backside_widgets = [widget_side];
            } else if (this.backside_widgets.indexOf(widget_side) < 0) {
                this.backside_widgets.push(widget_side);                         
            }
            if (is_backside) {
                widget.set_parent_of_backside(this, true);
            } else {
                widget.set_parent_of_frontside(this, true);
            }
            if (backside.visible()) {
                widget_side.set_visible(true);
                widget.render();
            }
//             if (this.get_running()) {
//                 widget.set_running(true);
//             }
        },

        remove_all_backside_widgets: function () {
            // this is used to clear a top-level widget before loading new contents
            if (!this.backside_widgets) {
                return;
            }
            while (this.backside_widgets.length > 0) {
                this.backside_widgets[0].remove();
//              this.remove_backside_widget(this.backside_widgets[0], this.backside_widgets[0].is_backside());
            }
        },
        
        remove_backside_widget: function (widget, is_backside, ignore_if_not_on_backside) {
            var backside = this.get_backside();
            var widget_side = is_backside ? widget.get_backside(true) : widget;
            var widget_index, parent_of_backside, parent_of_frontside;
            if (TT.debugging && !this.backside_widgets) {
                if (ignore_if_not_on_backside) {
                    console.log("remove_backside_widget called and there are no backside_widgets");
                } else {
                    TT.UTILITIES.report_internal_error("Couldn't remove a widget from backside widgets.");
                }
                return;
            }
            widget_index = this.backside_widgets.indexOf(widget_side);
            if (widget_index < 0) {
                if (ignore_if_not_on_backside) {
                    if (TT.debugging) {
                        console.log("Warning: Probable redundant call to remove_backside_widget");
                    }
                } else {
                    TT.UTILITIES.report_internal_error("Couldn't find a widget to remove it from backside widgets. " + widget_side.get_widget() + " (" + widget_side.get_widget()._debug_id + ")"); 
                }
                return;                        
            }
            this.backside_widgets.splice(widget_index, 1);
            if (this.backside_widgets_json_views) {
                // remove from JSON view info about backside widgets
                this.backside_widgets_json_views.splice(widget_index, 1);
            }
            if (is_backside) {
                parent_of_backside = widget.get_parent_of_backside();
                if (parent_of_backside && parent_of_backside.get_widget() === this) {
                    widget.set_parent_of_backside(undefined, true, true);
                }
            } else {
                parent_of_frontside = widget.get_parent_of_frontside();
                if (parent_of_frontside && parent_of_frontside.get_widget() === this) {
                    widget.set_parent_of_frontside(undefined, undefined, true);
                }       
            }
            widget_side.set_visible(false);
//          console.log("Removed " + widget + " (" + widget._debug_id + ") from list of backside widgets of " + this + ". Length is now " +  this.backside_widgets.length);
//             if (backside) {
//                 backside.update_run_button_disabled_attribute();
//             }
        },
        
        set_backside_widget_sides: function (backside_widgets, json_views) {
            var backside = this.get_backside();
            var backside_visible = backside && backside.visible();
//          console.log("setting backside_widgets of " + this + " were " + this.backside_widgets + " and is now " + backside_widgets);
            this.backside_widgets = backside_widgets;
            if (backside_widgets.length > 0) { 
                if (this.get_backside()) {
                    this.get_backside().add_backside_widgets(backside_widgets, json_views);
                } else {
                    // store this for when backside is created 
                    this.backside_widgets_json_views = json_views;
                }
                backside_widgets.forEach(function (backside_widget) {
                    if (!backside_widget) {
                        return;
                    }
                    if (backside_widget.is_backside()) {
                        backside_widget.get_widget().set_parent_of_backside(this, true);
                    } else {
                        backside_widget.get_widget().set_parent_of_frontside(this, true);
                    }
                    backside_widget.set_visible(backside_visible);
                }.bind(this)); 
            }
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
                    copy.set_backside_widget_sides(TT.UTILITIES.copy_widget_sides(backside_widgets, parameters), this.get_backside_widgets_json_views());
                }
            }
            copy.set_visible(this.visible());
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
            if (!widget_copy) {
                widget_copy = this.copy({});
            }
            var frontside_element = this.get_frontside_element();
            var frontside_element_copy = widget_copy.get_frontside_element();  
            var $container_element = $(frontside_element).closest(".toontalk-backside");
            var ok_to_set_dimensions = widget_copy.ok_to_set_dimensions();
            var position, container_widget;
            if ($container_element.length === 0) {
                $container_element = $(".toontalk-backside");  
            }
            if (typeof x_offset === 'undefined') {
                x_offset = 30;
            }
            if (typeof y_offset === 'undefined') {
                y_offset = 30;
            }
            position = TT.UTILITIES.relative_position(frontside_element, $container_element.get(0));
            container_widget = TT.UTILITIES.widget_from_jquery($container_element);
            // plain text should not have its dimensions set
            $(frontside_element_copy).css({width:  ok_to_set_dimensions ? $(frontside_element).width()  : "",
                                           height: ok_to_set_dimensions ? $(frontside_element).height() : "",
                                           left: position.left+x_offset,
                                           top:  position.top+y_offset});
            $container_element.get(0).appendChild(frontside_element_copy);
            if (container_widget) {
                container_widget.add_backside_widget(widget_copy);
//              console.log("Added the copy " + widget_copy + " (" + widget_copy._debug_id + ") to " + container_widget + " (" + container_widget._debug_id + ")");
            }
            if (this.robot_in_training()) {
                this.robot_in_training().copied(this, widget_copy, false);
            }
            return widget_copy;
        },
        
        visible: function () {
            var frontside = this.get_frontside();
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
            var new_continuation = continuation && function () {
                                                      setTimeout(continuation);
                                                   };
            var animate_backside_appearance = 
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
                            $(element).css({left: final_left,
                                            top:  final_top,
                                            opacity: final_opacity});
                            this.apply_backside_geometry();
                        }.bind(this));
                }.bind(this);
            var backside_element, frontside_element, parent, $frontside_ancestor_that_is_backside_element,
                $frontside_ancestor_before_backside_element, frontside_ancestor_before_backside_element, ancestor_that_owns_backside_element,
                final_left, final_top, 
                frontside_offset, backside_width, frontside_height, 
                container_offset, container_width;
            if (backside) {
                backside_element = backside.get_element();
                if ($(backside_element).is(":visible")) {
                    TT.UTILITIES.highlight_element(backside_element, undefined, 1000);
                    if (new_continuation) {
                        new_continuation();
                    }
                    return backside;
                }
                // need to see if on backside is on the backside of another (and that is closed)
                parent = this.get_parent_of_backside();
                if (parent && parent.is_backside()) {
                    return parent.get_widget().open_backside(continuation);
                }
            }
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
            backside_element.toontalk_widget = this;
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
                                     opacity: .01
            });
            $frontside_ancestor_that_is_backside_element.append(backside_element);
            ancestor_that_owns_backside_element = TT.UTILITIES.widget_from_jquery($frontside_ancestor_that_is_backside_element);
            if (ancestor_that_owns_backside_element) {
                ancestor_that_owns_backside_element.add_backside_widget(this, true);
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
            backside.render();
            if (this.backside_widgets) {
                this.backside_widgets.forEach(function (widget_side) {
                        widget_side.render();
                        widget_side.set_visible(true);
                });
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
                TT.backside.scale_backside($(backside_element), this.backside_geometry.x_scale, this.backside_geometry.y_scale, this.backside_geometry.original_width, this.backside_geometry.original_height);
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
        
        close_button_ok: function (element) {
            return this.get_type_name() !== "top-level" &&
                   !$(element).is(".toontalk-top-level-resource") &&
                   !$(element).closest(".toontalk-conditions-panel").is("*");
        },

        get_widget: function () {
            // caller may be asking a parent that could be a backside for its widget
            return this;
        },

        add_to_top_level_backside: function (widget, train) {
            var top_level_widget = this.top_level_widget();
            var widget_frontside_element = widget.get_frontside_element(true);
            top_level_widget.add_backside_widget(widget);
            top_level_widget.get_backside_element().appendChild(widget_frontside_element);
            widget.render();
            if (train && this.robot_in_training()) {
                this.robot_in_training().dropped_on(widget, top_level_widget);
            }
            return widget_frontside_element;
        },

        create_top_level_widget: function (settings) {
            var widget = Object.create(TT.widget);
            var stack_of_robots_in_training = [];
            var return_false = function () {
                return false;
            };
            if (!settings) {
                settings = {};  
            }
            widget.is_top_level = function () {
                 return true;
            };
            widget.is_number = return_false;
            widget.is_box = return_false;
            widget.is_empty_hole = return_false;
            widget.is_scale = return_false;
            widget.is_bird = return_false;
            widget.is_nest = return_false;
            widget.is_robot = return_false;
            widget.is_element = return_false;
            widget.is_function_nest = return_false;
            widget.is_hole = return_false;
            widget.is_plain_text_element = return_false;
            widget.ok_to_set_dimensions = return_false;
            widget.get_json = function (json_history) {
                var backside = this.get_backside(true);
                var backside_element = backside.get_element();
                var background_color = document.defaultView.getComputedStyle(backside_element, null).getPropertyValue("background-color");
                // don't know why the following returns undefined
//               $backside_element.attr("background-color")};
                return {semantic: {type: "top_level",
                                   settings: settings},
                        view:     {background_color: background_color}};
            };
            widget.get_type_name = function () {
                 return "top-level";
            };
            widget.is_of_type = function(type_name) {
                    return type_name === "top-level";
            };
            widget.toString = function () {
                return "top level widget";
            };
            widget.get_description = function () {
                 // doesn't have one (at least for now)
                 return;
            };
            widget.match = function () {
                return 'matched';
            };
            widget.update_display = function () {
                if (this.backside_widgets) {
                    this.backside_widgets.forEach(function (widget_side) {
                        if (widget_side && widget_side.visible()) {
                            widget_side.update_display();
                        }    
                    });
                }
            };
            widget.copy = function () {
                // revisit this if ever there are multiple top-level backsides
                // copied when training a robot
                return this;
            };
            widget.visible = function () {
                // might want to be able to make top-level backsides invisible 
                // for a while to run faster
                return true;
            };
            widget.get_parent_of_frontside = function () {
                return undefined;
            };
            widget.get_parent_of_backside = function () {
                return undefined;
            };
            widget.closest_visible_ancestor = function () {
                return this;
            };
            widget.get_infinite_stack = function () {
                return false;
            };
            widget.top_level_widget = function () {
                return this;
            };
            if (TT.debugging || TT.logging) {
                widget.to_debug_string = function () {
                    var location = $(this.get_backside_element()).offset();
                    return "top-level widget at " + Math.round(location.left) + ", " + Math.round(location.top);
                };
            }
            widget = widget.add_sides_functionality(widget);
            widget = widget.runnable(widget);
            widget = widget.has_parent(widget);
            widget.removed_from_container = function (other, backside_removed, event, index, ignore_if_not_on_backside) {
                if (!this.robot_in_training()) {
                   // robots in training take care of this (and need to to record things properly)
                   this.remove_backside_widget(other, backside_removed, ignore_if_not_on_backside);
                };
            };
            widget.widget_dropped_on_me = function (other, other_is_backside, event, robot, ignore_training) {
                return this.get_backside().widget_dropped_on_me(other, other_is_backside, event, robot, ignore_training);
            };
            widget.get_element = function () {
                return this.get_backside().get_element();
            };
            widget.get_setting = function (option_name, dont_use_default) {
                if (typeof settings[option_name] === 'undefined' && !dont_use_default) {
                    settings[option_name] = TT.DEFAULT_SETTINGS && TT.DEFAULT_SETTINGS[option_name];     
                }
                return settings[option_name];
            };
            widget.set_setting = function (option_name, new_value) {
                settings[option_name] = new_value;
            };
            widget.open_settings = function () {
                TT.SETTINGS.open(widget);
            };
            widget.robot_in_training = function () {
                // for robots to train robot need a stack of robots
                if (stack_of_robots_in_training.length > 0) {
                    return stack_of_robots_in_training[stack_of_robots_in_training.length-1];
                }
            };
            widget.robot_training_this_robot = function () {
                if (stack_of_robots_in_training.length > 1) {
                    return stack_of_robots_in_training[stack_of_robots_in_training.length-2];
                }
            };
            widget.robot_started_training = function (robot) {
                 stack_of_robots_in_training.push(robot);  
            };
            widget.robot_finished_training = function () {
                 stack_of_robots_in_training.pop();  
            };
            widget.save = function (immediately, parameters, callback) {
                var program_name = this.get_setting('program_name', true);
                var json, google_drive_status;
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
                if (parameters.google_drive && !this.get_setting('google_drive_unavailable')) {
                    json = TT.UTILITIES.get_json_top_level(this);
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
                    if (!json) {
                        json = TT.UTILITIES.get_json_top_level(this);
                    }
                    this.save_to_local_storage(json);
                }
                if (callback) {
                    callback();
                }
            };
            widget.publish = function (callback, as_workspace) {
                TT.publish.publish_widget(this.get_setting('program_name'), this, as_workspace, callback);   
            };
            widget.save_to_local_storage = function (json, time_stamp) {
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
                        console.error(message);
                    } else {
                        TT.UTILITIES.display_message(message);
                    }
                    // following could be displayed in the settings panel
                    this.last_local_storage_error = message;
                }
            };
            widget.load = function (google_drive_first, loaded_callback, nothing_to_load_callback) {
                var program_name = this.get_setting('program_name');
                var file_name = program_name + ".json";
                var key = TT.UTILITIES.local_storage_program_key(program_name);
                var download_callback = 
                    function (json_string) {
                        var json;
                        if (json_string) {
                            try {
                                json = JSON.parse(json_string);
                                widget.remove_all_backside_widgets();
                                TT.UTILITIES.add_backside_widgets_from_json(widget, json.semantic.backside_widgets, {json_of_shared_widgets: json.shared_widgets,
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
            widget.walk_children = function () {
                // ignore since top-level widgets are currently only used for their backside
            };
            widget.render = function () {
                // ignore
            };
            widget.is_widget = true;
            widget.get_backside(true).set_visible(true); // top-level backsides are always visible (at least for now)
            if (TT.debugging) {
                widget._debug_id = TT.UTILITIES.generate_unique_id();
                widget.debug_string = "Top-level widget"; 
            }
            return widget;
        } // ends create_top_level_widget

    };

}(window.TOONTALK));

