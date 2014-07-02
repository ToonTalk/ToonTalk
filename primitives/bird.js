 /**
 * Implements ToonTalk's birds and nests
 * box.Authors = Ken Kahn
 * License: New BSD
 */
 
 /*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */

window.TOONTALK.bird = (function (TT) {
    "use strict";
    var bird = Object.create(TT.widget);
    
    bird.create = function (nest, description) { // image_url removed
        var new_bird = Object.create(bird);
//         if (!image_url) {
//             image_url = "images/GIMME3.PNG";
//         }
//         new_bird.get_image_url = function () {
//             return image_url;
//         };
//         new_bird.set_image_url = function (new_value, update_display) {
//             if (image_url === new_value) {
//                 return false;
//             }
//             image_url = new_value;
//             if (update_display) {
//                 this.rerender();
//             }
//             return true;
//         };
        new_bird.widget_dropped_on_me = function (other, other_is_backside, event, robot) {
            var package_side = {widget: other,
                                is_backside: other_is_backside};
            if (nest) {
                if (nest.visible && (event || (robot && robot.visible()))) {
                    nest.animate_bird_delivery(package_side, this);
                } else {
                    nest.add_to_contents(package_side, this);
                }
            } else {
                console.log("to do: handle drop on a nestless bird -- just removes other?");
            }
            if (TT.robot.in_training) {
                TT.robot.in_training.dropped_on(other, this);
            }
            return true;
        };
        new_bird.animate_delivery_to = function (package_side, target_side, temporary_copy) {
            var target_offset, bird_offset, bird_frontside_element, parent_element, bird_style_position, width, height,
                $top_level_backside_element, top_level_backside_element_offset, continuation;
            this.element_to_display_when_flying = TT.UTILITIES.get_side_element_from_side(package_side);
            $(this.element_to_display_when_flying).addClass("toontalk-carried-by-bird");
            $(this.element_to_display_when_flying).css({left: '',
                                                        top:  ''});
            target_offset = $(target_side.widget.get_frontside_element()).offset();
            bird_frontside_element = this.get_frontside_element(true);
            bird_offset = $(bird_frontside_element).offset();
            // save some state before clobbering it
            parent_element = bird_frontside_element.parentElement;
            width = $(bird_frontside_element).width();
            height = $(bird_frontside_element).height();
            $top_level_backside_element = $(".toontalk-top-level-backside");
            top_level_backside_element_offset = $top_level_backside_element.offset();
            bird_style_position = bird_frontside_element.style.position;
            bird_frontside_element.style.position = 'absolute';
            $top_level_backside_element.append(bird_frontside_element); // while flying            
            $(bird_frontside_element).css({left: bird_offset.left-top_level_backside_element_offset.left,
                                           top: bird_offset.top-top_level_backside_element_offset.top,
                                           width: width,
                                           height: height
                                           });
//             setTimeout(function () {
//                            $(this.element_to_display_when_flying).css({width: width,
//                                                                        height: height});            
//                         }.bind(this),
//                         100);
            if (temporary_copy) {
                continuation = function () {
                    nest.add_to_contents(package_side, this);
                    // fade away -- not working (at least in Chrome)
                    $(bird_frontside_element).css({opacity: 1});
                    $(bird_frontside_element).addClass("toontalk-side-animating");
//                     this.fly_to(bird_offset, function () {
//                                    this.remove();
//                                }.bind(this));
                    $(bird_frontside_element).css({opacity: 0.1});
                    setTimeout(function () {
                                   this.remove();
                               }.bind(this),
                               2000);
                }.bind(this);
            } else {
                continuation = function () {
                    var final_continuation = function () {
                        var parent = this.get_parent_of_frontside();
                        bird_frontside_element.style.position = bird_style_position;
                        parent_element.appendChild(bird_frontside_element);
                        if (parent.widget.get_type_name() === 'top-level') {
                            this.rerender();
                        } else {
                            parent.widget.rerender();
                        }
                    }.bind(this);
                    $(this.element_to_display_when_flying).removeClass("toontalk-carried-by-bird");
                    bird_frontside_element.removeChild(this.element_to_display_when_flying);
                    this.element_to_display_when_flying = undefined;
                    nest.add_to_contents(package_side, this);
                    // return to original location
                    setTimeout(function () {
                            this.fly_to(bird_offset, final_continuation); 
                        }.bind(this),
                        1);
                }.bind(this);
            }
            this.fly_to(target_offset, continuation);
        };
        new_bird.get_json = function (json_history) {
            return {type: "bird",
                    nest: nest && TT.UTILITIES.get_json(nest, json_history)
                   };
        };
        new_bird.copy = function (just_value) {
            // this may become more complex if the original ToonTalk behaviour
            // that if a bird and its nest are copied or saved as a unit they become a new pair
            // notice that bird/nest semantics is that the nest is shared not copied
            var copy = this.create(nest, this.get_description()); // image_url);
            return this.add_to_copy(copy, just_value);
        };
        new_bird.deliver_to = function (nest_copy, widget_side_copy) {
            nest_copy.add_to_contents(widget_side_copy);
        };
        new_bird = new_bird.add_standard_widget_functionality(new_bird);
        new_bird.set_description(description);
        if (TT.debugging) {
            new_bird.debug_id = TT.UTILITIES.generate_unique_id();
            if (nest) {
                new_bird.debug_string = "a bird with " + nest.debug_string;
            } else {
                new_bird.debug_string = "a bird without a nest";
            }
        }
        return new_bird;
    };
    
    bird.create_backside = function () {
        return TT.bird_backside.create(this);
    };
    
    bird.match = function (other) {
        // doesn't matter if erased
        // shouldn't be able to match to see if two birds are identical, right?
        if (other.match_with_any_bird) {
            return other.match_with_any_bird(this);
        }
        return "not matched";
    };
    
    bird.match_with_any_bird = function () {
        return "matched";
    };
    
    bird.update_display = function() {
        var frontside = this.get_frontside(true);
        var backside = this.get_backside(); 
        var bird_image, frontside_element;
        frontside_element = frontside.get_element();
//         bird_image = this.image();
        // if animating will display the element_to_display_when_flying
        // remove what's there currently before adding new elements
        while (frontside_element.firstChild) {
            frontside_element.removeChild(frontside_element.firstChild);
        }
        frontside_element.title = this.get_title();
        $(frontside_element).addClass("toontalk-bird");
        if (!($(frontside_element).is(".toontalk-side-animating"))) {
            TT.UTILITIES.add_animation_class(frontside_element, "toontalk-bird-waiting");
        }
        if (this.element_to_display_when_flying) {
            frontside_element.appendChild(this.element_to_display_when_flying);
        }
//      frontside_element.appendChild(bird_image);
        if (backside) {
            backside.rerender();
        }
    };
        
    bird.fly_to = function (target_offset, continuation) {
        // target_offset is page relative coordinates
        var frontside_element = this.get_frontside_element();
        var bird_offset = $(frontside_element).offset();
        var delta_x = target_offset.left-bird_offset.left;
        var delta_y = target_offset.top-bird_offset.top;
        var angle = Math.atan2(delta_y, delta_x); // in radians
        var region = Math.round((angle/Math.PI+1)*4) % 8;
        var direction = ["toontalk-fly-west","toontalk-fly-northwest","toontalk-fly-north", "toontalk-fly-northeast", 
                         "toontalk-fly-east","toontalk-fly-southeast","toontalk-fly-south","toontalk-fly-southwest"][region];
        var distance = Math.round(Math.sqrt(delta_x*delta_x+delta_y*delta_y));
        var bird_position = $(frontside_element).position();
        TT.UTILITIES.add_animation_class(frontside_element, direction);
        var full_continuation = function () {
            $(frontside_element).removeClass(direction);
            continuation();
        };
        // duration is proportional to distance
        this.animate_to_absolute_position(target_offset, full_continuation);
    };
    
//     bird.image = function () {
//         return TT.UTILITIES.create_image(this.get_image_url(), "toontalk-bird-image");   
//     };
    
    bird.toString = function () {
        return "a bird"; // good enough for now
    };
    
    bird.get_type_name = function () {
        return "bird";
    };
    
    bird.create_from_json = function (json, additional_info) {
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
            var backside_element = backside.get_element();
//          var image_url_input = TT.UTILITIES.create_text_input(bird.get_image_url(), "toontalk-image-url-input", "Image URL&nbsp;", "Type here to provide a URL for the appearance of this bird.");
            var standard_buttons = TT.backside.create_standard_buttons(backside, bird);
//             var infinite_stack_check_box = TT.backside.create_infinite_stack_check_box(backside, bird);
//             var image_url_change = function () {
//                 var image_url = image_url_input.button.value.trim();
//                 if (bird.set_image_url(image_url, true) && TT.robot.in_training) {
//                     // if changed and by a robot then record it
//                     TT.robot.in_training.edited(bird, {setter_name: "set_image_url",
//                                                        argument_1: image_url,
//                                                        toString: "change the image URL to " + image_url + " of the bird",
//                                                        button_selector: ".toontalk-run-once-check-box"});
//                 }
//             };
//             var input_table;
//             image_url_input.button.addEventListener('change', image_url_change);
//             image_url_input.button.addEventListener('mouseout', image_url_change);
//             input_table = TT.UTILITIES.create_vertical_table(description_text_area.container); // image_url_input.container
//             $(input_table).css({width: "90%"});
//             backside_element.appendChild(input_table);
            backside_element.appendChild(standard_buttons);
//             backside_element.appendChild(infinite_stack_check_box.container);
            backside.update_display = function () {
                var frontside_element = bird.get_frontside_element();
                var $containing_backside_element;
//                 $(description_text_area.button).val(bird.get_description());
//                 $(image_url_input.button).val(bird.get_image_url());
                if (frontside_element) {
                    frontside_element.title = bird.get_title();
                    $containing_backside_element = $(frontside_element).closest(".toontalk-backside");
                    if ($containing_backside_element.length > 0) {
                        $containing_backside_element.data("owner").get_backside().update_run_button_disabled_attribute();
                    }                    
                }
                backside.update_run_button_disabled_attribute();
                this.display_updated();
            };
            return backside;
        }
        
    };
}(window.TOONTALK));

