 /**
 * Implements ToonTalk's JavaScript functions shared between files
 * Authors: Ken Kahn
 * License: New BSD
 */

// jQuery.event.props.push('dataTransfer'); // some posts claim this needed -- unsure...

window.TOONTALK.UTILITIES = 
(function (TT) {
    "use strict";
	var json_creators = {"box": TT.box.create_from_json,
	                     "number": TT.number.create_from_json,
						 "robot": TT.robot.create_from_json,
						 "body": TT.actions.create_from_json,
						 "pick_up_constant_action": TT.pick_up_constant.create_from_json,
						 "pick_up_action": TT.pick_up.create_from_json,
						 "drop_on_action": TT.drop_on.create_from_json,
						 "box_path": TT.box.path.create_from_json,
						 "path_to_entire_context": TT.path_to_entire_context.create_from_json};
	// id needs to be unique across ToonTalks due to drag and drop
	var id_counter = new Date().getTime();
    return {
		create_from_json: function (json) {
			var widget;
			if (json_creators[json.type]) {
				widget = json_creators[json.type](json);
			} else {
				console.log("json type " + json.type + " not yet supported.");
				return;
			}
			if (widget && json.erased) {
				widget.set_erased(json.erased);
			}
			return widget;
		},
		
		create_array_from_json: function (json_array) {
			var new_array = [];
			var i;
			for (i = 0; i < json_array.length; i += 1) {
				if (json_array[i]) {
					new_array[i] = TT.UTILITIES.create_from_json(json_array[i]);
				}
			}
			return new_array;
		},
		
		get_json_of_array: function (array) {
			var json = [];
		    var i;
			for (i = 0; i < array.length; i += 1) {
				if (array[i]) {
					if (array[i].get_json) {
					    json[i] = array[i].get_json();
					} else {
						console.log("No get_json for " + array[i].toString());
					}
				}
			}
			return json;
		},
		
		generate_unique_id: function () {
			id_counter += 1;
		    return 'toontalk_id_' + id_counter;
		},
		
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
		
		// replace calls with JQuery
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
		
		data_transfer_json_object: function (event) {
			var json;
			if (!event.originalEvent.dataTransfer) {
				console.log("no dataTransfer in drop event");
				return;
		    }
			json = event.originalEvent.dataTransfer.getData("application/json");
			if (!json) {
				console.log("No data in dataTransfer in drop.");
				return;
			}
			try {
				return JSON.parse(json);
			} catch (e) {
				console.log("Exception parsing " + json + "\n" + e.toString());
			}
		},
		
		drag_and_drop: function ($element) {
			$element.css({position: "absolute"});
			$element.attr("draggable", true);
			// draggable causes dataTransfer to be null
			// rewrote after noticing that this works fine: http://jsfiddle.net/KWut6/
 			$element.on('dragstart', 
			    function (event) {
					var $container = $element.parents(".toontalk-side:first");
					var container = $container.data("owner");
					var position = $element.position();
					var unique_id = TT.UTILITIES.generate_unique_id();
					var json_object;
					var widget = $element.data("owner");
					if ($element.is(".toontalk-frontside")) {
						// save the current dimension so size doesn't change while being dragged
						$element.css({width:  this.offsetWidth + "px",
									  height: this.offsetHeight + "px"});
					}
					$element.attr("id", unique_id);
					if (container) {
					    container.removed($element.data("owner"), $element, event);
					}
					if (event.originalEvent.dataTransfer) {
						event.originalEvent.dataTransfer.effectAllowed = 'move';
						json_object = widget.get_json();
						json_object.id_of_original_dragree = unique_id;
						json_object.drag_x_offset = event.originalEvent.clientX-position.left;
						json_object.drag_y_offset = event.originalEvent.clientY-position.top;
						json_object.original_width_fraction = $element.outerWidth() / $element.parent().outerWidth();
						json_object.original_height_fraction = $element.outerHeight() / $element.parent().outerHeight();
						$element.data("json", json_object);
						event.originalEvent.dataTransfer.setData("application/json", JSON.stringify(json_object));
					}
					event.stopPropagation();
				});
			$element.on('dragend', 
			    function (event) {
					if ($element.is(".toontalk-frontside")) {
						// restore ordinary size styles
						var json_object = $element.data("json");
						if (json_object) {
							$element.css({width:  json_object.original_width_fraction * 100 + "%",
										  height: json_object.original_height_fraction * 100 + "%"});
						}
					}
					event.stopPropagation();
				});
// 				greedy: true,
// 				tolerance: "intersect", // at least 50%
            $element.on('dragover', 
			    function (event) {
					event.preventDefault();
					return false;
				});
			$element.on('drop',
                function (event) {
					var $source, source, $target, target, target_position, json_object, drag_x_offset, drag_y_offset;
					var json_object = TT.UTILITIES.data_transfer_json_object(event);
                    $source = $("#" + json_object.id_of_original_dragree);
					$target = $(event.target).closest(".toontalk-side");
					target = $target.data("owner");
					if ($source.length >= 1) {
						source = $source.data("owner");	
					} else {
						source = TT.UTILITIES.create_from_json(json_object);
						$source = $(source.get_frontside_element());
					}
					if ($target.is(".toontalk-backside")) {
						target_position = $target.position();
						if (json_object) {
							drag_x_offset = json_object.drag_x_offset;
						    drag_y_offset = json_object.drag_y_offset;
						} else {
							drag_x_offset = 0;
							drag_y_offset = 0;
						}
						$source.css({left: event.originalEvent.clientX-target_position.left-drag_x_offset,
							          top: event.originalEvent.clientY-target_position.top-drag_y_offset});
						target.get_backside().widget_dropped_on_me(source, event);
						event.stopPropagation();
					} else if (!target) {
						console.log("target element has no 'owner'");
					} else if (source.drop_on(target, $target, event)) {
						event.stopPropagation();
					}
					event.preventDefault();
                });
			// following provides mouseevents rather than dragstart and the like
			// which doesn't have a dataTransfer attribute
// 			$element.draggable({
// 				create: function (event, ui) {
//                     $(this).css({position: "absolute"})
// 				},
// //  				appendTo: $element.parents(".toontalk-side:last"), // top-most
// 				greedy: true,
// // 				containment: false, // doesn't seem to work... -- nor does "none"
// 				stack: ".toontalk-side",
// 			}); // .resizable(); -- works fine for backsides but need to fix frontside problem
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
		
		create_button_set: function (parameters) {
			var container = document.createElement("div");
			var i;
			for (i = 0; i < arguments.length; i += 1) {
				container.appendChild(arguments[i]);
			}
			$(container).buttonset();
			return container;
		},
		
		create_text_input: function (value, class_name, label, title) {
			var input = document.createElement("input");
			var label_element, container;
			input.type = "text";
			if (class_name) {
				input.className = class_name;
			}
			input.value = value;
			if (title) {
				input.title = title;
			}
			input.id = TT.UTILITIES.generate_unique_id();
			label_element = document.createElement("label");
			label_element.innerHTML = label;
			label_element.htmlFor = input.id;
			container = document.createElement("div");
			container.appendChild(label_element);
			container.appendChild(input);
			$(input).button();
			$(label_element).button();
			return {container: container,
				    button: input};
		},
		
		create_radio_button: function (name, value, label, title) {
			var container = document.createElement("div");
			var input = document.createElement("input");
			input.type = "radio";
			input.className = "toontalk-radio-button";
			input.name = name;
			input.value = value;
			input.id = TT.UTILITIES.generate_unique_id();
			var label_element = document.createElement("label");
			label_element.innerHTML = label;
			label_element.htmlFor = input.id;
			container.appendChild(input);
			container.appendChild(label_element);
			if (title) {
				container.title = title;
			}
			$(input).button();
// 			$(container).button();
			return {container: container,
			        button: input,
					label: label_element};
		},
		
// 		get_radio_button_element: function (container) {
// 			return $(container).children(".toontalk-radio-button").get(0);
// 		},
		
// 		label_radio_button: function (button, label, title, label_class_name) {
// 			// consider merging this with create_radio_button
// 			var container = document.createElement("div");
// 			var label_element = document.createElement("label");
// 			if (!button.id) {
// 				button.id = TT.UTILITIES.generate_unique_id();
// 			}
// 			label_element.innerHTML = label;
// 			label_element.for = input.id;
// 			// still worth doing here?
// 			label_element.className += " " + label_class_name;
// 			container.appendChild(button);
// 			container.appendChild(label_element);
// 			if (title) {
// 				container.title = title;
// 			}
// 			$(container).button();
// 			return container;		
// 		},
		
// 		create_label: function (html) {
// 			var label_element = document.createElement("span");
// 			label_element.className = "toontalk-label";
// 			label_element.innerHTML = html;
// 			return label_element;
// 		},
		
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
