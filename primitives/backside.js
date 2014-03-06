 /**
 * Implements ToonTalk's backside of a widget
 * Authors: Ken Kahn
 */

window.TOONTALK.backside = 
(function (TT) {
    "use strict";
    return {
		create: function (widget) {
			var backside = Object.create(this);
			var backside_element = document.createElement("div");
			var $backside_element = $(backside_element);
			$backside_element.addClass("toontalk-backside toontalk-side");
			backside.get_element = function () {
                return backside_element;
            };
			backside.get_widget = function () {
				return widget;
			}
			if (!widget.get_backside) {
				// e.g. top-level backside
				widget.get_backside = function () {
					return backside;
				}
		    }
			if (!widget.drop_on) {
				// TO DO: determine if this is needed -- top-level backside can't be added to something - can it?
			    widget.drop_on = function (other, $side_element_of_other, event) {
					$backside_element.append($side_element_of_other);
// 					$backside_element.addClass("toontalk-on-backside");
				    TT.UTILITIES.set_position_absolute($side_element_of_other.get(0), true, event); // when on the backside
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
			        var other_front_side_element = other.get_frontside(true).get_element();
			        var $other_front_side_element = $(other_front_side_element);
			        $backside_element.append($other_front_side_element);
			        TT.UTILITIES.set_position_absolute(other_front_side_element, true, event); // when on the backside
			        return true;
		        };
		    if (backside_element.parentElement && backside_element.parentElement.tagName != "BODY") {
				// when loaded backside_element will have a position
				setTimeout(function ()  {
// 						var hide_button = TT.UTILITIES.create_button("Hide", "toontalk-hide-backside-button", "Click to hide this behind the front side.");
						var $hide_button =  $("<button>Hide</button>").button();
						$hide_button.addClass("toontalk-hide-backside-button");
						$hide_button.click(function () {
							$backside_element.remove(); // could animate away
							if (widget.forget_backside) {
								widget.forget_backside();
							}
						});
						$hide_button.css({left: "10px",
										   top: (backside_element.offsetHeight - 55) + "px"});
						$backside_element.append($hide_button.get(0));
					},
					1);	
		    }
			TT.backside.associate_widget_with_backside_element(widget, backside, backside_element);
			TT.UTILITIES.drag_and_drop($backside_element, widget);
			$backside_element.resizable();
            // following should be done by something like GWT's onLoad...
            // but DOMNodeInserted is deprecated and MutationObserver is only in IE11.
			$(backside_element).on('DOMNodeInserted', function (event) {
				var $source = $(event.originalEvent.srcElement);
				var owner_widget;
				if ($source.is(".toontalk-frontside")) {
					$source.addClass("toontalk-frontside-on-backside");
					owner_widget = $source.data("owner");
					if (owner_widget) {
						owner_widget.update_frontside();
					}
				}
			});
			$(backside_element).on('DOMNodeRemoved', function (event) {
				var $source = $(event.originalEvent.srcElement);
				var owner_widget;
				if ($source.is(".toontalk-frontside")) {
					$source.removeClass("toontalk-frontside-on-backside");
					owner_widget = $source.data("owner");
					if (owner_widget) {
						owner_widget.update_frontside();
					}
				}
			});		
			return backside;
		},
		
        associate_widget_with_backside_element: function (widget, backside, backside_element) {
			var $backside_element = $(backside_element);
			$backside_element.data("owner", widget);
            return widget;
        },

    };
}(window.TOONTALK));