window.TOONTALK.nest = (function (TT) {
    "use strict";
    var nest = Object.create(TT.widget);
    // following enables nests to invoke private methods of other nests
    var add_copy_private_key = {}; // any unique object is fine
    
    nest.create = function (description, contents, waiting_robots, guid, original_nest) { // removed image_url
        var new_nest = Object.create(nest);
        var nest_copies;
        if (!contents) {
            contents = [];
        }
        if (!waiting_robots) {
            waiting_robots = [];
        }
//         if (!image_url) {
//             image_url = "images/HATCH01.PNG";
//         }
//         new_nest.get_image_url = function () {
//             return image_url;
//         };
//         new_nest.set_image_url = function (new_value, update_display) {
//             if (image_url === new_value) {
//                 return false;
//             }
//             image_url = new_value;
//             if (update_display) {
//                 this.rerender();
//             }
//             return true;
//         };
        new_nest.matched_by = function (other) {
            if (contents.length > 0) {
                return TT.UTILITIES.match(other, contents[0].widget);
            } else {
                // suspend on this nest
                return [this];
            }
        };
        new_nest.run_when_non_empty = function (robot_run) {
            waiting_robots.push(robot_run);
        };
        new_nest.add_to_contents = function (widget_side, delivery_bird) {
            var current_waiting_robots, widget_side_copy;
            if (contents.push(widget_side) === 1) {
                if (waiting_robots.length > 0) {
                    // is the first content and some robots are waiting for this nest to be filled
                    // running these robots may cause new waiting robots so set waiting_robots to [] first
                    current_waiting_robots = waiting_robots;
                    waiting_robots = [];
                    current_waiting_robots.forEach(function (robot_run) {
                        robot_run.robot.run(robot_run.context, robot_run.top_level_context, robot_run.queue);
                    });
                }
            } else {
                // is under the top widget
                widget_side.widget.hide();
            }
            if (widget_side.is_backside) {
                widget_side.widget.set_parent_of_backside(this);
            } else {
                widget_side.widget.set_parent_of_frontside(this);
            }
            if (delivery_bird && nest_copies) {
                nest_copies.forEach(function (nest_copy) {
                    widget_side_copy = {widget: widget_side.widget.copy(),
                                        is_backside: widget_side.is_backside};
                    delivery_bird.deliver_to(nest_copy, widget_side_copy);
                });
            }
            this.rerender();
        };
        new_nest.animate_bird_delivery = function (package_side, bird) {
            var start_position, bird_parent_element;
            bird.animate_delivery_to(package_side, {widget: this});
            if (nest_copies) {
                start_position = $(bird.get_frontside_element()).position();
                bird_parent_element = TT.UTILITIES.get_side_element_from_side(bird.get_parent_of_frontside());
                nest_copies.forEach(function (nest_copy) {
                    var bird_copy = bird.copy(true);
                    var bird_frontside_element = bird_copy.get_frontside_element(true); 
                    $(bird_parent_element).append(bird_frontside_element);
                    $(bird_frontside_element).css({left: start_position.left,
                                                   top:  start_position.top});
                    bird_copy.animate_delivery_to(TT.UTILITIES.copy_side(package_side), {widget: nest_copy}, true);
                });
            }
        };
        new_nest.removed_from_container = function (part, backside_removed, event) {
            var removed = contents.splice(0,1);
            if (this.visible()) {
                $(TT.UTILITIES.get_side_element_from_side(removed[0])).css({width:  removed[0].saved_width,
                                                                            height: removed[0].saved_height});
                if (contents.length > 0) {
                    $(TT.UTILITIES.get_side_element_from_side(contents[0])).show();
                }
                this.render();
            }
        };
        // defined here so that contents and other state can be private
        new_nest.get_json = function (json_history) {
            var waiting_robots_json = 
                waiting_robots && waiting_robots.map(function (robot_run) {
                    // no point jsonifying the queue since for the seeable future this only one queue
                    return {robot: TT.UTILITIES.get_json(robot_run.robot, json_history),
                            context: context && TT.UTILITIES.get_json(robot_run.context, json_history),
                            top_level_context: top_level_context && TT.UTILITIES.get_json(robot_run.top_level_context, json_history)};
            });
            return {type: "nest",
                    contents: TT.UTILITIES.get_json_of_array(contents, json_history),
                    guid: guid,
                    original_nest: original_nest && TT.UTILITIES.get_json(original_nest, json_history),
                    waiting_robots: waiting_robots_json
                    // nest_copies are generated as those nests are created
//                  nest_copies: nest_copies && TT.UTILITIES.get_json_of_array(nest_copies, json_history)
                   };
        };
        new_nest.copy = function (just_value) {
            // this may become more complex if the original ToonTalk behaviour
            // that if a bird and its nest are copied or saved as a unit they become a new pair
            // notice that bird/nest semantics is that the nest is shared not copied
            var contents_copy, copy;
            if (just_value && contents.length > 0) {
                return contents[0].widget.copy(just_value);
            }
            contents_copy = TT.UTILITIES.copy_array(contents);
            copy = TT.nest.create(this.get_description(), contents_copy, [], guid, original_nest || this); // image_url removed
            return this.add_to_copy(copy, just_value);
        };
        new_nest.dropped_on_other = function (other, other_is_backside, event) {
            var bird, frontside_element, bird_frontside_element, nest_position, 
                hatching_finished_handler, fly_down_finished_handler, bird_fly_continuation;
            if (!guid) {
                guid = TT.UTILITIES.generate_unique_id();
//                 image_url = "images/MKNEST25.PNG";
                if (TT.debugging) {
                    new_nest.debug_string = "A nest with id " + guid;
                }
                this.rerender();
                frontside_element = this.get_frontside_element(true);
                TT.UTILITIES.add_animation_class(frontside_element, "toontalk-hatch-egg");
                hatching_finished_handler = function () {
                    var backside_where_bird_goes, resting_left, resting_top;
                    if (other_is_backside) {
                        backside_where_bird_goes = other.get_backside();
                    } else {
                        // really should find closest ancestor that is a backside 
                        // but that requires Issue 76
                        backside_where_bird_goes = $(".toontalk-top-level-backside").data("owner").get_backside();
                    }
                    bird = TT.bird.create(this);
                    bird_frontside_element = bird.get_frontside_element(true);
                    TT.UTILITIES.add_animation_class(bird_frontside_element, "toontalk-fly-southwest");
                    nest_position = TT.UTILITIES.relative_position(frontside_element, backside_where_bird_goes.get_element());
                    $(bird_frontside_element).css({left: nest_position.left,
                                                   top:  nest_position.top});
                    backside_where_bird_goes.widget_dropped_on_me(bird, false, event);
                    $(frontside_element).removeClass("toontalk-hatch-egg");
                    TT.UTILITIES.add_animation_class(frontside_element, "toontalk-empty-nest");
                    bird_fly_continuation = function () {
                        $(bird_frontside_element).removeClass("toontalk-fly-southwest");
                        setTimeout(function () {
                                TT.UTILITIES.add_animation_class(bird_frontside_element, "toontalk-fly-down");
                                fly_down_finished_handler = function () {
//                                     $(bird_frontside_element).css({width:  $(bird_frontside_element).width(),
//                                                                   height: $(bird_frontside_element).height()});
                                    $(bird_frontside_element).removeClass("toontalk-fly-down");
                                    $(bird_frontside_element).removeClass("toontalk-side-animating");
                                    // could morph to bricks
                                    bird_frontside_element.style.transitionDuration = "0s";
                                    TT.UTILITIES.add_animation_class(bird_frontside_element, "toontalk-bird-waiting");
                                }
                                TT.UTILITIES.add_one_shot_event_handler(frontside_element, "animationend", 1000, fly_down_finished_handler);
                            },
                            1);
                    };
                    resting_left = Math.max(10, nest_position.left-100);
                    // because of the animation the top of the nest is higer than it appears so add more to top target
                    resting_top = Math.max(10, nest_position.top+300); 
                    bird.animate_to_absolute_position({left: resting_left,
                                                       top: resting_top},
                                                      bird_fly_continuation);
                    this.rerender();
                }.bind(this);
                TT.UTILITIES.add_one_shot_event_handler(frontside_element, "animationend", 2000, hatching_finished_handler);
            }
        };
        new_nest.widget_dropped_on_me = function (other, other_is_backside, event, robot) {
            if (contents.length === 0) {
                this.add_to_contents({widget: other,
                                      is_backside: other_is_backside});
            } else {
                contents[0].widget.widget_dropped_on_me(other, other_is_backside, event, robot);
            }
        };
        new_nest.update_display = function() {
            var frontside = this.get_frontside(true);
            var backside = this.get_backside(); 
            var frontside_element, contents_backside, contents_side_element;
            frontside_element = frontside.get_element();
            // if animating should also display thing_in_hand
            // remove what's there currently before adding new elements
            while (frontside_element.firstChild) {
                frontside_element.removeChild(frontside_element.firstChild);
            }
            if (contents.length > 0) {
                if (contents[0].is_backside) {
                    contents_backside = contents[0].widget.get_backside(true);
                    contents_side_element = contents_backside.get_element();
                    contents_backside.update_display();
                    contents_backside.scale_to_fit(contents_side_element, frontside_element);
                } else {
                    contents[0].widget.render();
                    contents_side_element = contents[0].widget.get_frontside_element();
                }
                contents[0].saved_width =  $(contents_side_element).width();
                contents[0].saved_height = $(contents_side_element).height();
                $(contents_side_element).css({width:  '',
                                              height: '',
                                              left: '',
                                              top: ''});
                $(contents_side_element).addClass("toontalk-widget-on-nest");
//                 contents_side_element.style.position = "static";
                frontside_element.appendChild(contents_side_element);
            } else {
                frontside_element.title = this.get_title();
                if (guid) {
                    TT.UTILITIES.add_animation_class(frontside_element, "toontalk-empty-nest");
                    $(frontside_element).removeClass("toontalk-nest-with-egg");
                } else {
                    TT.UTILITIES.add_animation_class(frontside_element, "toontalk-nest-with-egg");
                }
            }
            $(frontside_element).addClass("toontalk-nest");
            if (backside) {
                backside.rerender();
            }
        };
        new_nest[add_copy_private_key] = function (nest_copy) {
            if (!nest_copies) {
                nest_copies = [];
            }
            nest_copies.push(nest_copy);
        };
        new_nest.get_path_to = function (widget, robot) {
            var sub_path;
            if (contents.length > 0) {
                if (contents[0].widget === widget) {
                    return true; // if in box will treat this properly -- what is the general case?
                }
                // assuming frontside -- following not fully supported yet so leave for later
//                 sub_path = contents[0].widget.get_path_to(widget, robot);
//                 if (sub_path) {
//                     // for now assume that contents[0] isn't itself a container (e.g. box)
//                     // and something inside was referenced
//                     return sub_path;
//                 }
            }
        };
        new_nest = new_nest.add_standard_widget_functionality(new_nest);
        new_nest.set_description(description);
        if (TT.debugging) {
            new_nest.debug_id = TT.UTILITIES.generate_unique_id();
            if (guid) {
                new_nest.debug_string = "A nest with id " + guid;
            } else {
                new_nest.debug_string = "A nest with an egg";
            }
        }
        if (original_nest && guid) {
            original_nest[add_copy_private_key](new_nest);            
        }
        return new_nest;
    };
    
    nest.create_backside = function () {
        return TT.nest_backside.create(this);
    };
    
    nest.match = function (other) {
        // not allowed since is not stable -- could be covered asynchronously
        return "not matched";
    };
    
//     nest.image = function () {
//         return TT.UTILITIES.create_image(this.get_image_url(), "toontalk-nest-image");    
//     };
    
    nest.toString = function () {
        return "a nest"; // good enough for now
    };
    
    nest.get_type_name = function () {
        return "nest";
    };
    
    nest.create_from_json = function (json, additional_info) {
        var waiting_robots; // to do
        return TT.nest.create(json.description, 
                              TT.UTILITIES.create_array_from_json(json.contents, additional_info), 
                              waiting_robots, 
                              json.guid,
                              json.original_nest && TT.UTILITIES.create_from_json(json.original_nest, additional_info));
    };
    
    return nest;
}(window.TOONTALK));

