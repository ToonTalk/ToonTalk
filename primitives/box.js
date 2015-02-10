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
                $(this.get_frontside_element()).children(".toontalk-side").remove();
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
                if (new_value) {
                    new_value.save_dimensions();
                }
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
            if (!this.temporarily_removed_contents) {
                this.temporarily_removed_contents = [];
            }
            this.temporarily_removed_contents[index] = widget;
            this.set_hole(index, undefined, update_display);
            // returns a function to restore the contents
            return function () {
                this.set_hole(index, widget, update_display);
                this.temporarily_removed_contents[index] = undefined;
            }.bind(this);
        };
        new_box.get_contents_temporarily_removed = function (index) {
            if (this.temporarily_removed_contents) {
                return this.temporarily_removed_contents[index];
            }
        };
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
            if (size === new_size || new_size < 0 || isNaN(new_size)) {
                // ingore no change, negative or NaN values
                return false;
            }
            holes.length = new_size;
            if (new_size > size) {
                for (i = size; i < new_size; i++) {
                    holes[i] = TT.box_hole.create(i);
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
        new_box.copy = function (parameters) {
            var holes_copied, copy;
            if (!parameters) {
                // as a container it may contain birds and nests that need the parameters object
                // to maintain the correct relationships between birds and nests in the copy
                parameters = {};
            }
            holes_copied = holes.map(function (hole) {
                var content = hole.get_contents();
                if (content)
                    return content.copy(parameters);
                }
            );
            copy = box.create(size, horizontal, holes_copied, this.get_description());
            return this.add_to_copy(copy, parameters);
        };
        new_box = new_box.add_standard_widget_functionality(new_box);
        for (i = 0; i < size; i++) {
            holes[i] = TT.box_hole.create(i);
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
        return TT.box_backside.create(this); // .update_run_button_disabled_attribute();
    };
    
    box.equals = function (other) {
        return other.equals_box && other.equals_box(this);
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

    box.compare_with = function (other) {
        if (other.compare_with_box) {
            return -1*other.compare_with_box(this);
        }
    };

    box.compare_with_box = function (other_box) {
        var box1_size = this.get_size();
        var box2_size = other_box.get_size();
        var i, hole1, hole2, hole_comparison;
        if (box1_size > box2_size) {
            return 1;
        }
        if (box1_size < box2_size) {
            return -1;
        }
        for (i = 0; i < box1_size; i++) {
            hole1 = this.get_hole_contents(i);
            hole2 = other_box.get_hole_contents(i);
            if (hole1 && !hole2) {
                return 1;
            }
            if (!hole1 && hole2) {
                return -1;
            }
            if (hole1 && hole2) {
                if (hole1.compare_with) {
                    hole_comparison = hole1.compare_with(hole2);
                    if (hole_comparison === 1 || hole_comparison === -1) {
                        return hole_comparison;
                    }
                } else {
                    return; // undefined
                }
            }
        }
        return 0;
    };
    
    box.match = function (other) {
        if (this.get_erased && this.get_erased()) {
            if (other.match_with_any_box) {
                return other.match_with_any_box();
            }
            return this;
        }
        if (!other.match_with_this_box) {
            return this;
        }
        return other.match_with_this_box(this);
    };
    
    box.match_with_any_box = function () {
        return 'matched';
    };

    box.match_with_this_box = function (pattern_box) {
        var size = this.get_size();
        // typically only nests are waiting but a bird busy delivering before returning to a hole also waits
        var waiting_widgets = [];
        var i, my_hole, pattern_hole, hole_match, contents_temporarily_removed;
        if (size !== pattern_box.get_size()) {
            return pattern_box;
        }
        for (i = 0; i < size; i++) {
            pattern_hole = pattern_box.get_hole_contents(i);
            if (pattern_hole) {
                my_hole = this.get_hole_contents(i);
                if (my_hole) {
                    hole_match = TT.UTILITIES.match(pattern_hole, my_hole);
                    if (hole_match.is_widget) {
                        // sub-match failed
                        return hole_match;
                    }
                    if (hole_match !== 'matched') {
                        // suspended on a nest so combine the suspended nests
                        if (waiting_widgets.length === 0) {
                            waiting_widgets = hole_match;
                        } else {
                            waiting_widgets = waiting_widgets.concat(hole_match);
                        }
                    }
                } else {
                    // first check if contents temporarily missing (e.g. a bird busy delivering)
                    contents_temporarily_removed = this.get_contents_temporarily_removed(i);
                    if (contents_temporarily_removed) {
                        waiting_widgets.push(contents_temporarily_removed);
                    } else {
                        // expected something -- not an empty hole
                        return pattern_box; // or should this be pattern_hole to provide more tragetted feedback?
                    }
                }
            }
        }
        if (waiting_widgets.length > 0) {
            return waiting_widgets;
        }
        return 'matched';
    };
    
    box.toString = function () {
        var contents = "";
        var size = this.get_size();
        var i, hole;
        var extra_text = this.get_type_name() + " that looks like ";
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
    
    box.get_type_name = function  (plural) {
        if (plural) {
            return "boxes";
        }
        return "box";
    };

    box.get_help_URL = function () {
        return "docs/manual/boxes.html";
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

    box.walk_children = function (child_action) {
        var size = this.get_size();
        var i;
        for (i = 0; i < size; i++) {
            if (!child_action(this.get_hole(i))) {
                // aborted
                return;
            }
        }
    };
    
    TT.creators_from_json['box'] = function (json, additional_info) {
        return box.create(json.size, json.horizontal, TT.UTILITIES.create_array_from_json(json.contents, additional_info), json.description);
    };

    box.render = function () {
        // boxes inside boxes display a bit different so re-render the containing box
        var frontside_parent = this.get_parent_of_frontside();
        if (frontside_parent && frontside_parent.is_of_type('empty hole')) {
            frontside_parent.get_parent_of_frontside().render();
        }
        TT.DISPLAY_UPDATES.pending_update(this);
    };
    
    box.update_display = function () {
        var frontside = this.get_frontside(true);
        var frontside_element = frontside.get_element();
        var size = this.get_size();
        var update_hole = function (hole_element, hole, index) {
            var content_frontside_element = hole.get_frontside_element(true);
            var left, top, content_frontside_element, new_width, new_height;
            if (horizontal) {
                top = 0;
                if ($(hole_element).parents(".toontalk-box-hole").length > 0) {
                    new_width  = hole_width -2*border_size/size;
                    new_height = hole_height-2*border_size;
                } else {
                    new_width  = hole_width;
                    new_height = hole_height;
                }
                left = new_width*index;
                if (index > 1) {
                    left += border_size*(index-1);
                }
            } else {
                left = 0;
                if ($(hole_element).parents(".toontalk-box-hole").length > 0) {
                    new_width  = hole_width -2*border_size;
                    new_height = hole_height-2*border_size/size;
                } else {
                    new_width  = hole_width;
                    new_height = hole_height;
                }
                top = new_height*index;
                if (index > 1) {
                    top += border_size*(index-1);
                }
            }
            $(hole_element).css({left:   left,
                                 top:    top,
                                 width:  new_width,
                                 height: new_height});
//             if (content_frontside_element.parentElement === hole_element) {
//                 return;
//             }
            if (hole_element !== content_frontside_element) {
                // not an empty hole
                // save dimensions first?
                $(content_frontside_element).css({left:  0,
                                                  top:   0,
                                                  width:  '',
                                                  height: ''});
                hole_element.appendChild(content_frontside_element);
            }                                          
            if (!TT.UTILITIES.has_animating_image(content_frontside_element)) {
                // explicit size interferes with animation
                if (index > 0) {
                    // first hole doesn't need a divider
                    $(hole_element).removeClass("toontalk-box-eighth-size-border-left toontalk-box-quarter-size-border-left toontalk-box-half-size-border-left toontalk-box-full-size-border-left");
                    $(hole_element).removeClass("toontalk-box-eighth-size-border-top toontalk-box-quarter-size-border-top toontalk-box-half-size-border-top toontalk-box-full-size-border-top");
                    if (horizontal) {
                        $(hole_element).addClass(border_class + "-left");
                    } else {
                        $(hole_element).addClass(border_class + "-top");                        
                    }
                }
                hole_element.toontalk_border_size = border_size;
            }
            hole.render();
        };
        var horizontal = this.get_horizontal();
        var first_time = !$(frontside_element).is(".toontalk-box");
        var renderer = 
            function () {
                var $box_hole_elements = $(frontside_element).children(".toontalk-box-hole");
                if ($box_hole_elements.length === size) {
                    $box_hole_elements.each(function (index, hole_element) {
                        var hole = this.get_hole(index);
                        if (hole) {
                            // might be undefined if the box's size has been decreased while rendering
                            update_hole(hole_element, hole, index);
                        }
                    }.bind(this));
                } else {
                    // has wrong number of holes so rebuild it
                    $box_hole_elements.remove();
                    this.get_holes().forEach(function (hole, index) {
                        hole_element = hole.get_element();
                        $(hole_element).addClass("toontalk-hole-number-" + index);
                        update_hole(hole_element, hole, index);
                        frontside_element.appendChild(hole_element);
                    });
                };
            }.bind(this);
        var i, hole, hole_element, box_left, box_width, hole_width, first_hole_width, box_height, hole_height, content_frontside_element, border_class, border_size;
        $(frontside_element).addClass("toontalk-box");
        $(frontside_element).removeClass("toontalk-box-eighth-size-border toontalk-box-quarter-size-border toontalk-box-half-size-border toontalk-box-full-size-border");
        frontside_element.title = this.get_title();
        if (TT.debugging) {
            this.debug_string = this.toString();
        }
        if (this.get_erased()) {
            $(frontside_element).addClass("toontalk-box-erased");
            $(frontside_element).children(".toontalk-side").remove();                      
            return;
        }
        $(frontside_element).removeClass("toontalk-box-erased");
        box_width = $(frontside_element).width();
        box_height = $(frontside_element).height();
        if (horizontal) {
            hole_width  = box_width/size;
            hole_height = box_height;
        } else {
            hole_width  = box_width;
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
            hole_width  = hole_width -((size-1)*border_size)/size;
        } else {
            hole_height = hole_height-((size-1)*border_size)/size;      
        }
        $(frontside_element).addClass(border_class);
        frontside_element.toontalk_border_size = border_size;
        // delay it until browser has rendered current elements
        TT.UTILITIES.set_timeout(renderer);
    };
    
    box.update_hole_display = function (index, new_content) {
        var frontside_element = this.get_frontside_element();
        var $hole_element = $(frontside_element).children(".toontalk-hole-number-" + index);
        var content_frontside_element;
        $hole_element.empty();
        if (!new_content) {
            return;
        }
        content_frontside_element = new_content.get_frontside_element(true);
        $hole_element.append(content_frontside_element);
        $(content_frontside_element).css({left: 0,
                                          top:  0});
        new_content.rerender();
    };
    
    box.drop_on = function (other, is_backside, event) {
        var result;
        if (!other.box_dropped_on_me) {
            if (other.widget_dropped_on_me) {
                return other.widget_dropped_on_me(this, is_backside, event);
            }
            console.log("No handler for drop of " + this + " on " + other);
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

    box.widget_dropped_on_me = function (other, other_is_backside, event, robot) {
        var hole_index = this.which_hole(event);
        var hole_contents, hole;
        if (hole_index >= 0) {
            hole = this.get_hole(hole_index);
            hole_contents = hole.get_contents();
            if (hole_contents) {
                return other.drop_on(hole_contents, other_is_backside, event, robot);
            } 
            return hole.widget_dropped_on_me(other, other_is_backside, event, robot);  
        }
        TT.UTILITIES.report_internal_error(other + " dropped on " + this + " but no event was provided.");
    };
    
    box.get_index_of = function (part) {
        // parent should be a hole
        return part.get_parent_of_frontside().get_index();
    };
    
    box.removed_from_container = function (part, backside_removed, event, index, report_error_if_no_index) {
        var update_display = !!event;
        var hole, part_frontside_element;
        if (typeof index === 'undefined') {
            index = this.get_index_of(part);
        }
        if (index >= 0) {
            this.set_hole(index, undefined, update_display);
            if (update_display) {
                this.rerender();
                part.restore_dimensions();
            }
        } else if (report_error_if_no_index) {
            TT.UTILITIES.report_internal_error("Attempted to remove " + part + " from " + this + " but not found.");
        }
    };
    
    box.get_path_to = function (widget, robot) {
        var size = this.get_size();
        var index, part, path, sub_path, parent_box;
        if (widget.get_type_name() === 'empty hole') {
            parent_box = widget.get_parent_of_frontside();
            sub_path = TT.box.path.create(widget.get_index());
            if (parent_box === this) {
                return sub_path;
            }
            path = this.get_path_to(parent_box);
            if (!path) {
                return;
            }
            path.next = sub_path;
            return path;
        }
        for (index = 0; index < size; index++) {
            part = this.get_hole_contents(index) || this.get_contents_temporarily_removed(index);
            if (part) {
                if (widget === part || (part.top_contents_is && part.top_contents_is(widget))) {
                    return TT.box.path.create(index);
                } else if (part.get_path_to) {
                    sub_path = part.get_path_to(widget, robot);
                    if (sub_path) {
                        path = TT.box.path.create(index);
                        path.next = sub_path;
                        return path;
                    }
                }
            }
        }
    };

    box.element_to_highlight = function (point) {
        var hole_index = this.which_hole(point, true);
        var hole, hole_contents;
        if (hole_index < 0) {
            // highlight the whole thing
            return this.get_frontside_element();
        }
        hole = this.get_hole(hole_index);
        hole_contents = hole.get_contents();
        if (hole_contents) {
            return hole_contents.get_frontside_element();
        }
        return hole.get_frontside_element();
    };

    box.which_hole = function (point) {
        // if horizontal computes boundary seeing if event is left of the boundary
        // otherwise sees if point is below boundary
        var horizontal = this.get_horizontal();
        var frontside_element = this.get_frontside_element();
        var size = this.get_size();
        var i, position, increment, boundary;
        if (size === 0) {
            return;
        }
        position = $(frontside_element).offset();
        increment = horizontal ? $(frontside_element).width()/size : $(frontside_element).height()/size;
        boundary = horizontal ? position.left : position.top;
        if (point) { // not clear how this could be called without a point
            for (i = 0; i < size; i++) {
                boundary += increment;
                if ((horizontal ? (event.pageX <= boundary) :
                                  (event.pageY <= boundary)) ||
                    // or is last one
                    i+1 === size) {
                    return i;
                }
            }
        }
    };
    
    box.dereference = function (path, top_level_context, robot) {
        var index, hole;
        if (path) {
            index = path.get_index && path.get_index();
            if (!TT.debugging || typeof index === 'number') {
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
                            TT.UTILITIES.report_internal_error("Expected to refer to a part of " + hole + " but it lacks a method to obtain " + TT.path.toString(path.next));
                        }
                    }
                    if (path.removing_widget) {
                        if (hole.get_type_name() === 'empty hole') {
                            TT.UTILITIES.report_internal_error("Robot is trying to remove something from an empty hole. ");
                        } else if (!hole.get_infinite_stack()) {
                            robot.remove_from_container(hole, this);
                        }
                    }
                    return hole;
                } else {
                    // referencing an empty hole
                    return this.get_hole(index);
                }
            }
            TT.UTILITIES.report_internal_error(this + " unable to dereference the path: " + TT.path.toString(path));
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
                    if (this.true_type === 'scale') {
                        if (index === 0) {
                            return "the left side of the scale ";
                        } else {
                            return "the right side of the scale ";
                        }
                    }
                    return "the " + TT.UTILITIES.cardinal(index) + " hole ";
                },
                get_json: function (json_history) {
                    return {type: "box_path",
                            index: index,
                            true_type: this.true_type,
                            next: this.next && this.next.get_json(json_history)};
                }
            };
        }
    };

    box.get_custom_title_prefix = function () {
        return "Drop things in my holes to keep them for later.";
    };

    TT.creators_from_json["box_path"] = function (json, additional_info) {
        var path = box.path.create(json.index);
        if (json.next) {
            path.next = TT.UTILITIES.create_from_json(json.next, additional_info);
        }
        if (json.true_type) {
            path.true_type = json.true_type;
        }
        return path;
    };
    
    return box;
}(window.TOONTALK));

