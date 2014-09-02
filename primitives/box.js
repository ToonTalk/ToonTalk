 /**
 * Implements ToonTalk's boxes
 * Authors: Ken Kahn
 * License: New BSD
 */

/*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */

window.TOONTALK.box = (function (TT) {
    "use strict";

    var box = Object.create(TT.widget);

    box.create = function (size, horizontal, initial_contents, description) {
        var new_box = Object.create(box);
        var holes = [];
        var i;
        if (typeof horizontal === 'undefined') {
            // default is horizontal
            horizontal = true;
        }
        new_box.get_horizontal = function () {
            return horizontal;
        };
        new_box.set_horizontal = function (new_horizontal, update_display) {
            horizontal = new_horizontal;
            if (update_display) {
                this.rerender();
            }
            return this;
        };
        new_box.get_hole = function (index) {
            return holes[index];
        };
        new_box.get_hole_contents = function (index) {
            return holes[index].get_contents();
        };
        new_box.set_hole = function (index, new_value, update_display) {
            holes[index].set_contents(new_value);
            if (update_display) {
                this.update_hole_display(index, new_value);
            }
            this.rerender();
            if (TT.debugging) {
                this.debug_string = this.toString();
            }
        };
        new_box.get_holes = function () {
            return holes;
        };
        new_box.temporarily_remove_contents = function (widget, update_display) {
            // e.g. when a bird flies off to deliver something and will return
            var index = this.get_index_of(widget);
            if (index < 0) {
                console.log("Unable to find " + widget + " in " + this);
                return;
            }
            this.empty_hole(index, update_display);
            // returns a function to restore the contents
            return function () {
                this.set_hole(index, widget, update_display); 
            }.bind(this);
        }
        new_box.set_contents = function (new_contents) {
            new_contents.forEach(function (value, index) {
                holes[index].set_contents(value);
            });
        };
        new_box.get_size = function () {
            return size;
        };
        new_box.set_size = function (new_size, update_display) {
            var i;
            if (size === new_size) {
                return false;
            }
            holes.length = new_size;
            if (new_size > size) {
                for (i = size; i < new_size; i++) {
                    holes[i] = TT.box_empty_hole.create(i);
                    holes[i].set_parent_of_frontside(new_box);
                }
            }
            size = new_size;
            if (update_display) {
                this.rerender();
            }
            if (TT.debugging) {
                this.debug_string = this.toString();
            }
            return true;
        };
        new_box.copy = function (just_value) {
            var holes_copied = holes.map(function (hole) {
                var content = hole.get_contents();
                if (content)
                    return content.copy(just_value);
                }
            );
            var copy = box.create(size, horizontal, holes_copied, this.get_description());
            return this.add_to_copy(copy, just_value);
        };
        new_box = new_box.add_standard_widget_functionality(new_box);
        for (i = 0; i < size; i++) {
            holes[i] = TT.box_empty_hole.create(i);
            holes[i].set_parent_of_frontside(new_box);
        }
        new_box.set_description(description);
        new_box.set_contents(initial_contents);
        if (TT.debugging) {
            new_box.debug_string = new_box.toString();
            new_box.debug_id = TT.UTILITIES.generate_unique_id();
        }
        return new_box;
    };
    
    box.create_backside = function () {
        return TT.box_backside.create(this).update_run_button_disabled_attribute();
    };
    
    box.equals = function (other) {
        return other.equals_box(this);
    };
    
    box.equals_box = function (other_box) {
        // what should this do if either or both are erased?
        var size = this.get_size();
        var i, my_hole, pattern_hole;
        if (size !== other_box.get_size()) {
            return false;
        }
        for (i = 0; i < size; i++) {
            my_hole = this.get_hole_contents(i);
            pattern_hole = other_box.get_hole_contents(i);
            if ((!my_hole && pattern_hole) || (my_hole && !pattern_hole)) {
                return false;
            }
            if (my_hole && pattern_hole && !(my_hole.equals && my_hole.equals(pattern_hole))) {
                return false;
            }
        }
        return true;
    };
    
    box.match = function (context) {
        if (this.get_erased && this.get_erased()) {
            if (context.match_with_any_box) {
                return context.match_with_any_box();
            }
            return 'not matched';
        }
        if (!context.match_with_this_box) {
            return 'not matched';
        }
        return context.match_with_this_box(this);
    };
    
    box.match_with_any_box = function () {
        return 'matched';
    };

    box.match_with_this_box = function (pattern_box) {
        var size = this.get_size();
        var waiting_nests = [];
        var i, my_hole, pattern_hole, hole_match;
        if (size !== pattern_box.get_size()) {
            return 'not matched';
        }
        for (i = 0; i < size; i++) {
            pattern_hole = pattern_box.get_hole_contents(i);
            if (pattern_hole) {
                my_hole = this.get_hole_contents(i);
                if (!my_hole) {
                    // expected something -- not an empty hole
                    return 'not matched';
                }
                hole_match = TT.UTILITIES.match(pattern_hole, my_hole);
                if (hole_match === 'not matched') {
                    return 'not matched';
                }
                if (hole_match !== 'matched') {
                    // suspended on a nest so combine the suspended nests
                    if (waiting_nests.length === 0) {
                        waiting_nests = hole_match;
                    } else {
                        waiting_nests = waiting_nests.concat(hole_match);
                    }
                }
            }
        }
        if (waiting_nests.length > 0) {
            return waiting_nests;
        }
        return 'matched';
    };
    
    box.toString = function () {
        var contents = "";
        var size = this.get_size();
        var i, hole;
        var extra_text = "box that looks like ";
        for (i = 0; i < size; i++) {
            hole = this.get_hole(i);
            contents += hole.get_full_description();
            if (i < size - 1) {
                contents += " | ";
            }
        }
        // only want the extra_text on the topmost level
        return extra_text + "[" + contents.replace(extra_text, "") + ']';
    };
    
    box.get_type_name = function () {
        return "box";
    };

    box.get_json = function (json_history) {
        var contents_json = [];
        var size = this.get_size();
        var i;
        for (i = 0; i < size; i++) {
            if (this.get_hole_contents(i)) {
                contents_json[i] = TT.UTILITIES.get_json(this.get_hole_contents(i), json_history);
            } else {
                contents_json[i] = null;
            }
        }
        return {type: "box",
                size: size,
                contents: contents_json,
                horizontal: this.get_horizontal()
               };
    };
    
    box.create_from_json = function (json, additional_info) {
        return box.create(json.size, json.horizontal, TT.UTILITIES.create_array_from_json(json.contents, additional_info), json.description);
    };
    
    box.update_display = function () {
        var frontside = this.get_frontside(true);
        var frontside_element = frontside.get_element();
        var size = this.get_size();
        var update_hole = function (hole_element, hole, index) {
            var content_frontside_element = hole.get_frontside_element(true);
            var left, top, content_frontside_element;
            if (horizontal) {
                left = hole_width*index;
                if (index > 1) {
                    left += border_size*(index-1);
                }
                top = 0;
            } else {
                left = 0;
                top = hole_height*index;
            }
            $(hole_element).css({left:   left,
                                 top:    top,
                                 width:  hole_width,
                                 height: hole_height});
            if (hole_element !== content_frontside_element) {
                // not an empty hole
                // save dimensions first?
                $(content_frontside_element)//.addClass("toontalk-frontside-in-box")
                                            .css({left: 0, // index === 0 ? 0 : border_size,
                                                  top:  0,
                                                  width: '',
                                                  height: ''});
                hole_element.appendChild(content_frontside_element);
            }                                          
            if (!TT.UTILITIES.has_animating_image(content_frontside_element)) {
                // explicit size interferes with animation
                if (index > 0) {
                    // first hole doesn't need a divider
                    $(hole_element).removeClass("toontalk-box-eighth-size-border-left toontalk-box-quarter-size-border-left toontalk-box-half-size-border-left toontalk-box-full-size-border-left");
                    $(hole_element).addClass(border_class + "-left");
                }
                hole_element.toontalk_border_size = border_size;
//                 setTimeout(function () {
//                         var border;
//                         if (hole_element.childElementCount > 0) {
//                             border = hole_element.toontalk_border_size+hole_element.toontalk_border_size;
//                             $(hole_element).css({width:  hole_width-border,
//                                                  height: hole_height-border});
// //                         } else {
// //                             // empty hole -- fill with darker pegs
// //                             $(hole_frontside_element).css({width:  '100%',
// //                                                            height: '100%'});                          
//                         }         
//                     },
//                     1);
            }
            // following ensures that there is frontside_element of the hole
//             hole.render();
        };
        var horizontal = this.get_horizontal();
        var additional_class = horizontal ? "toontalk-box-hole-horizontal" : "toontalk-box-hole-vertical";
        var wrong_class = horizontal ? "toontalk-box-hole-vertical" : "toontalk-box-hole-horizontal";
        var first_time = !$(frontside_element).is(".toontalk-box");
        var i, hole, hole_element, box_left, box_width, hole_width, first_hole_width, box_height, hole_height, content_frontside_element, renderer, border_class, border_size;
        $(frontside_element).addClass("toontalk-box");
        box_width = $(frontside_element).width();
        box_height = $(frontside_element).height();
        if (horizontal) {
            hole_width = box_width/size;
            hole_height = box_height;
        } else {
            hole_width = box_width;
            hole_height = box_height/size;            
        }
        if (hole_width <= 32 || hole_height <= 32) {
            border_class = "toontalk-box-eighth-size-border";
            border_size = 4;
        } else if (hole_width <= 64 || hole_height <= 64) {
            border_class = "toontalk-box-quarter-size-border";
            border_size = 8;
        } else if (hole_width <= 128 || hole_height <= 128) {
            border_class = "toontalk-box-half-size-border";
            border_size = 16;
        } else {
            border_class = "toontalk-box-full-size-border";
            border_size = 32;
        }
        // recompute hole dimensions taking into account border width
        if (horizontal) {
            hole_width = (box_width-(size-1)*border_size)/size;
        } else {
            // TODO:             
        }
        $(frontside_element).removeClass("toontalk-box-eighth-size-border toontalk-box-quarter-size-border toontalk-box-half-size-border toontalk-box-full-size-border");
        $(frontside_element).addClass(border_class);
        frontside_element.toontalk_border_size = border_size;
        renderer = 
            function () {
                var $box_hole_elements = $(frontside_element).children("." + additional_class);
                // if switching between horizontal and vertical need to remove the old elements
                $(frontside_element).children("." + wrong_class).remove();
                if ($box_hole_elements.length === size) {
                    $box_hole_elements.each(function (index, hole_element) {
                        update_hole(hole_element, this.get_hole(index), index);
                    }.bind(this));
                } else {
                    // has wrong number of holes so rebuild it
                    $box_hole_elements.remove();
                    this.get_holes().forEach(function (hole, index) {
                        hole_element = hole.get_element();
                        $(hole_element).addClass("toontalk-box-hole toontalk-hole-number-" + index + " " + additional_class);
                        update_hole(hole_element, hole, index);
                        frontside_element.appendChild(hole_element);                       
                    });
                };
                $box_hole_elements = $(frontside_element).children("." + additional_class);
            }.bind(this);
        if (first_time) {
            // do it now to create the elements
            renderer();
        }
        // delay it until browser has rendered current elements
        setTimeout(renderer, 1);
        frontside_element.title = this.get_title();
        if (TT.debugging) {
            this.debug_string = this.toString();
        }
    };
    
    box.update_hole_display = function (index, new_content) {
        var frontside_element = this.get_frontside_element();
        var $hole_element = $(frontside_element).children(".toontalk-hole-number-" + index);
        var content_frontside_element = new_content.get_frontside_element(true);
        new_content.saved_width =  $(content_frontside_element).width();
        new_content.saved_height = $(content_frontside_element).height();
        $hole_element.empty();
        $hole_element.append(content_frontside_element);
        $(content_frontside_element).css({left: 0,
                                          top:  0});
//         $(content_frontside_element).addClass("toontalk-frontside-in-box");
        new_content.rerender();
    };
    
    box.empty_hole = function (index, update_display) {
        holes[index].set_contents(undefined);
        if (update_display) {
            this.render();
        }
    };
    
    box.drop_on = function (other, is_backside, event) {
        var result;
        if (!other.box_dropped_on_me) {
            if (other.widget_dropped_on_me) {
                return other.widget_dropped_on_me(this, is_backside, event);
            }
            console.log("No handler for drop of " + this.toString() + " on " + other.toString());
            return;
        }
        result = other.box_dropped_on_me(this, event);
        if (event) {
            other.rerender();
        }
        this.remove();
        return result;
    };
    
    box.box_dropped_on_me = function (other, event) {
        console.log("box on box not yet implemented");
        return false;
    };
    
    box.get_index_of = function (part) {
        part.get_parent_of_frontside().widget.get_index();
//         var size = this.get_size();
//         var hole, i;
//         // if this becomes a performance problem could use a map between parts and indices...
//         for (i = 0; i < size; i++) {
//             hole = this.get_hole(i);
//             if (part === hole) {
//                 return i;
//             }
//         }
//         return -1;
    };
    
    box.removed_from_container = function (part, backside_removed, event) {
        var update_display = !!event;
        var index = this.get_index_of(part);
        var hole;
        var part_frontside_element;
        if (index >= 0) {
            this.empty_hole(index, update_display);
            if (update_display) {
                this.rerender();
                part_frontside_element = part.get_frontside_element();
                if (part.saved_width) {
                    // without this timeout the resizing doesn't apply
                    // not sure why
                    setTimeout(function () {
                        $(part_frontside_element).css({width:  part.saved_width,
                                                       height: part.saved_height});
                        part.saved_width =  undefined;
                        part.saved_height = undefined;
                        part.rerender();
                    },
                    10);
                }
            }
        } else {
            console.log("Attempted to remove " + part + " from " + this + " but not found.");
        }
    };
    
    box.get_path_to = function (widget, robot) {
        var size = this.get_size();
        var i, part, path, sub_path;
        for (i = 0; i < size; i++) {
            part = this.get_hole_contents(i);
            if (widget === part || (part.top_contents_is && part.top_contents_is(widget))) {
                return TT.box.path.create(i);
            } else if (part.get_path_to) {
                sub_path = part.get_path_to(widget, robot);
                if (sub_path) {
                    path = TT.box.path.create(i);
//                     if (part.get_type_name() !== 'nest' && part.get_type_name() !== 'sensor') {
                        // if nest then widget must have been on the nest (or inside something that was -- not yet handled!)
                        path.next = sub_path;
//                     }
                    return path;
                }
            }
        }
    };
    
    box.dereference = function (path, top_level_context, robot) {
        var index, hole;
        if (path) {
            index = path.get_index && path.get_index();
            if (typeof index === 'number') {
                hole = this.get_hole_contents(index);
                if (hole) {
                    if (hole.dereference_contents && !path.not_to_be_dereferenced) {
                        // this will dereference the top of a nest instead of the nest itself
                        return hole.dereference_contents(path, top_level_context, robot);
                    }
                    if (path.next) {
                        if (hole.dereference) {
                            return hole.dereference(path.next, top_level_context, robot);
                        } else {
                            console.log("Expected to refer to a part of " + hole + " but it lacks a method to obtain " + TT.path.toString(path.next));
                        }
                    }
                    if (path.removing_widget) {
                        if (hole.get_type_name() === 'empty hole') {
                            console.log("Robot is trying to remove something from an empty hole. ");
                        } else if (!hole.get_infinite_stack()) {
                            robot.remove_from_container(hole, this);
                        }
                    }
                    return hole;
                }
            }
            console.log("box " + this.toString() + " unable to dereference path " + TT.path.toString(path));
        } else {
            return this;
        }
    };
    
    box.path = {
        create: function (index) {
            return {
                get_index: function () {
                    return index;
                },
                toString: function () {
                    return "the " + TT.UTILITIES.cardinal(index) + " hole "; // + (this.next ? "; " + TT.path.toString(this.next) : "");
                },
                get_json: function (json_history) {
                    return {type: "box_path",
                            index: index,
                            next: this.next && this.next.get_json(json_history)};
                }
            };
        },
    
        create_from_json: function (json, additional_info) {
            var path = box.path.create(json.index);
            if (json.next) {
                path.next = TT.UTILITIES.create_from_json(json.next, additional_info);
            }
            return path;
        }
    };
    return box;
}(window.TOONTALK));

