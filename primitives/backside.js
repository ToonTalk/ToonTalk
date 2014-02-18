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
			if (!widget.drop_on) {
			    widget.drop_on = function (other) {
				    window.TOONTALK.UTILITIES.set_position_absolute(other.get_frontside().get_element(), true); // when on the backside
					// no need to do anything else since backside can find all children and their 'owners' easily enough
			    };
			}
			if (!widget.removed) {
			    widget.removed = function (other) {
				    // no need to do anything since can find all children and their 'owners' easily enough
			    };
            }
			window.TOONTALK.UTILITIES.drag_and_drop($element, function ($element, $target) {
				var fraction = $target.is(".toontalk-frontside") ? 5 : 2.5;
				var width = $element.width() / fraction;
                var height = $element.height() / fraction;
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