window.TOONTALK.box_backside = 
(function (TT) {
    "use strict";
    
    return {
        create: function (box) {
            var backside = TT.backside.create(box);
            var size_input = TT.UTILITIES.create_text_input(box.get_size().toString(), 'toontalk-box-size-input', "Number of holes", "Type here to edit the number of holes.", undefined, "number");
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
            var advanced_settings_button = TT.backside.create_advanced_settings_button(backside, box);
            var generic_backside_update = backside.update_display;
            size_input.button.addEventListener('change',   update_value);
            size_input.button.addEventListener('mouseout', update_value);
            horizontal.button.addEventListener('change',   update_orientation);
            vertical.button  .addEventListener('change',   update_orientation);
            backside.update_display = function () {
                size_input.button.value = box.get_size().toString();
                if (box.get_horizontal()) {
                    TT.UTILITIES.check_radio_button(horizontal);
                } else {
                    TT.UTILITIES.check_radio_button(vertical);
                }
                generic_backside_update();
            };
            backside_element.appendChild(size_input.container);
            backside_element.appendChild($(TT.UTILITIES.create_horizontal_table(horizontal.container, vertical.container)).buttonset().get(0));
            backside_element.appendChild(advanced_settings_button);
            backside.add_advanced_settings();
            backside.render();
            return backside;
        }};
}(window.TOONTALK));

