 /**
 * Implements ToonTalk's boxes
 * Authors: Ken Kahn
 * License: New BSD
 */

/*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */

window.TOONTALK.box = (function (TT) {
    "use strict";

    var box = Object.create(TT.widget);

    box.create = function (size, horizontal, contents, description) {
        var new_box = Object.create(box);
        if (contents) {
            contents.forEach(function (widget) {
                if (widget) {
                    // assumes only frontsides end up in boxes -- relax this someday
                    widget.set_parent_of_frontside(new_box);
                }
            });
        } else {
            contents = [];
        }
        if (TT.debugging && size !== contents.length) {
            // eventually remove this when old saved code has been updated
            console.log("JSON size should be " + contents.length + " not " + size);
            size = contents.length;
        }
        if (typeof horizontal === 'undefined') {
            horizontal = true;
        }
        new_box.get_size = function () {
            return size;
        };
        new_box.set_size = function (new_size, update_display) {
            if (size === new_size) {
                return false;
            }
            size = new_size;
            contents.length = size;
            if (update_display) {
                this.rerender();
            }
            if (TT.debugging) {
                this.debug_string = this.toString();
            }
            return true;
        };
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
            return contents[index];
        };
        new_box.set_hole = function (index, new_value, update_display) {
//             if (contents[index]) {
//                 contents[index].set_parent_of_frontside(undefined);
//             }
            contents[index] = new_value;
            contents[index].set_parent_of_frontside(this);
            if (update_display) {
                this.update_hole_display(index);
            }
            if (TT.debugging) {
                this.debug_string = this.toString();
            }
        };
        new_box.get_contents = function () {
            // would be nice to make this private - needed by copy
            return contents;
        };
        new_box.set_contents = function (new_value) {
            var i, widget;
            if (contents) {
                for (i = 0; i < contents.length; i++) {
                    widget = contents[i];
                    if (widget) {
                        widget.set_parent_of_frontside(undefined);
                    }
                }
            }
            contents = new_value;
            for (i = 0; i < contents.length; i++) {
                widget = contents[i];
                if (widget) {
                    widget.set_parent_of_frontside(this);
                }
            }
        };
        new_box = new_box.add_standard_widget_functionality(new_box);
        new_box.set_description(description);
        if (TT.debugging) {
            new_box.debug_string = new_box.toString();
            new_box.debug_id = TT.UTILITIES.generate_unique_id();
        }
        return new_box;
    };
    
    box.copy = function (just_value) {
        var copy = box.create(this.get_size(), this.get_horizontal(), TT.UTILITIES.copy_widgets(this.get_contents(), just_value, copy), this.get_description());
        return this.add_to_copy(copy, just_value);
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
            my_hole = this.get_hole(i);
            pattern_hole = other_box.get_hole(i);
            if ((!my_hole && pattern_hole) || (my_hole && !pattern_hole)) {
                return false;
            }
            if (my_hole && pattern_hole && !my_hole.equals(pattern_hole)) {
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
            pattern_hole = pattern_box.get_hole(i);
            if (pattern_hole) {
                my_hole = this.get_hole(i);
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
            if (hole) {
                contents += hole.get_description();
            } else {
                contents += "_";
            }
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
            if (this.get_hole(i)) {
                contents_json[i] = TT.UTILITIES.get_json(this.get_hole(i), json_history);
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
    
    box.to_HTML = function () {
        var horizontal = this.get_horizontal();
        var extra_classes = (horizontal ? 'horizontal' : 'vertical');
        var html = "<table class='toontalk-box toontalk-box-" + extra_classes + "'>";
        var size = this.get_size();
        var i;
        var percentage = size === 0 ? 1 : 100 / size;
        var horizontal_style = horizontal ? " style='width:" + percentage + "%;'" : "";
        var vertical_style =   horizontal ? "" : " style='height:" + percentage + "%;'";
        var erased = this.get_erased && this.get_erased();
        html += "<tr" + vertical_style + ">";
        for (i = 0; i < size; i++) {
            html += "<td class='toontalk-box-hole toontalk-box-hole-" + extra_classes + "'" + horizontal_style + ">";
            if (!erased) {
                html += "<div class='toontalk-hole-about-to-be-replaced' />";
            }
            html += "</td>";
            if (!horizontal) {
                html += "</tr>";
                if (i+1 < size) {
                    html += "<tr" + vertical_style + ">";
                }
            }
        }
        if (horizontal) {
            html += "</tr>";
        }
        html += "</table>";
        return html;
    };
    
    box.update_display = function() {
        var frontside = this.get_frontside(true);
        var frontside_element = frontside.get_element();
        var new_HTML = this.to_HTML();
        if (!frontside_element.firstChild) {
            frontside_element.appendChild(document.createElement('div'));
        }
        frontside_element.firstChild.innerHTML = new_HTML;
        $(frontside_element.firstChild).addClass("toontalk-widget");
        $(".toontalk-hole-about-to-be-replaced").each(this.update_hole_display.bind(this));
        frontside_element.title = this.get_title();
        if (TT.debugging) {
            this.debug_string = this.toString();
        }
    };
    
    box.update_hole_display = function (index, old_hole_element) {
        var hole, box_frontside, size, hole_frontside, hole_frontside_element, box_frontside_element, $element_container;
        if (!this.visible()) {
            return;
        }
        hole = this.get_hole(index); // maybe should rename to to hole_contents or the like
        box_frontside = this.get_frontside();
        size = this.get_size();
        if (!hole) {
            hole = TT.box_empty_hole.create(index);
            this.set_hole(index, hole);
        }
        hole_frontside = hole.get_frontside(true);
        if (old_hole_element && old_hole_element.parentNode) {
            hole_frontside_element = hole_frontside.get_element();
            // use JQuery replaceWith instead?
            old_hole_element.parentNode.replaceChild(hole_frontside_element, old_hole_element);
            TT.UTILITIES.set_position_is_absolute(hole_frontside_element, false);
            $(hole_frontside_element).addClass("toontalk-frontside-in-box");
        } else {
            old_hole_element = hole_frontside.get_element();
            $element_container = $(box_frontside.get_element()).find(".toontalk-box-hole").eq(index);
            old_hole_element.width_before_in_box = $(old_hole_element).width();
            old_hole_element.height_before_in_box = $(old_hole_element).height();
//             if ($(old_hole_element).is(".toontalk-nest")) {
//                 // don't change the size of nests -- at least until it is clear how to scale them
//                 // a hack until a solution is found -- this changes the box size so nest fits
//                 setTimeout(function () {
//                     $(old_hole_element).css({width:  old_hole_element.width_before_in_box,
//                                              height: old_hole_element.height_before_in_box});              
//                 },
//                 100);
//             } else {
                if (this.get_horizontal()) {
                    $(old_hole_element).css({width: 'auto',
                                             height: $element_container.height()});
                } else {
                    $(old_hole_element).css({width: $element_container.width(),
                                             height: 'auto'});
                }
//             }
            // following should be more general but couldn't get it to work well
//             TT.UTILITIES.scale_to_fit(old_hole_element, $element_container.get(0));
            hole.update_display();
            if ($element_container.children(".toontalk-empty-hole").length > 0) {
                // if an empty hole was there then remove it (though could make it invisible instead so easier to restore)
                $element_container.empty();
            }
            $element_container.append(old_hole_element);
            // since drag and drop is set up with absolute as the default
            // is this redundant now?
            TT.UTILITIES.set_position_is_absolute(old_hole_element, false);
            $(old_hole_element).addClass("toontalk-frontside-in-box");
        }
//         TT.DISPLAY_UPDATES.pending_update(hole_frontside);
        hole.rerender();
    };
    
    box.empty_hole = function (index, update_display) {
        // could restore the 'original' empty_hole rather than create a new one here
        this.set_hole(index, TT.box_empty_hole.create(index), update_display);
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
    
    box.removed_from_container = function (part, backside_removed, event) {
        var size = this.get_size();
        var update_display = !!event;
        var i, part_frontside_element;
        for (i = 0; i < size; i++) {
//             console.log("Part is " + part.toString() + " hole " + i + " is " + this.get_hole(i).toString()); for debugging
            if (part === this.get_hole(i)) {
                this.empty_hole(i, update_display);
                if (update_display) {
                    this.rerender();
                    part_frontside_element = part.get_frontside_element();
                    $(part_frontside_element).removeClass("toontalk-frontside-in-box");
                    if (part_frontside_element.width_before_in_box) {
                        // without this timeout the resizing doesn't apply
                        // not sure why
                        setTimeout(function () {
                            $(part_frontside_element).css({width: part_frontside_element.width_before_in_box,
                                                           height: part_frontside_element.height_before_in_box});
                            part.rerender();
                        },
                        10);
                    }
                }
                return this;
            }
        }
        console.log("Attempted to remove " + part + " from " + this + " but not found.");
    };
    
    box.get_path_to = function (widget, robot) {
        var size = this.get_size();
        var i, part, path, sub_path;
        var removing_widget = robot.current_action_name === 'pick up';
        for (i = 0; i < size; i++) {
            part = this.get_hole(i);
            if (widget === part) {
                return TT.box.path.create(i, removing_widget);
            } else if (part.get_path_to) {
                sub_path = part.get_path_to(widget, robot);
                if (sub_path) {
                    path = TT.box.path.create(i);
                    if (part.get_type_name() !== 'nest' && part.get_type_name() !== 'sensor') {
                        // if nest then widget must have been on the nest (or inside something that was -- not yet handled!)
                        path.next = sub_path;
                    }
                    return path;
                }
            }
        }
    };
    
    box.dereference = function (path, robot) {
        var index, hole;
        if (path) {
            index = path.get_index && path.get_index();
            if (typeof index === 'number') {
                hole = this.get_hole(index);
                if (hole) {
                    if (path.next) {
                        return hole.dereference(path.next, robot);
                    }
                    if (path.removing_widget()) {
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
        create: function (index, removing_widget) {
            return {
                get_index: function () {
                    return index;
                },
                removing_widget: function () {
                    return removing_widget;
                },
                toString: function () {
                    return "the " + TT.UTILITIES.cardinal(index) + " hole "; // + (this.next ? "; " + TT.path.toString(this.next) : "");
                },
                get_json: function (json_history) {
                    return {type: "box_path",
                            index: index,
                            removing_widget: removing_widget,
                            next: this.next && this.next.get_json(json_history)};
                }
            };
        },
    
        create_from_json: function (json, additional_info) {
            var path = box.path.create(json.index, json.removing_widget);
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

window.TOONTALK.box_empty_hole = 
(function (TT) {
    "use strict";
    return {
        create: function (index) {
            // this should share more code with widget (e.g. done below with widget.has_parent)
            // box and parent should be same now -- simplify
            var empty_hole = Object.create(this);
            var hole_element;
            empty_hole.get_element = function () {
                if (!hole_element) {
                    hole_element = document.createElement("div");
                    hole_element.className = "toontalk-empty-hole toontalk-frontside toontalk-side";
                    $(hole_element).data("owner", empty_hole);
                }
                return hole_element;
            };
            empty_hole.get_frontside = function () {
                return this.get_element();
            };
            empty_hole.get_side_element = function () {
                return this.get_element();
            };
            // there is no backside of an empty hole
            empty_hole.get_frontside_element = empty_hole.get_side_element;
            empty_hole.update_display = function () {
                // should be nothing to do
                // but height percentage not working as expected
                var box_frontside_element;
                var box = this.get_parent_of_frontside().widget;
                if (box && !box.get_horizontal()) {
                    box_frontside_element = box.get_frontside_element();
                    $(this.get_element()).css({"min-height": $(box_frontside_element).height() / box.get_size()});
                }
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
                    TT.robot.in_training.dropped_on(dropped, empty_hole);
                }
                box.set_hole(index, dropped, true);
                dropped.set_parent_of_frontside(this, false);
                box.rerender();
                if (dropped.dropped_on_other) {
                    // e.g. so egg can hatch from nest drop
                    dropped.dropped_on_other(this, false, event, robot);
                }
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
                return TT.box_empty_hole.create(index);
            };
            empty_hole.match = function () {
                return "matched";
            };
            empty_hole.get_type_name = function () {
                return "empty hole";
            };
            empty_hole.visible = function () {
                return this.get_parent_of_frontside().widget.visible(); // you can't see it but if box is visible then it is 
            };
            empty_hole.render = function () {
                // nothing to do
            };
            empty_hole.rerender = function () {
                var box = this.get_parent_of_frontside().widget;
                if (box.get_hole(index) !== this) {
                    box.rerender();
                }
            };
            if (TT.debugging) {
                empty_hole.debug_string = "An empty hole";
            }
            TT.widget.has_parent(empty_hole);
            return empty_hole;
        },
        toString: function () {
            return "_";
        },
        get_description: function () {
            return "_";
        }
    };
    
}(window.TOONTALK));