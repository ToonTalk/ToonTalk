 /**
 * Implements ToonTalk's boxes
 * Authors: Ken Kahn
 * License: New BSD
 */

/*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */


(function (TT) {
    "use strict";
    // functions shared by boxes and their holes

    var update_css_of_hole_contents = function (widget_side, content_element, new_width, new_height) {
        var default_width, default_height, correct_width, correct_height, css;
        if (widget_side && new_width >= 0 && widget_side.maintain_proportional_dimensions() && widget_side.get_default_width) {
            // only set the "smaller" of the two dimensions
            default_width  = widget_side.get_default_width();
            default_height = widget_side.get_default_height();
            if (new_width/default_width >= new_height/default_height) {
                // hole is wider than necessary
                // center it in the hole
                correct_width = (default_width*new_height)/default_height;
                css = {left:   (new_width-correct_width)/2,
                       top:    0,
                       width:  correct_width,
                       height: new_height};
            } else {
                correct_height = (default_height*new_width)/default_width;
                css = {left:   0,
                       top:    (new_height-correct_height)/2,
                       width:  new_width,
                       height: correct_height};
            }
        } else {
            if (widget_side.is_backside()) {
                widget_side.update_display(); // TODO: see if render is OK
                // .92 works around a display problem -- unclear what is causing it
                widget_side.scale_to(new_width, new_height*.92);      
            } 
            css = {left: 0,
                   top:  0};
        }
        TT.UTILITIES.set_css(content_element, css);
    };

window.TOONTALK.box = (function (TT) {

    var box = Object.create(TT.widget);

    box.create = function (size, horizontal, initial_contents, description, labels) {
        var new_box = Object.create(box);
        var holes = [];
        var i;
        if (typeof horizontal === 'undefined') {
            // default is horizontal
            horizontal = true;
        }
        new_box.is_box = function () {
            return true;
        };
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
        new_box.set_hole = function (index, new_content, update_display) {
            var frontside_element, $hole_element, content_element, hole_dimensions;
            holes[index].set_contents(new_content);
            if (update_display) {
                if (new_content) {
                    new_content.save_dimensions();
                }
                frontside_element = this.get_frontside_element();
                $hole_element = $(frontside_element).children(".toontalk-hole-number-" + index);
                $hole_element.empty();
                if (!new_content) {
                    return;
                }
                hole_dimensions = this.get_hole_dimensions();
                content_element = new_content.get_element(true);
                if ($hole_element.length > 0) {
                    $hole_element.get(0).appendChild(content_element);
                }
                update_css_of_hole_contents(new_content, content_element, hole_dimensions.width, hole_dimensions.height);
                new_content.rerender();
            }
            this.rerender();
            if (TT.debugging) {
                this._debug_string = this.to_debug_string();
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
            var i, box_visibility;
            if (size === new_size || new_size < 0 || isNaN(new_size)) {
                // ingore no change, negative or NaN values
                return false;
            }
            box_visibility = this.visible();
            holes.length = new_size;
            if (new_size > size) {
                for (i = size; i < new_size; i++) {
                    holes[i] = TT.box_hole.create(i);
                    holes[i].set_parent_of_frontside(new_box);
                    holes[i].set_visible(box_visibility);
                }
            }
            size = new_size;
            if (update_display) {
                this.rerender();
            }
            if (TT.debugging) {
                this._debug_string = this.to_debug_string();
            }
            return true;
        };
        new_box.get_hole_dimensions = function () {
            // if parent is a hole does this need to adjust for its borders?
            var frontside_element = this.get_frontside_element();
            var box_width  = $(frontside_element).width()  || TT.box.get_default_width();
            var box_height = $(frontside_element).height() || TT.box.get_default_height();
            if (horizontal) {
                return {width: box_width/size,
                        height: box_height};
            } else {
                return {width: box_width,
                        height: box_height/size};
            }
        };           
        new_box.receive_size_from_dropped = function (dropped, event) {
            // dropped drop on the size text area
            // return a string for the new size
            var size_as_number_widget, new_size;
            if (dropped.is_number()) {
                size_as_number_widget = TT.number.create(this.get_size());
                size_as_number_widget.number_dropped_on_me_semantics(dropped);
                new_size = (Math.max(0, Math.round(size_as_number_widget.to_float())));
                // if the following were used a condition for returning then robots would ignore non-size changes - e.g. adding zero
                this.set_size(new_size);
                return new_size.toString();
            }
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
            copy = box.create(size, horizontal, holes_copied, this.get_description(), this.get_name());
            return this.add_to_copy(copy, parameters);
        };
        new_box.generate_name = function () {
            // are the names (or labels) of each hole
            // each is separated by a ;
            var name = "";
            var size = this.get_size();
            while (size > 0) {
                name += ";";
                size--;
            }
            return name;
        }
        new_box.add_standard_widget_functionality(new_box);
        new_box.has_name(new_box);
        new_box.set_name(labels);
        for (i = 0; i < size; i++) {
            holes[i] = TT.box_hole.create(i);
            holes[i].set_parent_of_frontside(new_box);
        }
        new_box.set_description(description);
        if (initial_contents) {
            new_box.set_contents(initial_contents);
        }
        if (TT.debugging) {
            new_box._debug_id = TT.UTILITIES.generate_unique_id();
            new_box._debug_string = new_box.to_debug_string();
        }
        return new_box;
    };
    
    box.create_backside = function () {
        return TT.box_backside.create(this); // .update_run_button_disabled_attribute();
    };
    
    box.equals = function (other) {
        // could be scale and box so need the type name test
        return other.equals_box && this.get_type_name() === other.get_type_name() && other.equals_box(this);
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
            this.last_match = other;
            return this;
        }
        if (!other.match_with_this_box) {
            this.last_match = other;
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
            pattern_box.last_match = this;
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
                        pattern_box.last_match = this;
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
    
    box.toString = function (to_string_info) {
        var contents = "";
        var size = this.get_size();
        var i, hole;
        var extra_text = this.get_type_name() + " that looks like ";
        for (i = 0; i < size; i++) {
            hole = this.get_hole(i);
            contents += hole.get_full_description(to_string_info);
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
                horizontal: this.get_horizontal(),
                name: this.get_name()
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
        return box.create(json.size, json.horizontal, TT.UTILITIES.create_array_from_json(json.contents, additional_info), json.description, json.name);
    };
    
    box.update_display = function () {
        var frontside = this.get_frontside(true);
        var frontside_element = frontside.get_element();
        var size = this.get_size();
        var update_hole = function (hole_element, hole, index) {
            var contents = hole.get_contents();
            var content_element = (contents || hole).get_element(true);
            var $parents = $(hole_element).parents(".toontalk-box-hole");
            var adjust_if_on_a_nest = function () {
                if ($(hole_element).parents(".toontalk-box-hole").children(".toontalk-nest").is("*")) {
                    // nests display their contents smaller so edges of nest is visible
                    new_width  /= TT.nest.CONTENTS_WIDTH_FACTOR;
                    new_height /= TT.nest.CONTENTS_HEIGHT_FACTOR;
                }
            };
            var left, top, new_width, new_height, hole_contents;
            if (horizontal) {
                top = 0;
                if ($parents.length > 0) {
                    new_width  = hole_width -2*border_size/size;
                    new_height = hole_height-2*border_size;
                } else {
                    new_width  = hole_width;
                    new_height = hole_height;
                }
                adjust_if_on_a_nest();
                left = new_width*index;
                if (index > 1) {
                    left += border_size*(index-1);
                }
            } else {
                left = 0;
                if ($parents.length > 0) {
                    new_width  = hole_width -2*border_size;
                    new_height = hole_height-2*border_size/size;
                } else {
                    new_width  = hole_width;
                    new_height = hole_height;
                }
                adjust_if_on_a_nest();
                top = new_height*index;
                if (index > 1) {
                    top += border_size*(index-1);
                }
            }
            TT.UTILITIES.set_css(hole_element,
                                 {left:   left,
                                  top:    top,
                                  width:  new_width,
                                  height: new_height});
            if (hole_labels[index]) {
                hole_element.setAttribute("toontalk_name", hole_labels[index]);
            }                                         
            if (!TT.UTILITIES.has_animating_image(content_element)) {
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
            }
            if (hole_element !== content_element) {
                // not an empty hole
                // save dimensions first?
                update_css_of_hole_contents(contents, content_element, new_width, new_height);
                hole_element.appendChild(content_element);
                // tried to delay the following until the changes to this box in the DOM have settled down
                // but the hole's contents may have changed
                hole.get_contents().rerender();
            }
            if (hole.is_element()) {
                hole_contents = hole.get_contents();
                hole_contents.set_size_attributes(new_width, new_height, true);
            }
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
                if (!$(frontside_element).parent(".toontalk-conditions-contents-container").is("*")) {
                    if ($(frontside_element).parent(".toontalk-box-hole").is("*")) {
                        TT.UTILITIES.set_css(frontside_element,
                                             {width:  '',
                                              height: ''});
                    } else {
                        TT.UTILITIES.set_css(frontside_element,
                                             {width:  box_width,
                                              height: box_height});
                    }
                }
            }.bind(this);
        var update_dimensions = function () {
            if (size === 0) {
                box_width = 0;
            } else {
                box_width = $(frontside_element).width()  || TT.box.get_default_width();
            }
            box_height = $(frontside_element).height() || TT.box.get_default_height();
            if (horizontal) {
                if (size === 0) {
                    hole_width = 0;
                } else {
                    hole_width  = box_width/size;
                }
                hole_height = box_height;
            } else {
                hole_width  = box_width;
                hole_height = box_height/size;
            }
        };
        var hole_labels = this.get_name().split(";");
        var i, hole, hole_element, box_left, box_width, hole_width, first_hole_width, box_height, hole_height,
            border_class, border_size, backside;
        if (TT.logging && TT.logging.indexOf('display') >= 0) {
            console.log("Updating display of " + this.to_debug_string());
        }
        $(frontside_element).addClass("toontalk-box");
        $(frontside_element).removeClass("toontalk-box-eighth-size-border toontalk-box-quarter-size-border toontalk-box-half-size-border toontalk-box-full-size-border");
        TT.UTILITIES.give_tooltip(frontside_element, this.get_title());
        if (TT.debugging) {
            this._debug_string = this.to_debug_string();
        }
        if (this.get_erased()) {
            $(frontside_element).addClass("toontalk-box-erased");
            $(frontside_element).children(".toontalk-side").remove();                      
            return;
        }
        $(frontside_element).removeClass("toontalk-box-erased");
        update_dimensions();
        // hole width or box width???
        border_size = this.get_border_size(hole_width, hole_height);
        if (border_size === 4) {
            border_class = "toontalk-box-eighth-size-border";
        } else if (border_size === 8) {
            border_class = "toontalk-box-quarter-size-border";
        } else if (border_size === 16) {
            border_class = "toontalk-box-half-size-border";
        } else {
            border_class = "toontalk-box-full-size-border";
        }
        // recompute hole dimensions taking into account border width
        if (horizontal) {
            hole_width  = hole_width -((size-1)*border_size)/size;
        } else {
            hole_height = hole_height-((size-1)*border_size)/size;      
        }
        $(frontside_element).addClass(border_class);
        // delay it until browser has rendered current elements
        TT.UTILITIES.set_timeout(renderer);
    };

    box.get_default_width = function () {
        // width of 2 hole horizontal box not including borders
        return 164;
    };

    box.get_default_height = function () {
        return 68;
    };

    box.get_border_size = function (width, height) {
        var frontside_width;
        if (width === 0) {
            // i.e. a zero-hole box
            frontside_width =  $(this.get_frontside_element()).width();
            if (frontside_width <= 16) {
                return 4;
            }
            if (frontside_width <= 32) {
                return 8;
            }
            if (frontside_width <= 64) {
                return 16;
            }
            return 32;
        }
        if (!width) {
            width  = $(this.get_frontside_element()).width();
        }
        if (!height) {
            height = $(this.get_frontside_element()).height();
        }
        if (width <= 32 || height <= 32) {
            return 4;
        } else if (width <= 64 || height <= 64) {
            return 8;
        } else if (width <= 128 || height <= 128) {
            return 16;
        } else {
            return 32;
        }
    };

    box.get_name_input_label = function () {
        return "The labels of my holes are";
    };

    box.get_name_input_title = function () {
        return "Each hole label is followed by a ';'. Yoou may enter as many hole labels as there are holes.";
    };
    
    box.drop_on = function (side_of_other, event, robot) {
        var result;
        if (!side_of_other.box_dropped_on_me) {
            if (side_of_other.widget_side_dropped_on_me) {
                return side_of_other.widget_side_dropped_on_me(this, event, robot);
            }
            console.log("No handler for drop of " + this + " on " + side_of_other);
            return;
        }
        result = side_of_other.box_dropped_on_me && side_of_other.box_dropped_on_me(this, event, robot);
        if (event) {
            side_of_other.rerender();
        }
        if (result) {
            this.remove();
        }
        return result;
    };
    
    box.box_dropped_on_me = function (other, event) {
        console.log("box on box not yet implemented");
        return false;
    };

    box.widget_side_dropped_on_me = function (side_of_other, event, robot) {
        var hole_index = this.which_hole(event);
        var hole_contents, hole;
        if (hole_index >= 0) {
            hole = this.get_hole(hole_index);
            hole_contents = hole.get_contents();
            if (hole_contents) {
                return side_of_other.drop_on(hole_contents, event, robot);
            } 
            return hole.widget_side_dropped_on_me(side_of_other, event, robot);  
        }
        TT.UTILITIES.report_internal_error(side_of_other + " dropped on " + this + " but no event was provided.");
    };
    
    box.get_index_of = function (part) {
        // parent should be a hole
        return part.get_parent_of_frontside() && part.get_parent_of_frontside().get_index && part.get_parent_of_frontside().get_index();
    };
    
    box.removed_from_container = function (part_side, event) {
        var update_display = !!event;
        var index = this.get_index_of(part_side);
        var hole, part_frontside_element;
        if (index >= 0) {
            this.set_hole(index, undefined, update_display);
            if (update_display) {
                this.rerender();
                part_side.restore_dimensions();
            }
        }
        // otherwise might have already been removed (e.g. by unwatched robot action called by watched robot)
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

    box.element_to_highlight = function (event) {
        var hole_index = this.which_hole(event, true);
        var hole, hole_contents;
        if (hole_index < 0 || this.get_size() === 0) {
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

    box.which_hole = function (event) {
        // if horizontal computes boundary seeing if event pageX is left of the boundary
        // otherwise sees if event pageY is below boundary
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
        if (event) { // not clear how this could be called without event
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
    
    box.dereference_path = function (path, top_level_context, robot) {
        var index, hole;
        if (path) {
            index = path.get_index && path.get_index();
            if (!TT.debugging || typeof index === 'number') {
                hole = this.get_hole_contents(index);
                if (hole) {
                    if (hole.dereference_contents && !path.not_to_be_dereferenced) {
                        // this will dereference the top of a nest instead of the nest itself
                        return hole.dereference_contents(path.next || path, top_level_context, robot);
                    }
                    if (path.next) {
                        if (hole.dereference_path) {
                            return hole.dereference_path(path.next, top_level_context, robot);
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
                            return "the left pan ";
                        } else {
                            return "the right pan ";
                        }
                    }
                    return "the " + TT.UTILITIES.ordinal(index) + " hole ";
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
        return "Drop things in my holes to store them.";
    };

    TT.creators_from_json["box_path"] = function (json, additional_info) {
        var path = box.path.create(json.index);
        if (json.next) {
            path.next = TT.UTILITIES.create_from_json(json.next, additional_info);
        }
        if (json.true_type) {
            // true_type is needed to distinguish boxes from scale (that are like 2-hole boxes with additional behaviours)
            path.true_type = json.true_type;
        }
        return path;
    };
    
    return box;
}(window.TOONTALK));

window.TOONTALK.box_backside = 
(function (TT) {
    
    return {
        create: function (box) {
            var backside = TT.backside.create(box);
            var size_area_drop_handler = 
                function (event) {
                    var dropped = TT.UTILITIES.input_area_drop_handler(event, box.receive_size_from_dropped.bind(box), box);
                    if (dropped) {
                        box.rerender();
                        if (box.robot_in_training()) {
                            box.robot_in_training().dropped_on_text_area(dropped, box, {area_selector: ".toontalk-box-size-input",
                                                                                        setter: 'receive_size_from_dropped',
                                                                                        toString: "for the box's size"});
                        }
                    }
                };
            var size_input = TT.UTILITIES.create_text_input(box.get_size().toString(), 'toontalk-box-size-input', "Number of holes", "Type here to edit the number of holes.", undefined, "number", size_area_drop_handler);
            var horizontal = TT.UTILITIES.create_radio_button("box_orientation", "horizontal", "toontalk-radio-button", "Left to right", "Show box horizontally.", true); // might be nicer replaced by an icon
            var vertical   = TT.UTILITIES.create_radio_button("box_orientation", "vertical", "toontalk-radio-button", "Top to bottom", "Show box vertically.", true);
            var update_value = function () {
                var new_size = parseInt(size_input.button.value.trim(), 10);
                if (box.set_size(new_size, true) && box.robot_in_training()) {
                    box.robot_in_training().edited(box, {setter_name: "set_size",
                                                         argument_1: new_size,
                                                         toString: "by changing the number of holes to " + new_size + " of the box",
                                                         button_selector: ".toontalk-box-size-input"});
                }
            };
            var update_orientation = function () {
                var selected_button = TT.UTILITIES.selected_radio_button(horizontal.button, vertical.button);
                var orientation = selected_button.value;
                var is_horizontal = (orientation === "horizontal");
                box.set_horizontal(is_horizontal, true);
                if (box.robot_in_training()) {
                    box.robot_in_training().edited(box, {setter_name: "set_horizontal",
                                                         argument_1: is_horizontal,
                                                         toString: "by changing the orientation to " + orientation + " of the box",
                                                         // just use the first className to find this button later
                                                         button_selector: "." + selected_button.className.split(" ", 1)[0]});
                }
            };
            var backside_element = backside.get_element();
            var advanced_settings_button = TT.backside.create_advanced_settings_button(backside, box);
            var generic_backside_update = backside.update_display.bind(backside);
            var buttons = TT.UTILITIES.create_horizontal_table(horizontal.container, vertical.container)
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
            backside_element.appendChild(buttons);
            $(buttons).buttonset();
            backside_element.appendChild(advanced_settings_button);
            backside.rerender();
            return backside;
        }};
}(window.TOONTALK));

// a hole is either empty or contains a widget
window.TOONTALK.box_hole = 
(function (TT) {

    return {
        create: function (index) {
            // perhaps this should share more code with widget (e.g. done below with widget.has_parent)
            var hole = Object.create(this);
            var contents, visible, hole_element;
            hole.is_hole = function () {
                return true;
            }
            hole.is_empty_hole = function () {
                return !contents;
            };
            hole.location_constrained_by_container = function () {
                return false;
            };
            hole.get_element = function () {
                if (!hole_element) {
                    hole_element = document.createElement("div");
                    hole_element.className = "toontalk-box-hole toontalk-frontside toontalk-side";
                    hole_element.toontalk_widget_side = hole;
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
            // there is no backside of an empty hole
            hole.get_frontside_element = function (update) {
                // this once returned the element of its contents
                // but then birds didn't know where to fly from and to
                return this.get_element();
            };
            hole.get_frontside = function () {
                // doubles as its own frontside
                return this;
            };
            hole.widget_side_dropped_on_me = function (dropped, event, robot) {
                var box = this.get_parent_of_frontside();
                var hole_element, hole_position, parent_position, dropped_element, finished_animating, is_plain_text;
                if (dropped.dropped_on_other) {
                    // e.g. so egg can hatch from nest drop
                    dropped.dropped_on_other(this, event, robot);
                }
                if (event) {
                    if (TT.sounds) {
                        TT.sounds.fall_inside.play();
                    }
                    hole_element = this.get_element();
                    is_plain_text = dropped.is_plain_text_element();
                    dropped_element = dropped.get_element();
                    $(dropped_element).css({"z-index": TT.UTILITIES.next_z_index()});  
                    parent_position = $(dropped_element.parentElement).offset();
                    hole_position   = $(hole_element).offset(); 
                    if (!is_plain_text) {
                        dropped_element.style.left = (event.pageX-parent_position.left)+"px";
                        dropped_element.style.top  = (event.pageY-parent_position.top) +"px";
                        $(dropped_element).addClass("toontalk-animating-element");
                    }
                    dropped_element.style.width  = hole_element.style.width;
                    dropped_element.style.height = hole_element.style.height;
                    dropped_element.style.left = (hole_position.left-parent_position.left)+"px";
                    dropped_element.style.top  = (hole_position.top -parent_position.top) +"px";
                    finished_animating = function () {
                        $(dropped_element).removeClass("toontalk-animating-element");
                        box.render();
                        this.set_contents(dropped);
                    }.bind(this);
                    setTimeout(finished_animating, (is_plain_text || TT.UTILITIES.has_animating_image(dropped_element)) ? 0 : 1200);
                    if (box.robot_in_training()) {
                        box.robot_in_training().dropped_on(dropped, this);
                    }
                    if (dropped.save_dimensions) { // and maybe watched robot too?
                        if (dropped.set_size_attributes) {
                            dropped.set_size_attributes($(hole_element).width(), $(hole_element).height());
                        }
                    }
                    if (!dropped.is_backside()) {
                        box.get_frontside_element().dispatchEvent(new CustomEvent('widget added', {detail: {element_widget: dropped_element,
                                                                                                            index: this.get_index()}}));
                    }
                } else {
                    box.rerender();
                    this.set_contents(dropped);
                }
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
                if (contents) {
                    return contents.is_of_type(type_name);
                }
                return type_name === "empty hole";
            };
            hole.get_box = function () {
                return this.get_parent_of_frontside();
            };
            hole.update_display = function () {
                var hole_element;
                if (contents) {
                    hole_element = this.get_frontside_element();
                    update_css_of_hole_contents(contents, contents.get_frontside_element(), $(hole_element).width(), $(hole_element).height());
                }
            };
            hole.dereference = function () {
                if (contents) {
                    return contents.dereference();
                }
                return this;
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
                    contents.set_parent(undefined);
                }
                contents = new_value;
                if (contents) {
                    contents.set_parent(this);
                    if (TT.debugging) {
                        this._debug_string = "A hole containing " + contents.to_debug_string();
                    }
                    contents.set_visible(visible);
                } else if (TT.debugging) {
                    this._debug_string = this.to_debug_string();
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
            hole.remove = function () {
                if (contents) {
                    contents.remove();
                }
            };
            hole.render = function () {
                if (contents) {
                    TT.DISPLAY_UPDATES.pending_update(this);
                }
                // otherwise nothing to do
            };
            hole.rerender = function () {
                if (contents && this.visible()) {
                    return this.render();
                }
                // otherwise nothing to do
            };
            hole.set_running = function (new_value) {
                if (contents) {
                    contents.set_running(new_value);
                }
            };
            hole.maintain_proportional_dimensions = function () {
                if (contents) {
                    return contents.maintain_proportional_dimensions();
                }
            };
            hole.removed_from_container = function (part, event, index, report_error) {
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
            hole.get_full_description = function (to_string_info) {
                if (contents) {
                    return contents.get_full_description(to_string_info);
                }
                return "_";
            };
            hole.is_backside = function () {
                // holes are not quite first-class in that they don't have a backside
                return false;
            };
            hole.get_widget = function () {
                // used to return itself but the box is the 'real' widget
                return this.get_parent_of_frontside();
            };
            hole.is_number = function () {
                if (contents) {
                    return contents.is_number();
                }
                return false;
            };
            hole.is_box = function () {
                if (contents) {
                    return contents.is_box();
                }
                return false;
            };
            hole.is_scale = function () {
                if (contents) {
                    return contents.is_scale();
                }
                return false;
            };
            hole.is_bird = function () {
                if (contents) {
                    return contents.is_bird();
                }
                return false;
            };
            hole.is_nest = function () {
                if (contents) {
                    return contents.is_nest();
                }
                return false;
            };
            hole.is_robot = function () {
                if (contents) {
                    return contents.is_robot();
                }
                return false;
            };
            hole.is_element = function () {
                if (contents) {
                    return contents.is_element();
                }
                return false;
            };
            hole.is_sensor = function () {
                if (contents) {
                    return contents.is_sensor();
                }
                return false;
            };
            hole.is_top_level = function () {
                return false;
            };
            hole.is_plain_text_element = function () {
                return false;
            };
            TT.widget.has_parent(hole);
            TT.widget.has_listeners(hole);
            if (TT.debugging || TT.logging) {
                hole.to_debug_string = function () {
                    var info =  "the " + TT.UTILITIES.ordinal(index) + " hole of the " +
                                (this.get_parent_of_frontside() ? this.get_parent_of_frontside().to_debug_string() : "not-yet-defined box");
                    if (contents) {
                        return info + " which contains " + contents.to_debug_string();
                    }
                    return info + " which is empty";
                };
                hole._debug_string = hole.to_debug_string();
            }
            return hole;
        }
    };
    
}(window.TOONTALK));

window.TOONTALK.box.function = 
(function () {
    var functions = TT.create_function_table();
    functions.add_function_object(
        'box hole', 
        function (message, event, robot) {
            var get_hole_contents = function (number, box) {
                var n = Math.round(number.to_float());
                if (n < 1) {
                    TT.UTILITIES.display_message("The box hole function bird cannot accept " + number + ". She only accepts positive numbers.");
                    return;
                }
                if (n > box.get_size()) {
                    TT.UTILITIES.display_message("The box hole function bird cannot accept " + number + ". The box only has " + box.get_size() + " holes.");
                    return;
                };
                return box.get_hole_contents(n-1);
            };
            return functions.typed_bird_function(message, get_hole_contents, ['number', 'box'], 2, 'box hole', event, robot);
        },
        "The bird will return with what is in a hole of the box. The number determines which hole's contents are returned. 1 for the first hole.",
        "hole",
        ['number', 'box']);
    functions.add_function_object(
        'count holes', 
        function (message, event, robot) {
            var get_size = function (box) {
                return TT.number.create(box.get_size());
            };
            return functions.typed_bird_function(message, get_size, ['box'], 1, 'count holes', event, robot);
        },
        "The bird will return with the number of holes the box has.",
        "count holes",
        ['box']);
    functions.add_function_object(
        'fill hole', 
        function (message, event, robot) {
            var set_hole_contents = function (number, box, new_contents) {
                var n = Math.round(number.to_float());
                if (n < 1) {
                    TT.UTILITIES.display_message("The fill hole function bird cannot accept " + number + ". She only accepts positive numbers.");
                    return;
                }
                if (n > box.get_size()) {
                    box.set_size(n);
                };
                box.set_hole(n-1, new_contents);
                return box;
            };
            return functions.typed_bird_function(message, set_hole_contents, ['number', 'box', undefined], 3, 'fill hole', event, robot);
        },
        "The bird will return with the box where one of its holes has been filled by whatever is in the fourth hole. The number determines which hole's contents are changed. 1 for the first hole.",
        "fill hole",
        ['number', 'box', undefined]);
    functions.add_function_object(
        'split box', 
        function (message, event, robot) {
            var split_box = function (number, box) {
                var n = Math.round(number.to_float());
                var box_size = box.get_size();
                var box_of_boxes = function () {
                    var original_holes = box.get_holes();
                    // create a box with holes after n
                    var box2_size = box_size-n;
                    var box2 = TT.box.create(box2_size);
                    var i;
                    for (i = 0; i < box2_size; i++) {
                        box2.set_hole(i, box.get_hole_contents(i+n));
                    }
                    // reduce original to n holes
                    box.set_size(n);
                    return TT.box.create(2, false, [box, box2]);
                };
                if (n < 0) {
                    TT.UTILITIES.display_message("The box split function bird cannot accept " + number + ". She only accepts zero or positive numbers.");
                    return;
                }
                if (n > box_size) {
                    TT.UTILITIES.display_message("The box split function bird cannot accept " + number + ". The box only has " + box_size + " holes.");
                    return;
                }
                return box_of_boxes();
            };
            return functions.typed_bird_function(message, split_box, ['number', 'box'], 2, 'split box', event, robot);
        },
        "The bird will return with a box with the original box split in two. The number determines where the split is. 1 for after the first hole.",
        "split",
        ['number', 'box']);
    functions.add_function_object(
        'merge boxes', 
        function (message, event, robot) {
            var merge_box = function () {
                var new_box_size = 0;
                var i, j, merged_box, merged_box_hole_index, box_size;
                if (arguments.length === 0) {
                    return TT.box.create(0);
                }
                merged_box = arguments[0]; // reuse the first box
                for (i = 0; i < arguments.length; i++) {
                    new_box_size += arguments[i].get_size();
                }
                merged_box_hole_index = merged_box.get_size();
                merged_box.set_size(new_box_size);
                for (i = 1; i < arguments.length; i++) {
                    box_size = arguments[i].get_size();
                    for (j = 0; j < box_size; j++) {
                        merged_box.set_hole(merged_box_hole_index, arguments[i].get_hole_contents(j));
                        merged_box_hole_index++;
                    }
                }
                return merged_box;
            };
            return functions.typed_bird_function(message, merge_box, ['box'], undefined, 'merge boxes', event, robot);
        },
        "The bird will return with a box that joins together all the boxes.",
        "merge",
        ['any number of boxes']);
    return functions.get_function_table();
}
());

}(window.TOONTALK));

