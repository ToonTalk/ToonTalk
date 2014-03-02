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
				greedy: true,
				stack: ".toontalk-side",
                start: function (event, ui) {
					TT.UTILITIES.remove_emerging_backsides();
					var $container = $element.parents(".toontalk-side:first");
					var container = $container.data("owner");
					$element.removeClass("toontalk-emerging-backside");
					// save the current dimension so size doesn't change while being dragged
					this.style.width = this.offsetWidth + "px",
					this.style.height = this.offsetHeight + "px",
					$element.addClass("toontalk-being-dragged");
					if (container) {
					    container.removed($element.data("owner"), $element, event);
					}
					event.stopPropagation();
				},
				stop: function (event, ui) {
					$element.removeClass("toontalk-being-dragged");
					// restore ordinary size styles
					this.style.width = "";
					this.style.height = "";
				},
            }); // .resizable(); -- works fine for backsides but need to fix frontside problem
			$element.droppable({
				greedy: true,
				tolerance: "intersect", // at least 50%
                drop: function (event, ui) {
                    var $source = $(".toontalk-being-dragged");
					var target_element = event.target;
					var $target = $(target_element);
					var source, target;
					if ($source.length >= 1) {
						target = $target.data("owner");
						source = $source.data("owner");
						if ($target.is(".toontalk-backside")) {
							target.get_backside().widget_dropped_on_me(source, event);
							event.stopPropagation();
						} else if (source.drop_on(target, $target, event)) {
						    event.stopPropagation();
					    }
					}
                }
			});
		},
		
		remove_emerging_backsides: function () {
			$(".toontalk-emerging-backside").each(function (index, element) {
				var widget = $(element).data("widget");
				widget.forget_backside();
			});
			$(".toontalk-emerging-backside").remove();
		},
		
		set_position_absolute: function (element, absolute, event) {
			var position, left, top, ancestor;
			if (absolute) {
				if (element.style.position === "absolute") {
					return;
				}
				if (event) {
					left = event.clientX;
			        top = event.clientY;
					ancestor = element.parentElement;
					while (ancestor) {
						left -= ancestor.offsetLeft;
						top -= ancestor.offsetTop;
						ancestor = ancestor.parentElement;
					}
				} else {
				    position = $(element).position();
					left = position.left;
					top = position.top;
				}
				element.style.position = "absolute";
				$(element).css({left: left,
				                 top: top});
			} else {
				if (element.style.position === "relative") {
					return;
				}
				element.style.position = "relative";
				element.style.left = "0";
				element.style.top = "0";
			}
		},
		
		create_text_input: function (value, class_name, title) {
			var input = document.createElement("input");
			input.type = "text";
			input.className = class_name;
			input.value = value;
			input.title = title;
			return input;
		},
		
		create_radio_button: function (name, value) {
			var input = document.createElement("input");
			input.type = "radio";
			input.className = "toontalk-radio-button";
			input.name = name;
			input.value = value;
			return input;
		},
		
		create_label: function (html) {
			var label_element = document.createElement("span");
			label_element.className = "toontalk-label";
			label_element.innerHTML = html;
			return label_element;
		},
		
		create_horizontal_table: function (parameters) {
			var table = document.createElement("table");
			var i, row, table_element;
			row = document.createElement("tr");
			table.appendChild(row);
			for (i = 0; i < arguments.length; i += 1) {
				table_element = document.createElement("td");
				row.appendChild(table_element);
				table_element.appendChild(arguments[i]);
			}
			return table;
		},
		
		create_vertical_table: function (parameters) {
			var table = document.createElement("table");
			var i, row, table_element;
			for (i = 0; i < arguments.length; i += 1) {
				row = document.createElement("tr");
				table.appendChild(row);
				table_element = document.createElement("td");
				row.appendChild(table_element);
				table_element.appendChild(arguments[i]);
			}
			return table;
		},
		
		label_radio_button: function (button, label, title, label_class_name) {
			var container = document.createElement("div");
			var label_element = this.create_label(label);
			label_element.className += " " + label_class_name;
			container.appendChild(button);
			container.appendChild(label_element);
			if (title) {
				container.title = title;
			}
			return container;		
		},
		
		selected_radio_button: function () {
			var i;
			for (i = 0; i < arguments.length; i += 1) {
				if (arguments[i].checked) {
					return arguments[i];
				}
			}
		}
	
    }
	
}(window.TOONTALK));
