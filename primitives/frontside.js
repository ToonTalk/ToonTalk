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
			var $frontside_container = $frontside_element.parents(".toontalk-frontside:first");
			var show_backside_timer;
			frontside_element.className += "toontalk-frontside toontalk-side";
			$frontside_element.data("owner", widget);
			TT.UTILITIES.drag_and_drop($frontside_element, widget);
            frontside.get_element = function () {
                return frontside_element;
            };
            frontside.get_widget = function () {
                return widget;
            };
			$frontside_element.mouseenter(function () {
				var backside = widget.get_backside();
				var backside_element;
				if (backside) {
					return; // could highlight it...
				}
				if ($frontside_element.parent(".toontalk-backside").length === 0) {
					// only those directly on a backside
					return;
				}
				show_backside_timer = setTimeout(
				    function () {
						if ($(".toontalk-being-dragged").length > 0) {
							// a drag in progress
							return;
						}
						backside = widget.get_backside(true);
						backside_element = backside.get_element();
						$(backside_element).addClass("toontalk-emerging-backside");
						$(backside_element).data("owner", widget);
						backside_element.style.left = frontside_element.style.left;
						backside_element.style.top = frontside_element.style.top;
						$frontside_element.parent(".toontalk-backside").append(backside_element);
					},
				    2000);
			});
			$frontside_element.on("click mouseout", function () {
				if (show_backside_timer) {
					clearTimeout(show_backside_timer);
					show_backside_timer = null;
				}
				setTimeout(TT.UTILITIES.remove_emerging_backsides, 4000);
			});
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