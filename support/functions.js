 /**
 * Implements ToonTalk's function birds of a type of widget
 * Authors: Ken Kahn
 * License: New BSD
 */

window.TOONTALK.create_function_table = 
(function (TT) {
  "use strict";
  return function () {
    var function_table = {};
    return {
    check_message: function (message) {
        var box_size, bird;
        if (!message.is_box()) {
           message.display_message("Function birds can only respond to boxes. One was given " + TT.UTILITIES.add_a_or_an(message.get_type_name()));
            return;
        }
        box_size = message.get_size();
        if (box_size < 1) {
            message.display_message("Function birds can only respond to boxes with holes.");
            return;
        }
        bird = message.get_hole_contents(0);
        if (!bird) {
            message.display_message("Function birds can only respond to boxes with something in the first hole.");
            return;
        }
        if (!bird.is_bird()) {
            message.display_message("Function birds can only respond to boxes with a bird in the first hole. The first hole contains " + TT.UTILITIES.add_a_or_an(bird.get_type_name() + "."));
            return;
        }
        return {box_size: box_size,
                bird:     bird};
    },
    process_response: function (response, bird, message, event, robot) {
        if (response) {
            // it used to be that this also called add_newly_created_widget
            // this wasn't necessary and for the delay function bird meant this could happen at the wrong step
            // following should not pass event through since otherwise it is recorded as if robot being trained did this
            bird.widget_side_dropped_on_me(response, undefined, robot, true, true);
        }
        message.remove(undefined, true);
    },  
    process_message: function (message, compute_response, event, robot) {
        var response;
        var box_size_and_bird = this.check_message(message);
        if (!box_size_and_bird) {
            return;
        }
        response = compute_response(box_size_and_bird.bird, box_size_and_bird.box_size);
        // following is typically unneeded but if the message contains covered nests
        // then the response might still be considered as a child of the obsolete nest
        // only the first hole is re-used in responses
        if (message.get_size() > 1) {
            message.get_hole_contents(1).remove(event, true, true);
        }
        this.process_response(response, box_size_and_bird.bird, message, event, robot);
        return response;
    },
    type_check: function (type, widget, function_name, index) {
        // returns a string describing the error if there is one
        var top_contents, error;
        if (widget.is_nest() && !widget.has_contents()) {
            // throw empty nest so can suspend this until nest is covered
            if (TT.sounds) {
                TT.sounds.bird_fly.pause();
            }
            throw {wait_for_nest_to_receive_something: widget};
        }
        if (!type) {
            // any type is fine
            return;
        }
        if (!widget) {
            return TT.UTILITIES.display_message("The '" + function_name + "' bird can only respond to boxes with " + TT.UTILITIES.add_a_or_an(type) + " in the " 
                                                + TT.UTILITIES.ordinal(index) + " hole. The " + TT.UTILITIES.ordinal(index) + " hole is empty.");
        }
        if (widget.dereference().is_of_type(type)) {
            return;
        }
        return widget.display_message("'" + function_name + "' birds can only respond to boxes with " + TT.UTILITIES.add_a_or_an(type) + " in the "
                                      + TT.UTILITIES.ordinal(index) + " hole. The " + TT.UTILITIES.ordinal(index)
                                      + " hole contains " + TT.UTILITIES.add_a_or_an(widget.get_type_name() + "."));
    },
    number_check: function (widget, function_name, index) {
        return this.type_check('number', widget, function_name, index);
    },
    n_ary_widget_function: function (message, zero_ary_value_function, binary_operation, function_name, event, robot) { 
        // binary_operation is a function of two widgets that updates the first
        var compute_response = function (bird, box_size) {
            var next_widget, index, response, error;
            if (box_size === 1) {
                return zero_ary_value_function();
            }
            index = 1;
            response =  message.get_hole_contents(index).dereference();
            error = this.number_check(response, function_name, index);
            if (is_number_or_nest) {
                return TT.element.create(error);
            }
            index++;
            while (index < box_size) {
                next_widget = message.get_hole_contents(index).dereference();
                error = this.number_check(next_widget, function_name, index);
                if (error) {
                    return TT.element.create(error);
                }
                binary_operation.call(response, next_widget);
                index++;
            }
            return response;
        }.bind(this);
        return this.process_message(message, compute_response, event, robot);
    },
    n_ary_function: function (message, operation, minimum_arity, function_name, event, robot) { 
        var compute_response = function (bird, box_size) {
            var next_widget, index, args, error, any_approximate_arguments, response;
            if (box_size < minimum_arity+1) { // one for the bird
                message.display_message("'" + function_name + "' birds can only respond to boxes with at least "
                                        + (minimum_arity+1) + " holes. Not " + box_size + " holes.");
                return;
            }
            args = [];
            index = 1;
            while (index < box_size) {
                next_widget = message.get_hole_contents(index).dereference();
                error = this.number_check(next_widget, function_name, index);
                if (error) {
                    return TT.element.create(error);;
                }
                if (next_widget.get_approximate && next_widget.get_approximate()) {
                    any_approximate_arguments = true;
                }
                args.push(next_widget.get_value());
                index++;
            }
            response = operation.apply(null, args);
            if (any_approximate_arguments) {
                response.set_approximate(true);
                // better default for approximate numbers
                response.set_format('decimal');
            }
            return response;
        }.bind(this);
        return this.process_message(message, compute_response, event, robot);
    },
    typed_bird_function: function (message, bird_function, types, arity, function_name, event, robot) {
        // if arity is undefined then no limit to the number of repetitions of the last type
        var compute_response = function (bird, box_size) {
            var next_widget, index, args, type, error;
            if (arity >= 0 && box_size != arity+1) { // one for the bird
                message.display_message("The '" + function_name + "' bird can only respond to boxes with " + (arity+1) + " holes. Not " + box_size + " holes.");
                return;
            }
            args = [];
            index = 1;
            while (index < box_size) {
                if (!message.get_hole_contents(index)) {
                    return TT.element.create(TT.UTILITIES.display_message("The '" + function_name + "' bird found nothing in the " + TT.UTILITIES.ordinal(index) + " hole."));
                }
                next_widget = message.get_hole_contents(index).dereference();
                if (index <= types.length) {
                    type = types[index-1];
                }
                error = this.type_check(type, next_widget, function_name, index)
                if (error) {
                    return TT.element.create(error);
                }
                args.push(next_widget);
                index++;
            }
            return bird_function.apply(message, args);
        }.bind(this);
        return this.process_message(message, compute_response, event, robot);
    },
    numeric_javascript_function_to_widget_function: function (decimal_function, approximate, toDecimal) {
        // takes a function that returns a JavaScript number and
        // returns a function that converts the response into a widget
        // if toDecimal to provided it should be a function from bigrats to decimals
        return function () {
            var response = TT.number.ZERO(TT.number.function_bird_results_default_format);
            response.set_value_from_decimal(decimal_function.apply(null, TT.UTILITIES.map_arguments(arguments, (toDecimal || bigrat.toDecimal))));
            if (approximate) {
                response.set_approximate(true);
                // better default for approximate numbers
                response.set_format('decimal');
            }
            return response;
        };
    },
    bigrat_function_to_widget_function: function (bigrat_function, approximate) {
        // takes a function that returns a bigrat and
        // returns a function that converts the response into a widget
        return function () {
            var result = TT.number.create_from_bigrat(bigrat_function.apply(null, arguments));
            if (approximate && approximate(arguments)) {
                result.set_approximate(true);
                // better default for approximate numbers
                result.set_format('decimal');
            }
            return result;
        };
    },
    add_function_object: function (name, respond_to_message, title, short_name, types) {
        var and_on_my_back = "\nOn my backside you can change me to compute other functions.";
        var get_description;
        if (types) {
           if (types.length === 1) {
               get_description = function () {
                   return "If you give me a box with another bird and " + TT.UTILITIES.add_a_or_an(types[0]) + " then " + 
                          TT.UTILITIES.lower_case_first_letter(this.title) + and_on_my_back;
               }
            } else {
                get_description = function () {
                    return "If you give me a box with another bird, " + TT.UTILITIES.conjunction(types, true) + " then " + 
                           TT.UTILITIES.lower_case_first_letter(this.title) + and_on_my_back;
                };
            }
        } else {
            get_description = function () {
                return "If you give me a box with another bird and some numbers then " + 
                       TT.UTILITIES.lower_case_first_letter(this.title) + and_on_my_back;
            };
        }
        var to_string_function = function () {
            return TT.UTILITIES.add_a_or_an("'" + this.name + "' function bird");
        };
        function_table[name] = {name: name,
                                short_name: short_name || name,
                                respond_to_message: respond_to_message,
                                get_description: get_description,
                                toString: to_string_function,
                                title: title};
    },
    get_function_table: function () {
        return function_table;
    }
}};

}(window.TOONTALK));