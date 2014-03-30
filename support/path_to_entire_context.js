 /**
 * Implements ToonTalk's path describing an action that applies to the entire context (i.e. what the robot is working on)
 * Authors: Ken Kahn
 * License: New BSD
 */
 
  /*jslint browser: true, devel: true, vars: true, white: true */

window.TOONTALK.path = {};

window.TOONTALK.path.to_entire_context = 
(function (TT) {
    "use strict";
    return {
        toString: function () {
            return "what he's working on";
        },
        
        get_json: function () {
            return {type: "path.to_entire_context"};
        },
        
        create_from_json: function () {
            return TT.path.to_entire_context;
        }
    };
}(window.TOONTALK));