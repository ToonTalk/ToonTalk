 /**
 * Implements ToonTalk's exact arithmetic using rational numbers
 * Relies upon https://npmjs.org/package/bigrat
 * Authors: Ken Kahn
 * License: New BSD
 */

/*jslint browser: true, devel: true, vars: true */
/*global BigInteger, bigrat */

window.TOONTALK.number = (function () {
    "use strict";
    
    var TT = window.TOONTALK; // for convenience and more legible code
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
                size *= factor;
            }
        } else {
            index = string.length - 1; // start with last digit or character
            while (size >= 1 && index > 0) {
                result = "<span class='toontalk-digit' style='font-size:" + size + "%'>" + string[index] + "<\/span>" + result;
                index -= 1;
                size *= factor;
            }
        }
        return result;
    };

    var fit_string_to_length = function (string, max_characters) {
        if (string.length <= max_characters) {
            return string;
        }
        if (max_characters < 4) {
            return string[0] + "<span class='toontalk-three-dots-in-number' style='font-size: 33%'>...</span>" + string[string.length - 1];
        }
        var characters_on_each_side = max_characters / 2;
        return shrink_to_fit(string, characters_on_each_side, true) +
               shrink_to_fit(string, characters_on_each_side, false);
    };

    var generate_decimal_places = function (fraction, max_decimal_places) {
        fraction = fraction.absolute_value();
        var numerator = fraction.get_value()[0];
        var denominator = fraction.get_value()[1];
        var ten = new BigInteger(10);
        var result = "";
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
        if ((typeof numerator === 'number' || typeof numerator === 'string') && (typeof denominator === 'number'  || typeof denominator === 'string')) {
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

    // public methods
    number.create = function (numerator, denominator) {
        var result = Object.create(number);
        // value is a private variable closed over below
        var value = bigrat_from_values(numerator, denominator);
        var format = "improper_fraction";
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
        result.get_format =
            function () { 
                return format; 
            };
        return number.add_sides_functionality(result);
    };
	
	number.create_backside = function () {
		return TT.number_backside.create(this);
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

    number.copy = function () {
        var copy = number.create(this.get_value()[0], this.get_value()[1]);
		if (this.erased) {
			copy.erased = this.erased;
		}
		if (this.operator) {
			copy.operator = this.operator;
		}
		return copy;
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
        var client_width, client_height, font_size, font_width, font_height, number_element, new_HTML;
        client_width = frontside_element.clientWidth;
        client_height = frontside_element.clientHeight;
        font_height = client_height * 0.8;
	//         font_size = TT.UTILITIES.get_style_numeric_property(frontside, "font-size");
        // according to http://www.webspaceworks.com/resources/fonts-web-typography/43/
        // the aspect ratio of monospace fonts varies from .43 to .55 
        font_width = font_height * 0.64; // .55 'worst' aspect ratio -- add a little extra
        // could find the font name and use the precise value
        new_HTML = this.to_HTML(client_width / font_width, font_height, this.get_format());
        if (!frontside_element.firstChild) {
            frontside_element.appendChild(document.createElement('div'));
        }
        frontside_element.firstChild.innerHTML = new_HTML;
    };

    number.drop_on = function (other, location) {
        return other.number_dropped_on_me(this, location);
    };

    number.number_dropped_on_me = function (other_number) { // ignores the optional 'location' parameters
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

    number.to_HTML_with_operator = function () {
        switch (this.get_operator()) {
        case '+':
            return this.to_HTML();
        case '-':
            return '&minus' + this.to_HTML();
        case '*':
            return '&times;' + this.to_HTML();
        case '/':
            return '&divide;' + this.to_HTML();
        case '^':
            return '^' + '<sup>' + this.toHTML() + '<\/sub>';
        default:
            console.log("Number has an unsupported operator: " + this.get_operator());
            return this;
        }
    };

    number.get_operator = function () {
        if (!this.operator) {
            this.operator = '+';
        }
        return this.operator;
    };

    number.set_operator = function (operator) {
        this.operator = operator;
        return this;
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

    number.toString = function () {
        // addition is implicit so don't display it
        var operator_string = this.get_operator() === '+' ? '' : this.get_operator();
		var erased_string = this.erased ? "erased: " : "";
        return erased_string + operator_string + bigrat.str(this.get_value());
    };

    number.to_HTML = function (max_characters, font_size, format, top_level) {
        // normalise value first?
        var integer_as_string, integer_part, fractional_part;
        var extra_class = (top_level !== false) ? ' toontalk-top-level-number' : '';
        if (!max_characters) {
            max_characters = 4;
        }
        if (!font_size) {
            font_size = 16;
        }
        if (this.is_integer()) {
            integer_as_string = bigrat.toBigInteger(this.get_value()).toString();
            return '<div class="toontalk-number toontalk-integer' + extra_class + '" style="font-size: ' + font_size + 'px;">' + fit_string_to_length(integer_as_string, max_characters) + '</div>';
        }
        if (format === 'improper_fraction' || !format) { // default format
            // double the max_characters since the font size is halved
            return '<table class="toontalk-number toontalk-improper-fraction ' + extra_class + '" style="font-size: ' + (font_size * 0.5) + 'px;">' +
                '<tr class="toontalk-numerator"><td align="center" class="toontalk-number">' + fit_string_to_length(this.numerator_string(), max_characters * 2) + '</td></tr>' +
                '<tr class="toontalk-fraction-line-as-row"><td  class="toontalk-fraction-line-as-table-entry"><hr class="toontalk-fraction-line"></td></tr>' +
                '<tr class="toontalk-denominator"><td align="center" class="toontalk-number">' + fit_string_to_length(this.denominator_string(), max_characters * 2) + '</td></tr></table>';
        }
        if (format === 'proper_fraction') {
            integer_part = this.integer_part();
            if (integer_part.is_zero()) {
                return this.to_HTML(max_characters, 'improper_fraction', false);
            }
            fractional_part = this.copy().subtract(integer_part).absolute_value();
            // split max_characters between the two parts and recur for each them
            return '<table class="toontalk-number toontalk-improper_fraction ' + extra_class + '" style="font-size: ' + (font_size * 0.5) + 'px;">' +
                '<tr><td class="toontalk-number toontalk-integer-part-of-proper-fraction">' +
                integer_part.to_HTML(max_characters, font_size, '', false) + // integers don't have formats
                '</td><td class="toontalk-number toontalk-fraction-part-of-proper_fraction">' +
                fractional_part.to_HTML(max_characters, font_size, 'improper_fraction', false) +
                '</td></tr></table>';
        }
        if (format === 'decimal') {
            return '<div class="toontalk-number toontalk-decimal' + extra_class + '" style="font-size: ' + font_size + 'px;">' + this.decimal_string(max_characters) + '</div>';
        }
        // else warn??
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

    number.decimal_string = function (max_decimal_places) {
        if (this.is_integer()) {
            return this.numerator_string();
        }
        var copy = this.copy();
        var integer_part = copy.integer_part();
        var integer_string = integer_part.toString();
        var fractional_part = copy.subtract(integer_part);
        var integer_max_digits = Math.min(integer_string.length, max_decimal_places / 2);
        var decimal_max_digits = max_decimal_places - integer_max_digits;
        var decimal_places = generate_decimal_places(fractional_part, decimal_max_digits * 2);
        if (decimal_places.length < decimal_max_digits) {
            // not repeating and not too many decimal digits
            integer_max_digits = max_decimal_places - decimal_places.length;
            decimal_max_digits = decimal_places.length;
        }
        // generate twice as many decimal places are there is room for so they shrink
        // split space between integer part and decimal part
        return fit_string_to_length(integer_string, integer_max_digits) +
            "<span class='toontalk-decimal-point' style='font-family: serif'>.</span>" + // decimal point looks better if not monospace
            shrink_to_fit(decimal_places, max_decimal_places / 2, true);
    };

    number.match = function (context) {
        if (this.erased) {
            return context.match_with_any_number();
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
}());
