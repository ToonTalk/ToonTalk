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

    var scale = Object.create(TT.widget);

    scale.create = function (initial_contents, description, new_scale) {
        var full_size_width = 123;
        var full_size_height = 91;
        var aspect_ratio = full_size_width/full_size_height;
        var contents_listener = function () {
                                    new_scale.rerender();
        };
        var which_hole = function (event) {
            var $frontside_element = $(new_scale.get_frontside_element());
            var position = $frontside_element.offset();
            var center = position.left+$frontside_element.width()/2;
            if (event.clientX < center) {
                return 0;
            } else {
                return 1;
            }
        };
        var box_get_json, box_copy, box_get_path_to, previous_state;
        // new_scale is bound when copying a scale
        if (!new_scale) {
            new_scale = TT.box.create(2, undefined, initial_contents, description);
        } 
        box_get_json = new_scale.get_json;
        box_copy = new_scale.copy;
        box_get_path_to = new_scale.get_path_to;
        new_scale.copy = function (just_value) {
            var copy_as_box = box_copy.call(this, just_value);
            var copy = TT.scale.create(undefined, undefined, copy_as_box);
            return new_scale.add_to_copy(copy, just_value);
        };
        new_scale.get_json = function (json_history) {
            var scale_json = box_get_json.call(this, json_history);
            scale_json.type = 'scale';
            return scale_json;
        };
        new_scale.get_path_to = function (widget, robot) {
            var path = box_get_path_to.call(this, widget, robot);
            path.true_type = 'scale';
            return path;
        };
        new_scale.widget_to_highlight = function (event) {
            var hole_index = which_hole(event);
            var hole = this.get_hole(hole_index);
            var hole_contents = hole.get_contents();
            if (hole_contents) {
                return hole_contents;
            }
            return hole;
        };
        new_scale.drop_on = function (other, is_backside, event, robot) {
            if (other.widget_dropped_on_me) {
                return other.widget_dropped_on_me(this, is_backside, event, robot);
            }
        };
        new_scale.widget_dropped_on_me = function (dropped, is_backside, event, robot) {
            var left_contents  = this.get_hole_contents(0);
            var right_contents = this.get_hole_contents(1); 
            var hole_index;
            if (left_contents && !right_contents) {
                this.set_hole(1, dropped);
                return true;
            }
            if (!left_contents && right_contents) {
                this.set_hole(0, dropped);
                return true;
            }
            hole_index = which_hole(event);
            if (hole_index === 0) {
                if (left_contents) {
                    if (left_contents.drop_on) {
                        return dropped.drop_on(left_contents, is_backside, event, robot);
                    }
                    return; // not much can be done
                }
            } else {
                if (right_contents) {
                    if (right_contents.drop_on) {
                        return dropped.drop_on(right_contents, is_backside, event, robot);
                    }
                    return; // not much can be done
                }
            }
            // hole was empty so fill it
            this.set_hole(hole_index, dropped); 
            return true;
        };
        new_scale.update_display = function () {
            var frontside_element = this.get_frontside_element();
            var $frontside_element = $(frontside_element);
            var $scale_parts = $(frontside_element).children(".toontalk-scale-half");
            var container_element = $(frontside_element).parent().is(".toontalk-top-level-backside") ? frontside_element : frontside_element.parentElement;
            var scale_width  = $(container_element).width();
            var scale_height = $(container_element).height();
            var update_hole = function (hole_element, hole, index) {
                var content_frontside_element = hole.get_frontside_element(true);
                var content_frontside_element;
                var left = index*scale_width*0.5;
                var top = 0;
                var width = scale_width*0.5;
                var height = scale_height;
                var hole_widget = hole.get_contents();
                var contents_left, contents_top, contents_width, contents_height;
                $(hole_element).css({left:   left,
                                     top:    top,
                                     width:  width,
                                     height: height});
                if (hole_element !== content_frontside_element) {
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
                    contents_width  = scale_width *0.4;
                    contents_height = scale_height*0.4;
                    $(content_frontside_element).css({left:   contents_left,
                                                      top:    contents_top,
                                                      width:  contents_width,
                                                      height: contents_height});
                    if (hole_widget) {
                        if (hole_widget.set_location_attributes) {
                            hole_widget.set_location_attributes(contents_left, contents_top);
                        }
                        if (hole_widget.set_size_attributes) {
                            hole_widget.set_size_attributes(contents_width, contents_height);
                        }           
                    }
                    hole_element.appendChild(content_frontside_element); // no-op if already there
                }                                          
            };
            var state, class_name;
            var scales = TT.UTILITIES.scale_to_fit(frontside_element, container_element, full_size_width, full_size_height);
            scale_width  /= scales.x_scale;
            scale_height /= scales.y_scale;
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
            if ($scale_parts.length === 2) {
                $scale_parts.each(function (index, hole_element) {
                        // delaying ensures they contents of the holes have the right size
                        setTimeout(function () {
                                update_hole(hole_element, this.get_hole(index), index);
                            }.bind(this),
                            1);
                    }.bind(this));
            } else {
                this.get_holes().forEach(function (hole, index) {
                        var hole_element = hole.get_element();
                        if (index === 0) {
                            $(hole_element).addClass("toontalk-left_scale  toontalk-scale-half");
                        } else {
                            $(hole_element).addClass("toontalk-right_scale toontalk-scale-half");
                        }
//                      $(hole_element).removeClass("toontalk-box-hole");
                        update_hole(hole_element, hole, index);
                        frontside_element.appendChild(hole_element);                       
                    });
            }
            frontside_element.title = this.get_title();
            if (TT.debugging) {
                this.debug_string = this.toString();
            } 
        };
        new_scale.get_type_name = function () {
            return 'scale';
        };
        new_scale.toString = function () {
            var left_contents  = this.get_hole(0); 
            var right_contents = this.get_hole(1);
            var description, left_pan, right_pan;
            switch (this.get_state()) {
                case -1:
                description = "scale leaning to the left";
                break;
                case 1:
                description = "scale leaning to the right";
                break;
                case 0:
                description = "balanced scale";
                break;
                default:
                description = "unbalanced scale";
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
            var left_contents  = this.get_hole_contents(0);
            var right_contents = this.get_hole_contents(1);
            if (!left_contents && !right_contents) {
                return; // undefined
            } else if (!left_contents) {
                return -1;
            } else if (!right_contents) {
               return 1;
            } else {
               if (left_contents.compare_with) {
                   return left_contents.compare_with(right_contents);
               }
            }
        };
        // equals??
        new_scale.match = function (other) {
            if (other.match_with_scale) {
                return other.match_with_scale(this);
            }
            return "not matched";
        };
        new_scale.match_with_scale = function (other_scale) {
            if (this.get_state() === other_scale.get_state()) {
                return "matched";
            }
            return "not matched";
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
        // following should only be done when first becoming visible (and removed when becoming hidden)
        new_scale.get_hole(0).add_listener('value_changed', contents_listener);
        new_scale.get_hole(1).add_listener('value_changed', contents_listener);
        if (new_scale.get_hole_contents(0)) {
            new_scale.get_hole_contents(0).add_listener('value_changed', contents_listener);
        }
        if (new_scale.get_hole_contents(1)) {
            new_scale.get_hole_contents(1).add_listener('value_changed', contents_listener);
        }
        return new_scale;
    };

    TT.creators_from_json["scale"] = function (json, additional_info) {
        return scale.create(TT.UTILITIES.create_array_from_json(json.contents, additional_info), json.description);
    };

    return scale;

}(window.TOONTALK));

window.TOONTALK.scale_backside = 
(function (TT) {
    "use strict";
    return {
        create: function (scale) {
            var backside = TT.backside.create(scale);
            backside.add_advanced_settings(true);
            return backside;
        }
        
    };
}(window.TOONTALK));