window.TOONTALK.box_backside = 
(function (TT) {
    "use strict";
    
    return {
        create: function (box) {
            var backside = TT.backside.create(box);
            var size_input = TT.UTILITIES.create_text_input(box.get_size().toString(), 'toontalk-box-size-input', "Number of holes", "Type here to edit the number of holes.");
            var horizontal = TT.UTILITIES.create_radio_button("box_orientation", "horizontal", "toontalk-horizontal-radio-button", "Left to right", "Show box horizontally."); // might be nicer replaced by an icon
            var vertical = TT.UTILITIES.create_radio_button("box_orientation", "vertical", "toontalk-vertical-radio-button", "Top to bottom", "Show box vertically.");
            var update_value = function () {
                var new_size = parseInt(size_input.button.value.trim(), 10);
                if (box.set_size(new_size, true) && TT.robot.in_training) {
                    TT.robot.in_training.edited(box, {setter_name: "set_size",
                                                      argument_1: new_size,
                                                      toString: "change the number of holes to " + new_size + " of the box",
                                                      button_selector: ".toontalk-box-size-input"});
                }
            };
            var update_orientation = function () {
                var selected_button = TT.UTILITIES.selected_radio_button(horizontal.button, vertical.button);
                var orientation = selected_button.value;
                var is_horizontal = (orientation === "horizontal");
                box.set_horizontal(is_horizontal, true);
                if (TT.robot.in_training) {
                    TT.robot.in_training.edited(box, {setter_name: "set_horizontal",
                                                      argument_1: is_horizontal,
                                                      toString: "change the orientation to " + orientation + " of the box",
                                                      // just use the first className to find this button later
                                                      button_selector: "." + selected_button.className.split(" ", 1)[0]});
                }
            };
            var backside_element = backside.get_element();
            var extra_settings = function (settings) {
                settings.appendChild(size_input.container);
                settings.appendChild($(TT.UTILITIES.create_horizontal_table(horizontal.container, vertical.container)).buttonset().get(0));
            }
            var standard_buttons = TT.backside.create_standard_buttons(backside, box, extra_settings);
            size_input.button.addEventListener('change', update_value);
            size_input.button.addEventListener('mouseout', update_value);
            horizontal.button.addEventListener('change', update_orientation);
            vertical.button.addEventListener('change', update_orientation);
            backside_element.appendChild(standard_buttons);
            backside.update_display = function () {
                size_input.button.value = box.get_size().toString();
                if (box.get_horizontal()) {
                    TT.UTILITIES.check_radio_button(horizontal);
                } else {
                    TT.UTILITIES.check_radio_button(vertical);
                }
                this.display_updated();
            };
            backside.render();
            return backside;
        }};
}(window.TOONTALK));

