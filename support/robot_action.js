 /**
 * Implements ToonTalk's generic action of a robot
 * Authors: Ken Kahn
 * License: New BSD
 */
 
 /*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */

window.TOONTALK.robot_action = 
(function (TT) {
    "use strict";
    var unwatched_run_functions =
        {"copy": function (widget, context, top_level_context, robot) {
            robot.add_newly_created_widget(widget.copy());
            return true;
         },
         "pick up": function (widget, context, top_level_context, robot) {
             robot.set_thing_in_hand(widget);
             return true;
         },
         "pick up a copy of": function (widget, context, top_level_context, robot) {
             var widget_copy = widget.copy();
             robot.add_newly_created_widget(widget_copy);
             robot.set_thing_in_hand(widget_copy);
             return true;
         },
         "drop it on": function (target, context, top_level_context, robot, additional_info) {
             var thing_in_hand, thing_in_hand_frontside_element, thing_in_hand_position;
             if (target) {
                 thing_in_hand = robot.get_thing_in_hand();
                 if (thing_in_hand) {
                     if (thing_in_hand.drop_on) {
                         if (TT.debugging && thing_in_hand === target) {
                             console.error("Dropping something on itself!");
                         }
                         // TODO: update this when robots can drop backsides as well
                         thing_in_hand.drop_on(target, false, undefined, robot);
                         robot.set_thing_in_hand(undefined);
                         if (target.visible && target.visible()) {
                             target.render();
                         }
                         if (thing_in_hand.robot_waiting_before_next_step === robot) {
                             // NOTE thing_in_hand needs to call robot.run_next_step();
//                              console.log("Expecting " + thing_in_hand + " to run_next_step");
                             if (!additional_info || !additional_info.running_watched) {
                                 thing_in_hand.robot_waiting_before_next_step = undefined;
//                                  console.log("robot_waiting_before_next_step reset for " + thing_in_hand + " in drop it on -- returning false");
                             }
                             return false;
                         }
                         return true;
                     }
                     TT.UTILITIES.report_internal_error("Thing in robot's hand (" + thing_in_hand + ") doesn't handle 'drop_on'. Robot that " + robot);
                 } else {
                    TT.UTILITIES.report_internal_error("The robot that '" + robot.toString() + "' is executing drop_on but has nothing in its hand.");
                 }
             } else {
                TT.UTILITIES.report_internal_error("The robot that '" + robot.toString() + "' is executing drop_on but doesn't know where to drop what its holding");
             }   
         },
         "remove": function (widget, context, top_level_context, robot) {
             widget.remove();
             if (widget === robot) {
                 robot.set_stopped(true);
             }
             return true;
         },
         "erased_widget": function (widget, context, top_level_context, robot, additional_info) {
             widget.set_erased(additional_info.erased);
             return true;
         },
         "edit": function (widget, context, top_level_context, robot, additional_info) {
             // uses setter_name instead of the function itself so can be JSONified
             // could replace with function on first use if this is a performance issue
             if (!widget[additional_info.setter_name]) {
                 TT.UTILITIES.report_internal_error(widget + " cannot be edited.");
                 return;
             }
             if (additional_info.argument_2) {
                 widget[additional_info.setter_name].call(widget, additional_info.argument_1, additional_info.argument_2, widget.visible());
             } else {
                 widget[additional_info.setter_name].call(widget, additional_info.argument_1, widget.visible());
             }
             return true;
         },
         "add to the top-level backside": function (widget, context, top_level_context, robot, additional_info) {
             var context_frontside_position, widget_frontside_element, top_level_element;
             if (!robot.visible()) {
                 // the condition is because this code is shared by the watched version and it has already done this
                 // could add an extra argument that indicates that it is call from the watched version
                 widget_frontside_element = widget.get_frontside_element(true);
                 context_frontside_position = $(context.get_frontside_element()).position();
                 // need to test the following rewrite:
                 top_level_element = $(context.get_frontside_element()).closest(".toontalk-top-level-backside").get(0) ||
                                     $(widget_frontside_element).closest(".toontalk-top-level-backside").get(0);
                 $(widget_frontside_element).css({left: context_frontside_position.left,
                                                  top:  context_frontside_position.top});
                 top_level_element.appendChild(widget_frontside_element);
                 top_level_element.toontalk_widget.add_backside_widget(widget);
                 widget.animate_to_element(top_level_element);
             }
             return true;
         },
         "add a new widget to the work space": function (widget, context, top_level_context, robot, additional_info) {
             var widget_frontside_element, robot_location;
             if (context.is_top_level()) {
                 widget_frontside_element = robot.add_to_top_level_backside(widget);
                 robot_location = $(robot.get_frontside_element()).offset();
                 widget.update_display(); // so it has width and height for the following
                 TT.UTILITIES.set_position_relative_to_top_level_backside($(widget_frontside_element), robot_location, true);
             } else {
                 widget.drop_on(context.get_backside(), false, undefined, robot, true);
             }
             return true;
         }
    };
    var pick_up_a_copy_animation = function (widget, context, top_level_context, robot, continuation) {
        var new_continuation = function () {
            continuation();
            // ensure that newly created copy is visible
            robot.get_recently_created_widget().set_visible(true);
            robot.update_display();
            robot.run_next_step();
        };
        move_robot_animation(widget, context, top_level_context, robot, new_continuation);
    };
    var move_robot_animation = function (side, context, top_level_context, robot, continuation) {
        var thing_in_hand = robot.get_thing_in_hand();
        var robot_frontside_element = robot.get_frontside_element();
        var widget_frontside_element = side.get_element(); 
        var left_offset, top_offset;
        left_offset = $(widget_frontside_element).width()/2;
        top_offset  = $(widget_frontside_element).height()/2;
        // robots move at 1/4 pixel per millisecond for clarity
        robot.animate_to_widget(side, continuation, .25, left_offset, top_offset);
        if (thing_in_hand) {
            // so robot displays what he's holding
            robot.render();
        }
    };
    var pick_up_animation = function (widget, context, top_level_context, robot, continuation) {
        var frontside_element = widget.get_frontside_element();
        var new_continuation = function () {
            continuation();
            robot.run_next_step();
        };
        if (widget.get_type_name() === 'empty hole') {
            TT.UTILITIES.report_internal_error("Robot trying to pick up an empty hole.");
            return;
        }
        if (widget.save_dimensions()) {
            $(frontside_element).css({width:  frontside_element.offsetWidth  + "px",
                                      height: frontside_element.offsetHeight + "px"});
            move_robot_animation(widget, context, top_level_context, robot, new_continuation);
        } else {
            new_continuation();
        }
    };
    var drop_it_on_animation = function (target, context, top_level_context, robot, continuation) {
        var thing_in_hand = robot.get_thing_in_hand();
        var $thing_in_hand_frontside_element, adjust_dropped_location_continuation;
        if (!thing_in_hand) {
            TT.UTILITIES.report_internal_error("Expected the robot to be holding something.");
            console.log("The robot is " + robot);
            move_robot_animation(target, context, top_level_context, robot, continuation);
            return;
        }
        if (TT.debugging && thing_in_hand === target) {
            console.error("Dropping something on itself!");
        }
        $thing_in_hand_frontside_element = $(thing_in_hand.get_frontside_element());
        adjust_dropped_location_continuation = function () {
            var thing_in_hand_position = $thing_in_hand_frontside_element.offset();
            var $top_level_element;
            $thing_in_hand_frontside_element.removeClass("toontalk-held-by-robot");
            continuation();
            if (thing_in_hand.drop_on) { 
                // need to see it before actions such as Bammer take place
                if (!$thing_in_hand_frontside_element.is(":visible")) {
                    $top_level_element = $(robot.get_frontside_element()).closest(".toontalk-top-level-backside")
                    $top_level_element.append($thing_in_hand_frontside_element.get(0));
                }
                TT.UTILITIES.set_absolute_position($thing_in_hand_frontside_element, thing_in_hand_position);
                thing_in_hand.restore_dimensions();
                // remove it from the robot's hand since the drop can take a few seconds
                // and we don't want to see it in the robot's hand
                if (thing_in_hand.robot_waiting_before_next_step === robot) {
                    // NOTE thing_in_hand needs to call robot.run_next_step();
//                     console.log("Expecting " + thing_in_hand + " to run_next_step");
//                     thing_in_hand.robot_waiting_before_next_step = undefined;
//                     console.log("robot_waiting_before_next_step reset for " + thing_in_hand + " in adjust_dropped_location_continuation");
                } else {
                    // e.g., a nest may take some time because the egg hatches
                    // but the robot is still holding it   
//                     $(thing_in_hand.get_frontside_element()).css({position: ""}); // no longer absolute -- TODO: check if still needed
                    robot.set_thing_in_hand(undefined);
                    robot.run_next_step();
                }
                robot.rerender();
            }
            // TODO: revisit use of get_parent_of_frontside once robots can manipulate backsides...
//             if ($thing_in_hand_frontside_element.is(":visible") && thing_in_hand.get_parent_of_frontside() && thing_in_hand.get_parent_of_frontside().is_backside()) {
//                 TT.UTILITIES.set_absolute_position($thing_in_hand_frontside_element, thing_in_hand_position);
//             }
        };
        if (target.is_backside() && !$(target.get_element()).is(":visible")) {
            target.get_widget().open_backside(function () {
                                                  var new_continuation = function () {
                                                      adjust_dropped_location_continuation();
                                                      // since the robot opened it needs to close when finished
                                                      target.hide_backside();
                                                  };
                                                  move_robot_animation(target, context, top_level_context, robot, new_continuation);
                                              });
        } else {
            move_robot_animation(target, context, top_level_context, robot, adjust_dropped_location_continuation);
        }
    };
    var find_backside_element = function (widget, class_name_selector) {
        var backside_element = widget.get_backside_element(true);
        return $(backside_element).find(class_name_selector).get(0);
    };
    var button_use_animation = function (widget, context, top_level_context, robot, continuation, class_name_selector, additional_info, delay_before_closing_backside) {
        var button_element = find_backside_element(widget, class_name_selector);
        var robot_frontside_element = robot.get_frontside_element();
        var button_visible = button_element && $(button_element).is(":visible");
        var new_continuation = function () {
            continuation();
            $(button_element).addClass("ui-state-active");
            if (class_name_selector === ".toontalk-select-function" || class_name_selector === ".toontalk-box-size-input") {
                button_element.value = additional_info.argument_1;
            }
            setTimeout(function () {
                           $(button_element).removeClass("ui-state-active");
                           if (!button_visible && widget.get_backside()) {
                               // restore things so button is hidden
                               widget.get_backside().hide_backside();
                           }
                           robot.run_next_step();
                      },
                      delay_before_closing_backside);
        };
        var animation_continuation = function () {
            if (!$(button_element).is(":visible") && backside) {
                // open advanced settings if button isn't visible
                backside.set_advanced_settings_showing(true, backside.get_element());
            }
            // robots move at 1/4 pixel per millisecond for clarity
            robot.animate_to_element(button_element, new_continuation, .25, 0, -$(robot_frontside_element).height());
        }
        var backside;
        if (!button_visible && widget.open_backside) {
            backside = widget.open_backside(animation_continuation);
        } else {
            animation_continuation();
        }
    };
    var tool_use_animation = function (widget, context, top_level_context, robot, continuation, tool_css_class) {
        var robot_frontside_element = robot.get_frontside_element();
        var new_continuation = function () {
            robot.carrying_tool = undefined;
            robot.update_display(); // to stop displaying tool
            continuation();
            robot.run_next_step();
        };
        robot.carrying_tool = tool_css_class;
        robot.update_display(); // to display tool
        // robots move at 1/4 pixel per millisecond for clarity
        robot.animate_to_element(widget.get_frontside_element(), new_continuation, .25, 0, 0);
    };
    var copy_animation = function (widget, context, top_level_context, robot, continuation) {
        var new_continuation = function () {
            continuation();
            widget.add_copy_to_container(robot.get_recently_created_widget());
        };
        tool_use_animation(widget, context, top_level_context, robot, new_continuation, "toontalk-wand-small");
    };
    var remove_or_erase_animation = function (widget, context, top_level_context, robot, continuation) {
        var parent = widget.get_parent_of_frontside();
        var new_continuation = function () {
            continuation();
            if (parent && parent.get_widget().get_type_name() !== 'top-level' && parent.update_display) {
                parent.update_display();
            }
            widget.render(); // if wasn't removed
        };
        tool_use_animation(widget, context, top_level_context, robot, new_continuation, "toontalk-vacuum-ready-small");
    };
    var edit_animation = function (widget, context, top_level_context, robot, continuation, additional_info) {
        var new_continuation = function () {
            var widget_backside = widget.get_backside();
            if (widget_backside) {
                // maybe this should have been created and displayed
                widget.get_backside().update_display();
            }
            continuation();
        };
        button_use_animation(widget, context, top_level_context, robot, new_continuation, additional_info.button_selector, additional_info, 1000);
    };
    var animate_widget_creation = function (widget, context, top_level_context, robot, continuation, additional_info) {
        var show_button_use = additional_info && additional_info.button_selector;
        var source_widget;
        if (show_button_use) {
            source_widget = TT.path.dereference_path(additional_info.path_to_source, context, top_level_context, robot);
            button_use_animation(source_widget, context, top_level_context, robot, continuation, additional_info.button_selector, additional_info, 3000);
        } else {
            continuation();
            robot.run_next_step();
        }      
    };
    var watched_run_functions = 
        {"copy":                 copy_animation,
         "pick up":              pick_up_animation,
         "pick up a copy of":    pick_up_a_copy_animation,
         "drop it on":           drop_it_on_animation,
         // remove and erase have identical animation but different unwatched semantics
         "remove":               remove_or_erase_animation,
         "erased_widget":        remove_or_erase_animation, 
         "edit":                 edit_animation,
         "add to the top-level backside": function (widget, context, top_level_context, robot, continuation) {
              // do nothing -- this action is only needed if unwatched
              continuation();
              robot.run_next_step();
         },
         "add a new widget to the work space": animate_widget_creation
    };

    TT.creators_from_json["robot_action"] = function (json, additional_info) {
        if (json.additional_info) {
            return TT.robot_action.create(TT.path.create_from_json(json.path, additional_info), json.action_name, TT.UTILITIES.create_keys_from_json(json.additional_info, additional_info));
        } else {
            return TT.robot_action.create(TT.path.create_from_json(json.path, additional_info), json.action_name);
        }
    };
    
    return {
        create: function (path, action_name, additional_info) {
            var new_action = Object.create(this);
            var unwatched_run_function = unwatched_run_functions[action_name];
            var watched_run_function = watched_run_functions[action_name];
            if (!watched_run_function) {
                watched_run_function = function (referenced, context, top_level_context, robot, additional_info) {
                    setTimeout(function () {
                        continuation(referenced);
                        },
                        3000);
                };
            }
            if (!path) {
                TT.UTILITIES.report_internal_error("path undefined in " + action_name + " action");
            }
            if (!unwatched_run_function) {
                TT.UTILITIES.report_internal_error("no run_function for " + action_name);
            }
            new_action.run_unwatched = function (context, top_level_context, robot) {
                var referenced = TT.path.dereference_path(path, context, top_level_context, robot);
                if (!referenced) {
                    TT.UTILITIES.report_internal_error("Unable to dereference path: " + TT.path.toString(path) + " in context: " + context.toString());
                    return false;
                }
                if (referenced.wait_until_this_nest_receives_something) {         
                        referenced.wait_until_this_nest_receives_something.run_when_non_empty(
                            function () {
                                this.run_unwatched(context, top_level_context, robot);
                                        }.bind(this),
                            robot);
                    return;
                }
                if (unwatched_run_function(referenced, context, top_level_context, robot, additional_info)) {
                    robot.run_next_step();
                } // else robot will stop due to the error
            };
            new_action.run_watched = function (context, top_level_context, robot) {
                var referenced = TT.path.dereference_path(path, context, top_level_context, robot); 
                var continuation = function () {
                    if (!additional_info) {
                        additional_info = {};
                    }
                    additional_info.running_watched = true;
                    // do the action unwatched
                    unwatched_run_function(referenced, context, top_level_context, robot, additional_info);
                }
                if (!referenced) {
                    TT.UTILITIES.report_internal_error("Unable to dereference the path: " + TT.path.toString(path) + " in context: " + context.toString());
                    return;
                }
                if (referenced.wait_until_this_nest_receives_something) {
                    referenced.wait_until_this_nest_receives_something.run_when_non_empty(
                        function () {
                            robot.set_waiting(false);
                            this.run_watched(context, top_level_context, robot);
                        }.bind(this),
                        robot);
                    robot.set_waiting(true);
                    return;
                }
                referenced.set_visible(true);
                watched_run_function(referenced, context, top_level_context, robot, continuation, additional_info);
            };
            new_action.toString = function (toString_info) {
                var suffix = "";
                if (action_name === "add a new widget to the work space") {
                    return action_name.replace("a new widget", TT.path.toString(path));
                }
                if (action_name === "add to the top-level backside") {
                    // is used for internal bookkeepping shouldn't be user visible
                    return "";
                }
                if (action_name === 'edit') {
                    suffix = " (" + additional_info.toString + ")";
                }
                return action_name + " " + TT.path.toString(path, toString_info) + suffix;
            };
            new_action.get_json = function (json_history) {
                return {type: "robot_action",
                        action_name: action_name,
                        path: TT.path.get_json(path, json_history),
                        additional_info: additional_info && TT.UTILITIES.get_json_of_keys(additional_info)};        
            };
            return new_action;  
        }
    };

}(window.TOONTALK));