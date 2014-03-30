 /**
 * Implements ToonTalk's JavaScript functions shared between files
 * Authors: Ken Kahn
 * License: New BSD
 */
 
/*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */

// jQuery.event.props.push('dataTransfer'); // some posts claim this needed -- unsure...

window.TOONTALK.UTILITIES = 
(function (TT) {
    "use strict";
	var dragee;
	var json_creators = {"box": TT.box.create_from_json,
	                     "number": TT.number.create_from_json,
						 "robot": TT.robot.create_from_json,
						 "body": TT.actions.create_from_json,
						 "pick_up_constant_action": TT.pick_up_constant.create_from_json,
						 "pick_up_action": TT.pick_up.create_from_json,
						 "drop_on_action": TT.drop_on.create_from_json,
						 "copy_constant_action": TT.copy_constant.create_from_json,
						 "copy_action": TT.copy.create_from_json,
						 "pick_up_copy_action": TT.pick_up_copy.create_from_json,
						 "box_path": TT.box.path.create_from_json,
						 "path.to_entire_context": TT.path.to_entire_context.create_from_json};
	// id needs to be unique across ToonTalks due to drag and drop
	var id_counter = new Date().getTime();
    return {
		create_from_json: function (json) {
			var widget, frontside_element, backside_widgets;
			if (!json) {
				// was undefined and still is
				return;
			}
			if (json_creators[json.type]) {
				widget = json_creators[json.type](json);
			} else {
				console.log("json type " + json.type + " not yet supported.");
				return;
			}
			if (widget) {
				if (json.erased) {
					widget.set_erased(json.erased);
				}
				if (json.width) {
					frontside_element = widget.get_frontside_element();
					$(frontside_element).css({width: json.width,
					                          height: json.height});
				}
				if (json.backside_widgets) {
					widget.set_backside_widgets(this.create_array_from_json(json.backside_widgets));
				}
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
		
		copy_widgets: function (widgets) {
			var widgets_copy = [];
			var i;
			for (i = 0; i < widgets.length; i++) {
				widgets_copy[i] = widgets[i].copy();
			}
			return widgets_copy;
		},
		
		copy_array: function (array) {
			var copy = [];
			var i;
			for (i = 0; i < array.length; i++) {
				copy[i] = array[i];
			}
			return copy;
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
		
		data_transfer_json_object: function (event) {
			var json;
			if (!event.originalEvent.dataTransfer) {
				console.log("no dataTransfer in drop event");
				return;
		    }
			json = event.originalEvent.dataTransfer.getData("text");
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
			$element.attr("draggable", true);
			// draggable causes dataTransfer to be null
			// rewrote after noticing that this works fine: http://jsfiddle.net/KWut6/
 			$element.on('dragstart', 
			    function (event) {
					var position = $element.get(0).getBoundingClientRect(); // $element.position();
					var unique_id = TT.UTILITIES.generate_unique_id();
					var widget = $element.data("owner");
					var json_object;
// 					if ($element.is(".toontalk-frontside-in-box")) {
// 						// but not stopping propagation so can drag widget in the hole
// 						return;
// 					}
					dragee = $element;
					$element.css({position: "absolute"});
					if ($element.is(".toontalk-frontside")) {
						// save the current dimension so size doesn't change while being dragged
						$element.css({width:  this.offsetWidth + "px",
									  height: this.offsetHeight + "px"});
					}
					$element.attr("id", unique_id);
					if (event.originalEvent.dataTransfer && widget.get_json) {
						event.originalEvent.dataTransfer.effectAllowed = 'move';
						json_object = widget.get_json();
						json_object.id_of_original_dragree = unique_id;
						json_object.drag_x_offset = event.originalEvent.clientX - position.left;
						json_object.drag_y_offset = event.originalEvent.clientY - position.top;
						if (!json_object.width) {
							if ($element.parent().is(".toontalk-backside")) {
								json_object.original_width_fraction = $element.outerWidth() / $element.parent().outerWidth();
								json_object.original_height_fraction = $element.outerHeight() / $element.parent().outerHeight();
							} else {
								// following should be kept in synch with toontalk-frontside-on-backside CSS
								json_object.original_width_fraction = 0.2;
								json_object.original_height_fraction = 0.1;
							}
						}
						$element.data("json", json_object);
						// following was text/plain but that caused an error in IE9
						event.originalEvent.dataTransfer.setData("text", JSON.stringify(json_object));
						widget.drag_started(json_object, $element.is(".toontalk-top-level-resource"));
					}
					event.stopPropagation();
				});
			$element.on('dragend', 
			    function (event) {
					if ($element.is(".toontalk-frontside")) {
						if ($element.parent().is(".toontalk-backside")) {
							// restore ordinary size styles
							var json_object = $element.data("json");
							if (json_object) {
								$element.data("json", ""); // no point wasting memory on this anymore
								$element.css({width:  json_object.width || json_object.original_width_fraction * 100 + "%",
											  height: json_object.height || json_object.original_height_fraction * 100 + "%"});
							}
						} else {
							$element.css({width:  "100%",
									      height: "100%"});
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
					var $source, source, $target, target, target_position, drag_x_offset, drag_y_offset;
					var json_object = TT.UTILITIES.data_transfer_json_object(event);
					var $container, container;
                    $source = dragee || (json_object && $("#" + json_object.id_of_original_dragree));
					if (!$source && !json_object) {
						if (!event.originalEvent.dataTransfer) {
							console.log("Drop failed since there is no event.originalEvent.dataTransfer");
						} else {
							console.log("Drop failed since unable to parse " + event.originalEvent.dataTransfer);
						}
						return;
					}
					$target = $(event.target).closest(".toontalk-side");
					target = $target.data("owner");
					if ($source && $source.length > 0) {
						if ($source.get(0) === $target.get(0)) {
							// just moved it a little bit
							return;
						}
						source = $source.data("owner");
						$container = $source.parents(".toontalk-side:first");
						container = $container.data("owner");
						if (container) {
							container.removed(source, $source, event);
						} else {
							TT.UTILITIES.restore_resource($source, source);
						}
					} else {
						source = TT.UTILITIES.create_from_json(json_object);
						$source = $(source.get_frontside_element());
					}
					if ($target.is(".toontalk-backside")) {
						target_position = TT.UTILITIES.absolute_position($target);
						if (json_object) {
							drag_x_offset = json_object.drag_x_offset;
						    drag_y_offset = json_object.drag_y_offset;
						} else {
							drag_x_offset = 0;
							drag_y_offset = 0;
						}
						target.get_backside().widget_dropped_on_me(source, event);
						// should the following use pageX instead?
						$source.css({left: event.originalEvent.clientX - (target_position.left + drag_x_offset),
							          top: event.originalEvent.clientY - (target_position.top + drag_y_offset)});
						if ($source.is(".toontalk-frontside") && !$source.is('.ui-resizable')) {
// 							$source.css({resize: "both"}); // didn't work
							$source.resizable(
								{resize: function(event, ui) {
									source.update_display();			
								 },
								 // the corner handles caused the element to be stuck in resize mode when used
								 handles: "n,e,s,w"});
						    // when dropped on a backside will be enabled
// 							$source.resizable("disable");
                        }
						event.stopPropagation();
					} else if (!target) {
						console.log("target element has no 'owner'");
					} else if (source.drop_on(target, $target, event)) {
						event.stopPropagation();
					}
					if (target) {
						if (target.widget_dropped_on_me) {
							target.widget_dropped_on_me();
						}
					}
					event.preventDefault();
					dragee = undefined;
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
		
		absolute_position: function ($element) {
			var element_position;
			var absolute_position = {left: 0, top: 0};
			while ($element.parent().length > 0) {
				element_position = $element.position();
				absolute_position.left += element_position.left;
				absolute_position.top += element_position.top;
				$element = $element.parent();
			}
			return absolute_position;
		},
		
		restore_resource: function ($dropped, dropped_widget) {
			var dropped_copy, dropped_element_copy;
			if ($dropped.is(".toontalk-top-level-resource")) {
				// restore original
				dropped_copy = dropped_widget.copy();
				dropped_element_copy = dropped_copy.get_frontside_element();
				$dropped.removeClass("toontalk-top-level-resource");
				$(dropped_element_copy).addClass("toontalk-top-level-resource");
				$dropped.parent().append(dropped_element_copy);
				dropped_copy.update_display();
			}
		},
		
// 		recursively_change_dimensions_to_percentages: function ($element) {
// 			var parent_width = $element.width();
// 			var parent_height = $element.height();
// 			$element.children().each(function (index, child) {
// 				if (!$(child).is(".ui-resizable-handle")) {
// 					var child_width = $(child).width();
// 					var child_height = $(child).height();
// 					var width_percentage = Math.min(100, (100 * child_width / parent_width)) + "%";
// 					var height_percentage = Math.min(100, (100 * child_height / parent_height)) + "%";
// 					$(child).css({width: width_percentage,
// 								  height: height_percentage});
// 					TT.UTILITIES.recursively_change_dimensions_to_percentages($(child));
// 				}
// 			});
// 		},
		
		set_position_absolute: function (element, absolute, event) {
			var position, left, top, ancestor;
			if (event) {
				// either DOM or JQuery event
				if (event.originalEvent) {
					event = event.originalEvent;
				}
			}
			if (absolute) {
				if (element.style.position === "absolute") {					
					if (!event || (event.pageX === event.clientX && event.pageY === event.clientY)) {
						// is already absolute and no need to adjust for scrolling
						return;
					}
				}
				if (event) {
					left = event.pageX;
			        top = event.pageY;
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
//				element.style.position = "absolute";
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
		
		cursor_of_image: function (url) {
			var extensionStart = url.lastIndexOf('.');
			if (extensionStart >= 0) {
				return url.substring(0, extensionStart) + ".32x32" + url.substring(extensionStart);
			}
			return url;
		},
		
		check_radio_button: function (button_elements) {
			$(button_elements.button).prop("checked", true);
			$(button_elements.label).addClass('ui-state-active');
		},
		
		create_button_set: function () { 
			// takes any number of parameters, any of which can be an array of buttons
			var container = document.createElement("div");
			var i, j;
			for (i = 0; i < arguments.length; i++) {
				if (arguments[i].length >= 0) {
					for (j = 0; j < arguments[i].length; j++) {
						container.appendChild(arguments[i][j]);
					}
				} else { 
					container.appendChild(arguments[i]);
				}
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
			container = TT.UTILITIES.create_horizontal_table(label_element, input);
			$(input).button().addClass("toontalk-text-input");
			$(input).css({"background-color": "white"});
            $(label_element).addClass("ui-widget");
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
		
		create_horizontal_table: function () { // takes any number of parameters
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
		
		create_vertical_table: function () { // takes any number of parameters
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
	
    };
	
}(window.TOONTALK));
