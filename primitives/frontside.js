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
			// where object is a ToonTalk widget like a number or a box
	        var frontside = Object.create(this);
            var frontside_element = document.createElement('div');
			var $frontside_element = $( frontside_element );
			frontside_element.className += "toontalk-frontside";
//             frontside_element.className = "toontalk-frontside";
			$frontside_element.data("owner", object);
			$frontside_element.draggable();
			$frontside_element.droppable({
                drop: function (event, ui) {
					// TODO: fix the following test
					if (event.toElement.parentElement.parentElement.className.indexOf("toontalk-frontside") >= 0) {
					    var target = $(event.toElement.parentElement.parentElement).data("owner");
					    object.drop_on(target);
						target.update_display();
					}
                }
			});
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