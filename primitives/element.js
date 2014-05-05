 /**
 * Implements ToonTalk's interface to HTML elements
 * Authors: Ken Kahn
 * License: New BSD
 */

/*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */
/*global BigInteger, bigrat */

window.TOONTALK.element = (function (TT) { // TT is for convenience and more legible code
    "use strict";
    
    var element = Object.create(TT.widget);
    
    element.create = function (html, style_attributes) {
        var new_element = Object.create(element);
        if (!style_attributes) {
            style_attributes = [];
        }
        new_element.get_HTML = function () {
            return html;
        };
        new_element.set_HTML = function (new_value) {
            var frontside_element = this.get_frontside_element();
            if (!frontside_element) {
                return;
            }
            html = new_value;
            // remove children so will be updated
            $(frontside_element).children(":not(.ui-resizable-handle)").remove(); 
            if (this.visible()) {
                TT.DISPLAY_UPDATES.pending_update(this);
            }
        };
        new_element.get_style_attributes = function () {
            return style_attributes;
        };
        new_element.set_style_attributes = function (new_value) {
            style_attributes = new_value;
        };
        new_element = new_element.add_standard_widget_functionality(new_element);
        if (TT.debugging) {
            new_element.debug_string = new_element.toString();
            new_element.debug_id = TT.UTILITIES.generate_unique_id();
        }
        return new_element;
    };
    
    element.copy = function (just_value) {
        // copy has a copy of the attributes array as well
        var copy = TT.element.create(this.get_HTML(), this.get_style_attributes().slice());
        return this.add_to_copy(copy, just_value);
    };
    
    element.match = function (context) {
        if (this.get_erased()) {
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
    
    element.update_display = function () {
        var frontside_element = this.get_frontside_element();
        var rendering;
        if (this.get_erased()) {
            return;
        }
        if (frontside_element.children.length === $(frontside_element).children(".ui-resizable-handle").length) {
            // only children are resize handles
            rendering = document.createElement('div');
            rendering.innerHTML = this.get_HTML();
            frontside_element.appendChild(rendering);
        }
    };
        
    element.toString = function () {
       return "element whose HTML is '" + this.get_HTML() +"'";
    };
    
    element.get_type_name = function () {
        return "element";
    };
    
    element.get_json = function () {
        return this.add_to_json(
           {type: "element",
            html: this.get_HTML()
            });
    };
    
    element.create_from_json = function (json) {
        return element.create(json.html);
    };
    
    return element;
}(window.TOONTALK));

window.TOONTALK.element_backside = 
(function (TT) {
    "use strict";
    
    var create_style_attribute_chooser = function (element_widget, attribute_table) {
        var options = ["left", "top", "width", "height"];
        var menu = document.createElement("ul");
        var add_style_attribute = function (attribute) {
            var style_attributes = element_widget.get_style_attributes();
            if (style_attributes.indexOf(attribute) < 0) {
               style_attributes = style_attributes[style_attributes.length] = attribute; 
            }
        };
        var create_menu_item = function (text) {
            var item = document.createElement("li");
            var anchor = document.createElement("a");
            anchor.textContent = text;
            anchor.href = "#";
            item.appendChild(anchor);
            return item;
        };
        // generalise this with options being a tree of lists
        var geometry_menu = create_menu_item("Geometry");
        var geometry_list = document.createElement("ul");
        geometry_menu.appendChild(geometry_list);
        options.forEach(function (option) {
            var menu_item = create_menu_item(option);
            geometry_list.appendChild(menu_item);
            menu_item.addEventListener('click', function (event) {
                add_style_attribute(option);
                update_style_attribute_table(attribute_table, element_widget);
            });
        });
        menu.appendChild(geometry_menu);
        $(menu).menu();
        return menu;
    };
    
    var update_style_attribute_table = function (table, element_widget) {
        var style_attributes = element_widget.get_style_attributes();
        var frontside_element = element_widget.get_frontside_element();
        var i, row, td, attribute_value_editor;
        $(table).empty();
        style_attributes.forEach(function (attribute) {
            var value = $(frontside_element).css(attribute);
            row = document.createElement("tr");
            table.appendChild(row);
            td = document.createElement("td");
            row.appendChild(td);
            td.appendChild(TT.UTILITIES.create_text_element(attribute));
            td = document.createElement("td");
            row.appendChild(td);
            attribute_value_editor = TT.UTILITIES.create_text_input(value.replace("px", ""),
                                                                    "toontalk-element-attribute-input",
                                                                    undefined,
                                                                    "Click here to edit the '" + attribute + "' style attribute of this element.");
            attribute_value_editor.button.addEventListener('change', function (event) {
                var new_value = this.value.trim();
                var new_value_number = parseFloat(new_value);
                if (new_value === (new_value_number + "")) {
                    // has no units
                    new_value = new_value_number;
                }
                var css = {};
                css[attribute] = new_value;
                $(frontside_element).css(css); 
            });
            td.appendChild(attribute_value_editor.container);
        });
        return table;
    };
    
    return {
        create: function (element_widget) {
            var backside = TT.backside.create(element_widget);
            var backside_element = backside.get_element();
            var html = element_widget.get_HTML();
            var html_input = TT.UTILITIES.create_text_area(html, "toontalk-html-input", "", "Type here to edit the html.");
            var attribute_table = document.createElement("table");
            var chooser = create_style_attribute_chooser(element_widget, attribute_table);
            var standard_buttons = TT.backside.create_standard_buttons(backside, element_widget);
            var update_html = function (event) {
                var new_html = html_input.button.value.trim();
                var frontside_element = element_widget.get_frontside_element();
                element_widget.set_HTML(new_html);
                if (TT.robot.in_training) {
                    TT.robot.in_training.edited(element_widget, {setter_name: "set_HTML",
                                                                 argument_1: new_html,
                                                                 toString: "change the HTML to " + new_html + " of",
                                                                 button_selector: ".toontalk-html-input"});
                }
            };
            $(html_input.container).resizable();
            $(html_input.container).css({width: "100%"});
            $(html_input.button).css({width: "100%"});
            html_input.button.addEventListener('change', update_html);
            backside_element.appendChild(html_input.container);
            backside_element.appendChild(chooser);
            update_style_attribute_table(attribute_table, element_widget);
            backside_element.appendChild(attribute_table);
            backside_element.appendChild(standard_buttons);
            backside.update_display = function () {
                $(html_input.button).val(element_widget.get_HTML());
                update_style_attribute_table(attribute_table, element_widget);
            };
            return backside;
        }};
}(window.TOONTALK));