window.TOONTALK.nest_backside = 
(function (TT) {
    "use strict";
    return {
        create: function (nest) {
            var backside = TT.backside.create(nest);
            var backside_element = backside.get_element();
//             var image_url_input = TT.UTILITIES.create_text_input(nest.get_image_url(), "toontalk-image-url-input", "Image URL&nbsp;", "Type here to provide a URL for the appearance of this nest.");
            var standard_buttons = TT.backside.create_standard_buttons(backside, nest);
//             var infinite_stack_check_box = TT.backside.create_infinite_stack_check_box(backside, nest);
//             var image_url_change = function () {
//                 var image_url = image_url_input.button.value.trim();
//                 if (nest.set_image_url(image_url, true) && TT.robot.in_training) {
//                     // if changed and by a robot then record it
//                     TT.robot.in_training.edited(nest, {setter_name: "set_image_url",
//                                                        argument_1: image_url,
//                                                        toString: "change the image URL to " + image_url + " of the nest",
//                                                        button_selector: ".toontalk-run-once-check-box"});
//                 }
//             };
//             image_url_input.button.addEventListener('change', image_url_change);
//             image_url_input.button.addEventListener('mouseout', image_url_change);
//             backside_element.appendChild(input_table);
            backside_element.appendChild(standard_buttons);
//             backside_element.appendChild(infinite_stack_check_box.container);
            backside.update_display = function () {
                var frontside_element = nest.get_frontside_element();
                var $containing_backside_element;
//                 $(image_url_input.button).val(nest.get_image_url());
                if (frontside_element) {
                    frontside_element.title = nest.get_title();
                    $containing_backside_element = $(frontside_element).closest(".toontalk-backside");
                    if ($containing_backside_element.length > 0) {
                        $containing_backside_element.data("owner").get_backside().update_run_button_disabled_attribute();
                    }                    
                }
                backside.update_run_button_disabled_attribute();
                this.display_updated();
            };
            return backside;
        }
        
    };
}(window.TOONTALK));
