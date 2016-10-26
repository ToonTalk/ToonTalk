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
    var return_the_message = function (message_properties) {
        var bird_copy;
        if (!message_properties) {
            return;
        }
        if (message_properties.message_return_bird) {
            if (message_properties.message_return_bird.is_nest_visible()) {
                bird_copy = message_properties.message_return_bird.add_copy_to_container()
                bird_copy.widget_side_dropped_on_me(message_properties.message);
            } else {
                message_properties.message_return_bird.widget_side_dropped_on_me(message_properties.message);
            }
        }
    }
    return {
      check_message: function (message) {
        var message_properties = {};
        var first_hole, box;
        if (!message.is_box()) {
            return this.report_error("Function birds can only respond to boxes. One was given " + TT.UTILITIES.add_a_or_an(message.get_type_name()));
        }
        message_properties.box_size = message.get_size();
        if (message_properties.box_size < 1) {
            return this.report_error("Function birds can only respond to boxes with holes.");
        }
        first_hole = message.get_hole_contents(0);
        if (!first_hole) {
            return this.report_error("Function birds can only respond to boxes with something in the first hole.");
        }
        if (first_hole.is_box()) {
            message_properties.bird = first_hole.get_hole_contents(0);
            if (first_hole.get_size() > 2) {
                message_properties.error_bird = first_hole.get_hole_contents(2);
                if (message_properties.error_bird && !message_properties.error_bird.is_bird()) {
                    return this.report_error("A function bird received a box with a box in its first hole that should only contain birds. It contains " + TT.UTILITIES.add_a_or_an(message_properties.message_return_bird.get_type_name()) + ".",
                                             message_properties.bird.is_bird() && message_properties);
                }
            }
            if (!message_properties.bird) {
                return this.report_error("Function birds can only respond to boxes with a box in the first hole if the box's first hole contains a bird. It is empty.",
                                         message_properties);
            }
            if (!message_properties.bird.is_bird()) {
                return this.report_error("Function birds can only respond to boxes with a box in the first hole if the box's first hole contains a bird. The first hole contains " + TT.UTILITIES.add_a_or_an(message_properties.bird.get_type_name()) + ".",
                                         message_properties);
            }
            if (first_hole.get_size() > 1) {
                message_properties.message_return_bird = first_hole.get_hole_contents(1);
                if (message_properties.message_return_bird && !message_properties.message_return_bird.is_bird()) {
                    return this.report_error("A function bird received a box with a box in its first hole that should only contain birds. It contains " + TT.UTILITIES.add_a_or_an(message_properties.message_return_bird.get_type_name()) + ".",
                                             message_properties);
                }
            }
        } else if (!first_hole.is_bird()) {
            return this.report_error("Function birds can only respond to boxes with a bird in the first hole. The first hole contains " + TT.UTILITIES.add_a_or_an(first_hole.get_type_name()) + ".",
                                     message_properties);
        } else {
            message_properties.bird = first_hole;
        }
        message_properties.message = message;
        return message_properties;
    },
    report_error: function (error, message_properties) {
        TT.UTILITIES.display_message(error);
        if (message_properties && 
            (message_properties.error_bird || message_properties.bird)) {
            (message_properties.error_bird || message_properties.bird).widget_side_dropped_on_me(TT.element.create(error));
        }
        return_the_message(message_properties);
        return error;
    },
    process_response: function (response, message_properties, message, event, robot) {
        if (response) {
            // it used to be that this also called add_newly_created_widget
            // this wasn't necessary and for the delay function bird meant this could happen at the wrong step
            // following should not pass event through since otherwise it is recorded as if robot being trained did this
            message_properties.bird.widget_side_dropped_on_me(response, undefined, robot, true, true);
            return_the_message(message_properties);
        }
        if (!message_properties.message_return_bird) {
            message.remove(undefined, true);
        }
    },  
    process_message: function (message, compute_response, event, robot) {
        var response;
        var message_properties = this.check_message(message);
        if (typeof message_properties === 'string') {
            // error reported and handled
            return;
        }
        response = compute_response(message_properties);
        // following is typically unneeded but if the message contains covered nests
        // then the response might still be considered as a child of the obsolete nest
        // only the first hole is re-used in responses
        if (!message_properties.message_return_bird && message.get_size() > 1 && message.get_hole_contents(1)) {
            message.get_hole_contents(1).remove(event, true, true);
        }
        this.process_response(response, message_properties, message, event, robot);
        return response;
    },
    type_check: function (type, widget, function_name, index, message_properties) {
        // returns a string describing the error if there is one
        if (widget.is_nest() && !widget.has_contents()) {
            // throw empty nest so can suspend this until nest is covered
            if (TT.sounds) {
                TT.sounds.bird_fly.pause();
            }
            throw {wait_for_nest_to_receive_something: widget};
        }
        if (!type) {
            // any type is fine
            return true;
        }
        if (!widget) {
            return this.report_error("The '" + function_name + "' bird can only respond to boxes with " + TT.UTILITIES.add_a_or_an(type) + " in the " 
                                      + TT.UTILITIES.ordinal(index) + " hole. The " + TT.UTILITIES.ordinal(index) + " hole is empty.",
                                     message_properties);
        }
        if (widget.dereference().is_of_type(type)) {
            return true;
        }
        return this.report_error("'" + function_name + "' birds can only respond to boxes with " + TT.UTILITIES.add_a_or_an(type) + " in the "
                                  + TT.UTILITIES.ordinal(index) + " hole. The " + TT.UTILITIES.ordinal(index)
                                  + " hole contains " + TT.UTILITIES.add_a_or_an(widget.get_type_name() + "."),
                                 message_properties);
    },
    number_check: function (widget, function_name, index, message_properties) {
        return this.type_check('number', widget, function_name, index, message_properties);
    },
    n_ary_widget_function: function (message, zero_ary_value_function, binary_operation, function_name, event, robot) { 
        // binary_operation is a function of two widgets that updates the first
        var compute_response = function (message_properties) {
            var next_widget, index, response;
            if (message_properties.box_size === 1) {
                return zero_ary_value_function();
            }
            index = 1;
            response = message.get_hole_contents(index);
            if (!response) {
                this.report_error("The '" + function_name + "' bird could not work because the first number is missing.", message_properties);
                return;
            }
            response = response.dereference()
            if (this.number_check(response, function_name, index, message_properties) !== true) {
                return;
            }
            if (message_properties.message_return_bird) {
                // if user wants the message back then don't reuse parts of it
                response = response.copy();
            }
            index++;
            while (index < message_properties.box_size) {
                next_widget = message.get_hole_contents(index);
                if (!next_widget) {
                    this.report_error("The '" + function_name + "' bird could not work because the " + TT.UTILITIES.ordinal(index-1) + " number is missing.", message_properties);
                    return;
                }
                next_widget = next_widget.dereference();
                if (this.number_check(next_widget, function_name, index, message_properties) !== true) {
                    return;
                }
                binary_operation.call(response, next_widget);
                index++;
            }
            return response;
        }.bind(this);
        return this.process_message(message, compute_response, event, robot);
    },
    n_ary_function: function (message, operation, minimum_arity, function_name, event, robot) { 
        var compute_response = function (message_properties) {
            var next_widget, index, args, any_approximate_arguments, response;
            if (message_properties.box_size < minimum_arity+1) { // one for the bird
                this.report_error("'" + function_name + "' birds can only respond to boxes with at least "
                                   + (minimum_arity+1) + " holes. Not " + message_properties.box_size + " holes.",
                                  message_properties);
                return;
            }
            args = [];
            index = 1;
            while (index < message_properties.box_size) {
                next_widget = message.get_hole_contents(index);
                if (!next_widget) {
                    this.report_error("The '" + function_name + "' bird stopped becaused the " + TT.UTILITIES.ordinal(index) + " hole is empty.", message_properties);
                    return;
                }
                next_widget = next_widget.dereference();
                if (this.number_check(next_widget, function_name, index, message_properties) !== true) {
                    return;
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
    typed_bird_function: function (message, bird_function, types, function_name, event, robot, min_arity, max_arity) {
        // if min_arity is undefined then no limit to the number of repetitions of the last type
        // if max_arity is undefined then every hole in the message is processed otherwise those beyond max_arity are ignored
        var compute_response = function (message_properties) {
            var next_widget, index, stop_index, args, type, contents;
            if (min_arity >= 0 && message_properties.box_size < min_arity+1) { // one for the bird
                this.report_error("The '" + function_name + "' bird can only respond to boxes with " + (min_arity+1) + " or more holes. Not " + message_properties.box_size + " holes.",
                                  message_properties);
                return;
            }
            args = [];
            index = 1;
            stop_index = max_arity ? max_arity : message_properties.box_size-1;
            while (index < stop_index+1) {
                // ignores any holes after the stop_index+1
                contents = message.get_hole_contents(index);
                if (index <= min_arity && !contents) {
                    this.report_error("The '" + function_name + "' bird found nothing in the " + TT.UTILITIES.ordinal(index) + " hole.",
                                      message_properties);
                    return;
                }
                if (contents) {
                    next_widget = contents.dereference();
                    if (index <= types.length) {
                        type = types[index-1];
                    }
                    if (this.type_check(type, next_widget, function_name, index, message_properties) !== true) {
                        // error already reported
                        return;
                    }
                }
                // push undefined if hole is empty
                args.push(next_widget);
                index++;
            }
            args.push(message_properties);
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