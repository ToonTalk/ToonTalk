 /**
 * Implements ToonTalk's frontside of a widget
 * Authors: Ken Kahn
 * License: New BSD
 */

window.TOONTALK.frontside = 
(function () {
    "use strict";
    return {
        create: function (object) {
			// where object is a primitive like a number or image
	        var frontside = Object.create(this);
            var frontside_element = document.createElement('div');
            frontside_element.className = "toontalk-frontside";
            frontside.get_element = function () {
                return frontside_element;
            };
            frontside.get_object = function () {
                return object;
            };
            return frontside;
        },
		
		update_display: function () {
			return this.get_object().update_display();
		}

    };
}());