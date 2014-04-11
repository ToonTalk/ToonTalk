 /**
 * Implements ToonTalk's exact arithmetic using rational numbers
 * Relies upon https://npmjs.org/package/bigrat
 * Authors: Ken Kahn
 * License: New BSD
 */

/*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */
/*global BigInteger, bigrat */

window.TOONTALK.number = (function (TT) { // TT is for convenience and more legible code
    "use strict";
    
    var number = Object.create(TT.widget);

    // private functions

    var shrink_to_fit = function (string, length, fromLeft) {
        var result = '',
            index,
            size = 100,
            factor = (length - 1) / length;
        if (fromLeft) {
            index = 0; // start with first digit or character
            while (size >= 1 && index < string.length) {
                result = result + "<span class='toontalk-digit' style='font-size:" + size + "%'>" + string[index] + "<\/span>";
                index += 1;
                if (string[index] !== '-') {
					// don't shrink if just displayed a minus sign
					size *= factor;
                }
            }
        } else {
            index = string.length - 1; // start with last digit or character
            while (size >= 1 && index > 0) {
                result = "<span class='toontalk-digit' style='font-size:" + size + "%'>" + string[index] + "<\/span>" + result;
                index -= 1;
				if (string[index] !== '-') {
                    size *= factor;
				}
            }
        }
        return result;
    };

    var fit_string_to_length = function (string, max_characters) {
        if (string.length <= Math.round(max_characters)) {
			return '<span class="toontalk-digit" style="font-size:100%">' + string + '</span>';
        }
		if (max_characters < 1) {
			// hopefully too small to see
			return "";
		}
        if (max_characters < 5) {
			// decrease font size and try again
			return "<span style='font-size: 80%'>" + fit_string_to_length(string, max_characters * 1.25) + "</span>";
//          return string[0] + "<span class='toontalk-three-dots-in-number' style='font-size: 33%'>...</span>" + string[string.length - 1];
        }
        var characters_on_each_side = max_characters / 2;
        return shrink_to_fit(string, characters_on_each_side, true) +
               shrink_to_fit(string, characters_on_each_side, false);
    };

    var generate_decimal_places = function (fraction, max_decimal_places) {
		var result = "";
        fraction = fraction.absolute_value();
        var numerator = fraction.get_value()[0];
        var denominator = fraction.get_value()[1];
        var ten = new BigInteger(10);
        while (max_decimal_places > result.length) {
            numerator = numerator.multiply(ten);
            if (numerator.compare(denominator) < 0) {
                result += "0";
            } else {
                result += numerator.divide(denominator).toString();
                numerator = numerator.remainder(denominator).multiply(ten);
                if (numerator.isZero()) {
                    return result;
                }
            }
        }
        return result;
    };
    
    var bigrat_from_values = function (numerator, denominator) {
        // numerator and denominator are integers
        if (!denominator) {
            denominator = 1;
        }
        if ((typeof numerator === 'number' || typeof numerator === 'string') && (typeof denominator === 'number' || typeof denominator === 'string')) {
            return bigrat.fromValues(numerator, denominator);
        }
        // assume (for now) numerator is a bigrat with denominator of 1
        var result = bigrat.create();
        if (denominator === 1) {
            bigrat.set(result, bigrat.toBigInteger(numerator.get_value()), BigInteger.ONE);
        } else if (numerator.get_value && denominator.get_value) {
            bigrat.set(result, bigrat.toBigInteger(numerator.get_value()), bigrat.toBigInteger(denominator.get_value()));
        } else { // are BigIntegers
            bigrat.set(result, numerator, denominator);
        }
        return result;
    };
	
	var html_for_operator = function (operator) {
        switch (operator) {
        case '+':
            return '';
        case '-':
            return '&minus;';
        case '*':
            return '&times;';
        case '/':
            return '&divide;';
        case '^':
            return '^';
        default:
            console.log("Number has an unsupported operator: " + operator);
            return "";
        }
    };

    // public methods
    number.create = function (numerator, denominator, operator, format) {
        var result = Object.create(number);
        // value is a private variable closed over below
        var value = bigrat_from_values(numerator, denominator);
        if (!format) {
			format = "improper_fraction";
        }
		if (!operator) {
			operator = '+';
		} 
        result.set_value =
            function (new_value, update_now) {
				var frontside, backside;
                value = new_value;
                if (update_now) {
                    this.update_display();
                } else {
					frontside = this.get_frontside();
					backside = this.get_backside();
                    if (frontside) {
                        TT.DISPLAY_UPDATES.add_dirty_side(frontside);
                    }
                    if (backside) {
                        TT.DISPLAY_UPDATES.add_dirty_side(backside);
                    }
                }
				if (TT.debugging) {
					this.debug_string = this.toString();
				}
                return this;
            };
        result.get_value =
            function () { 
                return value; 
            };
        result.set_format =
            function (new_value, update_now) { 
                format = new_value;
                if (update_now) {
                    this.update_display();
                }
                return this;
            };
        result.get_operator =
            function () { 
                return operator; 
            };
		result.set_operator =
            function (new_value, update_now) { 
                operator = new_value;
                if (update_now) {
                    this.update_display();
                }
                return this;
            };
        result.get_format =
            function () { 
                return format; 
            };
		result = number.add_standard_widget_functionality(result);
        return result;
    };
	
	number.create_backside = function () {
		return TT.number_backside.create(this).update_run_button_disabled_attribute();
	};
        
    number.set_from_values = function (numerator, denominator, update_now) {
        return this.set_value(bigrat_from_values(numerator, denominator), update_now);
    };

    number.ONE = function () {
        return this.create(1);
    };

    number.ZERO = function () {
        return this.create(0);
    };

    number.copy = function (just_value) {
		return this.add_to_copy(number.create(this.get_value()[0], this.get_value()[1], this.get_operator(), this.get_format()), just_value);
    };
    
    number.is_number = function () {
        return true;
    };
	
	number.equals = function (other) {
		return other.equals_number(this);
	};

    number.equals_number = function (other_number) {
		// note that we are not considering the operator
        return bigrat.equals(this.get_value(), other_number.get_value());
    };
    
    number.update_display = function() {
        // should compute width from frontside element
        // get format from backside ancestor (via parent attribute?)
        var frontside = this.get_frontside();
        if (!frontside) {
            return;
        }
        var frontside_element = frontside.get_element();
		var $dimensions_holder;
		if ($(frontside_element).is(".toontalk-thought-bubble-contents")) {
			$dimensions_holder = $(frontside_element);
		} else if ($(frontside_element).parent().is(".toontalk-backside, .toontalk-json")) {
			$dimensions_holder = $(frontside_element);
		} else {
			$dimensions_holder = $(frontside_element).parent();
		}
        var client_width = $dimensions_holder.width();
        var client_height = $dimensions_holder.height();
        var font_height = client_height * 0.8;
//      font_size = TT.UTILITIES.get_style_numeric_property(frontside, "font-size");
        // according to http://www.webspaceworks.com/resources/fonts-web-typography/43/
        // the aspect ratio of monospace fonts varies from .43 to .55 
        var font_width = font_height * 0.64; // .55 'worst' aspect ratio -- add a little extra
        // could find the font name and use the precise value
		var max_decimal_places = client_width / font_width;
        var new_HTML = this.to_HTML(max_decimal_places, font_height, this.get_format(), true, this.get_operator());
        if (!frontside_element.firstChild) {
            frontside_element.appendChild(document.createElement('div'));
        }
        frontside_element.firstChild.innerHTML = new_HTML;
		$(frontside_element.firstChild).addClass("toontalk-widget");
		frontside_element.title = this.get_title();
    };
	
    number.to_HTML = function (max_characters, font_size, format, top_level, operator) {
        var integer_as_string, integer_part, fractional_part, improper_fraction_HTML;
        var extra_class = (top_level !== false) ? ' toontalk-top-level-number' : '';
	    var operator_HTML = operator ? html_for_operator(operator) : "";
        if (!max_characters) {
            max_characters = 4;
        }
        if (!font_size) {
            font_size = 16;
        }
		if (this.get_erased()) {
			return '<div class="toontalk-number toontalk-integer' + extra_class + '" style="font-size: ' + font_size + 'px;"></div>';
		}
		if (operator_HTML.length > 0) {
			max_characters -= 1; // leave room for operator
		}
        if (this.is_integer()) {
            integer_as_string = bigrat.toBigInteger(this.get_value()).toString();
			if (max_characters < 4 && integer_as_string.length >= 4) {
				font_size *= max_characters / 4;
				max_characters = 4;
			}
            return '<div class="toontalk-number toontalk-integer' + extra_class + '" style="font-size: ' + font_size + 'px;">' + operator_HTML + fit_string_to_length(integer_as_string, max_characters) + '</div>';
        }
        if (format === 'improper_fraction' || !format) { // default format
            // double the max_characters since the font size is halved
            improper_fraction_HTML = 
			    '<table class="toontalk-number toontalk-improper-fraction' + extra_class + '" style="font-size: ' + (font_size * 0.5) + 'px;">' +
                '<tr class="toontalk-numerator"><td align="center" class="toontalk-number">' + fit_string_to_length(this.numerator_string(), max_characters * 2) + '</td></tr>' +
                '<tr class="toontalk-fraction-line-as-row"><td  class="toontalk-fraction-line-as-table-entry"><hr class="toontalk-fraction-line"></td></tr>' +
                '<tr class="toontalk-denominator"><td align="center" class="toontalk-number">' + fit_string_to_length(this.denominator_string(), max_characters * 2) + '</td></tr></table>';
			if (operator_HTML === '') {
				return improper_fraction_HTML;
			} else {
				return "<table class='toontalk-operator-and-fraction'><tr><td>" + operator_HTML + "</td><td>" + improper_fraction_HTML + "</td></tr></table>";
			}
        }
        if (format === 'proper_fraction') {
            integer_part = this.integer_part();
            if (integer_part.is_zero()) {
                return this.to_HTML(max_characters, font_size, 'improper_fraction', top_level);
            }
            fractional_part = this.copy().subtract(integer_part).absolute_value();
            // split max_characters between the two parts and recur for each them
            return '<table class="toontalk-number toontalk-proper_fraction' + extra_class + '" style="font-size: ' + (font_size * 0.5) + 'px;">' +
                   '<tr><td class="toontalk-number toontalk-integer-part-of-proper-fraction">' +
                    integer_part.to_HTML(max_characters, font_size, '', false, this.get_operator()) + // integers don't have formats but should display operator
                    '</td><td class="toontalk-number toontalk-fraction-part-of-proper_fraction">' +
                    fractional_part.to_HTML(max_characters, font_size, 'improper_fraction', false) +
                   '</td></tr></table>';
        }
        if (format === 'decimal') {
			if (max_characters < 4) {
				// better to use a smaller font than have too few digits
				font_size *= max_characters / 4;
				max_characters = 4;
			}
            return '<div class="toontalk-number toontalk-decimal' + extra_class + '" style="font-size: ' + font_size + 'px;">' + operator_HTML + this.decimal_string(max_characters, font_size) + '</div>';
        }
        // else warn??
    };

    number.drop_on = function (other, side_of_other, event) {
        if (!other.number_dropped_on_me) {
			if (other.widget_dropped_on_me) {
				return other.widget_dropped_on_me(this, event);
			}
            console.log("No handler for drop of " + this.toString() + " on " + other.toString());
			return;
		}
        var result = other.number_dropped_on_me(this, event);
		if (event) {
			other.update_display();
		}
		this.remove();
		if (TT.robot.in_training) {
            TT.robot.in_training.dropped_on(other);
        }
		return true;
    };

    number.number_dropped_on_me = function (other_number, clientX, clientY, event) { 
        switch (other_number.get_operator()) {
        case '+':
            return this.add(other_number);
        case '-':
            return this.subtract(other_number);
        case '*':
            return this.multiply(other_number);
        case '/':
            return this.divide(other_number);
        case '^':
            return this.power(other_number);
        default:
            console.log("Number received a number with unsupported operator: " + other_number.get_operator());
            return this;
        }
    };

    number.add = function (other) {
        // other is another rational number
        this.set_value(bigrat.add(bigrat.create(), this.get_value(), other.get_value()));
        return this;
    };

    number.subtract = function (other) {
        // other is another rational number
        this.set_value(bigrat.subtract(bigrat.create(), this.get_value(), other.get_value()));
        return this;
    };

    number.multiply = function (other) {
        // other is another rational number
        this.set_value(bigrat.multiply(bigrat.create(), this.get_value(), other.get_value()));
        return this;
    };

    number.divide = function (other) {
        // other is another rational number
        this.set_value(bigrat.divide(bigrat.create(), this.get_value(), other.get_value()));
        return this;
    };

    number.power = function (power) {
        // power is any integer (perhaps needs error handling if too large)
        this.set_value(bigrat.power(bigrat.create(), this.get_value(), bigrat.toInteger(power.get_value())));
        return this;
    };
    
    number.absolute_value = function () {
        this.set_value(bigrat.abs(bigrat.create(), this.get_value()));
        return this;
    };

    number.is_zero = function () {
        return bigrat.equals(this.get_value(), bigrat.ZERO);
    };
	
	number.is_negative = function () {
		return bigrat.isNegative(this.get_value());
	};

    number.toString = function () {
        // addition is implicit so don't display it
        var operator_string = this.get_operator() === '+' ? '' : this.get_operator();
		// erased_string was showing up in decimal number display
// 		var erased_string = this.get_erased() ? "erased: " : "";
        return operator_string + bigrat.str(this.get_value());
    };
	
	number.get_type_name = function () {
		return "number";
	};
	
	number.get_json = function () {
// 		var super_prototype = Object.getPrototypeOf(Object.getPrototypeOf(this));
		return this.add_to_json(
		   {type: "number",
		    operator: this.get_operator(),
		    numerator: this.numerator_string(),
	        denominator: this.denominator_string(),
			format: this.get_format()
		    });
	};
	
	number.create_from_json = function (json) {
		return number.create(json.numerator, json.denominator, json.operator, json.format);
	};

    number.is_integer = function () {
        // check if denominator is 1
        return this.get_value()[1].compare(BigInteger.ONE) === 0;
    };

    number.numerator = function () {
        var result = bigrat.create();
        return bigrat.set(result, this.get_value()[0], BigInteger.ONE);
    };

    number.denominator = function () {
        var result = bigrat.create();
        return bigrat.set(result, this.get_value()[1], BigInteger.ONE);
    };

    number.numerator_string = function () {
        return this.get_value()[0].toString();
    };

    number.denominator_string = function () {
        return this.get_value()[1].toString();
    };

    number.integer_part = function () {
	//        var result = Object.create(this);
	//        var integer_part = bigrat.toBigInteger(this.get_value());
	//        result.set_value(bigrat.set(bigrat.create(), integer_part, BigInteger.ONE));
	//        return result;
        return this.create(this);
    };

    number.decimal_string = function (max_decimal_places, font_size) {
        if (this.is_integer()) {
            return this.numerator_string();
        }
        var copy = this.copy();
        var integer_part = copy.integer_part();
        var integer_string = integer_part.toString();
		if (integer_string === "0" && this.is_negative()) {
			// need -0.ddd
			integer_string = "-" + integer_string;
		}
        var fractional_part = copy.subtract(integer_part);
        var integer_max_digits = Math.min(integer_string.length, max_decimal_places / 2);
        var decimal_max_digits = max_decimal_places - (integer_max_digits + 0.5); // 1/2 for the decimal point since not monospace
		// bigger fonts mean more digits can be seen so compute more of them
        var decimal_places = generate_decimal_places(fractional_part, decimal_max_digits * font_size / 20);
        if (decimal_places.length < decimal_max_digits) {
            // not repeating and not too many decimal digits
            integer_max_digits = max_decimal_places - decimal_places.length;
            decimal_max_digits = decimal_places.length;
        }
        // generate twice as many decimal places are there is room for so they shrink
        // split space between integer part and decimal part
        return fit_string_to_length(integer_string, integer_max_digits, font_size) +
               "<span class='toontalk-decimal-point' style='font-family: serif'>.</span>" + // decimal point looks better if not monospace
               shrink_to_fit(decimal_places, decimal_max_digits, true);
    };

    number.match = function (context) {
        if (this.get_erased()) {
			if (context.match_with_any_number) {
            	return context.match_with_any_number();
			}
			return 'not matched'; // since doesn't handle match_with_any_number
        }
		if (!context.match_with_this_number) {
			return 'not matched';
		}
        return context.match_with_this_number(this);
    };

    number.match_with_any_number = function () {
        return 'matched';
    };

    number.match_with_this_number = function (other_number) {
        if (other_number.equals(this)) {
            return 'matched';
        }
        return 'not matched';
    };
	
    return number;
}(window.TOONTALK));

