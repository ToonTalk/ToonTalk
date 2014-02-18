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
			    widget.drop_on = function (other, $side_element_of_other, event) {
					$element.append($side_element_of_other);
				    window.TOONTALK.UTILITIES.set_position_absolute($side_element_of_other.get(0), true, event); // when on the backside
					// following constants could be defined in backside widget -- good idea?
					var fraction = $side_element_of_other.is(".toontalk-frontside") ? 5 : 2.5;
				    var width = $element.width() / fraction;
                    var height = $element.height() / fraction;
//                     var offset = $target.offset();
                    $side_element_of_other.width(width);
                    $side_element_of_other.height(height);
//                     $target.offset(offset);
			    };
			}
			if (!widget.removed) {
			    widget.removed = function (other) {
				    // no need to do anything since can find all children and their 'owners' easily enough
			    };
            }
			window.TOONTALK.UTILITIES.drag_and_drop($element);
            return widget;
        },

    };
}());