// a hole is either empty or contains a widget
window.TOONTALK.box_empty_hole = 
(function (TT) {
    "use strict";
    return {
        create: function (index) {
            // perhaps this should share more code with widget (e.g. done below with widget.has_parent)
            var empty_hole = Object.create(this);
            var contents, hole_element;
            empty_hole.get_element = function () {
                if (!hole_element) {
                    hole_element = document.createElement("div");
                    hole_element.className = "toontalk-empty-hole toontalk-frontside toontalk-side";
                    hole_element.toontalk_widget = empty_hole;
                }
                return hole_element;
            };
            empty_hole.get_frontside = function (create) {
                if (contents) {
                    return contents.get_frontside(create);
                }
                return this.get_element();
            };
            empty_hole.get_side_element = function () {
                return this.get_element();
            };
            // there is no backside of an empty hole
            empty_hole.get_frontside_element = function (update) {
                if (contents) {
                    return contents.get_frontside_element(update);
                }
                return this.get_element();
            };
            empty_hole.update_display = function () {
                // following no longer needed
                // should be nothing to do
                // but height percentage not working as expected
//                 var box_frontside_element;
//                 var box = this.get_parent_of_frontside().widget;
//                 if (box && !box.get_horizontal()) {
//                     box_frontside_element = box.get_frontside_element();
//                     $(this.get_element()).css({"min-height": $(box_frontside_element).height() / box.get_size()});
//                 }
            };
            empty_hole.get_frontside = function () {
                // doubles as its own frontside
                return this;
            };
            empty_hole.widget_dropped_on_me = function (dropped, is_backside, event, robot) {
                var box = this.get_parent_of_frontside().widget;
                var parent_of_frontside = dropped.get_parent_of_frontside();
                // other code should take care of this (e.g. drop)
//              if (parent_of_frontside && parent_of_frontside.widget && parent_of_frontside.widget.removed_from_container) {
//                  parent_of_frontside.widget.removed_from_container(dropped);
//              }
                if (TT.robot.in_training) {
                    TT.robot.in_training.dropped_on(dropped, this);
                }
                this.set_contents(dropped);
                if (dropped.dropped_on_other) {
                    // e.g. so egg can hatch from nest drop
                    dropped.dropped_on_other(this, false, event, robot);
                }
                box.render();
                return true;
            };
            empty_hole.get_json = function () {
                // no need to put anything into the array
                return null;
            };
            empty_hole.add_to_json = function (json) {
                return json;
            };
            empty_hole.copy = function (just_value) {
                // is this obsolete???
                return TT.box_empty_hole.create(index);
            };
            empty_hole.match = function () {
                return "matched";
            };
            empty_hole.get_type_name = function () {
                return "empty hole";
            };
            empty_hole.get_index = function () {
                return index;
            };
            empty_hole.get_contents = function () {
                return contents;
            };
            empty_hole.set_contents = function (new_value) {
                if (contents) {
                    contents.set_parent_of_frontside(undefined);
                }
                contents = new_value;
                if (contents) {
                    contents.set_parent_of_frontside(this);
                }
            };
            empty_hole.visible = function () {
                // why isn't this just is frontside_element visible?
                // you can't see it but if box is visible then it is
                return this.get_parent_of_frontside().widget.visible(); 
            };
            empty_hole.render = function () {
                if (contents) {
                    return contents.render();
                }
                // otherwise nothing to do
            };
            empty_hole.rerender = function () {
                if (contents) {
                    return contents.rerender();
                }
                // otherwise nothing to do
            };
            empty_hole.removed_from_container = function (part, backside_removed, event) {
                if (contents) {
                    contents = undefined;
                    if (event) {
                        this.get_parent_of_frontside().widget.render();
                    }
                } else {
                    console.log("Holes can't be removed from containers.");
                }
            };
            empty_hole.toString = function () {
                if (contents) {
                    return contents.toString();
                }
                return "_";
            };
            empty_hole.get_description = function () {
                if (contents) {
                    return contents.get_description();
                }
                return "_";
            };
            empty_hole.get_full_description = function () {
                if (contents) {
                    return contents.get_full_description();
                }
                return "_";
            };
            if (TT.debugging) {
                empty_hole.debug_string = "An empty hole";
            }
            TT.widget.has_parent(empty_hole);
            return empty_hole;
        }
    };
    
}(window.TOONTALK));