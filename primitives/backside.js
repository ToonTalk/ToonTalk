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
            var original_width, original_height;
            var backside_widgets;
            $backside_element.addClass("toontalk-backside toontalk-side " + "toontalk-backside-of-" + widget.get_type_name());
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
            if (!widget.drop_on) {
                // TO DO: determine if this is needed -- top-level backside can't be added to something - can it?
                widget.drop_on = function (other, $side_element_of_other, event) {
                    $backside_element.append($side_element_of_other);
                    TT.UTILITIES.set_position_absolute($side_element_of_other.get(0), true, event); // when on the backside
                    if ($side_element_of_other.is(".toontalk-frontside")) {
                        // better to have a preferrred size that it goes to when on backside
                        // recorded when dropped into something that changes its size -- e.g. a box
                        $side_element_of_other.addClass("toontalk-frontside-on-backside");
                        TT.DISPLAY_UPDATES.pending_update(other);
                    }
                    backside.update_run_button_disabled_attribute();
                    return true;
                };
            }
            if (!widget.removed_from_container) {
                widget.removed_from_container = function (other, backside_removed, event) {
                    if (!backside_removed) {
                        $(other.get_frontside_element()).removeClass("toontalk-frontside-on-backside");
                    }
                    // what about removing backside_widgets here?
                };
            }
            backside.widget_dropped_on_me = 
                function (other, other_is_backside, event) {
                    // event serves 2 functions: info for adjusting for scrolling and whether to update the display
                    var other_side, other_side_element, $other_side_element;
                    if (other_is_backside) { 
                        other_side = other.get_backside(true);
                        other_side_element = other_side.get_element();
                    } else {
                        other_side = other.get_frontside(true);
                        other_side_element = other_side.get_element();
                    }
                    $other_side_element = $(other_side_element);
                    $backside_element.append($other_side_element);
                    if (!event) {
                        // i.e. by a robot -- then pick a random spot
                        other.animate_to_element(backside_element);
                    }
                    TT.UTILITIES.set_position_absolute(other_side_element, true, event); // when on the backside
                    TT.DISPLAY_UPDATES.pending_update(other_side);
                    if (TT.robot.in_training) {
                        TT.robot.in_training.dropped_on(other, this.get_widget());
                    }
                    this.get_widget().add_backside_widget(other, other_is_backside);
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
                            $(widget_side_element).data("owner", backside_widget_side.widget);
                            if (json_array) {
                                json_view = json_array[index];
                                if (json_view) {
                                    if (backside_widget_side.is_backside) {
                                         $(widget_side_element).css({left: json_view.backside_left,
                                                                     top: json_view.backside_top,
                                                                     width: json_view.backside_width,
                                                                     height: json_view.backside_height});
                                    } else {
                                         $(widget_side_element).css({left: json_view.frontside_left,
                                                                     top: json_view.frontside_top,
                                                                     width: json_view.frontside_width,
                                                                     height: json_view.frontside_heigh});
                                    }
                                }
                            }
                            $backside_element.append(widget_side_element);
                        });
                    },
                    1);
            };
            TT.backside.associate_widget_with_backside_element(widget, backside, backside_element);
            TT.UTILITIES.drag_and_drop($backside_element);
            // the following function should apply recursively...
            $backside_element.resizable(
                {start: function () {
                    if (!original_width) {
                        original_width = $backside_element.width();
                    }
                    if (!original_height) {
                        original_height = $backside_element.height();
                    }
                },
                resize: function (event, ui) {
                    var percentage = 100 * Math.min(1, $backside_element.width() / original_width, $backside_element.height() / original_height);
                    $backside_element.css({"font-size": percentage + "%"});
                },
                handles: "e,s,se"}); // was "n,e,s,w,se,ne,sw,nw" but interfered with buttons
            // following should be done by something like GWT's onLoad...
            // but DOMNodeInserted is deprecated and MutationObserver is only in IE11.
            $backside_element.on('DOMNodeInserted', function (event) {
                var $source = $(event.originalEvent.srcElement);
                var owner_widget;
                if ($source.is(".toontalk-frontside") && $source.parent().is(".toontalk-backside")) {
                    $source.addClass("toontalk-frontside-on-backside");
                    if ($source.is(".ui-resizable")) {
                        $source.resizable("enable");
                    }
                    owner_widget = $source.data("owner");
                    if (owner_widget) {
                        TT.DISPLAY_UPDATES.pending_update(owner_widget);
//                         owner_widget.update_display();
                    }
                } 
//                 else if ($source.is(".toontalk-backside")) {
//                     owner_widget = $source.data("owner");
//                     if (owner_widget) {
//                         // let it respond to being attached
//                         owner_widget.get_backside().attached();
//                     }
//                 }
                event.stopPropagation();
            });
            $backside_element.on('DOMNodeRemoved', function (event) {
                var $source = $(event.originalEvent.srcElement);
                if ($source.is(".toontalk-frontside")) {
                    $source.removeClass("toontalk-frontside-on-backside");
//                     $source.resizable("disable");
//                     owner_widget = $source.data("owner");
//                     if (owner_widget) {
//                         owner_widget.update_display();
//                     }
                }
                event.stopPropagation();
            });
            $backside_element.on("mouseenter", function (event) {
               var frontside = widget.get_frontside();
               if (frontside) {
                   $(frontside.get_element()).addClass("toontalk-highlight");
               }
            });
            $backside_element.on("mouseleave", function (event) {
               var frontside = widget.get_frontside();
               if (frontside) {
                   $(frontside.get_element()).removeClass("toontalk-highlight");
               }
            });
            if (widget.get_backside_widgets) {
                backside_widgets = widget.get_backside_widgets();
                backside.add_backside_widgets(backside_widgets, widget.get_backside_widgets_json_views());
            }
            if (TT.debugging) {
                backside_element.id = widget.debug_id;
            }
            return backside;
        },
        
        associate_widget_with_backside_element: function (widget, backside, backside_element) {
            var $backside_element = $(backside_element);
            $backside_element.data("owner", widget);
            return widget;
        },
                
        remove: function() {
            $(this.get_element()).remove();
        },
        
