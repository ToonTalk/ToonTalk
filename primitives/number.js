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

    var generate_decimal_places = function (fraction, number_of_full_size_characters) {
        var result = "";
        fraction = fraction.absolute_value();
        return generate_decimal_places_from_numerator_and_denominator(fraction.get_value()[0], fraction.get_value()[1], number_of_full_size_characters);
    };

    var generate_decimal_places_from_numerator_and_denominator = function (numerator, denominator, number_of_full_size_characters) {
        var result = "";
        var ten = new BigInteger(10);
        var negative = numerator.isNegative();
        if (negative) {
            numerator = numerator.abs();
        }
        while (number_of_full_size_characters > result.length) {
            numerator = numerator.multiply(ten);
            if (numerator.compare(denominator) < 0) {
                result += "0";
            } else {
                result += numerator.divide(denominator).toString();
                numerator = numerator.remainder(denominator).multiply(ten);
                if (numerator.isZero()) {
                    if (negative) {
                        result = '-' + result;
                    }
                    result = remove_trailing_zeroes(result);
                    return result;
                }
            }
        }
        if (negative) {
            result = '-' + result;
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

    // Math.log10 not defined in IE11
    var natural_log_of_10 = Math.log(10);
    var log10 = Math.log10 ? Math.log10 : function (x) { return Math.log(x)/natural_log_of_10 };

    var TEN = bigrat.fromInteger(10);

    // public methods
    number.create = function (numerator, denominator, operator, format, description) {
        var new_number = Object.create(number);
        // value is a private variable closed over below
        var value = bigrat_from_values(numerator, denominator);
        if (!format) {
            format = "improper_fraction";
        }
        if (!operator) {
            operator = '+';
        } 
        new_number.set_value =
            function (new_value) {
                if (bigrat.equals(value, new_value)) {
                    return;
                }
                this.fire_value_change_listeners(value, new_value);
                value = new_value;
                this.rerender(); // will update if visible
                if (TT.debugging) {
                    this.debug_string = this.toString();
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
//                if (this.debug_id === 'toontalk_id_1415038113558') {
//                     console.log("debug this");
//                 }
                return value; 
            };
        new_number.set_value_from_decimal =
            function (decimal_string) {
                // e.g. an attribute value
//                 console.log("set_value_from_decimal " + decimal_string + " " + this.debug_id);
                if (typeof decimal_string === 'number') {
                    this.set_value(bigrat.fromInteger(decimal_string));
                    return;
                }
                // else should be a string
                this.set_value(bigrat.fromDecimal(decimal_string));
            };
        new_number.get_format =
            function () { 
                return format; 
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
        new_number = number.add_standard_widget_functionality(new_number);
        new_number.set_description(description);
        if (TT.debugging) {
            new_number.debug_string = new_number.toString();
            new_number.debug_id = TT.UTILITIES.generate_unique_id();
            value.debug_id_new = new_number.debug_id; // for debugging
        }
        return new_number;
    };
    
    number.create_backside = function () {
        return TT.number_backside.create(this); //.update_run_button_disabled_attribute();
    };
        
    number.set_from_values = function (numerator, denominator) {
        return this.set_value(bigrat_from_values(numerator, denominator));
    };

    number.ONE = function () {
        return TT.number.create(1);
    };

    number.ZERO = function () {
        return TT.number.create(0);
    };

    number.copy = function (parameters) {
        return this.add_to_copy(number.create(this.get_value()[0], this.get_value()[1], this.get_operator(), this.get_format(), this.get_description()), parameters);
    };
    
    number.is_number = function () {
        return true;
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
//         console.log("compare with " + other_number + " id is " + other_number.debug_id);
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
        var frontside_element, $dimensions_holder, client_width, client_height, 
            font_height, font_width, max_decimal_places, new_HTML, backside, size_unconstrained_by_container, child_element;
        frontside_element = frontside.get_element();
        if ($(frontside_element).is(".toontalk-conditions-contents")) {
            $dimensions_holder = $(frontside_element);
        } else if ($(frontside_element).parent().is(".toontalk-backside, .toontalk-json")) {
            $dimensions_holder = $(frontside_element);
            size_unconstrained_by_container = true;
        } else if ($(frontside_element).parent().is(".toontalk-scale-half")) {
            // scales set the size of contents explicitly 
            $dimensions_holder = $(frontside_element);
        } else {
            $dimensions_holder = $(frontside_element).parent();
        }
        if ($(frontside_element).is(".toontalk-carried-by-bird")) {
            // good enough values when carried by a bird
            client_width  = 100;
            client_height =  40;
        } else if ($(frontside_element).is(".toontalk-element-attribute")) {
            // good enough values when carried by a bird
            client_width  = 200;
            client_height =  32;
        } else {
            if (!$dimensions_holder.is(":visible")) {
                return;
            }
            client_width =  $dimensions_holder.width();
            client_height = $dimensions_holder.height();
            if (client_width === 0 || client_height === 0) {
                return;
            }
            if ($dimensions_holder.is(".toontalk-nest")) {
                // doesn't cover the nest completely -- should put .8 into some parameter
                client_width  *= .8;
                client_height *= .8;
            }
        }
        $(frontside_element).removeClass("toontalk-number-eighth-size-border toontalk-number-quarter-size-border toontalk-number-half-size-border toontalk-number-full-size-border");
        if (client_width <= 32 || client_height <= 32) {
            $(frontside_element).addClass("toontalk-number-eighth-size-border");
            frontside_element.toontalk_border_size = 4;
        } else if (client_width <= 64 || client_height <= 64) {
            $(frontside_element).addClass("toontalk-number-quarter-size-border");
            frontside_element.toontalk_border_size = 8;
        } else if (client_width <= 128 || client_height <= 128) {
            $(frontside_element).addClass("toontalk-number-half-size-border");
            frontside_element.toontalk_border_size = 16;
        } else {
            $(frontside_element).addClass("toontalk-number-full-size-border");
            frontside_element.toontalk_border_size = 32;
        }
        font_height = (client_height-frontside_element.toontalk_border_size*2);
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
        child_element = $(frontside_element).children(".toontalk-widget");
        if (child_element.is("*")) {
            child_element = child_element.get(0);
        } else {
            child_element = document.createElement('div');
            frontside_element.appendChild(child_element);
        }
        child_element.innerHTML = new_HTML;
        // numbers looked wrong when translated (extra spaces between digits)
        child_element.translate = false;
        $(child_element).addClass("toontalk-widget notranslate");
        frontside_element.title = this.get_title();
        backside = this.get_backside();
        if (backside) {
            backside.rerender();
        }
    };
    
    number.to_HTML = function (max_characters, font_size, format, top_level, operator, size_unconstrained_by_container) {
        var integer_as_string, integer_part, fractional_part, improper_fraction_HTML, digits_needed, shrinkage, table_style,
            // following needed for scientific notation
            exponent, ten_to_exponent, exponent_area, significand, max_decimal_places, decimal_digits, integer_digit, negative, decimal_part;
        var extra_class = (top_level !== false) ? ' toontalk-top-level-number' : '';
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
            if (max_characters < 2) {
                // better to use a smaller font than have too few digits
                font_size *= Math.max(1, max_characters) / 2;
                max_characters = 2;
            }
        }
        if (this.is_integer() && format !== 'scientific_notation') {
            integer_as_string = bigrat.toBigInteger(this.get_value()).toString();
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
                      operator_HTML + fit_string_to_length(integer_as_string, max_characters, font_size) + '</div>';
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
            return '<div class="toontalk-number toontalk-decimal' + extra_class + '" style="font-size: ' + font_size + 'px;">' + operator_HTML + this.decimal_string(max_characters, font_size) + '</div>';
        }
        if (format === 'scientific_notation') {
            negative = bigrat.isNegative(this.get_value());
            exponent = scientific_notation_exponent(this.get_value());
            ten_to_exponent = bigrat.power(bigrat.create(), TEN, exponent);
            significand = bigrat.divide(bigrat.create(), this.get_value(), ten_to_exponent);
            // 6 for integer_digit, space, and '10x' - divide by 2 since superscript font is smaller
            exponent_area = 6+(exponent === 0 ? 1 : Math.ceil(log10(Math.abs(exponent)))/2);
            if (negative) {
                exponent_area++; // need more room
            }
            if (max_characters < exponent_area+1) {
                // try again with a smaller font_size
                return this.to_HTML(exponent_area+1, font_size*max_characters/(exponent_area+1), format, top_level, operator, size_unconstrained_by_container);
            }
            max_decimal_places = shrinking_digits_length(compute_number_of_full_size_characters_after_decimal_point(max_characters, exponent_area), font_size); 
            decimal_digits = generate_decimal_places_from_numerator_and_denominator(significand[0], significand[1], max_decimal_places);      
            if (negative) { // negative so include sign and first digit
                integer_digit = decimal_digits.substring(0, 2);
                decimal_digits = decimal_digits.substring(2);
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
                   '<div class="toontalk-number toontalk-decimal' + extra_class + '" style="font-size: ' + font_size + 'px;">' +
                   operator_HTML + integer_digit + decimal_part +
                   '</td><td class="toontalk-number toontalk-exponent-of-scientific-notation">' +
                   '<div style="font-size: ' + font_size + 'px;">' +
                   ' &times;10<sup style="font-size: ' + font_size/2 + 'px;">' + exponent + '</sup></div>' +
                   '</td></tr></table>';
        }
        // else warn??
    };

    number.drop_on = function (other, is_backside, event, robot) {
        if (!other.number_dropped_on_me) {
            if (other.widget_dropped_on_me) {
                return other.widget_dropped_on_me(this, is_backside, event, robot);
            }
            console.log("No handler for drop of '" + this + "' on '" + other + "'");
            return;
        }
        var result = other.number_dropped_on_me(this, is_backside, event, robot);
        return true;
    };
    
    number.number_dropped_on_me = function (other_number, other_is_backside, event, robot) {
         var bammer_element, $top_level_backside_element, target_absolute_position, 
             this_frontside_element, hit_number_continuation, bammer_gone_continuation;
         if (other_number.visible() && 
              (event || (robot && robot.visible()))) {
             // do this if number is visible and user did the drop or a visible robot did it
             if (robot) {
                 // robot should wait for this
                 other_number.robot_waiting_before_next_step = robot;
             }
             bammer_element = document.createElement("div");
             $(bammer_element).addClass("toontalk-bammer-down");
             $top_level_backside_element = $(this.get_frontside_element()).closest(".toontalk-top-level-backside");
             // start lower left off screen
             bammer_element.style.left = "-10px";
             bammer_element.style.top = ($top_level_backside_element.height())+"px";
             $top_level_backside_element.append(bammer_element);
             this_frontside_element = this.get_frontside_element();
             target_absolute_position = $(this_frontside_element).offset();
             target_absolute_position.left -= $(bammer_element).width()*0.75; // hammer is on bammer's right
             // aim for centre of number - Bammer's hammer when smashing is about 60% of his earlier height
             target_absolute_position.left += $(this_frontside_element).width() *0.5+$(bammer_element).width() *0.1; 
             target_absolute_position.top  -= $(this_frontside_element).height()*0.5+$(bammer_element).height()*0.4;
             hit_number_continuation = function () {
                 if (this.number_dropped_on_me_semantics(other_number, event, robot) && robot) {
                     // will stop if drop signaled an error
                    robot.run_next_step();
                 }
                 if (event) {
                     this.backup_all();
                 }
                 $(bammer_element).removeClass("toontalk-bammer-down");
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
                         TT.UTILITIES.animate_to_absolute_position(bammer_element, target_absolute_position, bammer_gone_continuation); 
                         $(bammer_element).css({opacity: 0.01});
                     });
             }.bind(this);
             TT.UTILITIES.animate_to_absolute_position(bammer_element, target_absolute_position, hit_number_continuation);
             $(bammer_element).css({opacity: 1.0,
                                    // ensure that Bammer is on top of everything
                                    "z-index": TT.UTILITIES.next_z_index()+100});
             return this;             
         } else {
             return this.number_dropped_on_me_semantics(other_number, event, robot);
         }
     };

    number.number_dropped_on_me_semantics = function (other_number, event, robot) { 
        if (TT.robot.in_training && event) {
            TT.robot.in_training.dropped_on(other_number, this);
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
        case '^':
            return this.power(other_number);
        default:
            TT.UTILITIES.report_internal_error("Number received a number with unsupported operator: " + other_number.get_operator());
            // don't continue if an error
            return;
        }
    };
    
    number.widget_dropped_on_me = function (other, other_is_backside, event, robot) {
        if (other.number_dropped_on_me) {
            // this can happen if this number is on a nest
            return this.number_dropped_on_me(other, other_is_backside, event, robot);
        }
        // only numbers can be dropped on numbers (for now at least)
        return false;
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
        var operator_string;
        if (this.get_erased()) {
            return "erased number";
        }
        // addition is implicit so don't display it
        operator_string = this.get_operator() === '+' ? '' : this.get_operator();
        return operator_string + bigrat.str(this.get_value());
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
    
    number.get_json = function () {
        return {type: "number",
                operator: this.get_operator(),
                numerator: this.numerator_string(),
                denominator: this.denominator_string(),
                format: this.get_format()
                };
    };
    
    TT.creators_from_json["number"] = function (json) {
        return number.create(json.numerator, json.denominator, json.operator, json.format, json.description);
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
        if (this.is_integer()) {
            return this.numerator_string();
        }
        // if this is a subclass of number we don't care -- just using the copy for convenience of calculation here
        var copy = number.copy.call(this);
        var integer_part = copy.integer_part();
        var integer_string = integer_part.toString();
        if (integer_string === "0" && this.is_negative()) {
            // need -0.ddd
            integer_string = "-" + integer_string;
        }
        var fractional_part = copy.subtract(integer_part);
        var number_of_full_size_characters_after_decimal_point = 
            compute_number_of_full_size_characters_after_decimal_point(number_of_full_size_characters, integer_string.length);
        var decimal_max_digits = shrinking_digits_length(number_of_full_size_characters_after_decimal_point, font_size);
        var integer_max_digits = Math.min(integer_string.length, number_of_full_size_characters/2);
        // bigger fonts mean more digits can be seen so compute more of them
        var decimal_places = generate_decimal_places(fractional_part, decimal_max_digits);
        var after_decimal_point;
        if (decimal_places.length < number_of_full_size_characters) {
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
            return this; // since doesn't handle match_with_any_number
        }
        if (!other.match_with_this_number) {
            return this;
        }
        return other.match_with_this_number(this);
    };

    number.match_with_any_number = function () {
        return 'matched';
    };

    number.match_with_this_number = function (number_pattern) {
        if (number_pattern.equals(this)) {
            return 'matched';
        }
        return number_pattern;
    };

    number.get_custom_title_prefix = function () {
        return "Drop another number on me and I'll add it to my value (unless it has been changed so that I'll subtract, multiply, or divide instead).";
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
            var slash = document.createElement("div");
            var current_numerator = number.numerator_string();
            var current_denominator = number.denominator_string();
            var numerator_input = TT.UTILITIES.create_text_area(current_numerator, "toontalk-numerator-input", "", 
                                                                "Type here to edit the numerator",
                                                                "number");
            var denominator_input = TT.UTILITIES.create_text_area(current_denominator, "toontalk-denominator-input", "", 
                                                                  "Type here to edit the denominator",
                                                                  "number");
            var decimal_format = TT.UTILITIES.create_radio_button("number_format", "decimal", "toontalk-decimal-radio-button", "Decimal number", "Display number as a decimal.");
            var mixed_number_format = TT.UTILITIES.create_radio_button("number_format", "proper_fraction", "toontalk-proper-fraction-radio-button", "Mixed number", "Display number as an integer part and a proper fraction.");
            var improper_format =TT.UTILITIES.create_radio_button("number_format", "improper_fraction", "toontalk-improper-fraction-radio-button", "Improper fraction", "Display number as a simple fraction.");
            var scientific_format =TT.UTILITIES.create_radio_button("number_format", "scientific_notation", "toontalk-scientific-notation-radio-button", "Scientific notation", "Display number as a decimal between 1 and 10 multiplied by ten to some power.");
            var plus = TT.UTILITIES.create_radio_button("operator", "+", "toontalk-plus-radio-button", "+", "Add me to what I'm dropped on."); // no need for &plus; and it doesn't work in IE9
            var minus = TT.UTILITIES.create_radio_button("operator", "-", "toontalk-minus-radio-button", "&minus;", "Subtract me from what I'm dropped on.");
            var multiply = TT.UTILITIES.create_radio_button("operator", "*", "toontalk-times-radio-button", "&times;", "Multiply me with what I'm dropped on.");
            var divide = TT.UTILITIES.create_radio_button("operator", "/", "toontalk-dividie-radio-button", "&divide;", "Divide me into what I'm dropped on.");
            var power = TT.UTILITIES.create_radio_button("operator", "^", "toontalk-power-radio-button", "Integer power", "Use me as the number of times to multiply together what I'm dropped on.");
            var update_value = function (event) {
                var numerator = numerator_input.button.value.trim();
                var denominator = denominator_input.button.value.trim();
                var string, first_class_name;
                if (numerator === current_numerator && denominator === current_denominator) {
                    return;
                }
                number.set_from_values(numerator, denominator);
                current_numerator   = numerator;
                current_denominator = denominator;
                if (TT.robot.in_training) {
                    first_class_name = event.srcElement.className.split(" ", 1)[0];
                    if (first_class_name === "toontalk-denominator-input") {
                        string = "change value of the denominator to " + denominator + " of the number";
                    } else {
                        string = "change value of the numerator to " + numerator + " of the number";
                    }
                    TT.robot.in_training.edited(number, {setter_name: "set_from_values",
                                                         argument_1: numerator,
                                                         argument_2: denominator,
                                                         toString: string,
                                                         button_selector: "." + first_class_name});
                }
            };
            var update_format = function () {
                var selected_button = TT.UTILITIES.selected_radio_button(decimal_format.button, mixed_number_format.button, improper_format.button, scientific_format.button);
                var format = selected_button.value;
                number.set_format(format, true);
                if (TT.robot.in_training) {
                    TT.robot.in_training.edited(number, {setter_name: "set_format",
                                                         argument_1: format,
                                                         toString: "change the format to " + format + " of the number",
                                                         // just use the first className to find this button later
                                                         button_selector: "." + selected_button.className.split(" ", 1)[0]});
                }
            };
            var update_operator = function () {
                var selected_button = TT.UTILITIES.selected_radio_button(plus.button, minus.button, multiply.button, divide.button, power.button);
                var operator = selected_button.value;
                number.set_operator(operator, true);
                if (TT.robot.in_training) {
                    TT.robot.in_training.edited(number, {setter_name: "set_operator",
                                                         argument_1: operator,
                                                         toString: "change the operator to " + operator + " of the number",
                                                         // just use the first className to find this button later
                                                         button_selector: "." + selected_button.className.split(" ", 1)[0]});
                }
            };
            var number_set = TT.UTILITIES.create_horizontal_table(numerator_input.container, slash, denominator_input.container);
            var format_set = $(TT.UTILITIES.create_horizontal_table(decimal_format.container, mixed_number_format.container, improper_format.container, scientific_format.container)).buttonset().get(0);
            var operator_set = $(TT.UTILITIES.create_horizontal_table(plus.container, minus.container, multiply.container, divide.container, power.container)).buttonset().get(0);
            var advanced_settings_button = TT.backside.create_advanced_settings_button(backside, number);
            var generic_backside_update = backside.update_display;
            slash.innerHTML = "/";
            $(slash).addClass("ui-widget"); // to look nice
            backside_element.appendChild(number_set);
            backside_element.appendChild(advanced_settings_button);
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
                case "^":
                TT.UTILITIES.check_radio_button(power);
                break;
            }
            plus.button    .addEventListener('change', update_operator);
            minus.button   .addEventListener('change', update_operator);
            multiply.button.addEventListener('change', update_operator);
            divide.button  .addEventListener('change', update_operator);
            power.button   .addEventListener('change', update_operator);
            backside.update_display = function () {
                $(numerator_input.button).val(number.numerator_string());
                $(denominator_input.button).val(number.denominator_string());
                generic_backside_update();
            };
            $(format_set)  .addClass("toontalk-advanced-setting");
            $(operator_set).addClass("toontalk-advanced-setting");
            backside_element.appendChild(format_set);
            backside_element.appendChild(operator_set);
            backside.add_advanced_settings();
            return backside;
        }

    };
}(window.TOONTALK));

