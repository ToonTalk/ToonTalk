 /**
 * Implements ToonTalk's backside of a widget
 * Authors: Ken Kahn
 */

window.TOONTALK.backside = 
(function () {
    "use strict";
    return {
        associate_widget_with_backside_element: function (widget, element) {
			var $element = $(element);
			$element.data("owner", widget);
            widget.get_element = function () {
                return element;
            };
			widget.drop_on = function (other) {
				console.log("backside drops not yet implemented");
			};
			widget.removed = function (other) {
				console.log("backside removal not yet implemented");
			};
			window.TOONTALK.UTILITIES.drag_and_drop($element, function ($element, $target) {
				var width = $element.width()/5;
                var height = $element.height()/5;
                var offset = $target.offset();
                $element.append($target);
                $target.width(width);
                $target.height(height);
                $target.offset(offset);
			});
// 			$element.draggable();
// 			$element.droppable({
// 				greedy: true, // so it doesn't propagate
//                 drop: function (event, ui) {
//                     var $target = $(event.toElement).parents(".toontalk-frontside:first");
// 					// TODO: generalise the following sizes
//                     var width = $element.width()/5;
//                     var height = $element.height()/5;
//                     var offset = $target.offset();
//                     $element.append($target);
//                     $target.width(width);
//                     $target.height(height);
//                     $target.offset(offset);
// 					event.stopPropagation();
// 					event.preventDefault();
//                 }
//             });
            return widget;
        },

    };
}());