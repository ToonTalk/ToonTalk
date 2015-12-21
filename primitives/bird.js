 /**
 * Implements ToonTalk's birds and nests
 * Authors = Ken Kahn
 * License: New BSD
 */
 
 /*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */

 (function () {
     // start context sharing between bird and nest code
     // ability to set the nest of a bird is private to this context
     var bird_set_nest;
     // a nest copy needs to be updated when it is discovered that its bird was later copied as well
     var update_nest, add_nest_copy, remove_nest_copy, make_nest_fresh;

window.TOONTALK.bird = (function (TT) {
    "use strict";
    var bird = Object.create(TT.widget);

    var add_function_choice = function (nest, backside, bird) {
        var type_name = nest.get_function_type();
        var function_object = nest.get_function_object();
        var items = Object.keys(TOONTALK[type_name]['function']); 
        var item_titles = items.map(function (item) {
            return TOONTALK[type_name]['function'][item].title;
        });
        var select_menu = TT.UTILITIES.create_select_menu("functions",
                                                          items,
                                                          "toontalk-select-function",
                                                          "Which function should I fly to? ",
                                                          "Click to select the function that this bird will use when given a box.",
                                                          item_titles);
        var backside_element = backside.get_element();
        var $description_text_area;
        if (function_object) {
            select_menu.menu.value = function_object.name;
        }
        select_menu.menu.addEventListener('change', function (event) {
            bird.set_function_name(event.target.value);
            if (!bird.get_description()) {
                $description_text_area = $(bird.get_backside_element()).find(".toontalk-description-input");
                if ($description_text_area.length > 0) {
                    $description_text_area.get(0).setAttribute('placeholder', bird.get_default_description());
                }
            }
        });
        backside_element.insertBefore(select_menu.container, backside_element.firstChild);
    };
    
    bird.create = function (nest, description) {
        var new_bird = Object.create(bird);
        var non_empty_listeners = [];
        var waiting_widgets     = [];
        bird_set_nest = function (new_value) {
            nest = new_value;
        };
        new_bird.is_bird = function () {
            return true;
        };
        new_bird.widget_side_dropped_on_me = function (message_side, event, robot, do_not_run_next_step, by_function_bird) {
            var frontside_element, fly_continuation, run_next_step_continuation, add_to_nest_contents_directly;
            if (nest) {
                if (nest.has_ancestor(message_side)) {
                    TT.UTILITIES.display_message("Bird can't take its nest to its nest!");
                    return false;
                }
                if ((nest.visible() || this.visible() || nest.any_nest_copies_visible()) &&
                    (!robot || !robot.visible() || robot.animate_consequences_of_actions())) {
                    // if !robot.animate_consequences_of_actions() then finishing watched cycle after context closed
                    // so do it immediately
                    if (!by_function_bird) {
                        // if "dropped" by function bird then geometry isn't relevant 
                        message_side.save_dimensions();
                    }
                    // doesn't matter if robot is visible or there is a user event -- if either end visible show the delivery
                    frontside_element = this.get_frontside_element();
                    setTimeout(function () {
                        // delay this since removes geometry until recomputed
                        $(frontside_element).removeClass("toontalk-bird-gimme")
                                            .addClass("toontalk-bird-static " + this.get_class_name_with_color("toontalk-bird-static"));
                        this.get_parent_of_frontside().rerender();
                    }.bind(this));
                    message_side.set_visible(nest.visible()); // since nest is
                    if (robot && !do_not_run_next_step) {
                        // robot needs to wait until delivery is finished
                        message_side.robot_waiting_before_next_step = robot;
                        // generalise this with backside support too
                        // the following was redundant (but unsure if it alsways is)
//                      message_side.remove_from_parent_of_frontside();
                        if (robot.run_next_step) {
                            run_next_step_continuation = function () {
                                message_side.robot_waiting_before_next_step = undefined;
                                robot.run_next_step();
                            };
                        }
                    }
                    nest.animate_bird_delivery(message_side, this, run_next_step_continuation, event, robot);
                } else {
                    add_to_nest_contents_directly = function () {
                        try {
                            nest.add_to_contents(message_side, event, robot);
                         } catch (nest_or_error) {
                            if (nest_or_error.wait_for_nest_to_receive_something) {
                                // e.g. this is a function bird and it received a box with empty nests inside
                                nest_or_error.wait_for_nest_to_receive_something.run_when_non_empty(add_to_nest_contents_directly, this);
                                return;
                            } else {
                                // is an error -- this isn't the place to deal with it
                                console.error(nest_or_error.stack);
                                throw nest_or_error;
                            }
                        }
                    };
                    add_to_nest_contents_directly();
                    if (robot && robot === message_side.robot_waiting_before_next_step) {
                        message_side.robot_waiting_before_next_step = undefined;
                        robot.run_next_step();
                    }
               }
            } else {
                console.log("TODO: handle drop on a nestless bird -- just removes other?"); // isn't this handled?
            }
            if (event && this.robot_in_training()) {
                this.robot_in_training().dropped_on(message_side, this);
            }
            return true;
        };
        new_bird.animate_delivery_to = function (message_side, target_side, nest_recieving_message, starting_left, starting_top, after_delivery_continuation, event, robot) {
            // starting_left and starting_top are optional and if given are in the coordinate system of the top-level backside
            var temporary_bird = !!nest_recieving_message;
            var parent = this.get_parent_of_frontside();
            var bird_frontside_element = this.get_frontside_element(true);
            var bird_position = $(bird_frontside_element).position();
            var bird_width = $(bird_frontside_element).width();
            var visible_ancestor = this.closest_visible_ancestor_or_frontside();
            var bird_offset = $(visible_ancestor.get_frontside_element()).offset();
            var bird_finished_continuation = 
                function () {
                    var become_static, current_non_empty_listeners;
                    if (TT.sounds) {
                        TT.sounds.bird_fly.pause();
                    }
                    if (temporary_bird) {
                        this.remove();
                    } else if (this.visible()) {
                        become_static = function () {
                            $(bird_frontside_element).removeClass("toontalk-bird-morph-to-static");
                            $(bird_frontside_element).addClass("toontalk-bird-static " + this.get_class_name_with_color("toontalk-bird-static"));
                            if (parent) {
                                parent.get_widget().rerender();
                            }
                        }.bind(this);
                        bird_frontside_element.style.position = bird_style_position;
                        TT.UTILITIES.set_css(bird_frontside_element, bird_position);
                        if (parent_element) {
                            parent_element.appendChild(bird_frontside_element);
                        }
                        if (parent) {
                            if (parent.get_widget().is_top_level()) {
                                this.rerender();
                            } else {
                                parent.get_widget().rerender();
                            }
                        }
                        if (restore_contents) {
                            // if bird was inside something go back where it was
                            top_level_widget.remove_backside_widget(this, true);
                            restore_contents();
                            if (non_empty_listeners) {
                                // running these continuations may add to non_empty_listeners so save and reset it first
                                current_non_empty_listeners = non_empty_listeners;
                                non_empty_listeners = [];
                                waiting_widgets     = [];
                                current_non_empty_listeners.forEach(function (non_empty_listener) {
                                    non_empty_listener();
                                });
                            }
                        }
                        TT.UTILITIES.add_animation_class(bird_frontside_element, "toontalk-bird-morph-to-static");
                        TT.UTILITIES.add_one_shot_event_handler(bird_frontside_element, "animationend", 1000, become_static);
                    }
                    if (after_delivery_continuation) {
                        after_delivery_continuation();
                    }
                }.bind(this);
            var bird_return_continuation = 
                function () {
                    try {
                        nest_recieving_message.add_to_contents(message_side, event, robot, this, true);
                    } catch (nest_or_error) {
                        if (nest_or_error.wait_for_nest_to_receive_something) {
                            // e.g. this is a function bird and it received a box with empty nests inside
                            nest_or_error.wait_for_nest_to_receive_something.run_when_non_empty(bird_return_continuation, this);
                            if (after_delivery_continuation) {
                                // e.g. a robot is running this and the robot shouldn't wait to run the next step
                                after_delivery_continuation();
                                after_delivery_continuation = undefined;
                            }
                            return;
                        } else {
                            // is an error -- this isn't the place to deal with it
                            console.error(nest_or_error.stack);
                            throw nest_or_error;
                        }
                    }
                    stop_carrying_element($(bird_frontside_element).offset());
                    // return to original location
                    TT.UTILITIES.set_timeout(function () {
                            this.fly_to(bird_offset, bird_finished_continuation, robot); 
                        }.bind(this));
                }.bind(this);
            var carry_element = 
                function (element, widget_side) {
                    if (!widget_side) {
                        widget_side = TT.UTILITIES.widget_side_of_element(element);
                    } 
                    // CSS uses .8 and .4 for scaling relative to bird dimensions
//                     element.width_before_carry  = $(element).width()  || $(this.get_frontside_element(true)).width() *0.8;
//                     element.height_before_carry = $(element).height() || $(this.get_frontside_element(true)).height()*0.4;
                    this.element_to_display_when_flying = element;
                    if (widget_side) {
                        this.update_display();
                        // TODO: determine if the following is still needed
                        setTimeout(function () {
                            widget_side.update_display();
                        });
                    }
                    $(element).addClass("toontalk-carried-by-bird");
                    $(element).removeClass("toontalk-temporarily-set-down");
                    // the timeout fixes a problem when a watched robot gives a bird something that
                    // thing carried is displayed displaced to the southeast from where it should be
                    TT.UTILITIES.set_timeout(function () {
                            var css = {left: '',
                                       top:  '',
                                       position: ''}
                            if (widget_side && !widget_side.use_scaling_transform) {
                                css.width = '';
                                css.height = '';
                            }
                            if (element.toontalk_x_scale > 1) {
                                css['font-size'] = 'inherit';
                            }
                            TT.UTILITIES.set_css(element, css);
                            this.update_display();
                        }.bind(this));
                }.bind(this);
            var stop_carrying_element = 
                function (where_to_leave_it) {
                    var parent, css;
                    if (!this.element_to_display_when_flying) {
                        return;
                    }
                    $(this.element_to_display_when_flying).removeClass("toontalk-carried-by-bird");
                    if (where_to_leave_it) {
                        css = {"z-index": TT.UTILITIES.next_z_index()};
                        if (this.element_to_display_when_flying.width_before_carry > 0) {
                            css.width  = this.element_to_display_when_flying.width_before_carry;
                        }
                        if (this.element_to_display_when_flying.height_before_carry > 0) {
                            css.height = this.element_to_display_when_flying.height_before_carry;
                        }
                        if (this.element_to_display_when_flying.toontalk_x_scale > 1) {
                            css['font-size'] = 'inherit';
                        }
                        TT.UTILITIES.set_css(this.element_to_display_when_flying, css);
                        this.top_level_widget().get_backside_element().appendChild(this.element_to_display_when_flying);
                        TT.UTILITIES.set_absolute_position(this.element_to_display_when_flying, where_to_leave_it);
                        parent = message_side.get_parent_of_frontside();
                        if (parent && !parent.is_backside()) {
                            parent.rerender();
                        } else {
                            message_side.set_visible(true);
                            message_side.render();
                        }
                    } else {
                        $(this.element_to_display_when_flying).remove();
                    }
                    this.element_to_display_when_flying = undefined;
                    this.update_display();
                }.bind(this);
            var delay_between_steps = 300; // milliseconds
            var target_offset, bird_offset, target_frontside_element, parent_element, bird_style_position, width, height,
                $top_level_backside_element, top_level_backside_element_offset, continuation, delivery_continuation, restore_contents,
                nest_contents_frontside_element, nest_width, nest_height, nest_offset, message_element, 
                top_level_widget, top_level_backside_element_bounding_box;
            if (!nest_recieving_message) {
                nest_recieving_message = nest;
            }
            message_element = message_side.get_element(true);
            carry_element(message_element, message_side);
            if (!target_side.is_function_nest()) {
                // nests of functions are 'virtual'
                target_frontside_element = target_side.get_widget().closest_visible_ancestor_or_frontside().get_widget().get_frontside_element();
            }
            if ((!target_side.visible() && !this.visible()) || (!target_side.is_function_nest() && !TT.UTILITIES.visible_element(target_frontside_element))) {
                // neither are visible so just add contents to nest
                nest_recieving_message.add_to_contents(message_side, event, robot, this, true);
                return;
            }
            if (TT.sounds) {
                TT.sounds.bird_fly.play();
            }
            $(bird_frontside_element).removeClass("toontalk-bird-static " + this.get_class_name_with_color("toontalk-bird-static"));
            if (!target_side.is_function_nest()) {
                // nests of functions are 'virtual'
                target_frontside_element = target_side.get_widget().closest_visible_ancestor_or_frontside().get_widget().get_frontside_element();
                target_offset = $(target_frontside_element).offset();
                $top_level_backside_element = $(nest_recieving_message.get_frontside_element()).closest(".toontalk-top-level-backside");   
            }
            if (!$top_level_backside_element || !$top_level_backside_element.is("*")) {
                // target (e.g. nest) isn't contributing its top-level backside so use this bird's
                $top_level_backside_element = $(this.get_frontside_element()).closest(".toontalk-top-level-backside");
            }
            top_level_backside_element_bounding_box = $top_level_backside_element.offset();
            if (!top_level_backside_element_bounding_box) {
                top_level_backside_element_bounding_box = {left: 0,
                                                           top:  0};
            }
            if (starting_left) {
                bird_offset = {left: starting_left+top_level_backside_element_bounding_box.left,
                               top:  starting_top +top_level_backside_element_bounding_box.top};
            } else if (bird_offset.left === 0 && bird_offset.top === 0) {
                // don't really know where the bird is so put him offscreen
                bird_offset = {left: -message_element.clientWidth,
                               top:  top_level_backside_element_bounding_box.top+$top_level_backside_element.height()/2};
            }
            if (!target_offset) {
                // offscreen to the left at vertical center of top-level backside
                target_offset = {left: -2*message_element.clientWidth,
                                 top:  top_level_backside_element_bounding_box.top+$top_level_backside_element.height()/2};
            }
            // save some state before clobbering it
            parent_element = bird_frontside_element.parentElement;
            width =  $(bird_frontside_element).width();
            height = $(bird_frontside_element).height();
            bird_style_position = bird_frontside_element.style.position;
            bird_frontside_element.style.position = 'absolute';
            top_level_widget = this.top_level_widget();
            if (parent && parent.temporarily_remove_contents) {
                restore_contents = parent.temporarily_remove_contents(this, true);
                if (restore_contents) {
                    // if it really did remove the contents
                    this.get_widget().add_to_top_level_backside(this);
                }
            }
            if ($top_level_backside_element.length > 0) {
                $top_level_backside_element.get(0).appendChild(bird_frontside_element); // while flying
            }           
            TT.UTILITIES.set_css(bird_frontside_element,
                                 {left:   starting_left || bird_offset.left-top_level_backside_element_bounding_box.left,
                                  top:    starting_top  || bird_offset.top -top_level_backside_element_bounding_box.top,
                                  width:  width,
                                  height: height});
            if (TT.logging && TT.logging.indexOf('bird') >= 0) {
                console.log(this.to_debug_string() + " from " + 
                           (starting_left || bird_offset.left-top_level_backside_element_bounding_box.left) + ", " + 
                           (starting_top  || bird_offset.top -top_level_backside_element_bounding_box.top) + 
                            " to " + target_offset.left + ", " + target_offset.top);
            }
            nest_contents_frontside_element = nest_recieving_message.get_contents_element &&
                                              nest_recieving_message.get_contents_element();
            if (nest_contents_frontside_element && nest_recieving_message.visible() &&
                (!robot || robot.animate_consequences_of_actions())) {
                // just fly to nest and return if unwatched robot caused this
                // head near the nest (southeast) to set down message,
                // move nest contents,
                // put message on nest
                // and restore nest contents
                nest_width =  $(target_frontside_element).width();
                nest_height = $(target_frontside_element).height();
                nest_offset = $(target_frontside_element).offset();
                top_level_backside_element_bounding_box.max_left = top_level_backside_element_bounding_box.left+$top_level_backside_element.width();
                top_level_backside_element_bounding_box.max_top  = top_level_backside_element_bounding_box.top +$top_level_backside_element.height();
                target_offset.left += nest_width
                target_offset.top  += nest_height;
                // set message down near nest (southeast) 
                var message_offset =  {left: Math.min(nest_offset.left+nest_width,  top_level_backside_element_bounding_box.max_left -nest_width),
                                       top:  Math.min(nest_offset.top +nest_height, top_level_backside_element_bounding_box.max_top  -nest_height)};
                // set contents down near nest (northwest)
                var contents_offset = {left: Math.max(nest_offset.left-nest_width , top_level_backside_element_bounding_box.left),
                                       top:  Math.max(nest_offset.top -nest_height, top_level_backside_element_bounding_box.top)};
                var set_down_message_continuation = function () {
                    var fly_to_nest_continuation = function () {
                        // no other bird should do this once this one begins to fly to the nest to move its contents
                        if (!nest_recieving_message.visible()) {
                            // been hidden since this bird started delivery
                            nest_recieving_message.add_to_contents(message_side, event, robot, this, true);
                            if (after_delivery_continuation) {
                                after_delivery_continuation();
                                after_delivery_continuation = undefined;
                            }
                            return;
                        }
                        nest_recieving_message.set_locked(true);
                        this.fly_to(nest_offset, move_nest_contents_continuation, robot, delay_between_steps);
                    }.bind(this);
                    $(message_element).addClass("toontalk-temporarily-set-down");
                    stop_carrying_element(message_offset);
                    if (nest_recieving_message.get_locked()) {
                        // another bird is delivering
                        nest_recieving_message.run_when_unlocked(fly_to_nest_continuation);
                        // should 'busy wait' animation
                    } else {
                        fly_to_nest_continuation();
                    }                       
                }.bind(this);
                var move_nest_contents_continuation = function () {
                    carry_element(nest_contents_frontside_element);
                    this.fly_to(contents_offset, set_down_contents_continuation, robot, delay_between_steps);
                }.bind(this);
                var set_down_contents_continuation = function () {
                    $(nest_contents_frontside_element).addClass("toontalk-temporarily-set-down");
                    stop_carrying_element(contents_offset);
                    this.fly_to(message_offset, pickup_message_continuation, robot, delay_between_steps);
                }.bind(this);
                var pickup_message_continuation = function () {
                    carry_element(message_element, message_side);
                    this.fly_to(nest_offset, deliver_message_continuation, robot, delay_between_steps);
                }.bind(this);
                var deliver_message_continuation = function () {
                    var message_dimensions = nest_recieving_message.get_contents_dimensions();
                    if (message_side.is_plain_text_element()) {
                        $(message_element).addClass("toontalk-temporarily-set-down");
                    }
                    stop_carrying_element(nest_offset);
                    if (!message_side.is_plain_text_element()) {
                        TT.UTILITIES.set_css(message_side.get_frontside_element(), message_dimensions);
                    }
                    this.fly_to(contents_offset, move_contents_back_continuation, robot, delay_between_steps);
                }.bind(this);
                var move_contents_back_continuation = function () {
                    carry_element(nest_contents_frontside_element);
                    this.fly_to(nest_offset, complete_nest_update_continuation, robot, delay_between_steps);
                }.bind(this);
                var complete_nest_update_continuation = function () {
                    $(message_element).removeClass("toontalk-temporarily-set-down");
                    nest_recieving_message.set_locked(false);
                    stop_carrying_element();
                    nest_recieving_message.update_display();
                    bird_return_continuation();
                }.bind(this);
                this.fly_to(message_offset, set_down_message_continuation, robot, delay_between_steps);
            } else {
                this.fly_to(target_offset,  bird_return_continuation,      robot, delay_between_steps);
            }  
        };
        new_bird.get_json = function (json_history, callback, start_time) {
            var new_callback;
            if (nest) {
                new_callback = function (nest_json, start_time) {
                    callback({type: "bird",
                              nest: nest_json},
                             start_time);
                };
                TT.UTILITIES.get_json(nest, json_history, new_callback, start_time);
            } else {
                callback({type: "bird"}, start_time);
            }
        };
        new_bird.copy = function (parameters) {
            // notice that bird/nest semantics is that the nest is shared not copied
            // if a bird and its nest are copied as part of a widget (e.g. a box) 
            // then a new pair is created and linked
            var copy, new_nest, i, nest_guid;
            if (!parameters) {
                if (nest && nest.is_function_nest()) {
                    // each bird has its own function nest so can be changed independently
                    copy = this.create(nest.copy(), this.get_description());
                } else {
                    copy = this.create(nest, this.get_description());
                }
            } else if (parameters.just_value) {
                copy = this.create(undefined, this.get_description());
            } else {
                nest_guid = nest.get_guid();
                if (nest_guid && parameters.nests_copied && parameters.nests_copied[nest_guid]) {
                    // function nests don't have guids
                    new_nest = parameters.nests_copied[nest_guid][0];
                    // turn first copy into a 'fresh' copy
                    make_nest_fresh.call(new_nest);
                    // and make the others treat the fresh copy as their original_nest
                    for (i = 1; i < parameters.nests_copied[nest_guid].length; i++) {
                        update_nest.call(parameters.nests_copied[nest_guid][i], new_nest);
                    }
                    copy = this.create(new_nest, this.get_description());
                } else {
                    copy = this.create(nest, this.get_description());
                }
                if (!parameters.birds_copied) {
                    parameters.birds_copied = {};
                }
                if (nest_guid) {
                    if (!parameters.birds_copied[nest_guid]) {
                        parameters.birds_copied[nest_guid] = [];
                    }
                    // add to birds of this nest copied before the nest is (if at all)
                    parameters.birds_copied[nest_guid].push(copy);
                } 
            }
            return this.add_to_copy(copy, parameters);
        };
        new_bird.run_when_non_empty = function (non_empty_listener, widget) {
            // widget is a robot waiting for this bird to return to a box hole
            if (waiting_widgets.indexOf(widget) < 0) {
                non_empty_listeners.push(non_empty_listener);
                waiting_widgets.push(widget);
            }
        };
        new_bird.create_backside = function () {
            var backside = TT.bird_backside.create(this);
            if (nest && nest.is_function_nest()) {
                add_function_choice(nest, backside, this);
            }
            return backside;
        };
        new_bird.get_help_URL = function () {
            if (nest && nest.is_function_nest()) {
                return "docs/manual/function-birds.html";
            }
            return "docs/manual/birds-nests.html";
        };
        new_bird.is_function_bird = function () {
            return nest && nest.is_function_nest();
        };
        new_bird.get_custom_title_prefix = function () {
            var function_object;
            if (nest) {
                if (nest.is_function_nest()) {
                    function_object = nest.get_function_object();
                    if (function_object) {
                        return function_object.get_description();
                    }
                }
                return "Drop something on me and I'll take it to my nest.";
            }
            return "This bird no longer knows where her nest is. She'll get rid of anything you give her.";
        };
        new_bird.toString = function (to_string_info) {
            if (nest) {
                if (nest.is_function_nest()) {
                    return nest.get_function_object().toString();
                }
                return "a bird";
            }
            if (to_string_info && to_string_info.role === "conditions") {
                return "any bird";
            }
            return "a bird without a nest";
        };
        new_bird.get_default_description = function () {
            if (this.is_function_bird()) {
                return "a bird who gives another bird a box to find out the '" + nest.get_function_object().name + "' of " + TT.UTILITIES.add_a_or_an(this.get_function_type()) + ".";
            }
            return "a bird who takes things to her nest.";
        };
        new_bird.update_display = function () {
            var frontside = this.get_frontside(true);
            var backside = this.get_backside(); 
            var bird_image, frontside_element;
            frontside_element = frontside.get_element();
            frontside_element.setAttribute('toontalk_name', this.get_name());
            TT.UTILITIES.give_tooltip(frontside_element, this.get_title());
            if (!$(frontside_element).is(".toontalk-bird, .toontalk-side-animating")) {
                $(frontside_element).addClass("toontalk-bird-static " + this.get_class_name_with_color("toontalk-bird toontalk-bird-static"));
                frontside_element.addEventListener("dragenter", function (event) {
                    if (frontside_element.className.indexOf("toontalk-bird-static") >= 0) {
                        $(frontside_element).removeClass("toontalk-bird-static " + this.get_class_name_with_color("toontalk-bird-static"));
                        TT.UTILITIES.add_animation_class(frontside_element, "toontalk-bird-gimme");
                    }
                }.bind(this));
                frontside_element.addEventListener("dragleave", function (event) {
                    if ($(frontside_element).is(".toontalk-bird-gimme")) {
                        $(frontside_element)
                            .addClass("toontalk-bird-static " + this.get_class_name_with_color("toontalk-bird-static"))
                            .removeClass("toontalk-bird-gimme");
                       // if in a container restore dimensions
                       this.get_parent_of_frontside().render();
                    }
                }.bind(this));
            }
            if (this.element_to_display_when_flying) {
                frontside_element.appendChild(this.element_to_display_when_flying);
            } else {
                $(frontside_element).children(".toontalk-side").remove();
            }
        };
        new_bird.set_function_name = function (new_name) {
            if (nest && nest.is_function_nest() && nest.set_function_name(new_name)) {
                this.rerender();
                if (this.robot_in_training()) {
                    this.robot_in_training().edited(this, {setter_name: "set_function_name",
                                                           argument_1:  new_name,
                                                           toString: "change the function bird to '" + new_name + "'",
                                                           button_selector: ".toontalk-select-function"});
                }
            }
        };
        new_bird.get_function_type = function () {
            return nest.get_function_type();
        };
        new_bird.get_class_name_with_color = function (base_class_name) {
            if (nest && nest.get_class_name_with_color) {
                return nest.get_class_name_with_color(base_class_name);
            }
            return base_class_name;
        }; 
        new_bird.get_name = function () {
            return nest && nest.get_name();
        };
        if (nest && nest.set_name) {
            // function nest names are read-only
            new_bird.set_name = function (new_value, update_display) {
                return nest.set_name(new_value, update_display);
            };
        }   
        new_bird.add_standard_widget_functionality(new_bird);
        new_bird.set_description(description);
        if (TT.debugging) {
            new_bird._debug_id = TT.UTILITIES.generate_unique_id();
            new_bird._debug_string = new_bird.to_debug_string();
        }
        return new_bird;
    };

    bird.create_function = function (type_name, description, function_name) {
        // default function adds its arguments and gives result to bird
        return bird.create(TT.nest.create_function(description, type_name, function_name || TT.UTILITIES.get_first_property(TT[type_name].function)));
    };
    
    bird.match = function (other) {
        // doesn't matter if erased
        // shouldn't be able to match to see if two birds are identical, right?
        if (other.match_with_any_bird) {
            return other.match_with_any_bird(this);
        }
        this.last_match = other;
        return this;
    };
    
    bird.match_with_any_bird = function () {
        return "matched";
    };

    bird.fly_to = function (target_offset, continuation, robot, delay) {
        // target_offset is page relative coordinates
        // delay if undefined (or zero) means the continuation is run immediately upon reaching the target_offset
        var frontside_element = this.get_frontside_element();
        var bird_offset = $(frontside_element).offset();
        var delta_x = target_offset.left-bird_offset.left;
        var delta_y = target_offset.top-bird_offset.top;
        var angle = Math.atan2(delta_y, delta_x); // in radians
        var region = Math.round((angle/Math.PI+1)*4) % 8;
        var direction = ["toontalk-fly-west", "toontalk-fly-northwest", "toontalk-fly-north", "toontalk-fly-northeast", 
                         "toontalk-fly-east", "toontalk-fly-southeast", "toontalk-fly-south", "toontalk-fly-southwest"][region];
        var bird_position = $(frontside_element).position();
        var full_continuation = function () {
            $(frontside_element).removeClass(direction);
            if (delay) {
                setTimeout(continuation, robot ? robot.transform_step_duration(delay) : delay);
            } else {
                continuation();
            };
        }.bind(this);
        // this timeout fixes the problem that the bird's name is displayed incorrectly while she is flying
        setTimeout(function () {
                       $(frontside_element).removeClass("toontalk-bird-static " + this.get_class_name_with_color("toontalk-bird-static"));
                       TT.UTILITIES.add_animation_class(frontside_element, direction);
                       // duration is proportional to distance
                       // console.log("Flying to " + target_offset.left + ", " + target_offset.top + " holding " + (this.element_to_display_when_flying && this.element_to_display_when_flying.className));
                       this.animate_to_absolute_position(target_offset, full_continuation, robot && robot.transform_animation_speed(TT.UTILITIES.default_animation_speed));
                   }.bind(this),
                   1);
    };
    
    bird.get_type_name = function (plural, detailed) {
        if (plural) {
            if (detailed && this.is_function_bird()) {
                return "function birds";
            }
            return "birds";
        }
        return "bird";
    };

    bird.maintain_proportional_dimensions = function () {
        // should not be stretched in only one dimension
        return true;
    };

    bird.matching_resource = function (other) {
        // should only be one bird resource since bird identity is an issue
        return other.get_type_name && other.get_type_name() === this.get_type_name();
    };
    
    bird.drop_on = function (side_of_other, event, robot) {
        if (side_of_other.widget_side_dropped_on_me) {
            return side_of_other.widget_side_dropped_on_me(this, event, robot);
        }
    };
        
    TT.creators_from_json["bird"] = function (json, additional_info) {
        return TT.bird.create(TT.UTILITIES.create_from_json(json.nest, additional_info), json.description);
    };
    
    return bird;
}(window.TOONTALK));

window.TOONTALK.bird_backside = 
(function (TT) {
    "use strict";
    return {
        create: function (bird) {
            var backside = TT.backside.create(bird);
            backside.add_description_setting();
            backside.add_name_setting();
            backside.get_element().appendChild(TT.backside.create_advanced_settings_button(backside, bird));
            return backside;
        }
        
    };
}(window.TOONTALK));

window.TOONTALK.nest = (function (TT) {
    "use strict";
    var nest = Object.create(TT.widget);
    // following enables nests to invoke private methods of other nests
    // TODO: use private keys for other things private to nests
    // and make this not enumerable -- see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Enumerability_and_ownership_of_properties
    // could define the following here if TT.UTILITIES is defined before TT.nest
    var add_copy_private_key; // any unique string is fine
    // following should be updated if CSS is
    var contents_width = function (width) {
        return width *TT.nest.CONTENTS_WIDTH_FACTOR;
    };
    var contents_height = function (height) {
        return height*TT.nest.CONTENTS_HEIGHT_FACTOR;
    };
    var next_serial_number = 0;
    var name_counter = 0;
    // nest capacity - enforced only for unwatched robots when robot_removed_contents_since_empty
    nest.default_maximum_capacity = 10;
    nest.maximum_capacity = nest.default_maximum_capacity;
    nest.create = function (description, contents, guid, original_nest, serial_number, name) { 
        var new_nest = Object.create(nest);
        var non_empty_listeners           = [];
        var nest_under_capacity_listeners = [];
        var waiting_widgets               = [];
        var robot_removed_contents_since_empty           = false; // has any of its contents been removed since this was empty -- needed for maximum_capacity
        var nest_copies, generic_set_name, generic_set_visible;
        if (!contents) {
            contents = [];
        }
        if (!serial_number) {
            next_serial_number++;
            serial_number = next_serial_number;
        }
        update_nest = function (new_original_nest) {
            if (original_nest) {
                remove_nest_copy.call(original_nest, this);
            }
            original_nest = new_original_nest;
            guid = new_original_nest.get_guid();
            add_nest_copy.call(new_original_nest, this);
        };
        make_nest_fresh = function () {
            if (original_nest) {
                remove_nest_copy.call(original_nest, this);
            }
            original_nest = undefined;
            guid = TT.UTILITIES.generate_unique_id();
        };
        add_nest_copy = function (new_copy) {
            if (!add_copy_private_key) {
                add_copy_private_key = TT.UTILITIES.generate_unique_id();
            }
            this[add_copy_private_key](new_copy);
        };
        remove_nest_copy = function (old_copy) {
            if (!add_copy_private_key) {
                add_copy_private_key = TT.UTILITIES.generate_unique_id();
            }
            this[add_copy_private_key](old_copy, true);
        };
        new_nest.is_nest = function () {
            return true;
        };
        new_nest.get_guid = function () {
            return guid;
        };
        new_nest.matched_by = function (other) {
            if (contents.length > 0) {
                return TT.UTILITIES.match(other, contents[0]);
            } else {
                // suspend on this nest -- other is reported for help providing useful feedback
                return [[this, other]];
            }
        };
        new_nest.run_when_non_empty = function (non_empty_listener, widget) {
            if (contents.length > 0) {
                // is already non-empty so run it now
                non_empty_listener(contents[0]);
                return;
            }
            if (waiting_widgets.indexOf(widget) < 0) {
                // widget isn't already waiting for this nest
                // widget is typically a robot but could be a function bird
                non_empty_listeners.push(non_empty_listener);
                waiting_widgets.push(widget);
            }
        };
        new_nest.dereference = function () {
            // holder of a nest can do anything with it -- it is birds that need to be restricted
            if (contents.length > 0) {
                return contents[0];
            }
            return this;
        };
        new_nest.match = function (other) {
            // the semantics of matching an uncovered nest is that the other must be a nest (covered or not)
            // paths should be to the entire nest so that a robot can pick up a nest and manipulate it
            if (contents.length > 0) {
                // backside conditions can be nests with something on top
                return contents[0].match(other);
            }
            if (other.match_nest_with_nest) {
                return other.match_nest_with_nest(this);
            }
            this.last_match = other;
            return this;
        };
        new_nest.add_to_contents = function (widget_side, event, robot, delivery_bird, ignore_copies) {
            var current_non_empty_listeners, widget_side_copy;
            var stack_size = contents.push(widget_side);
            var nest_visible = this.visible();
            if (stack_size > nest.maximum_capacity && robot && robot_removed_contents_since_empty && !robot.visible() && !nest_visible) {
                // if robot or nest is visible let it keep running even if nest goes over capactity
                // robot_removed_contents_since_empty ensures that programs to add to top-level nests or nests without robots removing things don't stop
                if (TT.logging && TT.logging.indexOf("nest") >= 0) {
                    console.log(this.to_debug_string() + " postponing addition of " + widget_side.to_debug_string() +
                                " by " + robot.to_debug_string() + ". Stack is " + contents.length + " long. " +
                                nest_under_capacity_listeners.length + " previously postponed.");
                }
                // stop the robot at the end of this cycle
                // and let him run again when the nest isn't so full
                robot.add_body_finished_listener(function () {
                    robot.set_stopped(true);
                    nest_under_capacity_listeners.push(function () {
                        robot.set_stopped(false);
                        robot.run_actions();
                    });
                })
            }
            if (TT.logging && TT.logging.indexOf("nest") >= 0) {
                console.log(this.to_debug_string() + " added " + widget_side.to_debug_string() + " nest now contains " + contents.length + " widgets.");
            }
            if (stack_size === 1) {
                robot_removed_contents_since_empty = false;
                if (non_empty_listeners.length > 0) {
                    // is the first content and some robots are waiting for this nest to be filled
                    // running these robots may cause new waiting robots so set non_empty_listeners to [] first
                    current_non_empty_listeners = non_empty_listeners;
                    non_empty_listeners = [];
                    waiting_widgets     = [];
                    current_non_empty_listeners.forEach(function (non_empty_listener) {
                                                            non_empty_listener(widget_side);
                                                        });
                }
                widget_side.set_visible(nest_visible);
                if (!nest_visible) {
                    widget_side.hide();
                }
            } else {
                // is under the top widget
                widget_side.hide();
                widget_side.set_visible(false);
            }
            if (widget_side.is_backside()) {
                widget_side.set_parent_of_backside(this);
            } else {
                widget_side.set_parent_of_frontside(this);
            }
            if (nest_copies && !ignore_copies) {
                if (delivery_bird) {
                    nest_copies.forEach(function (nest_copy) {
                        if (!nest_copy.has_ancestor(widget_side.get_widget())) {
                            // ignore if nest_copy is inside message
                            nest_copy.animate_bird_delivery(TT.UTILITIES.copy_side(widget_side), delivery_bird, undefined, event, robot);
                        }
                    });                    
                } else {
                    nest_copies.forEach(function (nest_copy) {
                        if (!nest_copy.has_ancestor(widget_side.get_widget())) {
                            // ignore if nest_copy is inside message
                            nest_copy.add_to_contents(TT.UTILITIES.copy_side(widget_side, false, true), event, robot);
                        }
                    });
                }
            }
            this.rerender();
        };
        new_nest.animate_bird_delivery = function (message_side, bird, continuation, event, robot) {
            var start_position, bird_parent_element, visible;
            if (this.get_parent_of_frontside() === undefined) {
                // is acting like a sink for messages
                message_side.remove();
                if (continuation) {
                    continuation();
                }
                return;
            }
            bird.animate_delivery_to(message_side, this, undefined, undefined, undefined, continuation, event, robot);
            if (nest_copies) {
                start_position = $(bird.closest_visible_ancestor().get_widget().get_frontside_element()).closest(":visible").position();
                bird_parent_element = bird.get_parent_of_frontside().get_element();
                visible = this.visible();
                nest_copies.forEach(function (nest_copy) {
                    var message_copy = TT.UTILITIES.copy_side(message_side, false, visible);
                    var bird_copy, bird_frontside_element;
                    if (!nest_copy.has_ancestor(message_side.get_widget())) {
                        // ignore if nest_copy is inside message
                        if (!start_position || (!nest_copy.visible() && !visible)) {
                            // neither are visible so just add contents to nest
                            nest_copy.add_to_contents(message_copy, undefined, robot);
                        } else {
                            bird_copy = bird.copy({just_value: true});
                            bird_frontside_element = bird_copy.get_frontside_element(true); 
                            bird_parent_element.appendChild(bird_frontside_element);
                            bird_copy.animate_delivery_to(message_copy, nest_copy, nest_copy, start_position.left, start_position.top, undefined, event, robot);
                        }
                   }
               });
            }
        };
        new_nest.get_contents_element = function () {
            if (contents.length > 0) {
                return contents[0].get_element();
            }
        };
        new_nest.get_locked = function () {
            return this.locked_for_animating_deliveries;
        };
        new_nest.set_locked = function (new_value) {
            this.locked_for_animating_deliveries = new_value;
            if (!new_value && this.to_run_when_unlocked && this.to_run_when_unlocked.length > 0) {
                // enqueue the oldest listener and run it
                this.to_run_when_unlocked.shift()();
            }
        };
        new_nest.run_when_unlocked = function (listener) {
            if (this.to_run_when_unlocked) {
                this.to_run_when_unlocked.push(listener);
            } else {
                this.to_run_when_unlocked = [listener];
            }
        };
        new_nest.removed_from_container = function (part_side, event) {
            var removed = contents.shift();
            if (TT.logging && TT.logging.indexOf("nest") >= 0) {
                console.log(this.to_debug_string() + " removed " + removed.to_debug_string() + " remaining widgets is " + contents.length);
            }
            if (removed) {
                if (!event) { // only if robot did this should flag to be updated
                    robot_removed_contents_since_empty = true;
                }
                if (removed.is_backside()) {
                    removed.set_parent_of_backside(undefined);
                } else {
                    removed.get_widget().set_parent_of_frontside(undefined);
                }
            } else {
                if (report_error_if_nothing_removed) {
                    TT.UTILITIES.report_internal_error("Nothing removed from nest!");
                }
                return;
            }
            if (this.visible()) {
                if (removed.restore_dimensions) {
                    removed.restore_dimensions();
                }
                if (contents.length > 0) {
                    contents[0].set_visible(true);
                    $(contents[0].get_element()).show();
                }
                this.render();
            }
            if (contents.length <= nest.maximum_capacity && nest_under_capacity_listeners.length > 0) {
                // remove the limit while running the listeners
                if (TT.logging && TT.logging.indexOf("nest") >= 0) {
                    console.log(this.to_debug_string() + " running " + nest_under_capacity_listeners.length + " postponed additions. Stack is " + contents.length + " long.");
                }
                nest.maximum_capacity = Number.MAX_VALUE;
                nest_under_capacity_listeners.forEach(function (listener) {
                    listener();
                });
                // restore the default limit
                nest.maximum_capacity = nest.default_maximum_capacity;
                nest_under_capacity_listeners = [];
            }
            return removed;
        };
        new_nest.dereference_path = function (path, robot) {
            if (contents.length === 0) {
                if (this.get_guid()) {
                    // robot needs to wait until something arrives on this nest
                    return {wait_until_this_nest_receives_something: this};
                } else {
                    // egg hasn't hatched yet
                    return this;
                }
            }
            if (contents) {
                return contents[0].dereference_path(path, robot);
            }
            TT.UTILITIES.display_message("Robot expected to find a nest something that it could get " + TT.path.toString(path) + ". But the nest is empty.");
            return this;
        };
        new_nest.dereference_contents = function (path_to_nest, robot) {
            var widget_side, nest_offset, $top_level_backside_element, top_level_backside_element_offset, 
                widget_element, nest_element, nest_width, nest_height,
                left, top;
            if (contents.length === 0) {
                // robot needs to wait until something arrives on this nest
                return {wait_until_this_nest_receives_something: this};
            }
            // e.g. when a robot takes something off the nest
            if (path_to_nest.removing_widget) {
                widget_side = contents[0];
                robot.remove_from_container(widget_side, this);
                // isn't attached to the DOM because was removed from nest
                if (this.visible()) {
                    nest_element = this.get_frontside_element();
                    nest_offset = $(nest_element).offset();
                    $top_level_backside_element = $(nest_element).closest(".toontalk-backside-of-top-level");
                    top_level_backside_element_offset = $top_level_backside_element.offset();
                    if (!top_level_backside_element_offset) {
                        // perhaps nest is on the back of something
                        top_level_backside_element_offset = {left: 0,
                                                             top:  0};
                    }
                    widget_element = widget_side.get_element(true);
                    nest_width =  $(nest_element).width();
                    nest_height = $(nest_element).height();
                    // left and top are 10%
                    left = nest_width  * .1 + nest_offset.left - top_level_backside_element_offset.left;
                    top  = nest_height * .1 + nest_offset.top -  top_level_backside_element_offset.top;
                    TT.UTILITIES.set_css(widget_element,
                                         {width:  contents_width(nest_width),
                                          height: contents_height(nest_height)});
                    if ($top_level_backside_element.length > 0) {
                        robot.add_watched_step_end_listeners(function () {
                            // run this after step has finished since removal from parent may happen during this step
                            $top_level_backside_element.get(0).appendChild(widget_element);
                            TT.UTILITIES.set_css(widget_element, {left: left, 
                                                                   top: top});
                            });
                    }
                }
                return widget_side;
            }
            // act as if the top contents was being dereferenced
            if (path_to_nest.next) {
                return contents[0].get_widget().dereference_path(path_to_nest.next, robot);
            }
            // TODO: determine if this should just be return contents[0]
            return contents[0].get_widget();
        };
        // defined here so that contents and other state can be private
        new_nest.get_json = function (json_history, callback, start_time) {
            var json_array = [];
            var new_callback =
                function () {
                    var original_nest_callback = function (orginal_nest_json, start_time) {
                                                     callback({type: "nest",
                                                               contents: json_array,
                                                               guid: guid,
                                                               original_nest: orginal_nest_json,
                                                               serial_number: serial_number,
                                                               name: this.get_name()},
                                                              start_time);
                                                 }.bind(this);
                    if (original_nest) {
                        TT.UTILITIES.get_json(original_nest, json_history, original_nest_callback, start_time);
                    } else {
                        original_nest_callback(undefined, start_time);
                    }
                }.bind(this);
            TT.UTILITIES.get_json_of_array(contents, json_array, 0, json_history, new_callback, start_time);
        };
        new_nest.copy = function (parameters) {
            // notice that bird/nest semantics is that the nest is shared not copied
            // unless the nest is copied along with one of its birds
            var contents_copy, copy, top_content_copy, new_original_nest, new_original_nest_guid;
            if (parameters && parameters.just_value) {
                if (contents.length > 0) {
                    top_content_copy = contents[0].copy(parameters);
                    if (!parameters.copy_covered_nests) {
                        return top_content_copy;
                    }
                }
                copy = TT.nest.create(this.get_description(), [], "in a robot's condition", undefined, serial_number, this.get_name());
                if (top_content_copy) {
                    copy.add_to_contents(top_content_copy);
                }
                return copy;
            }
            contents_copy = TT.UTILITIES.copy_widget_sides(contents, parameters);
            if (!parameters) {
                copy = TT.nest.create(this.get_description(), contents_copy, guid, (original_nest || this), serial_number, this.get_name());
            } else if (parameters.fresh_copy) {
                // e.g. could be a resource that shouldn't be linked to its copy
                // don't give the copy a GUID if master doesn't have one (e.g. still has egg in nest)
                copy = TT.nest.create(this.get_description(), contents_copy, guid && TT.UTILITIES.generate_unique_id());
            } else {
                new_original_nest = (original_nest || this);
                if (parameters.birds_copied && parameters.birds_copied[guid]) {
                    new_original_nest_guid = new_original_nest.get_guid();
                    if (parameters.nests_copied && parameters.nests_copied[new_original_nest_guid]) {
                        // this nest has already been copied
                        // so make copies use this fresh copy as its original_nest
                        copy = parameters.nests_copied[new_original_nest_guid][0].copy();
                        parameters.nests_copied[new_original_nest_guid].forEach(function (nest_copy) {
                            update_nest.call(nest_copy, copy);
                        });                    
                    } else {
                        // create a fresh copy of the nest
                        copy = TT.nest.create(this.get_description(), contents_copy, TT.UTILITIES.generate_unique_id());
                    }
                    parameters.birds_copied[guid].forEach(function (bird) {
                        bird_set_nest.call(bird, copy);
                    });
                } else {
                    copy = TT.nest.create(this.get_description(), contents_copy, guid, new_original_nest, serial_number, this.get_name());
                }
                if (!parameters.nests_copied) {
                    parameters.nests_copied = {};
                }
                if (parameters.nests_copied[new_original_nest]) {
                    parameters.nests_copied[new_original_nest_guid].push(copy);  
                } else {
                    // first of this group of nest copies to be copied
                    parameters.nests_copied[new_original_nest_guid] = [copy];
                }
            }
            return this.add_to_copy(copy, parameters);
        };
        new_nest.has_contents = function () {
            return contents.length > 0;
        };
        new_nest.dropped_on_other = function (side_of_other, event, robot) {
            var bird, frontside_element, bird_frontside_element, nest_position, 
                hatching_finished_handler, fly_down_finished_handler, bird_fly_continuation;
            if (!guid) {
                guid = TT.UTILITIES.generate_unique_id();
                if (TT.debugging) {
                    this._debug_string = this.to_debug_string();
                }                
                // create bird now so robot knows about it
                bird = TT.bird.create(this);
                if (robot) {
                    robot.add_newly_created_widget(bird);
                    if (!this.visible()) {
                        return;
                    }
                    // since robot dropped the nest it needs to wait (if watched)
                    this.robot_waiting_before_next_step = robot;
//                     console.log("robot_waiting_before_next_step set for " + this + " in new_bird.dropped_on_other");
                }
                if (event && this.robot_in_training()) {
                    // robot did this so add bird to a newly created widgets of this.robot_in_training()
                    // robot should be undefined since it isn't a running robot
                    this.robot_in_training().add_newly_created_widget(bird);
                }
                if (TT.sounds) {               
                    setTimeout(function () {
                                   TT.sounds.hatching.play();
                               },
                               1000);
                }
                this.rerender();
                frontside_element = this.get_frontside_element(true);
                TT.UTILITIES.add_animation_class(frontside_element, "toontalk-hatch-egg");
                hatching_finished_handler = function () {
                    var backside_where_bird_goes, top_level_backside_element, top_level_backside_position, 
                        resting_left, resting_top, top_level_widget_side;
                    if (side_of_other.is_backside()) {
                        backside_where_bird_goes = side_of_other;
                    } else {
                        top_level_widget_side = TT.UTILITIES.widget_side_of_jquery($(frontside_element).closest(".toontalk-top-level-backside"));
                        if (!top_level_widget_side) {
                            top_level_widget_side = TT.UTILITIES.widget_side_of_jquery($(other.get_widget().get_frontside_element(true)).closest(".toontalk-top-level-backside"));     
                        }
                        if (top_level_widget_side) {
                            if (top_level_widget_side.is_backside()) {
                                backside_where_bird_goes = top_level_widget_side;
                            } else {
                                backside_where_bird_goes = top_level_widget_side.get_backside();
                            }
                        } else {
                            TT.UTILITIES.report_internal_error("Unable to find the top-level backside for bird to go to.");
                            return;
                        }
                    }
                    top_level_backside_element = backside_where_bird_goes.get_element();
                    top_level_backside_position = $(top_level_backside_element).offset();
                    bird_frontside_element = bird.get_frontside_element(true);
                    $(bird_frontside_element).removeClass("toontalk-bird-static " + this.get_class_name_with_color("toontalk-bird-static"));
                    TT.UTILITIES.add_animation_class(bird_frontside_element, "toontalk-fly-southwest");
                    nest_position = TT.UTILITIES.relative_position(frontside_element, top_level_backside_element);
                    TT.UTILITIES.set_css(bird_frontside_element,
                                         {left: nest_position.left,
                                          top:  nest_position.top});
                    if (event && this.robot_in_training()) {
                        // robot should not add steps for the hatching of the bird - hence true argument
                        backside_where_bird_goes.widget_side_dropped_on_me(bird, event, undefined, true);
                    } else {
                        backside_where_bird_goes.widget_side_dropped_on_me(bird, event);
                    }
                    $(frontside_element).removeClass("toontalk-hatch-egg")
                                        .addClass(this.get_class_name_with_color("toontalk-empty-nest"))
                                        // rely upon toontalk-empty-nest for dimensions (or other classes)
                                        // problem this addresses is nest otherwise is too tall since it needed that
                                        // height while bird was hatching
                                        .css({width:  '',
                                              height: ''});
                    if (this.get_parent_of_frontside() && this.get_parent_of_frontside().is_top_level()) {
                        // due to switch from animation of bird hatching in nest to static nest
                        // position needs adjusting
                        TT.UTILITIES.set_css(frontside_element,
                                             {left: nest_position.left-5,
                                              top:  nest_position.top+45});
                    }
                    this.get_parent_of_frontside().render();
                    bird_fly_continuation = function () {
                        $(bird_frontside_element).removeClass("toontalk-fly-southwest");
                        TT.UTILITIES.set_timeout(function () {
                                TT.UTILITIES.add_animation_class(bird_frontside_element, "toontalk-fly-down");
                                $(bird_frontside_element).removeClass("toontalk-bird-static " + this.get_class_name_with_color("toontalk-bird-static"));
                                fly_down_finished_handler = function () {
                                    var become_static = function () {
                                        $(bird_frontside_element)
                                            .removeClass("toontalk-bird-morph-to-static toontalk-side-animating")
                                            .addClass("toontalk-bird-static " + this.get_class_name_with_color("toontalk-bird-static"));
                                    }.bind(this);
                                    $(bird_frontside_element).removeClass("toontalk-fly-down");
                                    TT.UTILITIES.add_animation_class(bird_frontside_element, "toontalk-bird-morph-to-static");
                                    TT.UTILITIES.add_one_shot_event_handler(bird_frontside_element, "animationend", 1000, become_static);
                                    if (robot) {
//                                         console.log("reset robot_waiting_before_next_step for " + this);
//                                         if (this.robot_waiting_before_next_step) {
                                            this.robot_waiting_before_next_step = undefined;
//                                             console.log("bird run_next_step in fly_down_finished_handler");
//                                         }
                                        robot.run_next_step();
                                    }
                                    // following ensures it listens to drag over events to change CSS class
                                    // perhaps there is a better way
                                    bird.update_display();
                                }.bind(this);
                                TT.UTILITIES.add_one_shot_event_handler(frontside_element, "animationend", 1000, fly_down_finished_handler);
                            }.bind(this));
                    }.bind(this);
                    $(bird_frontside_element).removeClass("toontalk-bird-static " + this.get_class_name_with_color("toontalk-bird-static"));
                    resting_left = Math.max(10, nest_position.left-70);
                    // because of the animation the top of the nest is higher than it appears so add more to top target
                    resting_top = Math.max(10, nest_position.top+70);
                    bird.animate_to_absolute_position({left: resting_left+top_level_backside_position.left,
                                                       top:  resting_top +top_level_backside_position.top},
                                                      bird_fly_continuation,
                                                      robot && robot.transform_animation_speed(TT.UTILITIES.default_animation_speed));
                    this.rerender();
                }.bind(this);
                TT.UTILITIES.add_one_shot_event_handler(frontside_element, "animationend", 2000, hatching_finished_handler);
            }
            return true;
        };
        new_nest.widget_side_dropped_on_me = function (side_of_other, event, robot) {
            if (event && side_of_other.save_dimensions) {
                side_of_other.save_dimensions();
            }
            if (contents.length === 0) {
                this.add_to_contents(side_of_other, event, robot);
                if (side_of_other.dropped_on_other) {
                    // e.g. so egg can hatch from nest drop
                    side_of_other.dropped_on_other(this, event, robot);
                } else if (event && this.robot_in_training()) {
                    this.robot_in_training().dropped_on(side_of_other, this);
                }
            } else {
                side_of_other.drop_on(contents[0], event, robot)
            }
            return true;
        };
        new_nest.drop_on = function (side_of_other, event, robot) {
            if (side_of_other.widget_side_dropped_on_me) {
                side_of_other.widget_side_dropped_on_me(this, event, robot);
                return true;
            }
            return false;
        };
        new_nest.element_to_highlight = function () {
            if (contents.length === 0) {
                return this.get_frontside_element();
            }
            return contents[0].get_frontside_element();
        };
        new_nest.update_display = function () {
            var frontside = this.get_frontside(true);
            var backside = this.get_backside(); 
            var frontside_element, top_contents, nest_width, nest_height, top_contents_element;
            frontside_element = frontside.get_element();
            frontside_element.setAttribute('toontalk_name', this.get_name());
            if (contents.length > 0) {
                top_contents = contents[0];
                if (top_contents.is_backside()) {
                    top_contents_element = top_contents.get_element(true);
                    top_contents.update_display(); // TODO: see if render is OK
                    top_contents.scale_to_fit(top_contents_element, frontside_element);
                } else {
                    // if was running with document/window hidden then top contents may think they are not visible
                    top_contents.set_visible(true);
                    top_contents.render();
                    top_contents_element = contents[0].get_element(true);
                    $(top_contents_element).show();
                }
                nest_width  = $(frontside_element).width();
                nest_height = $(frontside_element).height();
                if (nest_width > 0 && nest_height > 0) {
                    // tried to have a CSS class toontalk-widget-on-nest that specified width and height as 80%
                    // but it didn't work well - especially in FireFox
                    // timeout needed when loading otherwise something resets the width and height
                    TT.UTILITIES.set_timeout(function () {
                            var contents_dimension = this.get_contents_dimensions();
                            if (!contents_dimension) {
                                return;
                            }
                            TT.UTILITIES.set_css(top_contents_element,
                                                 {width:  contents_dimension.width,
                                                  height: contents_dimension.height,
                                                  // following currently has no effect if element has a translation transform
                                                  left: nest_width*0.1,
                                                  top:  nest_height*0.1});
                            if (top_contents.set_size_attributes) {
                                // e.g. element widgets need to update their attributes
                                top_contents.set_size_attributes(contents_dimension.width, contents_dimension.height);
                            }
                        }.bind(this),
                        2); // TODO: see if 0 works here
                }
                frontside_element.appendChild(top_contents_element);
                $(frontside_element).addClass(this.get_class_name_with_color("toontalk-empty-nest"));
                if (contents[0].is_backside()) {
                    top_contents.set_parent_of_backside(this);
                } else {
                    top_contents.set_parent_of_frontside(this);
                }
            } else {
                TT.UTILITIES.give_tooltip(frontside_element, this.get_title());
                if (guid) {
                    $(frontside_element).removeClass(this.get_class_name_with_color("toontalk-nest-with-egg"));
                    $(frontside_element).addClass(this.get_class_name_with_color("toontalk-empty-nest"));
                } else {
                    TT.UTILITIES.add_animation_class(frontside_element, this.get_class_name_with_color("toontalk-nest-with-egg"));
                }
            }
            $(frontside_element).addClass("toontalk-nest");
            if (backside) {
                backside.rerender();
            }
        };
        if (!add_copy_private_key) {
            add_copy_private_key = TT.UTILITIES.generate_unique_id();
        }
        new_nest[add_copy_private_key] = function (nest_copy, remove_copy) {
            if (!nest_copies) {
                if (remove_copy) {
                    return; // nothing to do
                }
                nest_copies = [];
            }
            if (remove_copy) {
                nest_copies.splice(nest_copies.indexOf(nest_copy), 1);
            } else {
                nest_copies.push(nest_copy);
            }
        };
        new_nest.get_contents_dimensions = function () {
            var frontside_element = this.get_frontside_element();
            var nest_width = $(frontside_element).width();
            var nest_height = $(frontside_element).height();
            var width  = TT.nest.CONTENTS_WIDTH_FACTOR *nest_width;
            var height = TT.nest.CONTENTS_HEIGHT_FACTOR*nest_height;
            var top_contents_widget = contents[0];
            var border_factor, border_adjustment;
            if (!top_contents_widget) {
                return;
            }
            // logically border_adjustment should be twice the border_size since there are two borders
            // but once looks better for boxes
            // the underlying problem is that the border width depends upon the size which in turn depends upon the border-width
            // tried to use JQuery's outerWidth but it didn't help
            border_factor = top_contents_widget.is_box() ? 1 : 2;
            border_adjustment = top_contents_widget.get_border_size ? border_factor*top_contents_widget.get_border_size(width, height) : 0;
            width  -= border_adjustment;
            height -= border_adjustment;
            return {width:  width,
                    height: height};
        };
        new_nest.get_path_to = function (widget, robot) {
            var widget_on_nest;
            var path, sub_path;
            if (contents.length > 0) {
                widget_on_nest = contents[0].get_widget();
                if (widget_on_nest === widget) {
                    // should dereference the top of the nest
                    return TT.path.to_widget_on_nest();
                }
                if (widget_on_nest.get_path_to) {
                    // assuming frontside
                    path = TT.path.to_widget_on_nest();
                    sub_path = widget_on_nest.get_path_to(widget, robot);
                    if (sub_path) {
                        path.next = sub_path;
                        return path;
                    }
                }
            }
        };
        new_nest.walk_children = function (child_action) {
            // walk_children should be private to nests 
            // maybe use a token instead of the string "walk_children"
            if (contents.length > 0) {
                return child_action(contents[0]);
            };
        };
        new_nest.top_contents_is = function (other) {
            return contents.length > 0 && contents[0] === other;
        };
        new_nest.any_nest_copies_visible = function () {
            var found_one = false;
            if (!nest_copies) {
                return false;
            }
            nest_copies.some(function (nest) {
                if (nest.visible()) {
                    found_one = true;
                    return;
                }
            });
            return found_one;
        };
        new_nest.compare_with = function (other) {
            if (contents.length > 0) {
                return contents[0].compare_with(other);
            }
            if (other.compare_with_nest) {
                return -1*other.compare_with_nest(this);
            }
        };
        new_nest.compare_with_nest = function (other_nest) {
            if (contents.length === 0) {
                // both empty
                return 0;
            }
            return 1; // this is heavier than an empty nest
        };
        // TODO: determine if the following should be renamed
        new_nest.compare_with_number = function (other) {
            if (contents.length > 0) {
                return contents[0].compare_with(other);
            }
            return -1; // this is lighter
        };
        new_nest.get_class_name_with_color = function (base_class_name) {
            if (!serial_number) {
                return base_class_name;
            }
            return base_class_name + ["", "-magenta", "-yellow"][serial_number%3];
        };
        new_nest.generate_name = function () {
            name_counter++;
            return "#" + name_counter.toString();
        };
        new_nest.has_name(new_nest);
        generic_set_name = new_nest.set_name;
        new_nest.set_name = function (new_value, update_display) {
            var old_name = this.get_name();
            if (!generic_set_name.call(this, new_value, update_display)) {
                return false;
            }
            if (update_display) {
                // also re-render any birds
                $(".toontalk-bird").each(function () {
                    if (this.getAttribute('toontalk_name') === old_name) {
                        // if some happen to have the same name (e.g. are in different backsides)
                        // then just some time wasted re-rendering them
                        TT.UTILITIES.widget_side_of_element(this).rerender();
                    }
                });
            }
        };
        new_nest.set_name(name);
        new_nest.compare_with_box   = new_nest.compare_with_number;
        new_nest.compare_with_scale = new_nest.compare_with_number;
        new_nest.add_standard_widget_functionality(new_nest);
        generic_set_visible = new_nest.set_visible;
        new_nest.set_visible = function (new_value) {
            generic_set_visible.call(this, new_value);
            if (!new_value) {
                this.set_locked(false);
            }
        };
        new_nest.set_description(description);
        if (TT.debugging) {
            new_nest._debug_id = TT.UTILITIES.generate_unique_id();
            new_nest._debug_string = new_nest.to_debug_string();
        }
        if (original_nest && guid) {
            if (!add_copy_private_key) {
                add_copy_private_key = TT.UTILITIES.generate_unique_id();
            }
            original_nest[add_copy_private_key](new_nest);            
        }
        return new_nest;
    };

    nest.create_function = function (description, type_name, function_name) {
        var return_false = function () {
            return false;
        };
        var function_object = TT[type_name] && TT[type_name].function && TT[type_name].function[function_name];
        // message by convention is a box whose first widget should be a bird
        // and whose other widgets are arguments to the function
        var function_nest =
            {get_function_type: 
                function () {
                    return type_name;
                },
            get_function_object: 
                function () {
                    return function_object;
                },
            set_function_name:
                function (new_name) {
                    if (function_name === new_name) {
                        return false; // no change
                    }
                    function_name = new_name;
                    function_object = TT[type_name] && TT[type_name].function && TT[type_name].function[function_name];
                    this.add_to_contents = function_object.respond_to_message;
                    return true;
                },
            is_function_nest: 
                function () {
                    return true;
                },
            copy:
                function () {
                    return TT.nest.create_function(description, type_name, function_name);
                },
            animate_bird_delivery:
                function (message_side, bird, continuation, event, robot) {
                    bird.animate_delivery_to(message_side, this, undefined, undefined, undefined, continuation, event, robot);
                },
            get_json: 
                function (json_history, callback, start_time) {
                    callback({type: 'function_nest',
                              function_type: type_name,
                              // default to first function if none known -- shouldn't really happen but better than an error
                              function_name: function_object ? function_object.name : TT.UTILITIES.get_first_property(TT[type_name].function)},
                             start_time);
                },
            add_to_json: TT.widget.add_to_json,
            get_widget:
                function () {
                    return this;
                },
            get_guid: 
                function () {
                    // doesn't have a guid since function nests are stateless and can be shared
                    return;
                },
            get_name:
                function () {
                    return function_object.short_name;
                },
            // following needed for bird to just pass along the contents
            has_ancestor:            return_false,
            visible:                 return_false,
            any_nest_copies_visible: return_false,
            is_backside:             return_false};
        TT.widget.has_parent(function_nest);
        TT.widget.has_description(function_nest);
        TT.widget.add_sides_functionality(function_nest);
        function_nest.set_description(description);
        if (function_object) {
            // the following is run when the nest receives something
            // here it does what the particular function_object indicates
            function_nest.add_to_contents = function_object.respond_to_message;
            if (TT.debugging) {
                function_nest._debug_id = TT.UTILITIES.generate_unique_id();
                function_nest._debug_string = "a function nest that " + function_object.toString();
            }
        } else {
            TT.UTILITIES.report_internal_error("Cannot create a function nest because TOONTALK." + type_name + "." + function_name + " is not defined.");
        }
        return function_nest;
    };

        
    TT.creators_from_json["function_nest"] = function (json, additional_info) {
        return TT.nest.create_function(json.description, json.function_type, json.function_name);
    };
    
    nest.create_backside = function () {
        return TT.nest_backside.create(this);
    };

    nest.match_nest_with_nest = function (other_nest) {
        return "matched";
    };
    
    nest.toString = function () {
        return "a nest"; // good enough for now
    };

    nest.get_default_description = function () {
        return "a nest that receives things from its birds.";
    };

    nest.get_help_URL = function () {
        return "docs/manual/birds-nests.html";
    };
    
    nest.get_type_name = function  (plural) {
        if (plural) {
            return "nests";
        }
        return "nest";
    };

    nest.maintain_proportional_dimensions = function () {
        // should not be stretched in only one dimension
        return true;
    };
    
    nest.matching_resource = function (other) {
        // should only be one nest resource since nest identity is an issue
        return other.get_type_name && other.get_type_name() === this.get_type_name();
    };

    nest.get_custom_title_prefix = function () {
        return "Drop something on my bird and she'll take it here.";
    };
    
    TT.creators_from_json["nest"] = function (json, additional_info) {
        // don't share the nest if this is a copy
        var nest = !json.original_nest && json.guid && additional_info && additional_info.guid_to_nest_table && additional_info.guid_to_nest_table[json.guid];
        if (!nest) {
            nest = TT.nest.create(json.description, 
                                  TT.UTILITIES.create_array_from_json(json.contents, additional_info), 
                                  json.guid,
                                  json.original_nest && TT.UTILITIES.create_from_json(json.original_nest, additional_info),
                                  json.serial_number,
                                  json.name);
            additional_info.guid_to_nest_table[json.guid] = nest;                 
        }
        return nest;
    };

    nest.CONTENTS_WIDTH_FACTOR  = 0.8;
    nest.CONTENTS_HEIGHT_FACTOR = 0.8;
    
    return nest;
}(window.TOONTALK));

window.TOONTALK.nest_backside = 
(function (TT) {
    "use strict";
    return {
        create: function (nest) {
            var backside = TT.backside.create(nest);
            backside.add_description_setting();
            backside.add_name_setting();
            return backside;
        }
        
    };
}(window.TOONTALK));

// end context sharing between bird and nest code
}())
