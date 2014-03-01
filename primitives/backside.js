 /**
 * Implements ToonTalk's backside of a widget
 * Authors: Ken Kahn
 */

window.TOONTALK.backside = 
(function (TT) {
    "use strict";
    return {	
        associate_widget_with_backside_element: function (widget, backside, backside_element) {
			var $backside_element = $(backside_element);
			$backside_element.data("owner", widget);
            widget.get_element = function () {
                return backside_element;
            };
			if (!widget.drop_on) {
			    widget.drop_on = function (other, $side_element_of_other, event) {
					$backside_element.append($side_element_of_other);
// 					$backside_element.addClass("toontalk-on-backside");
				    TT.UTILITIES.set_position_absolute($side_element_of_other.get(0), true, event); // when on the backside
					// following constants could be defined in backside widget -- good idea?
					if ($side_element_of_other.is(".toontalk-frontside")) {
						// better to have a preferrred size that it goes to when on backside
						// recorded when dropped into something that changes its size -- e.g. a box
                        $side_element_of_other.addClass("toontalk-frontside-on-backside");
                        other.update_frontside();
			        }
					return true;
			    };
			}
			if (!widget.removed) {
			    widget.removed = function (other, $side_element_of_other, event) {
					$side_element_of_other.removeClass("toontalk-frontside-on-backside");
// 					$element.removeClass("toontalk-on-backside");
				    // no need to do anything since can find all children and their 'owners' easily enough
			    };
            }
			backside.widget_dropped_on_me = 
			    function (other, event) {
			        var other_front_side_element = other.get_frontside().get_element();
			        var $other_front_side_element = $(other_front_side_element);
			        $backside_element.append($other_front_side_element);
			        TT.UTILITIES.set_position_absolute(other_front_side_element, true, event); // when on the backside
			        // following constants could be defined in backside widget -- good idea?
			        if ($other_front_side_element.is(".toontalk-frontside")) {
				        // better to have a preferrred size that it goes to when on backside
				        // recorded when dropped into something that changes its size -- e.g. a box
				        $other_front_side_element.addClass("toontalk-frontside-on-backside");
                        other.update_frontside();
			         }
			         return true;
		        };
			TT.UTILITIES.drag_and_drop($backside_element);
			$backside_element.resizable();
            return widget;
        },


    };
}(window.TOONTALK));