window.TOONTALK.number.function = 
(function (TT) {
    "use strict";
    var n_ary_function = function (message, zero_ary_value_function, binary_operation) {
        var box_size, bird, result, index, next_widget;
        if (!message.is_of_type('box')) {
            TT.UTILITIES.display_message("Function birds can only respond to boxes. One was given " + TT.UTILITIES.add_a_or_an(message.get_type_name()));
            return;
        }
        box_size = message.get_size();
        if (box_size < 1) {
            TT.UTILITIES.display_message("Function birds can only respond to boxes with holes.");
            return;
        }
        bird = message.get_hole_contents(0);
        if (!bird) {
            TT.UTILITIES.display_message("Function birds can only respond to boxes with something in the first hole.");
            return;
        }
        if (!bird.is_of_type('bird')) {
            TT.UTILITIES.display_message("Function birds can only respond to boxes with a bird in the first hole. The first hole contains " + TT.UTILITIES.add_a_or_an(bird.get_type_name()));
            return;
        }
        result = zero_ary_value_function();
        index = 1;
        while (index < box_size) {
            next_widget = message.get_hole_contents(index);
            if (!next_widget.is_of_type('number')) {
                TT.UTILITIES.display_message("Function birds for numbers can only respond to boxes with a number in the " + TT.UTILITIES.cardinal(index) + " hole. The " + TT.UTILITIES.cardinal(index) + "hole contains " + TT.UTILITIES.add_a_or_an(next_widget.get_type_name()));
                return;
            }
            binary_operation.call(result, next_widget);
            index++;
        }
        bird.widget_dropped_on_me(result, false);
        message.remove();
    };
    return {
        sum: {respond_to_message: function (message) {
                  return n_ary_function(message, TT.number.ZERO, TT.number.add);
              },
              description: "Gives the bird the sum of what is in the other holes."}
    };

}(window.TOONTALK));