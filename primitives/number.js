 /**
 * Implements ToonTalk's exact arithmetic using rational numbers
 * Relies upon https://npmjs.org/package/bigrat
 * Authors: Ken Kahn
 * License: New BSD
 */

/*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */
/*global BigInteger, bigrat */

(function (TT) {  // TT is for convenience and more legible code
    "use strict";
    // common functions and variables between number, number backside, and number functions

    // TODO: make these into 'const' when Ecma6 is everywhere
    var RADIAN                         = 180/Math.PI;
    var LOG_10                         = Math.log(10); 
    var TEN                            = bigrat.fromInteger(10); 
    var HALF                           = bigrat.fromValues( 1, 2);
    var NEGATIVE_HALF                  = bigrat.fromValues(-1, 2);
    var THREE_HUNDRED_AND_SIXTY        = bigrat.fromInteger(360);
    var TWO_PI                         = bigrat.fromDecimal(2*Math.PI);
//     var MAX_JAVASCRIPT_NUMBER          = bigrat.fromDecimal(Number.MAX_VALUE);
//     var NEGATIVE_MAX_JAVASCRIPT_NUMBER = bigrat.opposite(bigrat.create(), MAX_JAVASCRIPT_NUMBER);

    // Math.log10 not defined in IE11
    var log10 = Math.log10 ? Math.log10 : function (x) { return Math.log(x)/LOG_10 };

    var integer_and_fraction_parts = function (rational_number) {
        // if rational_number is negative then so are the parts (or zero if integer_part is zero)
        var integer_part    = bigrat.fromValues(bigrat.toBigInteger(rational_number), 1);
        var fractional_part = bigrat.subtract(bigrat.create(), rational_number, integer_part);
        return {integer_part:    integer_part,
                fractional_part: fractional_part};
    };

    var box_with_integer_and_fraction = function (rational_number) {
        var parts = integer_and_fraction_parts(rational_number);
        var integer_number  = TT.number.ZERO(TT.number.function_bird_results_default_format);
        var fraction_number = TT.number.ZERO(TT.number.function_bird_results_default_format);
        integer_number.set_value(parts.integer_part);
        fraction_number.set_value(parts.fractional_part);
        return TT.box.create(2, true, [integer_number, fraction_number], "The integer and fraction parts of " + rational_number.toString().replace(",", "/"));
    };

    var modulo = function (n, modulus) {
        var quotient = bigrat.divide(bigrat.create(), n, modulus);
        var quotient_parts = integer_and_fraction_parts(quotient);
        // reuse storage of quotient since not needed anymore
        return bigrat.multiply(quotient, quotient_parts.fractional_part, modulus);
    };

    var round = function (rational_number) {
        var parts = integer_and_fraction_parts(rational_number);
        if (bigrat.isLessThan(parts.fractional_part, NEGATIVE_HALF)) {
            // e.g. round(-2.7) returns -3
            return bigrat.subtract(parts.integer_part, parts.integer_part, bigrat.ONE);
        }
        if (bigrat.isLessThan(parts.fractional_part, bigrat.ZERO)) {
            // e.g. round(-2.3) returns -2
            return parts.integer_part;
        }
        if (bigrat.isLessThan(parts.fractional_part, HALF)) {
            // e.g. round(2.3) returns 2
            return parts.integer_part;
        }
        // e.g. round(2.7) returns 3
        return bigrat.add(parts.integer_part, parts.integer_part, bigrat.ONE);   
    };

    var floor = function (rational_number) {
        var parts = integer_and_fraction_parts(rational_number);
        if (bigrat.isLessThan(parts.fractional_part, bigrat.ZERO)) {
            // e.g. floor(-2.3) returns -3
            return bigrat.subtract(parts.integer_part, parts.integer_part, bigrat.ONE);
        }
        return parts.integer_part;
    };

    var ceiling = function (rational_number) {
        var parts = integer_and_fraction_parts(rational_number);
        if (bigrat.isLessThan(parts.fractional_part, bigrat.ZERO)) {
            // e.g. ceil(-2.3) returns -2
            return parts.integer_part;
        }
        if (bigrat.equals(parts.fractional_part, bigrat.ZERO)) {
            return parts.integer_part;
        }
        return bigrat.add(parts.integer_part, parts.integer_part, bigrat.ONE);
    };

window.TOONTALK.number = (function () {   
    var number = Object.create(TT.widget);

    var shrink_to_fit = function (string, number_of_full_size_characters, font_size, fromLeft) {
        // after steps iteration the digits should be 1% of the initial size
        var result = '',
            index,
            size = 100,
            minimum_size = 50/font_size, // percentage that is half a pixel
            factor = number_of_full_size_characters/(1+number_of_full_size_characters);
        if (fromLeft) {
            index = 0; // start with first digit or character
            while (size >= minimum_size && index < string.length) {
                result = result + "<span class='toontalk-digit' style='font-size:" + size + "%'>" + string[index] + "<\/span>";
                index += 1;
                if (string[index] !== '-') {
                    // don't shrink if just displayed a minus sign
                    size *= factor;
                }
            }
        } else {
            index = string.length - 1; // start with last digit or character
            while (size >= minimum_size && index > 0) {
                result = "<span class='toontalk-digit' style='font-size:" + size + "%'>" + string[index] + "<\/span>" + result;
                index -= 1;
                if (string[index] !== '-') {
                    size *= factor;
                }
            }
        }
        return result;
    };

    var shrinking_digits_length = function (number_of_full_size_characters, font_size) {
        // returns number of shrinking digits that could fit in number_of_full_size_characters*font_size
        // before getting below half a pixel
        var factor = number_of_full_size_characters/(1+number_of_full_size_characters); 
        return Math.ceil(Math.log(.5/font_size)/Math.log(factor));
    };

    var fit_string_to_length = function (string, max_characters, font_size) {
        if (string.length <= Math.round(max_characters)) {
            return '<span class="toontalk-digit" style="font-size:100%">' + string + '</span>';
        }
        if (max_characters < 1) {
            // hopefully too small to see
            return "";
        }
        if (max_characters < 5) {
            // decrease font size and try again
            return "<span style='font-size: 80%'>" + fit_string_to_length(string, max_characters * 1.25, font_size * 0.8) + "</span>";
        }
        // substract 1 to look better
        var characters_on_each_side = max_characters/2-1;
        return shrink_to_fit(string, characters_on_each_side, font_size, true) +
               shrink_to_fit(string, characters_on_each_side, font_size, false);
    };

    var generate_decimal_places = function (bigrat_fraction, number_of_full_size_characters) {
        var result = "";
        if (bigrat.isNegative(bigrat_fraction)) {
            bigrat.abs(bigrat_fraction, bigrat_fraction);
        }
        return generate_decimal_places_from_numerator_and_denominator(bigrat.fromValues(bigrat_fraction[0], 1), 
                                                                      bigrat.fromValues(bigrat_fraction[1], 1), 
                                                                      number_of_full_size_characters);
    };

    var generate_decimal_places_from_numerator_and_denominator = function (numerator, denominator, number_of_full_size_characters) {
        // numerator and denominator are bigrats with denominators of 1
        var result = "";
        // this is base 10 -- could generalise...
        var quotient_rational = bigrat.create();
        var quotient_integer  = bigrat.create();
        var quotient_fraction = bigrat.create();
        bigrat.multiply(numerator, numerator, TEN);
        while (number_of_full_size_characters > result.length) {
            if (bigrat.isLessThan(numerator, denominator)) {
                result += "0";
            } else {
                bigrat.divide(quotient_rational, numerator, denominator);
                quotient_integer = bigrat.toBigInteger(quotient_rational);
                result += quotient_integer.toString();
                bigrat.subtract(quotient_fraction, quotient_rational, bigrat.fromValues(quotient_integer, 1));
                bigrat.multiply(numerator, quotient_fraction, denominator); 
                if (bigrat.equals(numerator, bigrat.ZERO)) {
                    result = remove_trailing_zeroes(result);
                    return result;
                }
            }
            bigrat.multiply(numerator, numerator, TEN);
        }
        return result;
    };

    var remove_trailing_zeroes = function (string) {
        if (string.length > 0 && string.charAt(string.length-1) === '0') {
            return remove_trailing_zeroes(string.substring(0, string.length-1));
        }
        return string;
    };

    var compute_number_of_full_size_characters_after_decimal_point = function (number_of_full_size_characters, integer_string_length) {
        var integer_max_digits = Math.min(integer_string_length, number_of_full_size_characters/2);
         // 1 for the decimal point despite it being in a different font type
        return number_of_full_size_characters-(integer_max_digits+1);
    };
    
    var bigrat_from_values = function (numerator, denominator) {
        // numerator and denominator are integers, strings, or TT.numbers
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
        case '=':
            return '&equals;';
        case '^':
            // deprecated
            return '^';
        default:
            TT.UTILITIES.report_internal_error("Number has an unsupported operator: " + operator);
            return "";
        }
    };

    var scientific_notation_exponent = function (rational_number) {
        var absolute_value = bigrat.abs(bigrat.create(), rational_number);
        var negative_exponent = bigrat.isLessThan(absolute_value, bigrat.ONE);
        var integer_approximation, integer_approximation_as_string;
        if (negative_exponent) {
            // use reciprocal to compute exponent
            integer_approximation = bigrat.toBigInteger(bigrat.divide(bigrat.create(), bigrat.ONE, absolute_value));
        } else {
            integer_approximation = bigrat.toBigInteger(absolute_value);
        }
        integer_approximation_as_string = integer_approximation.toString();
        if (negative_exponent) {
            return -integer_approximation_as_string.length;
        }
        return integer_approximation_as_string.length-1;
    };

    number.default_format                       = "mixed_number";
    number.function_bird_results_default_format = "decimal";

    number.create = function (numerator, denominator, operator, format, description, approximate) {
        var new_number = Object.create(number);
        // value is a private variable closed over below
        var value = bigrat_from_values(numerator, denominator);
//         if (!format) {
//             format = number.default_format;
//         }
        if (!operator) {
            operator = '+';
        }         
        new_number.is_number = function () {
            return true;
        };
        new_number.set_value =
            function (new_value, dont_check_if_new) {
                if (!dont_check_if_new && bigrat.equals(value, new_value)) {
                    return;
                }
                this.fire_value_change_listeners(value, new_value);
                value = new_value;
                this.rerender(); // will update if visible
                if (TT.debugging) {
                    this._debug_string = this.to_debug_string();
                    if (new_value.toString() === "0,0") {
                        TT.UTILITIES.report_internal_error("Impossible numeric value -- can be caused by decimal string not being parsable as a number.");
                    }
                }
                return this;
            };
        // sub classes can call set_value_from_sub_classes from within their set_value without recurring 
        // since this closes over value calling super by storing and invoking this.set_value doesn't work 
        // if as in attribute_object.set_value it needs to set_value of its copies (without each of them doing the same)
        new_number.set_value_from_sub_classes = new_number.set_value;
        new_number.fire_value_change_listeners = function (old_value, new_value) {
            var listeners = this.get_listeners('value_changed');
            var event;
            if (listeners) {
                event = {type: 'value_changed',
                         old_value: old_value,
                         new_value: new_value};
                listeners.forEach(function (listener) {
                    listener(event);
                });
            }
        };
        new_number.get_value =
            function () {
                return value; 
            };
        new_number.set_value_from_decimal =
            function (decimal_string) {
                // e.g. an attribute value
                this.set_value(bigrat.fromDecimal(decimal_string));
                if (TT.debugging && this.get_value().toString() === "0,0") {
                    TT.UTILITIES.report_internal_error("Number being set to 0/0 from " + decimal_string);
                }
            };
        new_number.copy = function (parameters) {
            // this does not use this.get_format() etc because should not pass along default values
            // also this is presumably faster
            return this.add_to_copy(number.create(value[0], value[1], operator, format, description, approximate), parameters);
        };
        new_number.get_format =
            function () { 
                return format || number.default_format; 
            };
        new_number.set_format =
            function (new_value, update_now) { 
                format = new_value;
                if (update_now) {
                    this.rerender();
                }
                return this;
            };
        new_number.get_operator =
            function () { 
                return operator; 
            };
        new_number.set_operator =
            function (new_value, update_now) { 
                operator = new_value;
                if (update_now) {
                    this.rerender();
                }
                return this;
            };
        new_number.get_approximate =
            function () { 
                return approximate; 
            };
        new_number.set_approximate = 
            function (new_value, update_now) { 
                approximate = new_value;
                if (update_now) {
                    this.rerender();
                }
                return this;
            };
        number.add_standard_widget_functionality(new_number);
        new_number.set_description(description);
        if (TT.debugging) {
            new_number._debug_string = new_number.toString();
            new_number._debug_id = TT.UTILITIES.generate_unique_id();
            value._debug_id_new = new_number._debug_id; // for debugging
        }
        return new_number;
    };

    number.create_from_bigrat = function (bigrat) {
        var result = TT.number.ZERO();
        result.set_value(bigrat);
        return result;
    };
    
    number.create_backside = function () {
        return TT.number_backside.create(this);
    };
        
    number.set_from_values = function (numerator, denominator) {
        return this.set_value(bigrat_from_values(numerator, denominator));
    };

    number.set_numerator = function (numerator) {
        return this.set_value(bigrat_from_values(numerator, this.get_value()[1].toString()));
    };

    number.set_denominator = function (denominator) {
        return this.set_value(bigrat_from_values(this.get_value()[0].toString(), denominator));
    };

    number.ONE = function () {
        return TT.number.create(1);
    };

    number.ZERO = function (format) {
        return TT.number.create(0, undefined, undefined, format);
    };
    
    number.equals = function (other) {
        return other.equals_number && other.equals_number(this);
    };

    number.equals_number = function (other_number) {
        // note that we are not considering the operator -- TODO: decide if it should
        return bigrat.equals(this.get_value(), other_number.get_value());
    };

    number.compare_with = function (other) {
        if (other.compare_with_number) {
            return -1*other.compare_with_number(this);
        }
    };

    number.compare_with_number = function (other_number) {
        if (bigrat.equals(this.get_value(), other_number.get_value())) {
            return 0;
        }
        if (bigrat.isGreaterThan(this.get_value(), other_number.get_value())) {
            return 1;
        }
        return -1;
    };
    
    number.update_display = function () {
        // should compute width from frontside element
        // get format from backside ancestor (via parent attribute?)
        var frontside = this.get_frontside(true);
        var add_to_style = function (html, additional_style) {
            var style_index = html.indexOf('style="');
            if (style_index >= 0) {
                return html.substring(0, style_index+7) + additional_style + html.substring(style_index+7);
            }
            return html;
        };
        var border_size = 28;
        var frontside_element, $dimensions_holder, client_width, client_height, border_size,
            font_height, font_width, max_decimal_places, new_HTML, backside, 
            size_unconstrained_by_container, no_borders, parent_widget, child_element;
        if (TT.logging && TT.logging.indexOf('display') >= 0) {
            console.log("Updating display of " + this.to_debug_string());
        }
        frontside_element = frontside.get_element();
        if ($(frontside_element).is(".toontalk-conditions-contents")) {
            $dimensions_holder = $(frontside_element);
        } else if ($(frontside_element).parent().is(".toontalk-backside, .toontalk-json")) {
            $dimensions_holder = $(frontside_element);
            size_unconstrained_by_container = true;
        } else if ($(frontside_element).parent().is(".toontalk-element-frontside")) {
            $dimensions_holder = $(frontside_element);
            size_unconstrained_by_container = true;
            no_borders = true;
        } else if ($(frontside_element).parent().is(".toontalk-scale-half")) {
            // scales set the size of contents explicitly 
            $dimensions_holder = $(frontside_element);
        } else {
            $dimensions_holder = $(frontside_element).parent();
        }
        if ($dimensions_holder.length === 0) {
            // before giving up see if the widgets know about the container
            parent_widget = this.get_parent_of_frontside();
            if (parent_widget) {
                if (parent_widget.get_widget().is_hole()) {
                    parent_widget = parent_widget.get_parent_of_frontside();
                }
                $dimensions_holder = $(parent_widget.get_frontside_element());
            }
        }
        if ($(frontside_element).is(".toontalk-carried-by-bird")) {
            // good enough values when carried by a bird
            client_width  = 100;
            client_height = 100;
        } else  if ($(frontside_element).is(".toontalk-held-by-robot")) {
            client_width  = 76;
            client_height = 55;
        } else if ($(frontside_element).is(".toontalk-element-attribute")) {
            // good enough if this number is an element attribute
            client_width  = 200;
            client_height =  32;
        } else if (size_unconstrained_by_container && (frontside_element === $dimensions_holder.get(0) || $dimensions_holder.is(".toontalk-top-level-resource"))) {
            client_width  = $(frontside_element).width();
            client_height = $(frontside_element).height()
            if (!client_width || !client_height) {
                // TODO: generalise this
                client_width  = this.saved_width   || 76;
                client_height = this.saved_heieght || 55;
                $(frontside_element).css({width:  client_width,
                                          height: client_height});
            }
        } else {
            client_width  = $dimensions_holder.width();
            client_height = $dimensions_holder.height();
            if (client_width === 0 || client_height === 0) {
                if (TT.logging && TT.logging.indexOf('display') >= 0) {
                    console.log("Container has zero dimensions so no display of " + this.to_debug_string());
                }
                if (!TT.UTILITIES.is_attached(frontside_element)) {
                    // try again when attached
                    TT.UTILITIES.when_attached(frontside_element, this.update_display.bind(this));
                }
                return;
            }
            if ($dimensions_holder.is(".toontalk-nest")) {
                // doesn't cover the nest completely 
                client_width  *= TT.nest.CONTENTS_WIDTH_FACTOR;
                client_height *= TT.nest.CONTENTS_HEIGHT_FACTOR;
            }
        }
        child_element = $(frontside_element).children(".toontalk-widget");
        if (child_element.is("*")) {
            child_element = child_element.get(0);
        } else {
            child_element = document.createElement('div');
            frontside_element.appendChild(child_element);
        }
        $(frontside_element).removeClass("toontalk-number-eighth-size-border toontalk-number-quarter-size-border toontalk-number-half-size-border toontalk-number-full-size-border");
        border_size = this.get_border_size(client_width, client_height);
        if (no_borders) {
            // e.g. part of an element widget
        } else if (border_size === 4) {
            $(frontside_element).addClass("toontalk-number-eighth-size-border toontalk-number");
        } else if (border_size === 8) {
            $(frontside_element).addClass("toontalk-number-quarter-size-border toontalk-number");
        } else if (border_size === 16) {
            $(frontside_element).addClass("toontalk-number-half-size-border toontalk-number");
        } else {
            $(frontside_element).addClass("toontalk-number-full-size-border toontalk-number");
        }
        font_height = (client_height-border_size*2);
//      font_size = TT.UTILITIES.get_style_numeric_property(frontside, "font-size");
        // according to http://www.webspaceworks.com/resources/fonts-web-typography/43/
        // the aspect ratio of monospace fonts varies from .43 to .55
        font_width = font_height * 0.64; // .55 'worst' aspect ratio -- add a little extra
        // could find the font name and use the precise value
        max_decimal_places = client_width / font_width;
        new_HTML = this.to_HTML(max_decimal_places, font_height, this.get_format(), true, this.get_operator(), size_unconstrained_by_container);
        if (TT.UTILITIES.on_a_nest_in_a_box(frontside_element)) {
            // need to work around a CSS problem where nested percentage widths don't behave as expected
            new_HTML = add_to_style(new_HTML, "width:" + client_width + "px;");
        }
        child_element.innerHTML = new_HTML;
        // numbers looked wrong when translated (extra spaces between digits)
        child_element.translate = false;
        $(child_element).addClass("toontalk-widget notranslate");
        if ($dimensions_holder.is(".toontalk-box-hole")) {
            $(frontside_element).css({width: '',
                                      height: ''});
        }
        TT.UTILITIES.give_tooltip(frontside_element, this.get_title());
    };

    number.get_border_size = function (width, height) {
        if (width <= 64 || height <= 64) {
            return 4;
        } else if (width <= 128 || height <= 128) {
            return 8;
        } else if (width <= 256 || height <= 256) {
            return 16;
        } else {
            return 32;
        }
    };
    
    number.to_HTML = function (original_max_characters, font_size, format, top_level, operator, size_unconstrained_by_container) {
        var integer_as_string, value_as_string, integer_part, fractional_part, improper_fraction_HTML, digits_needed, shrinkage, table_style,
            // following needed for scientific notation
            exponent, ten_to_exponent, exponent_area, exponent_index, exponent_string, significand, max_decimal_places, decimal_digits, integer_digit, negative, decimal_part;
        var extra_class = (top_level !== false) ? ' toontalk-top-level-number' : '';
        var minimum_characters = 4;
        var max_characters = original_max_characters;
        var operator_end = ""; // typically no need for something at the end due to the operator -- e.g. -(-2)
        // --2 needs to be displayed as -(-2)
        var subtraction_of_negative_number;
        if (this.is_attribute_widget && this.is_attribute_widget()) {
             extra_class += " toontalk-attribute-number";
        } else if (this.get_approximate()) {
            extra_class += " toontalk-approximate-number";
        }
        if (size_unconstrained_by_container) {
            extra_class += ' toontalk-number-size-unconstrained-by-container';
        }
        var operator_HTML = operator ? html_for_operator(operator) : "";
        if (!max_characters) {
            max_characters = 4;
        }
        if (!font_size) {
            font_size = 16;
        }
        if (this.get_erased && this.get_erased()) {
            return '<div class="toontalk-number toontalk-integer' + extra_class + '" style="font-size: ' + font_size + 'px;"></div>';
        }
        if (operator_HTML.length > 0) {
            max_characters -= 1; // leave room for operator
            subtraction_of_negative_number = operator === '-' && 
                                               (this.is_negative() || this.is_zero()) &&
                                               (this.is_integer() || (format !== "improper_fraction" && format !== "proper_fraction" && format !== "mixed_number"));
            if (subtraction_of_negative_number) {
                max_characters -= 1;
                operator_HTML += "&nbsp;";
                operator_end = "";
            }
            if (max_characters < 2) {
                // better to use a smaller font than have too few digits
                font_size *= Math.max(1, max_characters) / 2;
                max_characters = 2;
            }
        }
        if (this.is_integer() && format !== 'scientific_notation') {
            try {
                integer_as_string = bigrat.toBigInteger(this.get_value()).toString();
            } catch (e) {
                TT.UTILITIES.report_internal_error("Error converting number to a string: " + e);
                integer_as_string = "0";
            }
            digits_needed = integer_as_string.length;
            if (operator_HTML.length > 0) {
                digits_needed++;
            }
            if (max_characters < 4 && digits_needed > max_characters) {
                shrinkage = Math.min(4, digits_needed);
                font_size *= max_characters / shrinkage;
                max_characters = shrinkage;
            }
            return '<div class="toontalk-number toontalk-integer' + extra_class + '" style="font-size: ' + font_size + 'px;">' +
                   operator_HTML + fit_string_to_length(integer_as_string, max_characters, font_size) + operator_end + '</div>';
        }
        if (this.get_approximate() || this.is_attribute_widget()) {
            if (format === 'decimal') {
                value_as_string = bigrat.toDecimal(this.get_value()).toString();
            } else if (format === 'scientific_notation') {
                value_as_string = bigrat.toDecimal(this.get_value()).toExponential();
                exponent_index = value_as_string.indexOf('e');
                if (exponent_index >= 0) {
                    exponent = value_as_string.substring(exponent_index+1);
                    value_as_string = value_as_string.substring(0, exponent_index);  
                }
            }
            if (value_as_string) {
                digits_needed = value_as_string.length;
                if (operator_HTML.length > 0) {
                    digits_needed++;
                }
                if (exponent) {
                    // 3 for x10
                    max_characters -= 3+exponent.length/2;
                }
                if (format === 'scientific_notation') {
                    minimum_characters += 2; // need room for exponent and x10
                }
                if (max_characters < minimum_characters && digits_needed > max_characters) {
                    shrinkage = Math.min(minimum_characters, digits_needed);
                    if (max_characters <= 0) {
                        font_size *= Math.max(1, max_characters) / shrinkage;
                    } else {
                        font_size *= Math.max(2, max_characters) / shrinkage;
                    }
                    max_characters = shrinkage;
                }
                if (exponent) {
                    exponent_string = '&times;10<sup style="font-size: ' + font_size/2 + 'px;">' + exponent + '</sup>';
                } else {
                    exponent_string = "";
                }
                return '<div class="toontalk-number toontalk-approximate-number' + extra_class + '" style="font-size: ' + font_size + 'px;">' +
                       operator_HTML + shrink_to_fit(value_as_string, max_characters, font_size, true) + exponent_string + operator_end + '</div>';
            }
        }
        table_style = ' style="font-size:' + (font_size * 0.4) + 'px;"';
        if (format === 'improper_fraction' || !format) { // default format
            // double the max_characters since the font size is halved
            improper_fraction_HTML = 
                '<table class="toontalk-number toontalk-improper-fraction' + extra_class + '"' + table_style + '>' +
                '<tr class="toontalk-numerator"><td align="center" class="toontalk-number">' + fit_string_to_length(this.numerator_string(), max_characters*2, font_size) + '</td></tr>' +
                '<tr class="toontalk-fraction-line-as-row"><td  class="toontalk-fraction-line-as-table-entry"><div class="toontalk-fraction-line"></div></tr>' +
                '<tr class="toontalk-denominator"><td align="center" class="toontalk-number">' + fit_string_to_length(this.denominator_string(), max_characters*2, font_size) + '</td></tr></table>';
            if (operator_HTML === '') {
                return improper_fraction_HTML;
            } else {
                return "<table class='toontalk-operator-and-fraction'" + table_style + "><tr><td>" + operator_HTML + "</td><td>" + improper_fraction_HTML + "</td></tr></table>";
            }
        }
        if (format === 'mixed_number' || format === 'proper_fraction') {
            // proper_fraction is the old name for mixed_number
            integer_part = this.integer_part();
            if (integer_part.is_zero()) {
                return this.to_HTML(max_characters, font_size, 'improper_fraction', top_level, operator);
            }
            fractional_part = this.copy({just_value: true}).subtract(integer_part).absolute_value();
            // split max_characters between the two parts and recur for each them
            return '<table class="toontalk-number toontalk-mixed-number' + extra_class + '"' + table_style + '>' +
                   '<tr><td class="toontalk-number toontalk-integer-part-of-mixed-number">' +
                    integer_part.to_HTML(max_characters/2, font_size, '', false, this.get_operator()) + // integers don't have formats but should display operator
                    '</td><td class="toontalk-number toontalk-fraction-part-of-mixed-number">' +
                    fractional_part.to_HTML(max_characters/2, font_size, 'improper_fraction', false) +
                   '</td></tr></table>';
        }
        if (format === 'decimal') {
            if (max_characters < 4) {
                // better to use a smaller font than have too few digits
                font_size *= Math.max(1, max_characters) / 4;
                max_characters = 4;
            }
            return '<div class="toontalk-number toontalk-decimal toontalk-top-level-decimal' + extra_class + '" style="font-size: ' + font_size + 'px;">' + operator_HTML + this.decimal_string(max_characters, font_size) + operator_end + '</div>';
        }
        if (format === 'scientific_notation') {
            negative = bigrat.isNegative(this.get_value());
            exponent = scientific_notation_exponent(this.get_value());
            ten_to_exponent = bigrat.power(bigrat.create(), TEN, exponent+1);
            significand = bigrat.divide(bigrat.create(), this.get_value(), ten_to_exponent);
            // 6 for integer_digit, space, and '10x' - divide by 2 since superscript font is smaller
            exponent_area = 6+(exponent === 0 ? 1 : Math.ceil(log10(Math.abs(exponent)))/2);
            if (negative) {
                exponent_area++; // need more room
            }
            if (original_max_characters < exponent_area+1) {
                // try again with a smaller font_size
                return this.to_HTML(exponent_area+1, font_size*original_max_characters/(exponent_area+1), format, top_level, operator, size_unconstrained_by_container);
            }
            max_decimal_places = shrinking_digits_length(compute_number_of_full_size_characters_after_decimal_point(max_characters, exponent_area), font_size); 
            decimal_digits = generate_decimal_places(significand, max_decimal_places);      
            if (negative) { // negative so include sign and first digit
                integer_digit = "-" + decimal_digits.substring(0, 1);
                decimal_digits = decimal_digits.substring(1);
            } else {
                integer_digit = decimal_digits.substring(0, 1);
                decimal_digits = decimal_digits.substring(1);
            }
            decimal_part = shrink_to_fit(decimal_digits, max_characters*(1-(exponent_area/max_characters)), font_size, true);
            if (decimal_part.length > 0) {
                decimal_part = "<span class='toontalk-decimal-point'>.</span>" + decimal_part; // decimal point looks better if not monospace
            }
            return '<table class="toontalk-number toontalk-scientific_notation' + extra_class + '"' + table_style + '>' +
                   '<tr><td class="toontalk-number toontalk-significand-of-scientific-notation">' +
                   // mulitply by .9 since otherwise the number obscures some of the number border
                   '<div class="toontalk-number toontalk-decimal' + extra_class + '" style="font-size: ' + font_size*.9 + 'px;">' +
                   operator_HTML + integer_digit + decimal_part + operator_end + 
                   '</td><td class="toontalk-number toontalk-exponent-of-scientific-notation">' +
                   '<div style="font-size: ' + font_size + 'px;">' +
                   ' &times;10<sup style="font-size: ' + font_size/2 + 'px;">' + exponent + '</sup></div>' +
                   '</td></tr></table>';
        }
        // else warn??
    };

    number.get_default_description = function () {
        if (this.get_approximate()) {
            return "a number from an approximate calculation.";
        }
        return "a number.";
    };

    number.drop_on = function (side_of_other, event, robot) {
        if (!side_of_other.number_dropped_on_me) {
            if (side_of_other.widget_side_dropped_on_me) {
                return side_of_other.widget_side_dropped_on_me(this, event, robot);
            }
            console.log("No handler for drop of '" + this + "' on '" + side_of_other + "'");
            return;
        }
        side_of_other.number_dropped_on_me(this, event, robot);
        return true;
    };
    
    number.number_dropped_on_me = function (side_of_other_number, event, robot) {
         var bammer_element, $top_level_backside_element, target_absolute_position, 
             this_frontside_element, hit_number_continuation, bammer_gone_continuation;
         if (side_of_other_number.is_backside()) {
             return;
         }
         if (side_of_other_number.visible() && this.visible() && (event || robot)) {
             // do this if number is visible and user did the drop or a visible robot did it
             if (robot) {
                 if (!robot.animate_consequences_of_actions()) {
                     return this.number_dropped_on_me_semantics(side_of_other_number, event, robot);
                 }
                 // robot should wait for this
                 side_of_other_number.robot_waiting_before_next_step = robot;
             }
             bammer_element = document.createElement("div");
             $(bammer_element).addClass("toontalk-bammer-down");
             $top_level_backside_element = $(this.get_frontside_element()).closest(".toontalk-top-level-backside");
             // start lower left off screen
             bammer_element.style.left = "-10px";
             bammer_element.style.top = ($top_level_backside_element.height())+"px";
             if ($top_level_backside_element.length > 0) {
                 $top_level_backside_element.get(0).appendChild(bammer_element);
             }
             this_frontside_element = this.get_frontside_element();
             target_absolute_position = $(this_frontside_element).offset();
             target_absolute_position.left -= $(bammer_element).width()*0.75; // hammer is on bammer's right
             // aim for centre of number - Bammer's hammer when smashing is about 60% of his earlier height
             target_absolute_position.left += $(this_frontside_element).width() *0.5+$(bammer_element).width() *0.1; 
             target_absolute_position.top  -= $(this_frontside_element).height()*0.5+$(bammer_element).height()*0.4;
             hit_number_continuation = function () {
                 if (TT.sounds) {
                     TT.sounds.bammer_hammer.play();
                 }
                 if (this.number_dropped_on_me_semantics(side_of_other_number, event, robot) && robot) {
                     // will stop if drop signaled an error
                     robot.run_next_step();
                 }
                 if (event) {
                     this.backup_all();
                 }
                 $(bammer_element).removeClass("toontalk-bammer-down");
                 // TODO: see if timeout is still needed
                 TT.UTILITIES.set_timeout(function () {
                         var top_level_offset = $top_level_backside_element.offset();
                         if (!top_level_offset) {
                             top_level_offset = {left: 0, top: 0};
                         }
                         $(bammer_element).addClass("toontalk-bammer-away");
                         target_absolute_position.left = top_level_offset.left+$top_level_backside_element.width() -100;
                         target_absolute_position.top  = top_level_offset.top +$top_level_backside_element.height()+100;
                         bammer_gone_continuation = function () {
                             $(bammer_element).remove();
                         };
                         TT.UTILITIES.animate_to_absolute_position(bammer_element,
                                                                   target_absolute_position,
                                                                   bammer_gone_continuation,
                                                                   robot && robot.transform_animation_speed(TT.UTILITIES.default_animation_speed)); 
                         $(bammer_element).css({opacity: 0.01});
                     });
             }.bind(this);
             TT.UTILITIES.animate_to_absolute_position(bammer_element,
                                                       target_absolute_position,
                                                       hit_number_continuation,
                                                       robot && robot.transform_animation_speed(TT.UTILITIES.default_animation_speed));
             $(bammer_element).css({opacity: 1.0,
                                    // ensure that Bammer is on top of everything
                                    "z-index": TT.UTILITIES.next_z_index()+100});
             return this;             
         } else {
             return this.number_dropped_on_me_semantics(side_of_other_number, event, robot);
         }
     };

    number.number_dropped_on_me_semantics = function (other_number, event, robot) { 
        if (event && this.robot_in_training()) {
            this.robot_in_training().dropped_on(other_number, this);
        }
        if (other_number.get_approximate()) {
            this.set_approximate(true);
        }
        other_number.remove();
        switch (other_number.get_operator()) {
        case '+':
            return this.add(other_number);
        case '-':
            return this.subtract(other_number);
        case '*':
            return this.multiply(other_number);
        case '/':
            return this.divide(other_number);
        case '=':
            return this.set_value(other_number.get_value());
        case '^':
            // deprecated since this only worked with integer exponents
            // and there is now a function bird who does this better
            return this.power(other_number);
        default:
            TT.UTILITIES.report_internal_error("Number received a number with unsupported operator: " + other_number.get_operator());
            // don't continue if an error
            return;
        }
    };
    
    number.widget_side_dropped_on_me = function (side_of_other, event, robot) {
        if (side_of_other.number_dropped_on_me) {
            // this can happen if this number is on a nest
            return this.number_dropped_on_me(side_of_other, event, robot);
        }
        // only numbers can be dropped on numbers (for now at least)
        return false;
    };

    number.add = function (other) {
        // other is another rational number
        this.set_value(bigrat.add(this.get_value(), this.get_value(), other.get_value()), true);
        return this;
    };

    number.subtract = function (other) {
        // other is another rational number
        this.set_value(bigrat.subtract(this.get_value(), this.get_value(), other.get_value()), true);
        return this;
    };

    number.multiply = function (other) {
        // other is another rational number
        this.set_value(bigrat.multiply(this.get_value(), this.get_value(), other.get_value()), true);
        return this;
    };

    number.divide = function (other) {
        // other is another rational number
        this.set_value(bigrat.divide(this.get_value(), this.get_value(), other.get_value()), true);
        return this;
    };

    number.minimum = function (other) {
        // other is another rational number
        this.set_value(bigrat.min(this.get_value(), this.get_value(), other.get_value()), true);
        return this;
    };

    number.maximum = function (other) {
        // other is another rational number
        this.set_value(bigrat.max(this.get_value(), this.get_value(), other.get_value()), true);
        return this;
    };

    number.power = function (power) {
        // deprecated
        // power is any integer (perhaps needs error handling if too large)
        this.set_value(bigrat.power(this.get_value(), this.get_value(), bigrat.toInteger(power.get_value())), true);
        return this;
    };
    
    number.absolute_value = function () {
        this.set_value(bigrat.abs(this.get_value(), this.get_value()), true);
        return this;
    };

    number.is_zero = function () {
        return bigrat.equals(this.get_value(), bigrat.ZERO);
    };
    
    number.is_negative = function () {
        return bigrat.isNegative(this.get_value());
    };

    number.toString = function () {
        var operator_string;
        if (this.get_erased()) {
            return "erased number";
        }
        // addition is implicit so don't display it
        operator_string = this.get_operator() === '+' ? '' : this.get_operator();
        return operator_string + bigrat.str(this.get_value());
    };

    number.operator_word = function (subject) {
        switch (this.get_operator()) {
        case "+":
            return "add " + subject + " to";
        case "-":
            return "subtract " + subject + " from";
        case "*":
            return "multiply " + subject + " with";
        case "/":
           return "divide " + subject + " into";
        }
    };

    number.get_text = function () {
        if (this.is_integer() || this.get_format() === 'improper_fraction') {
            return this.toString();
        }
        // can't turn an infinite decimal expansion into a string so approximate it as JavaScript number
        return bigrat.toDecimal(this.get_value()).toString();
    };
    
    number.to_float = function () {
        return bigrat.toDecimal(this.get_value());
    };
    
    number.get_type_name = function (plural) {
        if (plural) {
            return "numbers";
        }
        return "number";
    };

    number.get_help_URL = function () {
        return "docs/manual/numbers.html";
    };
    
    number.get_json = function (json_history, callback, start_time) {
        callback({type: "number",
                  operator:    this.get_operator(),
                  numerator:   this.numerator_string(),
                  denominator: this.denominator_string(),
                  format:      this.get_format(),
                  approximate: this.get_approximate()
                 },
                 start_time);
    };
    
    TT.creators_from_json["number"] = function (json) {
        return number.create(json.numerator, json.denominator, json.operator, json.format, json.description, json.approximate);
    };

    number.is_integer = function () {
        // check if denominator is 1 or numerator is 0
        return this.get_value()[1].compare(BigInteger.ONE)  === 0 ||
               this.get_value()[0].compare(BigInteger.ZERO) === 0;
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
        return this.create(this);
    };

    number.decimal_string = function (number_of_full_size_characters, font_size) {
        var value, copy, integer_part, integer_string, fractional_part, number_of_full_size_characters_after_decimal_point,
            decimal_max_digits, integer_max_digits, decimal_places, after_decimal_point;
        if (this.is_integer()) {
            return this.numerator_string();
        }
        value = this.get_value();
        copy = number.create(value[0], value[1]);
        integer_part = copy.integer_part();
        integer_string = integer_part.toString();
        if (integer_string === "0" && this.is_negative()) {
            // need -0.ddd
            integer_string = "-" + integer_string;
        }
        fractional_part = copy.get_value(); // will be the fractional remainder after the following
        bigrat.subtract(fractional_part, fractional_part, integer_part.get_value());
        number_of_full_size_characters_after_decimal_point = 
            compute_number_of_full_size_characters_after_decimal_point(number_of_full_size_characters, integer_string.length);
        decimal_max_digits = shrinking_digits_length(number_of_full_size_characters_after_decimal_point, font_size);
        integer_max_digits = Math.min(integer_string.length, number_of_full_size_characters/2);
        // bigger fonts mean more digits can be seen so compute more of them
        decimal_places = generate_decimal_places(fractional_part, decimal_max_digits);
        if (decimal_places.length < number_of_full_size_characters_after_decimal_point) {
            // not repeating and not too many decimal digits
            after_decimal_point = decimal_places;
        } else {
            after_decimal_point = shrink_to_fit(decimal_places, number_of_full_size_characters_after_decimal_point, font_size, true);
        }
        // generate twice as many decimal places are there is room for so they shrink
        // split space between integer part and decimal part
        return fit_string_to_length(integer_string, integer_max_digits, font_size) +
               "<span class='toontalk-decimal-point'>.</span>" + // decimal point looks better if not monospace
               after_decimal_point;
    };

    number.match = function (other) {
        if (this.get_erased && this.get_erased()) {
            if (other.match_with_any_number) {
                return other.match_with_any_number();
            }
            this.last_match = other;
            return this; // since doesn't handle match_with_any_number
        }
        if (!other.match_with_this_number) {
            this.last_match = other;
            return this;
        }
        return other.match_with_this_number(this);
    };

    number.match_with_any_number = function () {
        return 'matched';
    };

    number.match_with_this_number = function (number_pattern) {
        if (number_pattern.equals(this) && number_pattern.get_operator() === this.get_operator()) {
            return 'matched';
        }
        number_pattern.last_match = this;
        return number_pattern;
    };

    number.get_custom_title_prefix = function () {
        var prefix;
        if (this.get_operator() === '=') {
            prefix =  "Drop me on another number I'll give him my value.";
        } else {
            prefix = "Drop me on another number and I'll " + this.operator_word("myself") + " him.";
        }
        if (this.get_approximate()) {
            prefix += "\nI look a bit yellow because I'm the result of an " +
            TT.UTILITIES.encode_HTML_for_title("<i>approximate</i>") +
            " calculation.";
        }
        return prefix;
    };
    
    return number;
}());

window.TOONTALK.number_backside = 
(function () {
    
    return {
        create: function (number) {
            var backside = TT.backside.create(number);
            var backside_element = backside.get_element();
            var slash = document.createElement("div");
            var current_numerator = number.numerator_string();
            var current_denominator = number.denominator_string();
            var numerator_input = TT.UTILITIES.create_text_area(current_numerator, "toontalk-numerator-input", "", 
                                                                "Type here to edit the numerator",
                                                                undefined, // maybe add drop handler here
                                                                "number");
            var denominator_input = TT.UTILITIES.create_text_area(current_denominator, "toontalk-denominator-input", "", 
                                                                  "Type here to edit the denominator",
                                                                  undefined, // maybe add drop handler here
                                                                  "number");
            var decimal_format = TT.UTILITIES.create_radio_button("number_format", "decimal", "toontalk-decimal-radio-button", "Decimal number", "Display number as a decimal.", true);
            var mixed_number_format = TT.UTILITIES.create_radio_button("number_format", "proper_fraction", "toontalk-proper-fraction-radio-button", "Mixed number", "Display number as an integer part and a proper fraction.", true);
            var improper_format =TT.UTILITIES.create_radio_button("number_format", "improper_fraction", "toontalk-improper-fraction-radio-button", "Improper fraction", "Display number as a simple fraction.", true);
            var scientific_format =TT.UTILITIES.create_radio_button("number_format", "scientific_notation", "toontalk-scientific-notation-radio-button", "Scientific notation", "Display number as a decimal between 1 and 10 multiplied by ten to some power.", true);
            var plus = TT.UTILITIES.create_radio_button("operator", "+", "toontalk-plus-radio-button", "+", "Add me to what I'm dropped on.", true); // no need for &plus;
            var minus = TT.UTILITIES.create_radio_button("operator", "-", "toontalk-minus-radio-button", "&minus;", "Subtract me from what I'm dropped on.", true);
            var multiply = TT.UTILITIES.create_radio_button("operator", "*", "toontalk-times-radio-button", "&times;", "Multiply me with what I'm dropped on.", true);
            var divide = TT.UTILITIES.create_radio_button("operator", "/", "toontalk-divide-radio-button", "&divide;", "Divide me into what I'm dropped on.", true);
            var set = TT.UTILITIES.create_radio_button("operator", "=", "toontalk-set-equal-radio-button", "&equals;", "Set what I'm dropped on to my value.", true);
//          var power = TT.UTILITIES.create_radio_button("operator", "^", "toontalk-power-radio-button", "Integer power", "Use me as the number of times to multiply together what I'm dropped on.", true);
            var update_value = function (event) {
                var numerator = numerator_input.button.value.trim();
                var denominator = denominator_input.button.value.trim();
                var string, first_class_name;
                var valid_integer = function (string, ator, negative_not_allowed) {
                    // ator can be numerATOR or denominATOR
                    var without_sign;
                    if (string.length < 1) {
                        return {message: "Empty " + ator + " treated as 1.",
                                replacement: "1"};
                    }
                    if (string.charAt(0) === '-') {
                        if (negative_not_allowed) {
                            return {message: "'-' only allowed as the first character of the " + ator + ". Ignoring extra '-'s.",
                                    replacement: valid_integer(string, ator).replacement};
                        }
                        without_sign = valid_integer(string.substring(1, string.length), ator, true);
                        if (!without_sign.message) {
                            without_sign.replacement = '-' + without_sign.replacement;
                        }
                        return without_sign;
                    }
                    if (/^\d+$/.test(string)) {
                       return {replacement: string};
                    }
                    return {message: "The " + ator + " can only contain digits. " + "'" + string + "' doesn't make sense.",
                            replacement: string.replace(/[^\d]*/g, "")};
                };
                var validity;
                if (numerator === current_numerator && denominator === current_denominator) {
                    return;
                }
                validity = valid_integer(numerator, "numerator");
                if (validity.message) {
                    TT.UTILITIES.display_message(validity.message);
                    numerator = validity.replacement;
                }
                if (denominator === "0") {
                    TT.UTILITIES.display_message("It doesn't make sense for a fraction to have a denominator of 0. Resetting it to 1.");
                    denominator = "1";
                } else {
                    validity = valid_integer(denominator, "denominator");
                    if (validity.message) {
                        TT.UTILITIES.display_message(validity.message);
                        denominator = validity.replacement;
                    }
                }
                if (!number.set_from_values(numerator, denominator)) {
                    // no change in value so ignore this
                    return;
                }
                current_numerator   = numerator;
                current_denominator = denominator;
                if (number.robot_in_training()) {
                    first_class_name = event.srcElement.className.split(" ", 1)[0];
                    if (first_class_name === "toontalk-denominator-input") {
                        number.robot_in_training().edited(number, {setter_name: "set_denominator",
                                                                   argument_1: denominator,
                                                                   toString: "by changing the value of the denominator to " + denominator,
                                                                   button_selector: "." + first_class_name});
                    } else {
                        number.robot_in_training().edited(number, {setter_name: "set_numerator",
                                                                   argument_1: numerator,
                                                                   toString: "by changing the value of the numerator to " + numerator,
                                                                   button_selector: "." + first_class_name});
                    }   
                }
                number.rerender();
            };
            var update_format = function () {
                var selected_button = TT.UTILITIES.selected_radio_button(decimal_format.button, mixed_number_format.button, improper_format.button, scientific_format.button);
                var format = selected_button.value;
                number.set_format(format, true);
                if (number.robot_in_training()) {
                    number.robot_in_training().edited(number, {setter_name: "set_format",
                                                               argument_1: format,
                                                               toString: "by changing the format to " + format + " of the number",
                                                               // just use the first className to find this button later
                                                               button_selector: "." + selected_button.className.split(" ", 1)[0]});
                }
                number.rerender();
            };
            var update_operator = function () {
                var selected_button = TT.UTILITIES.selected_radio_button(plus.button, minus.button, multiply.button, divide.button, set.button);
                var operator = selected_button.value;
                number.set_operator(operator, true);
                if (number.robot_in_training()) {
                    number.robot_in_training().edited(number, {setter_name: "set_operator",
                                                               argument_1: operator,
                                                               toString: "by changing the operator to " + operator + " of the number",
                                                               // just use the first className to find this button later
                                                               button_selector: "." + selected_button.className.split(" ", 1)[0]});
                }
            };
            var number_set = TT.UTILITIES.create_horizontal_table(numerator_input.container, slash, denominator_input.container);
            var format_set = TT.UTILITIES.create_horizontal_table(decimal_format.container, mixed_number_format.container, improper_format.container, scientific_format.container);
            var operator_set =TT.UTILITIES.create_horizontal_table(plus.container, minus.container, multiply.container, divide.container, set.container);
            var advanced_settings_button = TT.backside.create_advanced_settings_button(backside, number);
            var generic_backside_update = backside.update_display.bind(backside);
            var generic_add_advanced_settings = backside.add_advanced_settings;
            slash.innerHTML = "/";
            $(slash).addClass("ui-widget"); // to look nice
            numerator_input.button.addEventListener('change',   update_value);
            numerator_input.button.addEventListener('mouseout', update_value);
            numerator_input.button.addEventListener('mouseenter', function () {
                current_numerator = numerator_input.button.value.trim();
            });
            denominator_input.button.addEventListener('change',   update_value);
            denominator_input.button.addEventListener('mouseout', update_value);
            denominator_input.button.addEventListener('mouseenter', function () {
                current_denominator = denominator_input.button.value.trim();
            });
            backside_element.appendChild(number_set);
            backside_element.appendChild(advanced_settings_button);
            decimal_format.button     .addEventListener('change', update_format);
            mixed_number_format.button.addEventListener('change', update_format);
            improper_format.button    .addEventListener('change', update_format);
            scientific_format.button  .addEventListener('change', update_format);
            switch (number.get_format()) {
                case "decimal":
                TT.UTILITIES.check_radio_button(decimal_format);
                break;
                case "improper_fraction":
                TT.UTILITIES.check_radio_button(improper_format);
                break;
                case "mixed_number":
                case "proper_fraction": // older name
                TT.UTILITIES.check_radio_button(mixed_number_format);
                break;
                case "scientific_format":
                TT.UTILITIES.check_radio_button(scientific_format);
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
                case "=":
                TT.UTILITIES.check_radio_button(set);
                break;
            }
            plus.button    .addEventListener('change', update_operator);
            minus.button   .addEventListener('change', update_operator);
            multiply.button.addEventListener('change', update_operator);
            divide.button  .addEventListener('change', update_operator);
            set.button     .addEventListener('change', update_operator);
            backside.update_display = function () {
                $(numerator_input.button).val(number.numerator_string());
                $(denominator_input.button).val(number.denominator_string());
                generic_backside_update();
            };
            backside.add_advanced_settings = function () {
                generic_add_advanced_settings.call(backside, format_set, operator_set);
                $(format_set).buttonset();
                $(operator_set).buttonset();
            };
            TT.UTILITIES.when_attached(backside_element,
                                       function () {
                                           if (!backside.is_primary_backside()) {
                                               // primary backsides update when frontside does
                                               number.add_listener('value_changed', function () {
                                                     backside.rerender();
                                                 });
                                           }
                                       });            
            return backside;
        }

    };
}());

window.TOONTALK.number.function = 
(function () {
    var functions = TT.create_function_table();
    var delay_function = function (message, event, robot) {
        // delays by the amount in the second hole in seconds and give the bird the number of seconds since receiving the box 
        var start = Date.now();
        var box_size_and_bird = functions.check_message(message);
        var delay;
        if (!box_size_and_bird) {
            return;
        }
        if (box_size_and_bird.size < 2) {
            TT.UTILITIES.display_message("Delay function birds need a number in the second hole.");
            return;
        }
        delay = message.get_hole_contents(1).to_float();
        setTimeout(function () {     
                       var response = TT.number.ZERO(TT.number.function_bird_results_default_format);
                       response.set_value_from_decimal((Date.now()-start)/1000);
                       response.set_approximate(true);
                       functions.process_response(response, box_size_and_bird.bird, message, event, robot);
                   },
                   delay*1000);
        return true;                 
    };
    var degrees_to_decimal = function (rational_number) {
        return bigrat.toDecimal(modulo(rational_number, THREE_HUNDRED_AND_SIXTY));
    };
    var radians_to_decimal = function (rational_number) {
        return bigrat.toDecimal(modulo(rational_number, TWO_PI));
    };
    functions.add_function_object('sum', 
                        function (message, event, robot) {
                            return functions.n_ary_widget_function(message, TT.number.ZERO, TT.number.add, 'sum', event, robot);
                        },
                        "The bird will return with the sum of the numbers in the box.",
                        "+");
    functions.add_function_object('difference', 
                        function (message, event, robot) {
                             return functions.n_ary_widget_function(message, TT.number.ZERO, TT.number.subtract, 'difference', event, robot);
                        },
                        "The bird will return with the result of subtracting the numbers in the box from the first number.",
                        "-");
    functions.add_function_object('product', 
                        function (message, event, robot) {
                             return functions.n_ary_widget_function(message, TT.number.ONE, TT.number.multiply, 'product', event, robot);
                        },
                        "The bird will return with the product of the numbers in the box.",
                        "×");
    functions.add_function_object('division', 
                        function (message, event, robot) {
                             return functions.n_ary_widget_function(message, TT.number.ONE, TT.number.divide, 'division', event, robot);
                        },
                        "The bird will return with the result of dividing the numbers into the first number in the box.",
                        "÷"); // CSS can't contain HTML -- see http://www.evotech.net/blog/2007/04/named-html-entities-in-numeric-order/
    functions.add_function_object('modulo', 
                        function (message, event, robot) {
                            return functions.n_ary_function(message, functions.bigrat_function_to_widget_function(modulo), 2, 'modulo', event, robot);
                        },
                        "The bird will return with the first number modulo the second number. For positive numbers this is like the remainder after division.",
                        "mod");
    functions.add_function_object('minimum', 
                        function (message, event, robot) {
                            return functions.n_ary_widget_function(message, TT.number.ONE, TT.number.minimum, 'minimum', event, robot);
                        },
                        "The bird will return with the smallest of the numbers in the box.",
                        "min");
    functions.add_function_object('maximum', 
                        function (message, event, robot) {
                            return functions.n_ary_widget_function(message, TT.number.ONE, TT.number.maximum, 'maximum', event, robot);
                        },
                        "The bird will return with the largest of the numbers in the box.",
                        "max");
    functions.add_function_object('absolute value', 
                        function (message, event, robot) {
                            var absolute_value = function (rational_number) {
                                var number_widget = TT.number.ZERO(message.get_hole_contents(1).get_format());
                                bigrat.abs(number_widget.get_value(), rational_number);
                                return number_widget;
                            }
                            return functions.n_ary_function(message, absolute_value, 1, 'absolute value', event, robot);
                        },
                        "The bird will return with the positive version of the number.",
                        "abs"); 
    functions.add_function_object('power', 
                        function (message, event, robot) {
                            var power_function = function (bigrat_base, bigrat_power) {
                                var to_numerator = bigrat.power(bigrat.create(), bigrat_base, bigrat_power[0].valueOf());
                                var denominator_power = bigrat_power[1].valueOf();
                                if (denominator_power === 1) {
                                    // faster and bigrat.nthRoot doesn't respond well to 1
                                    return to_numerator;
                                }
                                // reuse to_numerator since not needed anymore
                                return bigrat.nthRoot(to_numerator, to_numerator, denominator_power);
                            };
                            return functions.n_ary_function(message, functions.bigrat_function_to_widget_function(power_function, true), 2, 'power', event, robot);
                        },
                        "The bird will return with the first number to the power of the second number.");
    functions.add_function_object('logarithm', 
                        function (message, event, robot) {
                            var logarithm = function () {
                                if (arguments.length === 1) {
                                    return Math.log(arguments[0]);
                                }
                                return Math.log(arguments[0])/Math.log(arguments[1]);
                            };
                            return functions.n_ary_function(message, functions.numeric_javascript_function_to_widget_function(logarithm, true), 1, 'logarithm', event, robot);
                        },
                        "The bird will return an approximation of the logarithm number of the first number.\n" +
                        "If a second number is provided then it is used as the base of the logarithm.\n" +
                        "If there is no second number the logarithm is natural (the base is e).",
                        "log");                    
    functions.add_function_object('random', 
                        function (message, event, robot) {
                            var random = function () {
                                if (arguments.length === 0) {
                                    return Math.random();
                                }
                                if (arguments.length === 1) {
                                    return Math.random()*arguments[0];
                                }
                                if (arguments[0] < arguments[1]) {
                                    return Math.random()*(arguments[1]-arguments[0])+arguments[0];
                                }
                                return Math.random()*(arguments[0]-arguments[1])+arguments[1];
                            };
                            return functions.n_ary_function(message, functions.numeric_javascript_function_to_widget_function(random), 0, 'random', event, robot);
                        },
                        "The bird will return a random number between the first and second numbers.\n" +
                        "If the second number isn't provided a number less than the first number is returned.\n" +
                        "If no numbers are given then the bird returns with a number between 0 and 1.",
                        "rand");           
    functions.add_function_object('round', 
                        function (message, event, robot) {
                            return functions.n_ary_function(message, functions.bigrat_function_to_widget_function(round), 1, 'round', event, robot);
                        },
                        "The bird will return the number rounded to the nearest integer.");
    functions.add_function_object('floor', 
                        function (message, event, robot) {
                            return functions.n_ary_function(message, functions.bigrat_function_to_widget_function(floor), 1, 'floor', event, robot);
                        },
                        "The bird will return the largest integer less than or equal to the number.");                       
    functions.add_function_object('ceiling', 
                        function (message, event, robot) {
                            return functions.n_ary_function(message, functions.bigrat_function_to_widget_function(ceiling), 1, 'ceiling', event, robot);
                        },
                        "The bird will return the smallest integer greater than or equal to the number.",
                        "ceil");
    functions.add_function_object('delay',
                        delay_function,
                        "The bird will return after waiting the number of seconds in the second hole. She will return with the exact amount of time since she received the box.");  
    functions.add_function_object('integer and fraction parts', 
                        function (message, event, robot) {
                            return functions.n_ary_function(message, box_with_integer_and_fraction, 1, 'integer and fraction parts', event, robot);
                        },
                        "The bird will return with a box containing the integer part and the fraction.",
                        "parts");
    functions.add_function_object('sine', 
                        function (message, event, robot) {
                            var sin = function (degrees) {
                                          return Math.sin(degrees/RADIAN);
                                      };
                            return functions.n_ary_function(message, functions.numeric_javascript_function_to_widget_function(sin, true, degrees_to_decimal), 1, 'sine', event, robot);
                        },
                        "The bird will return with an approximation of the sine of the number (in degrees).",
                        "sin");                  
    functions.add_function_object('cosine', 
                        function (message, event, robot) {
                            var cos = function (degrees) {
                                          return Math.cos(degrees/RADIAN);
                                      };
                            return functions.n_ary_function(message, functions.numeric_javascript_function_to_widget_function(cos, true, degrees_to_decimal), 1, 'cosine', event, robot);
                        },
                        "The bird will return with an approximation of the cosine of the number (in degrees).",
                        "cos");
    functions.add_function_object('arc tangent', 
                        function (message, event, robot) {
                            var atan_in_degrees = function (x) {
                                                      return RADIAN*Math.atan(x);
                            };
                            return functions.n_ary_function(message, functions.numeric_javascript_function_to_widget_function(atan_in_degrees, true), 1, 'arc tangent', event, robot);
                        },
                        "The bird will return with an approximation of the arc tangent (in degrees) of the number.",
                        "atan");
    functions.add_function_object('arc tangent of y and x', 
                        function (message, event, robot) {
                            var atan_in_degrees = function (x, y) {
                                                      return RADIAN*Math.atan2(x, y);
                            };
                            return functions.n_ary_function(message, functions.numeric_javascript_function_to_widget_function(atan_in_degrees, true), 2, 'arc tangent of y and x', event, robot);
                        },
                        "The bird will return with an approximation of the arc tangent (in degrees) of the point where the first number is the y coordinate and the second one is the x.",
                        "atan2");
    functions.add_function_object('sine (in radians)', 
                        function (message, event, robot) {
                            return functions.n_ary_function(message, functions.numeric_javascript_function_to_widget_function(Math.sin, true, radians_to_decimal), 1, 'sine (in radians)', event, robot);
                        },
                        "The bird will return with an approximation of the sine of the number (in radians).",
                        "sin rad");                  
    functions.add_function_object('cosine (in radians)', 
                        function (message, event, robot) {
                            return functions.n_ary_function(message, functions.numeric_javascript_function_to_widget_function(Math.cos, true, radians_to_decimal), 1, 'cosine (in radians)', event, robot);
                        },
                        "The bird will return with an approximation of the cosine of the number (in radians).",
                        "cos rad");
    functions.add_function_object('arc tangent (in radians)', 
                        function (message, event, robot) {
                            return functions.n_ary_function(message, functions.numeric_javascript_function_to_widget_function(Math.atan, true), 1, 'arc tangent (in radians)', event, robot);
                        },
                        "The bird will return with an approximation of the arc tangent (in radians) of the number.",
                        "atan rad");
    functions.add_function_object('arc tangent of y and x (in radians)', 
                        function (message, event, robot) {
                            return functions.n_ary_function(message, functions.numeric_javascript_function_to_widget_function(Math.atan2, true), 2, 'arc tangent of y and x (in radians)', event, robot);
                        },
                        "The bird will return with an approximation of the arc tangent (in radians) of the point where the first number is the y coordinate and the second one is the x.",
                        "atan2 rad");
    return functions.get_function_table();
}());

}(window.TOONTALK));