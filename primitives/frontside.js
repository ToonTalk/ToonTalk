 /**
 * Implements ToonTalk's frontside of a widget
 * Authors: Ken Kahn
 * License: New BSD
 */
 
/*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */

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
			$(frontside_element).addClass("toontalk-frontside toontalk-side");
			$frontside_element.data("owner", widget);
			TT.UTILITIES.drag_and_drop($frontside_element, widget);
            frontside.get_element = function () {
                return frontside_element;
            };
            frontside.get_widget = function () {
                return widget;
            };
			$frontside_element.click(function (event) {
				var backside = widget.get_backside();
				var backside_element, $frontside_ancestor_that_is_backside_element, $frontside_ancestor_before_backside_element, frontside_ancestor_before_backside_element;
				if ($(event.target).is('.ui-resizable-handle')) { 
					// don't let resize events cause click response
					// see http://stackoverflow.com/questions/5709220/how-to-cancel-click-after-resizable-events
					return;
				}
				if (backside) {
					return; // could highlight it...
				}
				// frontside_ancestor_that_is_backside_element is first parent that is a toontalk-backside
				$frontside_ancestor_that_is_backside_element = $(frontside_element).parent();
				$frontside_ancestor_before_backside_element = $(frontside_element);
				if ($frontside_ancestor_before_backside_element.is(".toontalk-top-level-resource")) {
					return;					
				}
				while ($frontside_ancestor_that_is_backside_element.length > 0 && !$frontside_ancestor_that_is_backside_element.is(".toontalk-backside")) {
					$frontside_ancestor_before_backside_element = $frontside_ancestor_that_is_backside_element;
					$frontside_ancestor_that_is_backside_element = $frontside_ancestor_that_is_backside_element.parent();
				}
				frontside_ancestor_before_backside_element = $frontside_ancestor_before_backside_element.get(0);
				backside = widget.get_backside(true);
				backside_element = backside.get_element();
				$(backside_element).data("owner", widget);
				$(backside_element).css({left: frontside_ancestor_before_backside_element.offsetLeft + frontside_ancestor_before_backside_element.offsetWidth,
				                         top:  frontside_ancestor_before_backside_element.offsetTop});				
				$frontside_ancestor_that_is_backside_element.append(backside_element);
				event.stopPropagation();
			});
            return frontside;
        },
		
		update_display: function () {
			return this.get_widget().update_display();
		},
		
		remove: function() {
			$(this.get_element()).remove();
		}

    };
}(window.TOONTALK));