window.TOONTALK.number_backside = 
(function (TT) {
    "use strict";
	
    return {
        create: function (number) {
	        var backside = TT.backside.create(number);
			var backside_element = backside.get_element();
            var numerator_input = TT.UTILITIES.create_text_input(number.numerator_string(), "toontalk-numerator-input", "", "Type here to edit the numerator");
			var slash = document.createElement("div");
			slash.innerHTML = "/";
			$(slash).addClass("ui-widget"); // to look nice
            var denominator_input = TT.UTILITIES.create_text_input(number.denominator_string(), "toontalk-denominator-input", "", "Type here to edit the denominator");
			var decimal_format = TT.UTILITIES.create_radio_button("number_format", "decimal", "Decimal", "Display number as a decimal.");
			var proper_format = TT.UTILITIES.create_radio_button("number_format", "proper_fraction", "Proper fraction", "Display number as a proper fraction with an integer part and a fraction.");
			var improper_format =TT.UTILITIES.create_radio_button("number_format", "improper_fraction", "Improper fraction", "Display number as a simple fraction.");
			var plus = TT.UTILITIES.create_radio_button("operator", "+", "+", "Add me to what I'm dropped on."); // no need for &plus; and it doesn't work in IE9
			var minus = TT.UTILITIES.create_radio_button("operator", "-", "&minus;", "Subtract me from what I'm dropped on.");
			var multiply = TT.UTILITIES.create_radio_button("operator", "*", "&times;", "Multiply me with what I'm dropped on.");
			var divide = TT.UTILITIES.create_radio_button("operator", "/", "&divide;", "Divide me into what I'm dropped on.");
			var power = TT.UTILITIES.create_radio_button("operator", "^", "Integer power", "Use me as the number of times to multiply together what I'm dropped on.");
            var update_value = function () {
				var numerator = numerator_input.button.value.trim();
				var denominator = denominator_input.button.value.trim();
                number.set_from_values(numerator, denominator, true);
				if (TT.robot.in_training) {
					TT.robot.in_training.edited(number, {setter_name: "set_from_values",
			                                             argument_1: numerator,
														 argument_2: denominator,
														 toString: "change the value to " + numerator + "/" + denominator + " of the number"});
				}
            };
			var update_format = function () {
				// use JQuery instead?
				var format = TT.UTILITIES.selected_radio_button(decimal_format.button, proper_format.button, improper_format.button).value;
				number.set_format(format, true);
				if (TT.robot.in_training) {
					TT.robot.in_training.edited(number, {setter_name: "set_format",
			                                             argument_1: format,
														 toString: "change the format to " + format + " of the number"});
				}
			};
			var update_operator = function () {
				var operator = TT.UTILITIES.selected_radio_button(plus.button, minus.button, multiply.button, divide.button, power.button).value;
				number.set_operator(operator, true);
				if (TT.robot.in_training) {
					TT.robot.in_training.edited(number, {setter_name: "set_operator",
			                                             argument_1: operator,
														 toString: "change the operator to " + operator + " of the number"});
				}
			};
			var number_set = TT.UTILITIES.create_horizontal_table(numerator_input.container, slash, denominator_input.container);
			var format_set = $(TT.UTILITIES.create_horizontal_table(decimal_format.container, proper_format.container, improper_format.container)).buttonset().get(0);
            var operator_set = $(TT.UTILITIES.create_horizontal_table(plus.container, minus.container, multiply.container, divide.container, power.container)).buttonset().get(0);
			var standard_buttons = TT.backside.create_standard_buttons(backside, number);
			var infinite_stack_check_box = TT.backside.create_infinite_stack_check_box(backside, number);
			backside_element.appendChild(number_set);
			backside_element.appendChild(format_set);
			backside_element.appendChild(operator_set);
			backside_element.appendChild(standard_buttons);
			backside_element.appendChild(infinite_stack_check_box.container);
			// use JQuery UI for the following???
            numerator_input.button.onchange = update_value;
            denominator_input.button.onchange = update_value;
			decimal_format.button.onchange = update_format;
			proper_format.button.onchange = update_format;
			improper_format.button.onchange = update_format;
			switch (number.get_format()) {
				case "decimal":
				TT.UTILITIES.check_radio_button(decimal_format);
				break;
				case "improper_fraction":
				TT.UTILITIES.check_radio_button(improper_format);
				break;
				case "proper_fraction":
				TT.UTILITIES.check_radio_button(proper_format);
				break;
			}
			switch (number.get_operator()) {
				case "+":
				TT.UTILITIES.check_radio_button(plus);
				break;
				case "-":
				TT.UTILITIES.check_radio_button(minus);
				break;
				case "*":
				TT.UTILITIES.check_radio_button(multiply);
				break;
				case "/":
				TT.UTILITIES.check_radio_button(divide);
				break;
				case "^":
				TT.UTILITIES.check_radio_button(power);
				break;
			}
			plus.button.onchange = update_operator;
			minus.button.onchange = update_operator;
			multiply.button.onchange = update_operator;
			divide.button.onchange = update_operator;
			power.button.onchange = update_operator;
			backside.update_display = function () {
// 				var number_widget = this.get_widget();
				$(numerator_input.button).val(number.numerator_string());
				$(denominator_input.button).val(number.denominator_string());
			};
            return backside;
        }

    };
}(window.TOONTALK));
