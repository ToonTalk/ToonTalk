 /**
 * Implements shared methods of ToonTalk's widgets
 * Authors: Ken Kahn
 * License: New BSD
 */

/*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */

window.TOONTALK.widget = (function (TT) {
    "use strict";
    return {
        
        add_standard_widget_functionality: function (widget) {
            this.erasable(widget);
            this.add_sides_functionality(widget);
            this.runnable(widget);
            this.stackable(widget);
            this.animatable(widget);
            this.has_title(widget);
            this.has_parent(widget);
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
                        TT.DISPLAY_UPDATES.pending_update(this);
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
                        // all frontsides are the same
                        frontside = TT.frontside.create(widget);
                    }
                    return frontside;
               };
            }
            if (!widget.get_backside) {
                widget.get_backside = function (create) {
                    if (create && !backside) {
                        // backsides are customised by each kind of widget
                        backside = widget.create_backside();
                    }
                    return backside;
                };
            }
            if (!widget.forget_backside) {
                widget.forget_backside = function () {
                    backside = undefined;
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
            var running = false;
            if (!widget.get_running) {
                widget.get_running = function () {
                    return running;
                };
            }
            if (!widget.set_running) {
                widget.set_running = function (new_value) {
                    var backside_widgets = this.get_backside_widgets();
                    var i, backside_widget, backside_element;
                    running = new_value;
                    for (i = 0; i < backside_widgets.length; i++) {
                        backside_widget = backside_widgets[i];
                        if (backside_widget.get_type_name() === "robot") {
                            // could this set_stopped stuff be combined with set_running?
                            if (running) {
                                backside_widget.set_stopped(false);
                                backside_widget.run(widget);
                            } else {
                                backside_widget.set_stopped(true);
                            }
                            TT.DISPLAY_UPDATES.pending_update(backside_widget);
                        } else if (backside_widget.set_running) {
                            backside_widget.set_running(new_value);
                        }
                    }
                    backside_element = this.get_backside_element();
                    if (backside_element) {
                        $(backside_element).find(".toontalk-run-backside-button").each(function (index, element) {
                            TT.backside.update_run_button($(element), !running, widget);
                        });
                    }
                    TT.DISPLAY_UPDATES.pending_update(this);
                };
            }
            return widget;
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
                    var widget_element = widget.get_side_element();
                    if (!widget_element) {        
                        // widget is assumed to be a fresh copy of a resource that has yet to be added to anything
                        widget_element = TT.UTILITIES.find_resource_equal_to_widget(widget);
                    }
                    return widget_element;
                };
                widget.animate_to_widget = function (target_widget, continuation, left_offset, top_offset) {
                    this.animate_to_element(find_widget_element(target_widget), continuation, left_offset, top_offset);
                };
            }
            if (!widget.animate_to_element) {
                widget.animate_to_element = function (target_element, continuation, left_offset, top_offset) {
                    var target_absolute_position = $(target_element).offset();
                    var $frontside_element = $(this.get_frontside_element());
                    if (!left_offset) {
                        // pick a random location completely inside the target
                        left_offset = ($(target_element).width()-$frontside_element.width()) * Math.random();
                    }
                    if (!top_offset) {
                        top_offset = ($(target_element).height()-$frontside_element.height()) * Math.random();
                    }
                    target_absolute_position.left += left_offset;
                    target_absolute_position.top += top_offset;
                    this.animate_to_absolute_position(target_absolute_position, continuation);
                };
            }
            if (!widget.animate_to_absolute_position) {
                widget.animate_to_absolute_position = function (target_absolute_position, continuation) {
                    var mover_frontside_element = this.get_frontside_element();
                    var mover_absolute_position = $(mover_frontside_element).offset();
                    var mover_relative_position = $(mover_frontside_element).position();
                    var remove_transition_class = function () {
                        $(mover_frontside_element).removeClass("toontalk-side-animating");
                    };
                    TT.UTILITIES.add_one_shot_transition_end_handler(mover_frontside_element, remove_transition_class);
                    $(mover_frontside_element).addClass("toontalk-side-animating");
                    mover_frontside_element.style.left = (mover_relative_position.left + (target_absolute_position.left - mover_absolute_position.left)) + "px";
                    mover_frontside_element.style.top = (mover_relative_position.top + (target_absolute_position.top - mover_absolute_position.top)) + "px";
                    TT.UTILITIES.add_one_shot_transition_end_handler(mover_frontside_element, continuation);
                };
            }
        },
        
        has_title: function (widget) {
            if (!widget.get_title) {
                widget.get_title = function () {
                    var type_name = this.get_type_name();
                    var backside = this.get_backside();
                    var frontside_element = this.get_frontside_element();
                    if ($(frontside_element).is(".toontalk-top-level-resource")) {
                        return "Drag this " + type_name + " to a work area.";   
                    }
                    if (!backside || !backside.get_element()) {
                        return "Click to see the back side of this " + type_name;
                    }
                    return TT.UTILITIES.add_a_or_an(type_name, true);
                };
            }
        },
        
        has_parent: function (widget) {
            var parent, on_backside_of_parent;
            widget.get_parent = function () {
                return parent;
            };
            widget.get_on_backside_of_parent = function () {
                return on_backside_of_parent;
            };
            widget.set_parent = function (new_value, backside) {
                parent = new_value;
                on_backside_of_parent = backside;
            };
        },
        
        remove: function (event) {
            var backside = this.get_backside();
            var frontside = this.get_frontside();
            var parent = this.get_parent();
            if (backside) {
                backside.remove();
            }
            if (frontside) {
                frontside.remove();
            }
            if (parent) {
                parent.removed_from_container(this, false, event);
            }
            this.set_running(false);
        },
        
        get_frontside_element: function (update) {
            var frontside = this.get_frontside && this.get_frontside(true);
            if (!frontside) {
                return;
            }
            if (update) {
                TT.DISPLAY_UPDATES.pending_update(this);
            }
            return frontside.get_element();
        },
        
        get_backside_element: function () {
            var backside = this.get_backside && this.get_backside();
            if (backside) {
                return backside.get_element();
            }
        },
        
        get_side_element: function (create) {
            // returns frontside if showing othewise backside
            if (this.visible()) {
                return this.get_frontside_element(create);
            } else {
                return this.get_backside_element(create);
            }
        },
        
        dereference: function () {
            // is already dereferenced when used as part of a path
            return this;
        },
        
        add_to_json: function (json_semantic) {
            var json_view, json, position, frontside_element, backside, backside_element, backside_widgets;
            if (json_semantic) {
                if (json_semantic.view) {
                    // already contains both semantic and view
                    json_view = json_semantic.view;
                    json_semantic = json_semantic.semantic;
                } else {
                    json_view = {};
                }
                json = {semantic: json_semantic,
                        view: json_view,
                        version: 1};
                if (this.get_erased && this.get_erased()) {
                    json_semantic.erased = true;
                }
                if (this.get_erased && this.get_infinite_stack()) {
                    json_semantic.infinite_stack = true;
                }
                if (this.get_running && this.get_running()) {
                    json_semantic.running = true;
                }
                if (!this.get_parent() || this.get_on_backside_of_parent()) {
                    // otherwise geometry isn't needed
                    frontside_element = this.get_frontside_element && this.get_frontside_element();
                    if (frontside_element) {
                        json_view.frontside_width = $(frontside_element).width();
                        json_view.frontside_height = $(frontside_element).height();
                        if ($(frontside_element).is(":visible")) {
                            position = $(frontside_element).position();
                        } else {
                            position = this.position_when_hidden;
                        }
                        if (position) {
                            json_view.frontside_left = position.left;
                            json_view.frontside_top = position.top;
                        }
                    }
                }
                backside = this.get_backside();
                if (backside) {
                    backside_element = backside.get_element();
                    if (backside_element) {
                        json_view.backside_width = $(backside_element).width();
                        json_view.backside_height = $(backside_element).height();
                        position = $(backside_element).position();
                        json_view.backside_left = position.left;
                        json_view.backside_top = position.top;
                    }
                }
                backside_widgets = this.get_backside_widgets();
                if (backside_widgets.length > 0) {
                    json_semantic.backside_widgets = TT.UTILITIES.get_json_of_array(backside_widgets);
                }
                return json;
            }
            console.log("get_json not defined");
            return {};
        },
        
        get_backside_widgets: function () {
            return this.backside_widgets || [];
        },
        
        add_backside_widget: function (widget) {
            var backside = this.get_backside();
            if (TT.debugging && widget === this) {
                console.log("Adding a widget to a list of its backside widgets!");
                return;
            }
            if (!this.backside_widgets) {
                this.backside_widgets = [widget];
            } else if (this.backside_widgets.indexOf(widget) < 0) {
                this.backside_widgets[this.backside_widgets.length] = widget;                            
            }
            widget.set_parent(this, true);
//             console.log("Added " + widget + " (" + widget.debug_id + ") to list of backside widgets of " + this + ". Now has " + this.backside_widgets.length + " widgets.");
            if (backside) {
                backside.update_run_button_disabled_attribute();
            }
        },
        
        remove_backside_widget: function (widget) {
            var backside = this.get_backside();
            var widget_index;
            if (!this.backside_widgets) {
                console.log("Couldn't remove a widget from backside widgets.");
                return;
            }
            widget_index = this.backside_widgets.indexOf(widget);
            if (widget_index < 0) {
                console.log("Couldn't find a widget to remove it from backside widgets. " + widget + " (" + widget.debug_id + ")");
                return;                        
            }
            this.backside_widgets.splice(widget_index, 1);
//             console.log("Removed " + widget + " (" + widget.debug_id + ") from list of backside widgets of " + this + ". Length is now " +  this.backside_widgets.length);
            if (backside) {
                backside.update_run_button_disabled_attribute();
            }
        },
        
        set_backside_widgets: function (backside_widgets, json_views) {
            var backside = this.get_backside();
//             console.log("setting backside_widgets of " + this + " were " + this.backside_widgets + " and is now " + backside_widgets);
            this.backside_widgets = backside_widgets;
            if (backside_widgets.length > 0) { 
                if (this.get_backside()) {
                    this.get_backside().add_backside_widgets(backside_widgets, json_views);
                } else {
                    // keep this for when backside is created
                    this.backside_widgets_json_views = json_views;
                }
            }
            if (backside) {
                backside.update_run_button_disabled_attribute();
            }
        },
              
        get_backside_widgets_json_views: function () {
            return this.backside_widgets_json_views;
        },
        
        can_run: function () {
            // returns true if a backside element is a trained robot or 
            // or a widget this can_run
            var backside_widgets = this.get_backside_widgets();
            var i, backside_widget;
            for (i = 0; i < backside_widgets.length; i++) {
                backside_widget = backside_widgets[i];
                if (backside_widget.get_body && !backside_widget.get_body().is_empty()) {
                    return true;
                }      
                if (backside_widget.can_run()) {
                    return true;
                }
            }
            return false;
        },
        
        add_to_copy: function (copy, just_value) {
            var backside_widgets;
            if (this.get_erased()) {
                copy.set_erased(this.get_erased());
            }
            if (!just_value) {
                backside_widgets = this.get_backside_widgets();
                if (backside_widgets.length > 0) {
                    copy.set_backside_widgets(TT.UTILITIES.copy_widgets(backside_widgets), this.get_backside_widgets_json_views());
                }
            }
            return copy;
        },
        
        get_type_name: function () {
            // only used for informative purposes so ignore if not overridden 
            return "";
        },
        
        get_description: function () {
            if (this.get_erased && this.get_erased()) {
                return "erased " + this.get_type_name();
            }
            return this.toString();
        },
        
        copy: function () {
            console.assert(false, "copy not implemented");
        },
        
        add_copy_to_container: function (widget_copy) {
            if (!widget_copy) {
                widget_copy = this.copy();
            }
            var frontside_element = this.get_frontside_element();
            var frontside_element_copy = widget_copy.get_frontside_element();
            var position = $(frontside_element).position();
            var $container_element = $(frontside_element).closest(".toontalk-backside");
            var container_widget = $container_element.data("owner");
            $(frontside_element_copy).css({width: $(frontside_element).width(),
                                           height: $(frontside_element).height(),
                                           left: position.left+10,
                                           top: position.top+10});
            $container_element.append(frontside_element_copy);
            if (container_widget) {
                container_widget.add_backside_widget(widget_copy);
//                 console.log("Added the copy " + widget_copy + " (" + widget_copy.debug_id + ") to " + container_widget + " (" + container_widget.debug_id + ")");
            }
            if (TT.robot.in_training) {
                TT.robot.in_training.copied(this, widget_copy, false);
            }
            return widget_copy;
        },
        
        visible: function () {
            var frontside = this.get_frontside();
            if (!frontside) {
                return false;
            }
            return $(frontside.get_element()).is(":visible"); 
        },
        
        drag_started: function (json, is_resource) {
            // by default records this if robot is being trained
            // widgets may override this behaviour
            if (TT.robot.in_training) {
                TT.robot.in_training.picked_up(this, json, is_resource);
            }
        },
        
        widget_dropped_on_me: function (widget) {
            if (TT.robot.in_training) {
                TT.robot.in_training.dropped_on(widget, this);
            }
            return true;
        },
        
        equals: function (other) {
            console.assert(false, "equals not implemented");
        },
        
        match: function (context) {
            // should return 'matched', 'not-matched', or an array of nests waiting for objects to arrive
            console.assert(false, "match not implemented for " + context.toString());
        },
                   
        removed: function (part) {
            // part should be a ToonTalk widget that is part of this
            console.log("removed not implemented");
        },
        
        equals_box: function () {
            // if a box didn't respond to this then not equal
            return false;
        },
        
        equals_number: function () {
            // if a number didn't respond to this then not equal
            return false;
        },
        
        match_box: function () {
            // if a box didn't respond to this then not matched
            return 'not matched';
        },
        
        match_number: function () {
            // if a number didn't respond to this then not matched
            return 'not matched';
        },
        
        top_level_widget: function () {
            var widget = Object.create(TT.widget);
            widget.get_json = function () {
                var backside = this.get_backside();
                var $backside_element = $(backside.get_element());
                var json = {type: "top_level",
                            color: $backside_element.attr("background-color"),
                            backside_width: $backside_element.width(),
                            backside_height: $backside_element.height()};
                return this.add_to_json(json);
            };
            widget.get_type_name = function () {
                 return "top-level";
            };
            widget.toString = function () {
                return "top level widget";
            };
            widget.match = function () {
                return 'matched';
            };
            widget.update_display = function () {
                // no need to do anything
            };
            widget.copy = function () {
                // revisit this if ever there are multiple top-level backsides
                // copied when training a robot
                return this;
            };
            widget.visible = function () {
                return false;
            };
            widget.get_on_backside_of_parent = function () {
                return false;
            };
            widget = widget.add_sides_functionality(widget);
            widget = widget.runnable(widget);
            return widget;
        },
        
        top_level_create_from_json: function (json) {
            var widget = TT.widget.top_level_widget();
            var $backside_element = $(widget.get_backside(true).get_element());
            $backside_element.addClass("toontalk-top-level-backside");
            $backside_element.click(
                function (event) {
                    if (event.target === $backside_element.get(0)) {
                        // only if directly clicked upon
                        widget.set_running(!widget.get_running());
                        event.stopPropagation();
                    }
                }
            );
            return widget;
        }
    };
}(window.TOONTALK));
