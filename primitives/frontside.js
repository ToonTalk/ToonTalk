 /**
 * Implements ToonTalk's frontside of a widget
 * Authors: Ken Kahn
 * License: New BSD
 */

window.TOONTALK.frontside = 
(function () {
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
			window.TOONTALK.UTILITIES.drag_and_drop($frontside_element);
// 			$frontside_element.draggable({
// 				appendTo: $frontside_container,
//                 start: function (event, ui) {
// 					var $container = $(event.target).parents(".toontalk-frontside:first");
// 					var container = $container.data("owner");
// 					if (container) {
// 					    container.removed();
// 					}
// 					event.stopPropagation();
// 				}
//             });
// 			$frontside_element.droppable({
// 				greedy: true,
//                 drop: function (event, ui) {
// 					// without not($frontside_element); seems to find 'this' sometimes
// 					// ".toontalk-frontside" was ".toontalk-frontside:first"
// 					var $target = $(event.toElement).parents(".toontalk-frontside:first");
// // 					var $target = $(event.toElement).parents(".toontalk-frontside").not($frontside_element);
// 					if ($target.length >= 1) {
// 					    var target = $target.data("owner");
// 					    widget.drop_on(target, event.clientX, event.clientY, event);
// 						event.stopPropagation();
// 					}
//                 }
// 			});
            frontside.get_element = function () {
                return frontside_element;
            };
            frontside.get_widget = function () {
                return widget;
            };
            return frontside;
        },
		
		update_display: function () {
			return this.get_widget().update_display();
		},
		
		remove: function() {
			$(this.get_element()).remove();
		},

    };
}());