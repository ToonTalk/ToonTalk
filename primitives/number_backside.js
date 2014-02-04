 /**
 * Implements ToonTalk's backside of a number
 * Authors: Ken Kahn
 * License: New BSD
 */

window.TOONTALK.number_backside = 
(function () {
    "use strict";
	var create_input = function (value, class_name, title) {
		var input = document.createElement("input");
        input.type = "text";
		input.className = class_name;
        input.value = value;
        input.title = title;
		return input;
	};
	
	var create_button = function (label, class_name, title) {
		var button = document.createElement("button");
		button.className = class_name;
        button.innerHTML = label;
        button.title = title;
		return button;
	};
	
	var create_radio_button = function (name, value) {
		var input = document.createElement("input");
		input.type = "radio";
		input.className = "toontalk-radio-button";
        input.name = name;
        input.value = value;
		return input;
	};
	
	var label_radio_button = function (button, label) {
		var container = document.createElement("div");
		var label_element = document.createElement("span");
		label_element.innerHTML = label;
		container.appendChild(button);
		container.appendChild(label_element);
		return container;		
	};
	
	var selected_radio_button = function () {
		var i;
		for (i = 0; i < arguments.length; i += 1) {
			if (arguments[i].checked) {
				return arguments[i];
			}
		}
	};
	
	var add_test_button = function(backside, robot_name) {
		var add_one = create_button("add " + robot_name + " robot", "test", "just testing");
		add_one.onclick = function () {
			if (add_one.robot) {
				add_one.robot.stop();
				add_one.robot = undefined;
				add_one.innerHTML = "resume " + robot_name;
				return;
			}
			var robot;
			switch (robot_name) {
				case "add-one": 
				robot = TOONTALK.tests.add_one_robot(); 
				break;
				case "double": 
				robot = TOONTALK.tests.double_robot(); 
				break;
			}
			add_one.robot = robot;
			robot.run(backside.get_number());
			add_one.innerHTML = "stop " + robot_name;
		};
		backside.get_element().appendChild(add_one);
	};
	
    return {
        create: function (number) {
			var backside_element = document.createElement("div");
			backside_element.className = "toontalk-backside";
	        var backside = Object.create(this);
            var numerator_input = create_input(number.numerator_string(), 'toontalk-numerator-input', "Type here to edit the numerator");
            var denominator_input = create_input(number.denominator_string(), 'toontalk-denominator-input', "Type here to edit the denominator");
			var decimal_format = create_radio_button("number_format", "decimal");
			var proper_format = create_radio_button("number_format", "proper_fraction");
			var improper_format = create_radio_button("number_format", "improper_fraction");
            var update_value = function () {
                number.set_from_values(numerator_input.value.trim(), denominator_input.value.trim(), true);
            };
			var update_format = function () {
				number.set_format(selected_radio_button(decimal_format, proper_format, improper_format).value, true);
			};
			backside.get_element = function () {
                return backside_element;
            };
            backside.get_number = function () {
                return number;
            };
            numerator_input.onchange = update_value;
            denominator_input.onchange = update_value;
			decimal_format.onchange = update_format;
			proper_format.onchange = update_format;
			improper_format.onchange = update_format;
			improper_format.checked = true;
			// TO DO position the new elements
            backside_element.appendChild(numerator_input);
            backside_element.appendChild(denominator_input);
			backside_element.appendChild(label_radio_button(decimal_format, "&nbsp;Display number as a decimal."));
			backside_element.appendChild(label_radio_button(proper_format, "&nbsp;Display number as a proper fraction."));
			backside_element.appendChild(label_radio_button(improper_format, "&nbsp;Display number as a simple fraction."));
			add_test_button(backside, "add-one");
			add_test_button(backside, "double");
            return backside;
        },
		
		update_display: function () {
			var numerator_input = window.TOONTALK.UTILITIES.get_first_child_with_class(this.get_element(), "toontalk-numerator-input");
			var denominator_input = window.TOONTALK.UTILITIES.get_first_child_with_class(this.get_element(), "toontalk-denominator-input");
			var number = this.get_number();
			numerator_input.value = number.numerator_string();
			denominator_input.value = number.denominator_string();
		}

    };
}());