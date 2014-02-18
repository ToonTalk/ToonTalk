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
// 					$element.addClass("toontalk-on-backside");
				    window.TOONTALK.UTILITIES.set_position_absolute($side_element_of_other.get(0), true, event); // when on the backside
					// following constants could be defined in backside widget -- good idea?
					var scale = $side_element_of_other.is(".toontalk-frontside") ? .2 : .4;
				    var width = $element.width() * scale;
                    var height = $element.height() * scale;
                    $side_element_of_other.width(scale*100 + "%");
                    $side_element_of_other.height(scale*100 + "%");
					$side_element_of_other.children("toontalk-widget").css({"min-width": width,
					                                                        "min-height": height});
			    };
			}
			if (!widget.removed) {
			    widget.removed = function (other, $side_element_of_other, event) {
					$side_element_of_other.css({"min-width": "inherit",
					                            "min-height": "inherit"});
// 					$element.removeClass("toontalk-on-backside");
				    // no need to do anything since can find all children and their 'owners' easily enough
			    };
            }
			window.TOONTALK.UTILITIES.drag_and_drop($element);
            return widget;
        },

    };
}());