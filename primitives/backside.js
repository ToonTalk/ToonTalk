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
					if ($side_element_of_other.is(".toontalk-frontside")) {
						// better to have a preferrred size that it goes to when on backside
						// recorded when dropped into something that changes its size -- e.g. a box
// 						var horizontonal_scale = $side_element_of_other.is(".toontalk-frontside") ? .2 : .4;
// 						var vertical_scale = $side_element_of_other.is(".toontalk-frontside") ? .1 : .4;
//                     	$side_element_of_other.width(horizontonal_scale*100 + "%");
//                     	$side_element_of_other.height(vertical_scale*100 + "%");
                        $side_element_of_other.addClass("toontalk-frontside-on-backside");
                        other.update_display();
			        }
			    };
			}
			if (!widget.removed) {
			    widget.removed = function (other, $side_element_of_other, event) {
					$side_element_of_other.removeClass("toontalk-frontside-on-backside");
					// remove size css added above
// 					if (!$side_element_of_other.is(".toontalk-being-dragged")) {
// 					    $side_element_of_other.css({width: '',
// 					                                height: ''});
// 			        }
					// remove child?
// 					$side_element_of_other.find("toontalk-widget").css({"min-width": "inherit",
// 					                                                    "min-height": "inherit"});
// 					$element.removeClass("toontalk-on-backside");
				    // no need to do anything since can find all children and their 'owners' easily enough
			    };
            }
			window.TOONTALK.UTILITIES.drag_and_drop($element);
			$element.resizable();
            return widget;
        },

    };
}());