//         removed_from_container: function (part, event) {
//             this.get_widget().remove_backside_widget(part);
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
        
        create_standard_buttons: function (backside, widget) { // extra arguments are extra buttons
            var run_or_erase_button;
            var frontside_element = widget.get_frontside_element();
            if (!(this.get_erased && widget.get_erased()) && !$(frontside_element).is(".toontalk-thought-bubble-contents") && $(frontside_element).parents(".toontalk-thought-bubble-contents").length === 0) {
                run_or_erase_button = TT.backside.create_run_button(backside, widget);
            } else {
                run_or_erase_button = TT.backside.create_erase_button(backside, widget);
            }
            var copy_button = TT.backside.create_copy_button(backside, widget);
            var hide_button = TT.backside.create_hide_button(backside, widget);
            var remove_button = TT.backside.create_remove_button(backside, widget);
            // consider moving this to UTILITIES...
            // or eliminating it entirely since can appendChild after set is created
            var extra_arguments = [];
            var i;
            for (i = 2; i < arguments.length; i++) {
                extra_arguments[i-2] = arguments[i];
            }
            return TT.UTILITIES.create_button_set(run_or_erase_button, copy_button, remove_button, hide_button, extra_arguments);
        },            
        
        create_hide_button: function (backside, widget) {
            var backside_element = backside.get_element();
            var $backside_element = $(backside_element);
            var $hide_button = $("<button>Hide</button>").button();
            var record_backside_widget_positions = function () {
                var backside_widgets = widget.get_backside_widgets();
                var backside_widget_side_element;
                backside_widgets.forEach(function (backside_widget_side) {
                    var backside_widget = backside_widget_side.widget;
                    if (backside_widget_side.is_backside) {
                        backside_widget_side_element = backside_widget.get_backside_element();
                    } else {
                        backside_widget_side_element = backside_widget.get_frontside_element();   
                    }
                    if (backside_widget_side_element) {
                        backside_widget.position_when_hidden = $(backside_widget_side_element).position();
                    }
                });
            };
            $hide_button.addClass("toontalk-hide-backside-button");
            $hide_button.click(function (event) {
                var frontside_element = widget.get_frontside_element();
                var backside_position = $backside_element.position();
                var $backside_container = $backside_element.parent().closest(".toontalk-backside");
                var animate_disappearance = 
                        function ($element) {
                            var frontside_position = $(frontside_element).position();
                            var remove_element = function () {
                                $element.remove();
                            };
                            $element.addClass("toontalk-side-appearing");
                            TT.UTILITIES.add_one_shot_transition_end_handler($element.get(0), remove_element);
                            $element.css({left: frontside_position.left,
                                          top: frontside_position.top,
                                          opacity: .1});
                                        
                }
                if (widget && widget.forget_backside) {
                    widget.forget_backside();
                }
                if (widget) {
                    record_backside_widget_positions();
                }
                animate_disappearance($backside_element)
                if (!$(frontside_element).is(":visible")) {
                   $(frontside_element).css({left: backside_position.left,
                                             top:  backside_position.top});
                   $backside_container.append(frontside_element);
                }
                event.stopPropagation();
            });
            $hide_button.attr("title", "Click to hide this.");
            return $hide_button.get(0);
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
                var $robot_element = $(frontside_element).parents(".toontalk-robot");
                var robot = $robot_element.data("owner");
                var robot_backside;
                var erased = !widget.get_erased();
                widget.set_erased(erased, true);
                update_title();
                if (robot) {
                    robot_backside = robot.get_backside();
                    if (robot_backside) {
                        TT.DISPLAY_UPDATES.pending_update(robot_backside);
                    }
                }
                if (TT.robot.in_training) {
                    TT.robot.in_training.set_erased(widget, erased);
                }
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
            $run_button.click(function (event) {
                var will_run = !widget.get_running();
                TT.backside.update_run_button($run_button, widget);
                widget.set_running(will_run);
                event.stopPropagation();
            });
            $run_button.attr("title", "Click to run the robots on this " + widget.get_type_name());
            return $run_button.get(0);
        },
        
        update_run_button: function ($run_button, widget) {
            var running = widget.get_running();
            if (!$run_button.is(":visible") || !$run_button.is(":enabled")) {
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
        
        create_remove_button: function (backside, widget) {
            var $remove_button = $("<button>Remove</button>").button();
            $remove_button.addClass("toontalk-remove-backside-button");
            $remove_button.click(function (event) {
                if (widget.remove) {
                    if (TT.robot.in_training) {
                        TT.robot.in_training.removed(widget);
                    }
                    widget.remove(event);
                } // else warn??
                event.stopPropagation();
            });
            $remove_button.attr("title", "Click to remove this " + widget.get_type_name());
            return $remove_button.get(0);
        },
        
        get_widgets: function () {
            var widgets = [];
            $(this.get_element()).children().each(function (index, element) {
                var owner = $(element).data("owner");
                if (owner && widgets.indexOf(owner) < 0) {
                    widgets[widgets.length] = owner;
                }
            });
            return widgets;
        }

    };
}(window.TOONTALK));