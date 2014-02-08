 /**
 * Implements ToonTalk's JavaScript functions shared between files
 * Authors: Ken Kahn
 * License: New BSD
 */

window.TOONTALK.UTILITIES = 
(function () {
    "use strict";
    return {
        get_style_property: function (element, style_property) {
	        if (element.currentStyle) {
		        return element.currentStyle[style_property];
	        } 
            if (window.getComputedStyle) {
		         return document.defaultView.getComputedStyle(element,null).getPropertyValue(style_property);
	        }
        },

		get_style_numeric_property: function (element, style_property) {
			var as_string = this.get_style_property(element, style_property);
			var index;
			if (typeof as_string === 'string') {
				index = as_string.indexOf('px');
				if (index >= 0) {
					as_string = as_string.substring(0, index);
				}
				return parseInt(as_string, 10);
			}
			return as_string;
		},
		
		get_first_child_with_class: function (element, class_name) {
			var child;
			for (child = element.firstChild; child; child = child.nextSibling) {
                if (child.className === class_name) {
					return child;
				}
			}
		},
		
		dereference_path: function (path, context) {
			var reference;
		    if (path) {
                reference = context.dereference(path);
			    if (!reference) {
			        console.log("Unable to dereference path: " + path.toString() + " in context: " + context.toString());
			    }
			    return reference;
            }
            // no path means entire context
            return context;
        }
    };
}());
