 /**
 * Implements ToonTalk's JavaScript functions shared between files
 * Authors: Ken Kahn
 * License: New BSD
 */

window.TOONTALK.UTILITIES = 
(function (TT) {
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
        },
		
		drag_and_drop: function ($element) {
			$element.draggable({
				create: function( event, ui ) {
                    $(this).css({position: "absolute"})
				},
 				appendTo: $element.parents(".toontalk-side:last"), // top-most
				stack: ".toontalk-side",
                start: function (event, ui) {
					$element.addClass("toontalk-being-dragged");
					var $container = $element.parents(".toontalk-side:first");
					var container = $container.data("owner");
					if (container) {
					    container.removed($element.data("owner"), $element, event);
					}
					event.stopPropagation();
				},
				stop: function (event, ui) {
					$element.removeClass("toontalk-being-dragged");
				},
            }); // .resizable(); -- wrorks fine for backsides but need to fix frontside problem
			$element.droppable({
				greedy: true,
                drop: function (event, ui) {
                    var $target = $(".toontalk-being-dragged");
					if ($target.length >= 1) {
					    var target = $target.data("owner");
						var source = $element.data("owner");
					    source.drop_on(target, $target, event);
						event.stopPropagation();
					}
                }
			});
		},
		
		set_position_absolute: function (element, absolute, event) {
			var position;
			if (absolute) {
				if (element.style.position === "absolute") {
					return;
				}
				if (event) {
					position = {left: event.clientX - element.parentElement.offsetLeft,
					            top:  event.clientY - element.parentElement.offsetTop,
					};
				} else {
				    position = $(element).position();
				}
				element.style.position = "absolute";
				$(element).css({left: position.left,
				                 top: position.top});
			} else {
				if (element.style.position === "relative") {
					return;
				}
				element.style.position = "relative";
				element.style.left = "0";
				element.style.top = "0";
			}
		},
		
		// probably the following could be replaced with better JQuery UI coce
		
		create_text_input: function (value, class_name, title) {
			var input = document.createElement("input");
			input.type = "text";
			input.className = class_name;
			input.value = value;
			input.title = title;
			return input;
		},
		
		create_button: function (label, class_name, title) {
			var button = document.createElement("button");
			button.className = class_name;
			button.innerHTML = label;
			button.title = title;
			return button;
		},
		
		create_radio_button: function (name, value) {
			var input = document.createElement("input");
			input.type = "radio";
			input.className = "toontalk-radio-button";
			input.name = name;
			input.value = value;
			return input;
		},
		
		label_radio_button: function (button, label) {
			var container = document.createElement("div");
			var label_element = document.createElement("span");
			label_element.innerHTML = label;
			container.appendChild(button);
			container.appendChild(label_element);
			return container;		
		},
		
		selected_radio_button: function () {
			var i;
			for (i = 0; i < arguments.length; i += 1) {
				if (arguments[i].checked) {
					return arguments[i];
				}
			}
		},
	
    }
	
}(window.TOONTALK));
