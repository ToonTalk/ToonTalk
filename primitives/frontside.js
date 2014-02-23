 /**
 * Implements ToonTalk's frontside of a widget
 * Authors: Ken Kahn
 * License: New BSD
 */

window.TOONTALK.frontside = 
(function (TT) {
    "use strict";
    return {
        create: function (widget) {
			// where widget is a ToonTalk widget like a number or a box
	        var frontside = Object.create(this);
            var frontside_element = document.createElement('div');
			var $frontside_element = $(frontside_element);
// 			var $frontside_container = $frontside_element.parents(".toontalk-frontside:first");
			frontside_element.className += "toontalk-frontside toontalk-side";
			$frontside_element.data("owner", widget);
			TT.UTILITIES.drag_and_drop($frontside_element);
            frontside.get_element = function () {
                return frontside_element;
            };
            frontside.get_widget = function () {
                return widget;
            };
// 			$frontside_element.resizable(); {handles: "n, e, s, w"}
            return frontside;
        },
		
		update_display: function () {
			return this.get_widget().update_display();
		},
		
		remove: function() {
			$(this.get_element()).remove();
		},

    };
}(window.TOONTALK));