 /**
 * Implements ToonTalk's scales that compare two widgets and lean towards the bigger/heavier/...
 * Authors: Ken Kahn
 * License: New BSD
 */

/*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */

// scales are like boxes with two holes (with an usual appearance)
// their unique property is they tilt depending upon what is in their 'holes'

window.TOONTALK.scale = (function (TT) {
    "use strict";

    var PAN_FRACTION_OF_WIDTH  = 0.4;
    var PAN_FRACTION_OF_HEIGHT = 0.4;

    var scale = Object.create(TT.widget);

    scale.create = function (initial_contents, description, new_scale, inactive_state, name) {
        // inactive_state is the state of the scale when it became inactive (or undefined)
        var full_size_width = 123;
        var full_size_height = 91;
        var aspect_ratio = full_size_width/full_size_height;
        var contents_listener = function () {
                                    new_scale.rerender();
                                };
        var get_contents_dimensions_function = function () {
                return new_scale.get_contents_dimensions();
            };
        var box_get_json, box_copy, box_get_path_to, previous_state;
        // new_scale is bound when copying a scale
        if (!new_scale) {
            new_scale = TT.box.create(2, undefined, initial_contents, description, name || "");
        } 
        box_get_json = new_scale.get_json;
        box_copy = new_scale.copy;
        box_get_path_to = new_scale.get_path_to;
        new_scale.is_scale = function () {
            return true;
        };
        new_scale.copy = function (parameters) {
            var copy_as_box, copy;
            // if name is not captured here box_copy will use its own name generator for labelling box holes
            var name = this.get_name();
            if (!parameters) {
                // as a container it may contain birds and nests that need the parameters object
                // to maintain the correct relationships between birds and nests in the copy
                parameters = {};
            }
            copy_as_box = box_copy.call(this, parameters);
            copy = TT.scale.create(undefined, undefined, copy_as_box, parameters.just_value && this.get_state());
            return new_scale.add_to_copy(copy, parameters);
        };
        new_scale.get_json = function (json_history, callback, start_time) {
            var new_callback = function (json, start_time) {
                json.type = 'scale';
                json.inactive_state = this.get_inactive_state();
                callback(json, start_time);
            }.bind(this);
            box_get_json.call(this, json_history, new_callback, start_time);
        };
        new_scale.get_path_to = function (widget, robot) {
            var path = box_get_path_to.call(this, widget, robot);
            if (path) {
                path.true_type = 'scale';
            }
            return path;
        };
        new_scale.drop_on = function (side_of_other, event, robot) {
            if (side_of_other.widget_side_dropped_on_me) {
                return side_of_other.widget_side_dropped_on_me(this, event, robot);
            }
        };
        new_scale.widget_side_dropped_on_me = function (dropped, event, robot) {
            var left_contents  = this.get_hole_contents(0);
            var right_contents = this.get_hole_contents(1); 
            var hole_index;
            if (dropped.dropped_on_other) {
                // e.g. so egg can hatch from nest drop
                dropped.dropped_on_other(this, event, robot);
            }
            if (left_contents && !right_contents) {
                this.get_hole(1).widget_side_dropped_on_me(dropped, event, robot);
                return true;
            }
            if (!left_contents && (right_contents || !event)) {
                // if a robot drops a scale on a scale with empty pans it goes in left pan
                this.get_hole(0).widget_side_dropped_on_me(dropped, event, robot);
                return true;
            }
            hole_index = this.which_hole(event, false);
            if (hole_index === 0) {
                if (left_contents) {
                    if (left_contents.drop_on) {
                        return dropped.drop_on(left_contents, event, robot);
                    }
                    return; // not much can be done if contents doesn't accept drop_one
                }
            } else {
                if (right_contents) {
                    if (right_contents.drop_on) {
                        return dropped.drop_on(right_contents, event, robot);
                    }
                    return; // not much can be done
                }
            }
            // hole was empty so fill it
            this.get_hole(hole_index).widget_side_dropped_on_me(dropped, event, robot); 
            return true;
        };
        new_scale.which_hole = function (event, or_entire_thing) {
            // if or_entire_thing is true can return -1 meaning the whole scale
            // otherwise returns closest pan
            var frontside_element = new_scale.get_frontside_element();
            var position = $(frontside_element).offset();
            var width = TT.UTILITIES.get_element_width(frontside_element);
            var center = position.left+width/2;
            var distance_to_center = event.clientX-center;
            var error = or_entire_thing ? width/10 : 0; // within 1/10 of the width to center
            if (-distance_to_center > error) {
                return 0;
            } else if (distance_to_center > error) {
                return 1;
            } else {
                // at center
                return -1;
            }
        };
        new_scale.get_inactive_state = function () {
            return inactive_state;
        };
        new_scale.update_display = function () {
            var frontside_element = this.get_frontside_element(true);
            var $frontside_element = $(frontside_element);
            var $scale_parts = $(frontside_element).children(".toontalk-scale-half");
            var $parent = $(frontside_element).parent();
            var container_element = ($parent.is(".toontalk-backside") || $frontside_element.is(".toontalk-conditions-contents")) ? 
                                    frontside_element : 
                                    $parent.get(0);
            var scale_width  = $(container_element).width()  || $frontside_element.width();
            var scale_height = $(container_element).height() || $frontside_element.height();
            var update_hole = function (hole_element, hole, index) {
                var contents = hole.get_contents();
                var content_element = (contents || hole).get_element(true);
                var left = index*scale_width*0.5;
                var top  = 0;
                var width  = scale_width*0.5;
                var height = scale_height;
                var contents_left, contents_top, contents_width, contents_height;
                TT.UTILITIES.set_css(hole_element,
                                     {left:   left,
                                      top:    top,
                                      width:  width,
                                      height: height});
                if (hole_element !== content_element) {
                    if (index === 0) {
                        contents_left = scale_width*-0.05;
                    } else {
                        contents_left = scale_width*0.15;
                    }
                    if (class_name === "toontalk-scale-balanced") {
                        contents_top = scale_height*0.1;
                    } else if ((index === 0 && class_name === "toontalk-scale-left_heavier") ||
                               (index === 1 && class_name === "toontalk-scale-right_heavier")) {
                        contents_top = scale_height*0.25;
                    } else if ((index === 1 && class_name === "toontalk-scale-left_heavier") ||
                               (index === 0 && class_name === "toontalk-scale-right_heavier")) {
                        contents_top = scale_height*-0.1;
                    } else {
                        contents_top = scale_height*0.2;
                    }
                    contents_width  = scale_width  * PAN_FRACTION_OF_WIDTH;
                    contents_height = scale_height * PAN_FRACTION_OF_HEIGHT;
                    $(content_element).css({left:   contents_left,
                                            top:    contents_top,
                                            width:  contents_width,
                                            height: contents_height});
                    if (contents) {
                        if (contents.set_location_attributes) {
                            contents.set_location_attributes(contents_left, contents_top);
                        }
                        if (contents.set_size_attributes) {
                            contents.set_size_attributes(contents_width, contents_height);
                        }
                        if (contents.is_backside()) {
                            contents.update_display(); // TODO: see if render is OK
                            contents.scale_to(contents_width, contents_height);      
                        }
                        contents.render();
                    }
                    hole_element.appendChild(content_element); // no-op if already there
                    // holes are really pans and their dimensions are different from box holes
                    hole.get_contents_dimensions = get_contents_dimensions_function;
                    hole.is_scale_pan = function () { return true; };
                }                                          
            };
            var state, class_name, scales;
            if ($frontside_element.is(".toontalk-top-level-resource")) {
                class_name = "toontalk-scale-balanced";
            } else {
                state = this.get_state();
                if (typeof state === 'undefined') {
                    class_name = "toontalk-scale-unbalanced";
                } else {
                    class_name = ["toontalk-scale-right_heavier", "toontalk-scale-balanced", "toontalk-scale-left_heavier"][state+1];
                }
            }
            $frontside_element.removeClass("toontalk-scale-balanced toontalk-scale-left_heavier toontalk-scale-right_heavier toontalk-scale-unbalanced");
            $frontside_element.addClass(class_name);
            $frontside_element.addClass("toontalk-scale");
             if (scale_width === 0) {
                scale_width = 1;
            }
            if (scale_height === 0) {
                scale_height = 1;
            }
            if (!$(container_element).is(".toontalk-top-level-resource") &&
                !$(frontside_element).is(".toontalk-top-level-resource")) {
                // don't scale to fit container if top-level resource
                scales = TT.UTILITIES.scale_to_fit(frontside_element, container_element, full_size_width, full_size_height);
                scale_width  /= scales.x_scale;
                scale_height /= scales.y_scale;
            }
            if ($scale_parts.length === 2) {
                $scale_parts.each(function (index, hole_element) {
                        // delaying ensures they contents of the holes have the right size
                        TT.UTILITIES.set_timeout(function () {
                                                     update_hole(hole_element, this.get_hole(index), index);
                                                 }.bind(this));
                    }.bind(this));
            } else {
                this.get_holes().forEach(function (hole, index) {
                        var hole_element = hole.get_element();
                        var contents = hole.get_contents();
                        if (index === 0) {
                            $(hole_element).addClass("toontalk-left_scale  toontalk-scale-half");
                        } else {
                            $(hole_element).addClass("toontalk-right_scale toontalk-scale-half");
                        }
                        frontside_element.appendChild(hole_element);
                        hole.update_display();
     
                });
                // now that the "pan" widget elements have been created update display again
                setTimeout(function () {
                                this.render();
                           }.bind(this),
                           // not sure why a delay is needed but otherwise covered nests on scales display their name on top of their contents
                           100);
            }
            TT.UTILITIES.give_tooltip(frontside_element, this.get_title());
            if (TT.debugging) {
                this._debug_string = this.to_debug_string();
            } 
        };
        new_scale.get_contents_dimensions = function () {
            // dimensions of widgets in either pan
            var frontside_element = this.get_frontside_element(true);
            var $parent = $(frontside_element).parent();
            var container_element = ($parent.is(".toontalk-backside") || $frontside_element.is(".toontalk-conditions-contents")) ? 
                                    frontside_element : 
                                    $parent.get(0);
            var scale_width  = $(container_element).width()  || $frontside_element.width();
            var scale_height = $(container_element).height() || $frontside_element.height();
            return {width:  scale_width  * PAN_FRACTION_OF_WIDTH,
                    height: scale_height * PAN_FRACTION_OF_HEIGHT};  
        };
        new_scale.render = function () {
            // do standard behaviour -- not what boxes do
            TT.DISPLAY_UPDATES.pending_update(this);
        };
        new_scale.get_type_name = function (plural) {
            if (plural) {
                return "scales";
            }
            return 'scale';
        };
        new_scale.get_help_URL = function () {
            return "docs/manual/scales.html";
        };
        new_scale.toString = function () {
            var left_contents  = this.get_hole_contents(0); 
            var right_contents = this.get_hole_contents(1);
            var state = this.get_state();
            var description, left_pan, right_pan;
            switch (state) {
                case -1:
                description = "scale leaning to the right";
                break;
                case 1:
                description = "scale leaning to the left";
                break;
                case 0:
                description = "balanced scale";
                break;
                default:
                description = "unbalanced scale";
                if (!left_pan && !right_pan) {
                    return description;
                }
            }
            if (left_contents) {
                left_pan = "contains " + TT.UTILITIES.add_a_or_an(left_contents.get_full_description());
            } else {
                left_pan = "is empty";
            }
            if (right_contents) {
                right_pan = "contains " + TT.UTILITIES.add_a_or_an(right_contents.get_full_description());
            } else {
                right_pan = "is empty";
            }
            return description + " and the left pan " + left_pan + " and the right pan " + right_pan;
        };
        new_scale.create_backside = function () {
            return TT.scale_backside.create(this);
        };
        new_scale.get_state = function () {
            // can be -1, 0, 1 or undefined
            // 1 means left is heavier while -1 means right is
            var inactive_state = this.get_inactive_state();
            var left_contents, right_contents;
            if (inactive_state) {
                return inactive_state;
            }
            left_contents  = this.get_hole_contents(0);
            right_contents = this.get_hole_contents(1);
            if (!left_contents && !right_contents) {
                return; // undefined
            } else if (!left_contents) {
                return -1;
            } else if (!right_contents) {
               return 1;
            } else {
               // if either are covered nests compare their top contents
               left_contents  = left_contents .dereference();
               right_contents = right_contents.dereference();
               if (left_contents.get_widget().compare_with) {
                   return left_contents.get_widget().compare_with(right_contents.get_widget());
               }
            }
        };
        // equals needed??
        new_scale.match = function (other) {
            if (other.get_widget().match_with_scale) {
                return other.get_widget().match_with_scale(this);
            }
            this.last_match = other;
            return this;
        };
        new_scale.match_with_scale = function (scale_pattern) {
            var left_contents, right_contents;
            left_contents  = this.get_hole_contents(0);
            if (left_contents && left_contents.is_nest() && !left_contents.has_contents()) {
                // suspend on nest rather than fail
                return [[left_contents, this]];
            }
            right_contents = this.get_hole_contents(1);
            if (right_contents && right_contents.is_nest() && !right_contents.has_contents()) {
                // suspend on nest rather than fail
                return [[right_contents, this]];
            }
            if (this.get_state() !== scale_pattern.get_state()) {
                // mismatch if tilted differently
                scale_pattern.last_match = this;
                return scale_pattern;
            }
            return this.match_with_this_scale(scale_pattern);
        };
        new_scale.match_with_this_scale = function (pattern_box) {
            // much like box.match_with_this_box but for different type and size is always 2
            // typically only nests are waiting but a bird busy delivering before returning to a hole also waits
            var waiting_widgets = [];
            var i, my_hole, pattern_hole, hole_match, contents_temporarily_removed;
            for (i = 0; i < 2; i++) {
                pattern_hole = pattern_box.get_hole_contents(i);
                if (pattern_hole) {
                    my_hole = this.get_hole_contents(i);
                    if (my_hole) {
                        hole_match = TT.UTILITIES.match(pattern_hole, my_hole.dereference());
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
        new_scale.match_with_this_box = function (other) {
            // need to override the default box match box code
            other.last_match = this;
            return other;
        };
        new_scale.compare_with = function (other) {
            if (other.compare_with_scale) {
                return -1*other.compare_with_scale(this);
            }
        };
        new_scale.compare_with_scale = function (other_scale) {
            var state1 = this.get_state();
            var state2 = other_scale.get_state();
            if (state1 && !state2) {
                return 1;
            }
            if (!state1 && state2) {
                return -1;
            }
            if (state1 > state2) {
                return 1;
            }
            if (state1 < state2) {
                return -1;
            }
            return 0;
        };
        // scales have names not their holes like boxes which would otherwise be inherited
        new_scale.get_name_input_label = undefined;
        new_scale.generate_name = function () {
            return "";
        };
        // following should only be done when first becoming visible (and removed when becoming hidden)
        new_scale.get_hole(0).add_listener('value_changed', contents_listener);
        new_scale.get_hole(1).add_listener('value_changed', contents_listener);
        if (new_scale.get_hole_contents(0)) {
            new_scale.get_hole_contents(0).add_listener('value_changed', contents_listener);
        }
        if (new_scale.get_hole_contents(1)) {
            new_scale.get_hole_contents(1).add_listener('value_changed', contents_listener);
        }
        new_scale.get_custom_title_prefix = function () {
            var state = this.get_state();
            var left_contents  = this.get_hole_contents(0);
            var right_contents = this.get_hole_contents(1);
            if (typeof state === 'undefined') {
                if (left_contents && right_contents) {
                    return "I can't compare " + left_contents + " and " + right_contents + ".";
                }
                return "Use me to compare two things. Drop them in my pans.";
            } else {
                if (!left_contents) {
                    left_contents = "empty pan";
                }
                if (!right_contents) {
                    right_contents = "empty pan";
                }
                return ["The " + right_contents + " is greater than the " + left_contents + ".",
                        "The " + right_contents + " is equal to the "     + left_contents + ".",
                        "The " + right_contents + " is less than the "    + left_contents + "."][state+1];
            }            
        };
        new_scale.get_default_description = function () {
            return "a scale for comparing things.";
        };
        new_scale.set_name = undefined; // unlike boxes which re-use name for labels
        if (TT.debugging) {
            new_scale._debug_id = TT.UTILITIES.generate_unique_id();
            new_scale._debug_string = new_scale.to_debug_string();
        }
        return new_scale;
    };

    TT.creators_from_json["scale"] = function (json, additional_info) {
        return scale.create(TT.UTILITIES.create_array_from_json(json.contents, additional_info), json.description, undefined, json.inactive_state, json.name);
    };

    return scale;

}(window.TOONTALK));

window.TOONTALK.scale_backside = 
(function (TT) {
    "use strict";
    return {
        create: function (scale) {
            var backside = TT.backside.create(scale);
            backside.add_description_setting();
            // doesn't have a name so don't add name input area
            backside.get_element().appendChild(TT.backside.create_advanced_settings_button(backside, scale));
            return backside;
        }  
    };
}(window.TOONTALK));