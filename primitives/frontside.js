 /**
 * Implements ToonTalk's frontside of a widget
 * Authors: Ken Kahn
 */

window.TOONTALK.frontside = 
(function () {
    "use strict";
    return {
        create: function (number) {
	        var frontside = Object.create(this);
            var frontside_element = document.createElement('div');
            frontside_element.className = "toontalk-frontside";
            frontside.get_element = function () {
                return frontside_element;
            };
            frontside.get_number = function () {
                return number;
            };
            return frontside;
        }

    };
}());