// a hole is either empty or contains a widget
window.TOONTALK.box_hole = 
(function (TT) {
    "use strict";
    return {
        create: function (index) {
            // perhaps this should share more code with widget (e.g. done below with widget.has_parent)
            var hole = Object.create(this);
            var contents, visible, hole_element;
            hole.get_element = function () {
                if (!hole_element) {
                    hole_element = document.createElement("div");
                    hole_element.className = "toontalk-box-hole toontalk-frontside toontalk-side";
                    hole_element.toontalk_widget = hole;
                }
                // can only receive drops if empty -- rather than add and remove these listeners use box.element_to_highlight
//              TT.UTILITIES.can_receive_drops(hole_element);
                return hole_element;
            };
            hole.get_frontside = function (create) {
                if (contents) {
                    return contents.get_frontside(create);
                }
                return this.get_element();
            };
            hole.get_side_element = function () {
                return this.get_element();
            };
            // there is no backside of an empty hole
            hole.get_frontside_element = function (update) {
                if (contents) {
                    return contents.get_frontside_element(update);
                }
                return this.get_element();
            };
            hole.get_frontside = function () {
                // doubles as its own frontside
                return this;
            };
            hole.widget_dropped_on_me = function (dropped, is_backside, event, robot) {
                var box = this.get_parent_of_frontside();
                var $hole_element;
                if (TT.robot.in_training && event) {
                    TT.robot.in_training.dropped_on(dropped, this);
                }
                if (event && dropped.save_dimensions) { // and maybe watched robot too?
                    dropped.save_dimensions();
                    if (dropped.set_size_attributes) {
                        $hole_element = $(this.get_element());
                        dropped.set_size_attributes($hole_element.width(), $hole_element.height());
                    }
                }
                this.set_contents(dropped);
                if (dropped.dropped_on_other) {
                    // e.g. so egg can hatch from nest drop
                    dropped.dropped_on_other(this, false, event, robot);
                }
                box.render();
                return true;
            };
            hole.get_json = function () {
                // no need to put anything into the array
                return null;
            };
            hole.add_to_json = function (json) {
                return json;
            };
            hole.copy = function (parameters) {
                // is this obsolete???
                return TT.box_hole.create(index);
            };
            hole.match = function () {
                return "matched";
            };
            hole.get_type_name = function (plural) {
                if (contents) {
                    return contents.get_type_name(plural);
                }
                if (plural) {
                    return "empty holes";
                }
                return "empty hole";
            };
            hole.is_of_type = function (type_name) {
                return type_name === "empty hole";
            };
            hole.get_index = function () {
                return index;
            };
            hole.get_contents = function () {
                return contents;
            };
            hole.set_contents = function (new_value) {
                var listeners = this.get_listeners('value_changed');
                if (listeners) {
                    if (contents !== new_value) {
                        listeners.forEach(function (listener) {
                            listener({type: 'value_changed',
                                      old_value: contents,
                                      new_value: new_value});
                        });
                    }
                    if (contents) {
                        listeners.forEach(function (listener) {
                            contents.remove_listener('value_changed', listener, true);
                        });
                    }
                    if (new_value) {
                        listeners.forEach(function (listener) {
                            new_value.add_listener('value_changed', listener);
                        });
                    }
                }
                if (contents) {
                    contents.set_parent_of_frontside(undefined);
                }
                contents = new_value;
                if (contents) {
                    contents.set_parent_of_frontside(this);
                    if (TT.debugging) {
                        hole.debug_string = "A hole containing " + contents;
                    }
                    contents.set_visible(visible);
                } else if (TT.debugging) {
                    hole.debug_string = "An empty hole";
                }
            };
            hole.visible = function () {
                // if box is visible then hole is
                return this.get_parent_of_frontside().visible(); 
            };
            hole.set_visible = function (new_value) {
                visible = new_value;
                if (contents) {
                    contents.set_visible(new_value);
                }
            };
            hole.render = function () {
                if (contents) {
                    return contents.render();
                }
                // otherwise nothing to do
            };
            hole.rerender = function () {
                if (contents) {
                    return contents.rerender();
                }
                // otherwise nothing to do
            };
            hole.set_running = function (new_value) {
                if (contents) {
                    contents.set_running(new_value);
                }
            };
            hole.removed_from_container = function (part, backside_removed, event, index, report_error) {
                if (contents) {
                    if (event) {
                        contents.restore_dimensions();
                    }
                    this.set_contents(undefined);
                    if (event) {
                        this.get_parent_of_frontside().render();
                    }
                } else if (report_error) {
                    TT.UTILITIES.report_internal_error("Holes can't be removed from containers.");
                }
            };
            hole.temporarily_remove_contents = function (widget, update_display) {
                if (contents) {
                    // box should handle this
                    return this.get_parent_of_frontside().temporarily_remove_contents(widget, update_display);
                }
            };
            hole.toString = function () {
                if (contents) {
                    return contents.toString();
                }
                return "_";
            };
            hole.get_description = function () {
                if (contents) {
                    return contents.get_description();
                }
                return "_";
            };
            hole.get_full_description = function () {
                if (contents) {
                    return contents.get_full_description();
                }
                return "_";
            };
            hole.is_backside = function () {
                // holes are not quite first-class in that they don't have a backside
                return false;
            };
            hole.get_widget = function () {
                // isn't a backside so returns itself
                return this;
            };
            if (TT.debugging) {
                hole.debug_string = "An empty hole";
            }
            TT.widget.has_parent(hole);
            TT.widget.has_listeners(hole);
            return hole;
        }
    };
    
}(window.TOONTALK));

