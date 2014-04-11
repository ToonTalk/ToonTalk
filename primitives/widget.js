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
                }
            }
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
                        this.update_display();
                    }
                }
            };
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
                    var widgets = this.get_backside_widgets();
                    if (widgets) {
                        this.backside_widgets = widgets;
                    }
                    backside = undefined;
                };
            }
            if (!widget.create_backside) {
                widget.create_backside = function () {
                    return TT.backside.create(widget);
                }  
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
                    var i, backside_widget, backside_element, $backside_run_button;
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
                }
            };
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
        
        remove: function () {
            var backside = this.get_backside();
            var frontside = this.get_frontside();
            if (backside) {
                backside.remove();
            }
            if (frontside) {
                frontside.remove();
            }
            this.set_running(false);
        },
        
        get_frontside_element: function (update) {
            var frontside = this.get_frontside && this.get_frontside(true);
            if (!frontside) {
                return;
            }
            if (update) {
                this.update_display();
            }
            return frontside.get_element();
        },
        
        get_backside_element: function () {
            var backside = this.get_backside && this.get_backside();
            if (backside) {
                return backside.get_element();
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
                frontside_element = this.get_frontside_element && this.get_frontside_element();
                if (frontside_element) {
                    json_view.frontside_width = $(frontside_element).width();
                    json_view.frontside_height = $(frontside_element).height();
                    if ($(frontside_element).is(":visible")) {
                        position = $(frontside_element).position();
                    } else {
                        position = this.position_when_hidden;
                    }
//                     if (!position) {
//                         position = [0, 0];
//                     }
                    if (position) {
                        json_view.frontside_left = position.left;
                        json_view.frontside_top = position.top;
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
            } else {
                console.log("get_json not defined");
                return {};
            }
        },
        
        get_backside_widgets: function () {
            var backside;
            if (typeof this.backside_widgets !== 'undefined') {
                return this.backside_widgets;
            }
            backside = this.get_backside();  
            if (!backside) {
                return [];
            }
            return backside.get_widgets();
        },
        
        add_backside_widget: function (widget) {
            var backside_widgets = this.get_backside_widgets();
            var backside = this.get_backside();
            if (TT.debugging && widget === this) {
                console.log("Adding a widget to a list of its backside widgets!");
                return;
            }
            if (!backside_widgets) {
                this.backside_widgets = [widget];
            } else if (backside_widgets.indexOf(widget) < 0) {
                backside_widgets[backside_widgets.length] = widget;                            
            }
            if (backside) {
                backside.update_run_button_disabled_attribute();
            }
        },
        
        remove_backside_widget: function (widget) {
            var backside_widgets = this.get_backside_widgets();
            var backside = this.get_backside();
            var widget_index;
            if (!backside_widgets) {
                console.log("Couldn't remove a widget from backside widgets.");
                return;
            }
            widget_index = backside_widgets.indexOf(widget);
            if (widget_index < 0) {
                console.log("Couldn't find a widget to remove it from backside widgets.");
                return;                        
            }
            backside_widgets.splice(widget_index, 1);
            this.backside_widgets = backside_widgets;
            if (backside) {
                backside.update_run_button_disabled_attribute();
            }
        },
        
        set_backside_widgets: function (backside_widgets, json_views) {
            var backside = this.get_backside();
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
            if (this.get_erased()) {
                return "erased " + this.get_type_name();
            }
            return this.toString();
        },
        
        copy: function () {
            console.assert(false, "copy not implemented");
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
        
        widget_dropped_on_me: function () {
            if (TT.robot.in_training) {
                TT.robot.in_training.dropped_on(this);
            }
            return true;
        },
        
        equals: function (other) {
            console.assert(false, "equals not implemented");
        },
        
        match: function (context) {
            // should return 'matched', 'not-matched', or an array of nests waiting for objects to arrive
            console.assert(false, "copy not implemented");
        },
        
        drop_on: function (other, side_of_other, event) {
            console.log("drop_on not implemented; this is " + this.toString() + " and other is " + other.toString());
            return false;
        },
                   
        removed: function (part) {
            // part should be a ToonTalk widget that is part of this
            console.log("removed not implemented");
        },
        
        update_display: function () {
            console.log("update_display not implemented");
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
                            width: $backside_element.width(),
                            height: $backside_element.height()};
                return this.add_to_json(json);
            };
            widget.get_type_name = function () {
                 return "top-level";
            };
            widget.toString = function () {
                return "top level widget";
            };
            widget.copy = function () {
                // revisit this if ever there are multiple top-level backsides
                // copied when training a robot
                return this;
            };
            widget.visible = function () {
                return true;
            };
            widget = widget.add_sides_functionality(widget);
            widget = widget.runnable(widget);
            return widget;
        },
        
        top_level_create_from_json: function (json) {
            var widget = TT.widget.top_level_widget();
            var $backside_element = $(widget.get_backside(true).get_element());
            $backside_element.css({"background-color": json.color});
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
