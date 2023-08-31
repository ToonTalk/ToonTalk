 /**
 * Implements Birds that fly to user-defined functionality
 * Authors: Ken Kahn
 * License: New BSD
 */

/*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */

window.TOONTALK.web_function = {function:
(function () {
    "use strict";
    let functions = TT.create_function_table();
    functions.add_function_object(
        'log in console',
        function (message, options) {
            var console_log = function (widget, message_properties) {
                let string = widget.toString();
                console.log(string);
                return string;
            };
            return functions.typed_bird_function(message, console_log, [], 'log in console', options, 1, 1);
        },
        "The bird when given a box with a reply bird and a widget will add to the browser's console a description of the widget.",
        "log",
        []);
        return functions.get_function_table();
             }())
};