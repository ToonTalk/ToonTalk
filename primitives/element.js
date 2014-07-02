 /**
 * Implements ToonTalk's interface to HTML elements
 * Authors: Ken Kahn
 * License: New BSD
 */

/*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */
/*global $, BigInteger, bigrat */

(function () {
    
// this internal function is need by both element and element_backside
var is_transformation_option = function (attribute) {
    return (attribute === 'rotate' || attribute === 'skewX' || attribute === 'skewY' || attribute === 'transform-origin-x' || attribute === 'transform-origin-y');
};

window.TOONTALK.element = (function (TT) { // TT is for convenience and more legible code
    "use strict";
    
    var element = Object.create(TT.widget);
    
    var value_in_pixels = function (value, attribute) {
        var last_character, number;
        if (typeof value === 'number') {
            number = value;
        }
        if (value.length === 0) {
            number = 0;
        }
        if (typeof number === 'undefined') {
            last_character = value.substring(value.length-1);
            if ("0123456789x".indexOf(last_character) >= 0) {
                // assumes that only CSS units ending in 'x' is 'px'
                number = parseFloat(value);
                if (isNaN(number)) {
                    return; // undefined
                }
            }
        }
        return canonicalise_value(number, attribute);
    };
    
    var canonicalise_value = function (value, attribute) {
        var new_value;
        if (["rotate", "skewX", "skewY"].indexOf(attribute) >= 0) {
            // ensure the value is between 0 and 360
            new_value = value % 360;
            if (new_value < 0) {
                new_value += 360;
            }
            return new_value;
        }
        return value;
    };
    
    element.create = function (html, style_attributes, description) {
        var new_element = Object.create(element);
        var pending_css, transform_css, on_update_display_handlers, $image_element;
        if (!style_attributes) {
            style_attributes = [];
        }
        new_element.get_HTML = function () {
            return html;
        };
        new_element.set_HTML = function (new_value) {
            var frontside_element = this.get_frontside_element();
            if (!frontside_element) {
                return false;
            }
            if (html === new_value) {
                return false;
            }
            html = new_value;
            // remove children so will be updated
            $(frontside_element).children(":not(.ui-resizable-handle)").remove(); 
            this.rerender();
            return true;
        };
        new_element.get_style_attributes = function () {
            return style_attributes;
        };
        new_element.set_style_attributes = function (new_value) {
            style_attributes = new_value;
        };
        new_element.get_pending_css = function () {
            return pending_css;
        };
        new_element.get_transform_css = function () {
            return transform_css;
        };
        new_element.add_to_css = function (attribute, value) {
            if (is_transformation_option(attribute)) {
                // could remove attribute if value is 0
                if (!transform_css) {
                    transform_css = {};
                }
                transform_css[attribute] = value;
                return;
            }
            if (!pending_css) {
                pending_css = {};
            }
            pending_css[attribute] = value;
        };
        new_element.apply_css = function() {
            var frontside_element, image_css, transform;
            if (!pending_css && !transform_css) {
                return;
            }
            frontside_element = this.get_frontside_element();
            if (!frontside_element) {
                return;
            }
            if (transform_css) {
                if (transform_css['rotate']) {
                    transform = 'rotate(' + transform_css['rotate'] + 'deg)';
                }
                if (transform_css['skewX']) {
                    if (!transform) {
                        transform = "";
                    }
                    transform += 'skewX(' + transform_css['skewX'] + 'deg)';
                }
                if (transform_css['skewY']) {
                    if (!transform) {
                        transform = "";
                    }
                    transform += 'skewY(' + transform_css['skewY'] + 'deg)';
                }
                if (transform_css['transform-origin-x'] || transform_css['transform-origin-y']) {
                    if (!pending_css) {
                        pending_css = {};
                    }
                    pending_css['transform-origin'] = (transform_css['transform-origin-x'] || 0) + ' ' + (transform_css['transform-origin-y'] || 0);
                } 
                if (transform) {
                    if (!pending_css) {
                        pending_css = {};
                    }
                    pending_css['-webkit-transform'] = transform;
                    pending_css['-moz-transform'] = transform;
                    pending_css['-ms-transform'] = transform;
                    pending_css['o-transform'] = transform;
                    pending_css['transform'] = transform;
                }
            };
            if (!pending_css) {
                // can be undefined if all the transforms had a zero value
                return;
            }
            $(frontside_element).css(pending_css);
            // if it contains an image then change it too (needed only for width and height)
            if ($image_element && (pending_css.width || pending_css.height)) {
                image_css = {};
                image_css.width = pending_css.width;
                image_css.height = pending_css.height;
                $image_element.css(image_css);
            }
            pending_css = undefined;
        };
        new_element.on_update_display = function (handler) {
            if (!on_update_display_handlers) {
                on_update_display_handlers = [handler];
            } else {
                on_update_display_handlers.push(handler);
            }
        };
        new_element.fire_on_update_display_handlers = function () {
            if (on_update_display_handlers) {
                setTimeout(function () {
                        on_update_display_handlers.forEach(function (handler) {
                            handler();
                        });
                        on_update_display_handlers = [];
                    },
                    1);   
            }
        };
        new_element.get_image_element = function () {
            return $image_element;
        };
        new_element.set_image_element = function (element, frontside_element) {
            $image_element = $(element).find("img");
            if ($image_element.length === 0) {
                $image_element = undefined;
            } else {
                // make sure that the front side has the same dimensions as its image
                $(frontside_element).width($image_element.width());
                $(frontside_element).height($image_element.height());
            }
        };
        new_element = new_element.add_standard_widget_functionality(new_element);
        new_element.set_description(description);
        if (TT.debugging) {
            new_element.debug_string = new_element.toString();
            new_element.debug_id = TT.UTILITIES.generate_unique_id();
        }
        return new_element;
    };
    
    element.copy = function (just_value) {
        // copy has a copy of the attributes array as well
        var copy = element.create(this.get_HTML(), this.get_style_attributes().slice(), this.get_description());
        return this.add_to_copy(copy, just_value);
    };
    
    element.match = function (context) {
        if (this.get_erased && this.get_erased()) {
            if (context.match_with_any_element) {
                return context.match_with_any_element();
            }
            return 'not matched';
        }
        if (!context.match_with_this_element) {
            return 'not matched';
        }
        return context.match_with_this_element(this);
    };
    
    element.match_with_any_element = function () {
        return 'matched';
    };
    
    element.match_with_this_element = function (other_element) {
        if (this.get_HTML() === other_element.get_HTML()) {
            return 'matched';
        } else {
            return 'not matched';
        }
    };
    
    element.create_backside = function () {
        return TT.element_backside.create(this).update_run_button_disabled_attribute();
    };
    
    element.get_attribute = function (attribute) {
        var pending_css = this.get_pending_css();
        var frontside_element, transform_css, value;
        if (pending_css && pending_css[attribute]) {
            return pending_css[attribute];
        }
        transform_css = this.get_transform_css();
        if (transform_css && transform_css[attribute]) {
            return transform_css[attribute];
        }
        frontside_element = this.get_frontside_element();
        value = frontside_element.style[attribute];
        if (value === "") {
            // this caused integer rounding (at least of font-size)
            // but if the above doesn't find a value seems sometimes this does
            value = $(frontside_element).css(attribute);
        }
        if (!value) {
            // zero is the default value -- e.g. for transformations such as rotate
            return 0;
        }
        if (typeof value === 'number') {
            return value;
        }
        // should really check that px is at the end the rest is a number
        return value.replace("px", "");
    };
    
    element.set_attribute = function (attribute, new_value, handle_training) {
        var frontside = this.get_frontside();
        var frontside_element = frontside.get_element();
        var css = {};
        var current_value, new_value_number;
//         console.log(attribute + " of " + this.debug_id + " is " + new_value);
        if (!frontside_element) {
            return false;
        }
        current_value = this.get_attribute(attribute);
        if (current_value === new_value) {
            return false;
        }
        // need to use a number for JQuery's css otherwise treats "100" as "auto"
        new_value_number = value_in_pixels(new_value, attribute);
        if (new_value_number) {
            if (current_value === new_value_number) {
                return;
            }
            new_value = new_value_number;
        }
        if (handle_training && TT.robot.in_training) {
            TT.robot.in_training.edited(this, {setter_name: "set_attribute",
                                               argument_1: attribute,
                                               argument_2: new_value,
                                               toString: "change the '" + attribute + "' style to " + new_value + " of",
                                               button_selector: ".toontalk-element-" + attribute + "-attribute-input"});
        }
        this.add_to_css(attribute, new_value);
        this.rerender();
        return true;
    };
    
    element.dropped_on_style_attribute = function (dropped, attribute_name, event, robot) {
        var widget_string, widget_number, attribute_name, attribute_value, attribute_numerical_value, new_value;
        if (!dropped) {
            return;
        }
        widget_string = dropped.toString();
        if (dropped.get_type_name() === 'number') {
            attribute_value = this.get_attribute(attribute_name);
            if (typeof attribute_value === 'number') {
                attribute_numerical_value = attribute_value;
            } else if (attribute_value === 'auto') {
                switch (attribute_name) {
                    case "left":
                    attribute_numerical_value = $(this.get_frontside_element()).offset().left;
                    break;
                    case "top":
                    attribute_numerical_value = $(this.get_frontside_element()).offset().top;
                    break;
                    default:
                    attribute_numerical_value = 0;
                }
            } else {
                attribute_numerical_value = parseFloat(attribute_value);
                // what if NaN?
            }
            widget_number = dropped.to_float();
            switch (widget_string.substring(0, 1)) {
                case '-':
                new_value = attribute_numerical_value - widget_number;
                break;
                case '*':
                new_value = attribute_numerical_value * widget_number;
                break;
                case '/':
                new_value = attribute_numerical_value / widget_number;
                break;
                case '^':
                new_value = Math.pow(attribute_numerical_value, widget_number);
                break;
                default:
                new_value = attribute_numerical_value + widget_number;
            }
            // following doesn't handle training since is handled below
            this.set_attribute(attribute_name, new_value, false);
            if (event || (robot && robot.visible())) {
                this.get_backside().render();
            }
        }
        if (!dropped.get_infinite_stack()) {
            dropped.remove();
        }
        if (TT.robot.in_training) {
            TT.robot.in_training.dropped_on(dropped, this.create_attribute_object(attribute_name));
        }
    };
    
    element.create_attribute_object = function (attribute_name) {
        var selector = ".toontalk-element-" + attribute_name + "-attribute-input";
        var backside_element = this.get_backside_element();
        var $attribute_input, attribute_object;
        if (backside_element) {
            $attribute_input = $(backside_element).find(selector);
            if ($attribute_input.length > 0) {
                $attribute_input.data("owner", this);
            }
        }
        attribute_object =
               {element_widget: this,
                attribute: attribute_name,
                get_type_name: function () {
                    return "element attribute";
                },
                toString: function () {
                    return "the " + this.attribute + " of " + this.element_widget;
                },
                get_side_element: function () {
                    if ($attribute_input && $attribute_input.length > 0) {
                        return $attribute_input.get(0);
                    }
                },
                equals: function (other) {
                    if (attribute_name === other.attribute) {
                        return this.equals(other.element_widget);
                    }
                    return false;
                },
                visible: function () {
                    return $attribute_input && $attribute_input.is(":visible");
                },
                widget_dropped_on_me: function (other, event, robot) {
                    this.element_widget.dropped_on_style_attribute(other, attribute_name, event, robot);
                },
                update_display: function () {
                    if ($attribute_input) {
                        $attribute_input.val(this.element_widget.get_attribute(this.attribute));
                    }
                },
                render: function () {
                    TT.DISPLAY_UPDATES.pending_update(this);
                }
        };
        if (TT.debugging) {
            attribute_object.debug_id = TT.UTILITIES.generate_unique_id();
        }
        return attribute_object;
    };
    
    element.update_display = function () {
        var frontside_element = this.get_frontside_element();
        var rendering;
        var backside = this.get_backside();
        if (this.get_erased && this.get_erased()) {
            // could save the current opacity and restore it below
            $(frontside_element).css({opacity: 0});
            return;
        }
        if (this.get_erased && $(frontside_element).css("opacity") === "0") {
            // was erased but no longer
            $(frontside_element).css({opacity: 1});
        }
        if (frontside_element.children.length === $(frontside_element).children(".ui-resizable-handle").length) {
            // only children are resize handles so add the HTML
            rendering = document.createElement('div');
            rendering.innerHTML = this.get_HTML();
            frontside_element.appendChild(rendering);
            this.set_image_element(rendering, frontside_element);
            $(frontside_element).addClass("toontalk-element-frontside");
            if (rendering.innerHTML.substring(0, 1) !== '<') {
                // doesn't look like HTML so assume it is raw text and give it a class that will give it a better font and size
                $(frontside_element).addClass("ui-widget toontalk-plain-text-element");
            }
        }
        this.apply_css();
//         if (backside) {
//             backside.update_display();
//         }
        this.fire_on_update_display_handlers();
    };
    
//     element.is_in_thought_bubble = function () {
//         // this a workaround for the fact that toontalk-thought-bubble-contents's % values for width and height
//         // don't get applied to images
//         var $image_element = this.get_image_element();
//         var frontside_element;
//         if ($image_element) {
//             frontside_element = this.get_frontside_element();
//             if (frontside_element) {
//                 // should try to tie the .6 to the 60% in toontalk-thought-bubble-contents
//                 $image_element.width(0.6 * $(frontside_element).parent().width());
//                 $image_element.height(0.4 * $(frontside_element).parent().height());
//             }
//         }
//     };
        
    element.toString = function () {
        return "element whose HTML is '" + TT.UTILITIES.maximum_string_length(this.get_HTML(), 40) + "'";
    };
    
    element.get_type_name = function () {
        return "element";
    };
    
    element.get_json = function () {
        var attributes = this.get_style_attributes();
        var json_attributes = [];
        attributes.forEach(function (item) {
            // don't want them to appear where they were in the source page
            // need to revisit this since sometimes we want left and top
            // maybe when loading don't obey their values
//             if (item !== "left" && item !== "top") {
                json_attributes.push(item);
//             }
        });
        return {type: "element",
                html: encodeURIComponent(this.get_HTML()), 
                attributes: json_attributes,
                attribute_values: json_attributes.map(this.get_attribute.bind(this))
                };
    };
    
    element.create_from_json = function (json, additional_info) {
        var reconstructed_element = element.create(decodeURIComponent(json.html), json.attributes, json.description);
        var ignore_attributes;
        if (additional_info && additional_info.event) {
            // perhaps should check that event is a drop event
            // drop event location has priority over these settings
            ignore_attributes = ["left", "top"];
        } else {
            ignore_attributes = [];
        }
        json.attribute_values.forEach(function (value, index) {
            var attribute_name = json.attributes[index];
            if (ignore_attributes.indexOf(attribute_name) < 0) {
                reconstructed_element.add_to_css(attribute_name, value_in_pixels(value) || value);
            }
        });
        return reconstructed_element;
    };
    
    element.create_attribute_path = function (attribute_widget, robot) {
        var path_to_element_widget = TT.path.get_path_to(attribute_widget.element_widget, robot);
        return this.extend_attribute_path(path_to_element_widget, attribute_widget.attribute);
    };
    
    element.extend_attribute_path = function (path_to_element_widget, attribute_name) {
       return {
            dereference: function (context, top_level_context, robot) {
                // if the robot is running on the backside of a widget that is on the backside of the top_level_context
                // then use the top_level_context
                var element_widget = path_to_element_widget.dereference((top_level_context || context), undefined, robot);
                return element_widget.create_attribute_object(attribute_name);
            },
            toString: function () {
                return "the '" + attribute_name + "' property of " + path_to_element_widget;
            },
            get_json: function () {
                return {type: "path_to_style_attribute",
                        attribute: attribute_name,
                        element_widget_path: path_to_element_widget.get_json()};
            }};
    }
    
    element.create_path_from_json = function (json) {
        var element_widget_path = TT.UTILITIES.create_from_json(json.element_widget_path);
        return element.extend_attribute_path(element_widget_path, json.attribute);
    };
    
    return element;
}(window.TOONTALK));

window.TOONTALK.element_backside = 
(function (TT) {
    "use strict";
    
    var update_style_attribute_chooser = function (attributes_chooser, element_widget, attribute_table) {
        // the following could be made the default
        // but if TT.attribute_options is set use it instead
        var options = [{label: "Geometry attributes",
                        sub_menus: ["left", "top", "width", "height", "z-index", "background-position"]},
                       {label: "Color attributes",
                        sub_menus: ["background-color", "color", "opacity"]},
                       {label: "Font attributes",
                        sub_menus: ["font-size", "font-weight"]},
                       {label: "Transformations",
                        sub_menus: ["rotate", "skewX", "skewY", "transform-origin-x", "transform-origin-y"]}];
        var add_style_attribute = function (attribute) {
            var style_attributes = element_widget.get_style_attributes();
            var frontside_element;
            if (style_attributes.indexOf(attribute) < 0) {
               style_attributes.push(attribute);
               // update the backside during drag if 'left' or 'top' are attributes
               if (attribute === 'left') {
                   frontside_element = element_widget.get_frontside_element();
                   $(frontside_element).on('drag', function (event) {
                       var backside_element = element_widget.get_backside_element();
                       var frontside_element = element_widget.get_frontside_element();
                       if (backside_element && frontside_element) {
                           $(backside_element).find(".toontalk-element-left-attribute-input").val(event.originalEvent.clientX);
                       }

                   });
               } else if (attribute === 'top') {
                   frontside_element = element_widget.get_frontside_element();
                   $(frontside_element).on('drag', function (event) {
                       var backside_element = element_widget.get_backside_element();
                       var frontside_element = element_widget.get_frontside_element();
                       if (backside_element && frontside_element) {
                           $(backside_element).find(".toontalk-element-top-attribute-input").val(event.originalEvent.clientY);
                       }

                   });
               }
            }
        };
        var remove_style_attribute = function (attribute) {
            var style_attributes = element_widget.get_style_attributes();
            var index = style_attributes.indexOf(attribute);
            if (index >= 0) {
               style_attributes.splice(index, 1);
               update_style_attribute_chooser(attributes_chooser, element_widget, attribute_table);
            }
        };
        var documentation_source = function (attribute) {
            if (attribute === 'transform-origin-x' || attribute === 'transform-origin-y') {
                // # added so rest is ignored
                return "https://developer.mozilla.org/en-US/docs/Web/CSS/transform-origin#"
            } else if (is_transformation_option(attribute)) {
                return "https://developer.mozilla.org/en-US/docs/Web/CSS/transform#";
            } else {
                return "http://www.w3.org/community/webed/wiki/CSS/Properties/";
            }
        }; 
        var process_menu_item = function (option, menu_list) {
            var style_attributes = element_widget.get_style_attributes();
            var already_added = style_attributes.indexOf(option) >= 0;
            var title = "Click to add or remove the '" + option + "' style attribute from the backside of this element.";
            var check_box = TT.UTILITIES.create_check_box(already_added, "toontalk-style-attribute-check-box", option, title);
            var documentation_link = TT.UTILITIES.create_anchor_element(" (?)", documentation_source(option) + option);
            var list_item = document.createElement("li");
            check_box.container.appendChild(documentation_link);
            check_box.button.addEventListener('click', function (event) {
                if (check_box.button.checked) {
                    add_style_attribute(option);
                } else {
                    remove_style_attribute(option);
                }
                update_style_attributes_table(attribute_table, element_widget);
            });
            list_item.appendChild(check_box.container);
            menu_list.appendChild(list_item);
         };
        var process_options = function (sub_tree, menu_list) {
            var category_header, sub_menu_list;
            if (typeof sub_tree === 'string') {
                process_menu_item(sub_tree, menu_list);
            } else if (sub_tree.label) {
                category_header = document.createElement("h3");
                category_header.textContent = sub_tree.label;
                sub_menu_list = document.createElement("ul");
                menu_list.appendChild(category_header);
                menu_list.appendChild(sub_menu_list);   
                process_options(sub_tree.sub_menus, sub_menu_list);
            } else {
                // is an array
                sub_tree.forEach(function (sub_sub_tree) {
                    process_options(sub_sub_tree, menu_list);
                });               
            }
        };
        if ($(attributes_chooser).is(".ui-accordion")) {
            $(attributes_chooser).accordion('destroy');
        }
        $(attributes_chooser).empty();
        process_options(options, attributes_chooser);
        $(attributes_chooser).accordion({active: 0,
                                         heightStyle: "content"});
        return attributes_chooser;
    };
    
    var update_style_attributes_table = function (table, element_widget) {
        var style_attributes = element_widget.get_style_attributes();
        var frontside_element = element_widget.get_frontside_element();
        var row, td, attribute_value_editor;
        $(table).empty();
        style_attributes.forEach(function (attribute) {
            var value = element_widget.get_attribute(attribute);
            var update_value = function (event) {
                element_widget.set_attribute(attribute, this.value.trim(), true);
            };
            var classes = "toontalk-element-attribute-input toontalk-element-" + attribute + "-attribute-input";
            row = document.createElement("tr");
            table.appendChild(row);
            td = document.createElement("td");
            row.appendChild(td);
            td.appendChild(TT.UTILITIES.create_text_element(attribute));
            td = document.createElement("td");
            row.appendChild(td);
            attribute_value_editor = TT.UTILITIES.create_text_input(value,
                                                                    classes,
                                                                    undefined,
                                                                    "Click here to edit the '" + attribute + "' style attribute of this element.");
            attribute_value_editor.button.name = attribute;
            attribute_value_editor.button.addEventListener('input', update_value);
            TT.UTILITIES.can_receive_drops($(attribute_value_editor));
            td.appendChild(attribute_value_editor.container);
        });
        return table;
    };
    
    var create_show_attributes_chooser = function (attributes_chooser) {
        var show_label = "Add or remove style attributes";
        var show_title = "Click to add widgets for reading and writing style attributes of this element.";
        var hide_label = "Hide style attributes list";
        var hide_title = "Click to hide the list of attributes that can be added or removed.";
        var $show_chooser_button = $("<button>" + show_label + "</button>").button();
        $show_chooser_button.addClass("toontalk-show-attributes-chooser-button");
        $show_chooser_button.click(function (event) {
            if ($(attributes_chooser).is(":visible")) {
                $(attributes_chooser).hide();
                $show_chooser_button.button("option", "label", show_label);
                $show_chooser_button.attr("title", show_title);
            } else {
                $(attributes_chooser).show();
                $show_chooser_button.button("option", "label", hide_label);
                $show_chooser_button.attr("title", hide_title);
            }
        });
        $show_chooser_button.attr("title", show_title);
        return $show_chooser_button.get(0);
    };
    
    return {
        create: function (element_widget) {
            var backside = TT.backside.create(element_widget);
            var backside_element = backside.get_element();
            var html = element_widget.get_HTML();
            var html_input = TT.UTILITIES.create_text_area(html, "toontalk-html-input", "", "Type here to edit the html.");
            var attribute_table = document.createElement("table");
            var attributes_chooser = document.createElement("div");
            var show_attributes_chooser = create_show_attributes_chooser(attributes_chooser);
            var standard_buttons = TT.backside.create_standard_buttons(backside, element_widget);
            var update_html = function (event) {
                var new_html = html_input.button.value.trim();
                var frontside_element = element_widget.get_frontside_element();
                if (element_widget.set_HTML(new_html) && TT.robot.in_training) {
                    TT.robot.in_training.edited(element_widget, {setter_name: "set_HTML",
                                                                 argument_1: new_html,
                                                                 toString: "change the HTML to " + new_html + " of",
                                                                 button_selector: ".toontalk-html-input"});
                }
            };
            backside.get_attributes_chooser = function () {
                return attributes_chooser;
            };
            update_style_attribute_chooser(attributes_chooser, element_widget, attribute_table);
            $(html_input.container).resizable();
            $(html_input.container).css({width: "100%"});
            $(html_input.button).css({width: "100%"});
            html_input.button.addEventListener('change', update_html);
            html_input.button.addEventListener('mouseout', update_html);
            backside_element.appendChild(html_input.container);
            update_style_attributes_table(attribute_table, element_widget);
            backside_element.appendChild(attributes_chooser);
            backside_element.appendChild(show_attributes_chooser);
            backside_element.appendChild(attribute_table);
            backside_element.appendChild(standard_buttons);
            $(attributes_chooser).hide();
            $(attributes_chooser).addClass("toontalk-attributes-chooser");
            backside.update_display = function () {
                $(html_input.button).val(element_widget.get_HTML());
                update_style_attributes_table(attribute_table, element_widget);
                if ($(attributes_chooser).is(":visible")) {
                    update_style_attribute_chooser(attributes_chooser, element_widget, attribute_table);
                }
                this.display_updated();
            };
            // if the backside is hidden then so should the attributes chooser
            $(backside_element).find(".toontalk-hide-backside-button").click(function (event) {
                $(attributes_chooser).hide();
            });
            return backside;
    }};
}(window.TOONTALK));

}());