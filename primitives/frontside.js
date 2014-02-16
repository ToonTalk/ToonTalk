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
			// replacing the above with the following enables drag in IE9
			// see http://stackoverflow.com/questions/5500615/internet-explorer-9-drag-and-drop-dnd
// 			var frontside_element = document.createElement('a');
// 			frontside_element.href = '#';
			frontside_element.draggable = true;
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