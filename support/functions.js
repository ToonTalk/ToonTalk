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
        if (!bird.is_bird()) {
            TT.UTILITIES.display_message("Function birds can only respond to boxes with a bird in the first hole. The first hole contains " + TT.UTILITIES.add_a_or_an(bird.get_type_name() + "."));
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
            bird.widget_dropped_on_me(response, false, undefined, robot, true);
        }
        message.remove();
    },  
    process_message: function (message, compute_response, event, robot) {
        var response;
        var box_size_and_bird = this.check_message(message);
        if (!box_size_and_bird) {
            return;
        }
        response = compute_response(box_size_and_bird.bird, box_size_and_bird.box_size);
        this.process_response(response, box_size_and_bird.bird, message, event, robot);
        return response;
    },
    type_check: function (type, widget, function_name, index) {
        var top_contents;
        if (!type) {
            // any type is fine
            return true;
        }
        if (!widget) {
            TT.UTILITIES.display_message("Birds for the " + function_name + " function can only respond to boxes with " + TT.UTILITIES.add_a_or_an(type) + " in the " + 
                                          TT.UTILITIES.ordinal(index) + " hole. The " + TT.UTILITIES.ordinal(index) + " hole is empty.");
            return false;
        }
        if (widget.dereference().is_of_type(type)) {
            return true;
        }
        if (widget.is_nest()) {
            // throw empty nest so can suspend this until nest is covered
            throw {wait_for_nest_to_receive_something: widget};
        }
        TT.UTILITIES.display_message("Birds for the " + function_name + " function can only respond to boxes with " + TT.UTILITIES.add_a_or_an(type) + " in the " + 
                                     TT.UTILITIES.ordinal(index) + " hole. The " + TT.UTILITIES.ordinal(index) + 
                                     " hole contains " + TT.UTILITIES.add_a_or_an(widget.get_type_name() + "."));
        return false;
    },
    number_check: function (widget, function_name, index) {
        return type_check('number', widget, function_name, index);
    },
    n_ary_widget_function: function (message, zero_ary_value_function, binary_operation, function_name, event, robot) { 
        // binary_operation is a function of two widgets that updates the first
        var compute_response = function (bird, box_size) {
            var next_widget, index, response;
            var is_number_or_nest;
            if (box_size === 1) {
                return zero_ary_value_function();
            }
            index = 1;
            response =  message.get_hole_contents(index).dereference();
            is_number_or_nest = this.number_check(response, function_name, index);
            if (!is_number_or_nest) {
                return;
            }
            index++;
            while (index < box_size) {
                next_widget = message.get_hole_contents(index).dereference();
                is_number_or_nest = this.number_check(next_widget, function_name, index);
                if (!is_number_or_nest) {
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
        var compute_response = function (bird, box_size) {
            var next_widget, index, args, is_number_or_nest;
            if (box_size < minimum_arity+1) { // one for the bird
                TT.UTILITIES.display_message("Birds for the " + function_name + " function can only respond to boxes with at least " + (minimum_arity+1) + " holes. Not " + box_size + " holes.");
                return;
            }
            args = [];
            index = 1;
            while (index < box_size) {
                next_widget = message.get_hole_contents(index).dereference();
                is_number_or_nest = this.number_check(next_widget, function_name, index);
                if (!is_number_or_nest) {
                    return;
                }
                args.push(next_widget.get_value());
                index++;
            }
            return operation.apply(null, args);
        }.bind(this);
        return this.process_message(message, compute_response, event, robot);
    },
    typed_bird_function: function (message, bird_function, types, arity, function_name, event, robot) {
        // if arity is undefined then no limit to the number of repetitions of the last type
        var compute_response = function (bird, box_size) {
            var next_widget, index, args, type;
            if (arity >= 0 && box_size != arity+1) { // one for the bird
                TT.UTILITIES.display_message("Birds for the " + function_name + " function can only respond to boxes with " + (minimum_arity+1) + " holes. Not " + box_size + " holes.");
                return;
            }
            args = [];
            index = 1;
            while (index < box_size) {
                next_widget = message.get_hole_contents(index).dereference();
                if (index <= types.length) {
                    type = types[index-1];
                }
                if (!this.type_check(type, next_widget, function_name, index)) {
                    return;
                }
                args.push(next_widget);
                index++;
            }
            return bird_function.apply(null, args);
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
            }
            return response;
        };
    },
    bigrat_function_to_widget_function: function (bigrat_function, approximate) {
        // takes a function that returns a bigrat and
        // returns a function that converts the response into a widget
        return function () {
            var result = TT.number.create_from_bigrat(bigrat_function.apply(null, arguments));
            if (approximate) {
                result.set_approximate(true);
            }
            return result;
        };
    },
    add_function_object: function (name, respond_to_message, title, short_name, types) {
        var and_on_my_back = "\nOn my back side you can change me to compute other functions.";
        var get_description;
        if (types) {
           if (types.length === 1) {
               get_description = function () {
                   return "If you give me a box with another bird and " + types[0] + " then " + 
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