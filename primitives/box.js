 /**
 * Implements ToonTalk's boxes
 * Authors: Ken Kahn
 * License: New BSD
 */

/*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */

window.TOONTALK.box = (function (TT) {
    "use strict";

    var box = Object.create(TT.widget);

    box.create = function (size, horizontal, contents) {
        var new_box = Object.create(box);
        if (!contents) {
			contents = [];
        }
		if (!horizontal) {
			horizontal = true;
		}
        new_box.get_size = function () {
            return size;
        };
        new_box.set_size = function (new_size, update_display) {
            size = new_size;
			contents.length = size;
			if (update_display) {
			    this.update_display();
			}
			if (TT.debugging) {
				this.debug_string = this.toString();
			}
            return this;
        };
        new_box.get_horizontal = function () {
            return horizontal;
        };
        new_box.set_horizontal = function (new_horizontal, update_display) {
            horizontal = new_horizontal;
			if (update_display) {
			    this.update_display();
			}
            return this;
        };
        new_box.get_hole = function (index) {
            return contents[index];
        };
        new_box.set_hole = function (index, new_value, update_display) {
            contents[index] = new_value;
			if (update_display) {
                this.update_hole_display(index);
			}
			if (TT.debugging) {
				this.debug_string = this.toString();
			}
        };
        new_box = new_box.add_sides_functionality(new_box);
		new_box = new_box.erasable(new_box);
        return new_box;
    };
    
    box.copy = function () {
        var copy = box.create(this.get_size(), this.get_horizontal());
        var size = this.get_size();
        var i, hole;
        for (i = 0; i < size; i += 1) {
            hole = this.get_hole(i);
            if (hole) {
                copy.set_hole(i, hole.copy());
            }
        }
        return this.add_to_copy(copy);
    };
    
    box.create_backside = function () {
		return TT.box_backside.create(this);
	};
    
    box.equals = function (other) {
        return other.equals_box(this);
    };
    
    box.equals_box = function (other_box) {
        // what should this do if either or both are erased?
        var size = this.get_size();
        var i, my_hole, pattern_hole;
        if (size !== other_box.get_size()) {
            return false;
        }
        for (i = 0; i < size; i += 1) {
            my_hole = this.get_hole(i);
            pattern_hole = other_box.get_hole(i);
            if ((!my_hole && pattern_hole) || (my_hole && !pattern_hole)) {
                return false;
            }
            if (my_hole && pattern_hole && !my_hole.equals(pattern_hole)) {
                return false;
            }
        }
        return true;
    };
    
    box.match = function (context) {
        if (this.get_erased()) {
			if (context.match_with_any_box) {
   	            return context.match_with_any_box();
			}
			return 'not matched';
        }
        return context.match_with_this_box(this);
    };
    
    box.match_with_any_box = function () {
        return 'matched';
    };

    box.match_with_this_box = function (pattern_box) {
        var size = this.get_size();
        var waiting_nests = [];
        var i, my_hole, pattern_hole, hole_match;
        if (size !== pattern_box.get_size()) {
            return 'not matched';
        }
        for (i = 0; i < size; i += 1) {
            pattern_hole = pattern_box.get_hole(i);
            if (pattern_hole) {
                my_hole = this.get_hole(i);
                if (!my_hole) {
                    // expected something -- not an empty hole
                    return 'not matched';
                }
                hole_match = pattern_hole.match(my_hole);
                if (hole_match === 'not matched') {
                    return 'not matched';
                }
                if (hole_match !== 'matched') {
                    if (waiting_nests.length === 0) {
                        waiting_nests = hole_match;
                    } else {
                        waiting_nests = waiting_nests.concat(hole_match);
                    }
                }
            }
        }
        if (waiting_nests.length > 0) {
            return waiting_nests;
        }
        return 'matched';
    };
    
    box.toString = function () {
        var contents = "";
        var size = this.get_size();
        var i, hole;
        for (i = 0; i < size; i += 1) {
            hole = this.get_hole(i);
			if (hole) {
                contents += hole.toString();
			} else {
				contents += "_";
			}
            if (i < size - 1) {
                contents += " | ";
            }
        }
        return '[' + contents + ']';
    };

	box.get_json = function () {
// 		var super_prototype = Object.getPrototypeOf(Object.getPrototypeOf(this));
		var contents_json = [];
		var size = this.get_size();
		var i;
		for (i = 0; i < size; i += 1) {
			if (this.get_hole(i)) {
				contents_json[i] = this.get_hole(i).get_json();
			}
		}
		return this.add_to_json(
		   {type: "box",
		    contents: contents_json,
			horizontal: this.get_horizontal()
		   });
	};
	
	box.create_from_json = function (json) {
		return box.create(json.contents.length, json.horizontal, TT.UTILITIES.create_array_from_json(json.contents));
	};
    
    box.to_HTML = function () {
        var horizontal = this.get_horizontal();
        var extra_classes = (horizontal ? 'horizontal' : 'vertical');
        var html = "<table class='toontalk-box toontalk-box-" + extra_classes + "'>";
        var size = this.get_size();
        var i;
        var percentage = size === 0 ? 1 : 100 / size;
        var horizontal_style = horizontal ? " style='width:" + percentage + "%;'" : "";
        var vertical_style =   horizontal ? "" : " style='height:" + percentage + "%;'";
        html += "<tr" + vertical_style + ">";
        for (i = 0; i < size; i += 1) {
            html += "<td class='toontalk-box-hole toontalk-box-hole-" + extra_classes + "'" + horizontal_style + ">";
		    html += "<div class='toontalk-hole-about-to-be-replaced' />";
            html += "</td>";
            if (!horizontal) {
                html += "</tr>";
				if (i+1 < size) {
					html += "<tr" + vertical_style + ">";
				}
            }
        }
        if (horizontal) {
            html += "</tr>";
        }
        html += "</table>";
        return html;
    };
	
	box.update_display = function() {
		if (!this.visible()) {
            return;
        }
        var frontside = this.get_frontside();
        var frontside_element = frontside.get_element();
        var new_HTML = this.to_HTML();
		var that = this;
        if (!frontside_element.firstChild) {
            frontside_element.appendChild(document.createElement('div'));
        }
        frontside_element.firstChild.innerHTML = new_HTML;
		$(frontside_element.firstChild).addClass("toontalk-widget");
		$(".toontalk-hole-about-to-be-replaced").each(function (index, element) {
			// can't just use box.update_hole_display because then 'this' isn't bound to the box
			that.update_hole_display(index, element);
		});
    };
	
	box.update_hole_display = function (index, old_hole_element) {
        if (!this.visible()) {
            return;
        }
	    var hole = this.get_hole(index);
		var hole_frontside, hole_frontside_element, box_frontside, $element_container;
		if (!hole) {
			hole = TT.box_empty_hole.create(index, this);
			this.set_hole(index, hole);
		}
		hole_frontside = hole.get_frontside(true);
		if (old_hole_element && old_hole_element.parentNode) {
			hole_frontside_element = hole_frontside.get_element();
		    old_hole_element.parentNode.replaceChild(hole_frontside_element, old_hole_element);
			TT.UTILITIES.set_position_absolute(hole_frontside_element, false);
			$(hole_frontside_element).addClass("toontalk-frontside-in-box");
		} else {
			old_hole_element = hole.get_frontside(true).get_element();
			box_frontside = this.get_frontside();
			$element_container = $(box_frontside.get_element()).find(".toontalk-box-hole").eq(index); 
			$element_container.append(old_hole_element);
// 			$(old_hole_element).css({width:  "",
// 			                         height: ""});
			// since drag and drop is set up with absolute as the default
			TT.UTILITIES.set_position_absolute(old_hole_element, false);
			$(old_hole_element).addClass("toontalk-frontside-in-box");
		}
		hole_frontside.update_display();
	};
	
	box.empty_hole = function (index, update_display) {
		this.set_hole(index, TT.box_empty_hole.create(index, this), update_display);
	};
    
    box.dereference = function (path) {
        var index, hole;
        if (path) {
            index = path.get_index && path.get_index();
            if (typeof index === 'number') {
                hole = this.get_hole(index);
				if (hole) {
					if (path.next) {
                    	return hole.dereference(path.next);
					}
					return hole;
				}
            }
            console.log("box " + this.toString() + " unable to dereference path " + path.toString());
        } else {
            return this;
        }
    };
	
	box.drop_on = function (other, side_of_other, event) {
        if (!other.box_dropped_on_me) {
			if (other.widget_dropped_on_me) {
				return other.widget_dropped_on_me(this, event);
			}
            console.log("No handler for drop of " + this.toString() + " on " + other.toString());
			return;
		}
        var result = other.box_dropped_on_me(this, event);
		if (event) {
			other.update_display();
		}
		this.remove();
		return result;
    };
	
	box.box_dropped_on_me = function (other, event) {
		console.log("box on box not yet implemented");
		return false;
	};
	
	box.removed = function (part, element, event) {
		var size = this.get_size();
		var i;
		var part_frontside = part.get_frontside();
		var update_display = !!event;
		if (part_frontside) {
			$(part_frontside.get_element()).removeClass("toontalk-frontside-in-box");
		}
		for (i = 0; i < size; i += 1) {
// 			console.log("Part is " + part.toString() + " hole " + i + " is " + this.get_hole(i).toString()); for debugging
            if (part === this.get_hole(i)) {
				this.empty_hole(i, update_display);
				return this;
			}
		}
	};
    
    box.path = {
		create: function (index) {
			return {
				get_index: function () {
					return index;
				},         
				toString: function () {
					return "box hole " + index + (this.next ? "; " + this.next.toString() : "");
				},
				get_json: function () {
					return {type: "box_path",
							index: index,
							next: this.next && this.next.get_json()};
				}
			};
    	},
	
	    create_from_json: function (json) {
			var path = box.path.create(json.index);
			if (json.next) {
				path.next = TT.UTILITIES.create_from_json(json.next);
			}
			return path;
		}
    };
	
	if (TT.debugging) {
		box.debug_string = this.toString();
	}
    
    return box;
}(window.TOONTALK));

window.TOONTALK.box_backside = 
(function (TT) {
    "use strict";
	
    return {
        create: function (box) {
	        var backside = TT.backside.create(this);
            var size_input = TT.UTILITIES.create_text_input(box.get_size().toString(), 'toontalk-box-size-input', "Number of holes", "Type here to edit the number of holes.");
			var horizontal = TT.UTILITIES.create_radio_button("box_orientation", "horizontal", "Left to right", "Show box horizontally."); // might be nicer replaced by an icon
			var vertical = TT.UTILITIES.create_radio_button("box_orientation", "vertical", "Top to bottom", "Show box vertically.");
            var update_value = function () {
                box.set_size(parseInt(size_input.button.value.trim(), 10), true);
            };
			var update_orientation = function () {
				box.set_horizontal((TT.UTILITIES.selected_radio_button(horizontal.button, vertical.button).value === "horizontal"), true);
			};
			var backside_element = backside.get_element();
			var standard_buttons = TT.backside.create_standard_buttons(backside, box);
            size_input.button.onchange = update_value;
			horizontal.button.onchange = update_orientation;
			vertical.button.onchange = update_orientation;
            backside_element.appendChild(size_input.container);
			backside_element.appendChild($(TT.UTILITIES.create_horizontal_table(horizontal.container, vertical.container)).buttonset().get(0));
			if (box.get_horizontal()) {
				TT.UTILITIES.check_radio_button(horizontal);
			} else {
				TT.UTILITIES.check_radio_button(vertical.button);
			}
            backside_element.appendChild(standard_buttons);
            return backside;
        },		
		update_display: function () {
			var size_input = TT.UTILITIES.get_first_child_with_class(this.get_element(), "toontalk-box-size-input");
			var box = this.get_widget();
			size_input.value = box.get_size().toString();
		}

    };
}(window.TOONTALK));

window.TOONTALK.box_empty_hole = 
(function (TT) {
    "use strict";
	return {
	    create: function (index, box) {
			var empty_hole = Object.create(this);
			var hole_element = document.createElement("div");
			hole_element.className = "toontalk-empty-hole toontalk-frontside toontalk-side";
			empty_hole.get_frontside = function () {
				return hole_element;
			};
			empty_hole.update_display = function () {
				// nothing to do
			};
			empty_hole.get_frontside = function () {
				// doubles as its own frontside
				return this;
			};
			empty_hole.get_element = function () {
				// doubles as its own frontside
				return hole_element;
			};
			empty_hole.widget_dropped_on_me = function (dropped) {
				box.set_hole(index, dropped, true);
				box.update_display();
			};
			empty_hole.get_json = function () {
				// no need to put anything into the array
				return null;
			};
			empty_hole.copy = function () {
				return TT.box_empty_hole.create(index, box);
			};
			$(hole_element).on('drop',
                function (event) {
					var json_object = TT.UTILITIES.data_transfer_json_object(event);
                    var $dropped = $("#" + json_object.id_of_original_dragree);
					var dropped_widget;
					if ($dropped.length >= 1) {
						event.stopPropagation();
						if ($(hole_element).parents("#" + json_object.id_of_original_dragree).length > 0) {
							// dropped on itself
							return;
						}
						dropped_widget = $dropped.data("owner");
						TT.UTILITIES.restore_resource($dropped, dropped_widget);
						if ($dropped.is(".ui-resizable")) {
							$dropped.resizable("disable");
							// don't want it to look disabled just because you can't resize it
							$dropped.removeClass('ui-state-disabled');
						}
						box.set_hole(index, dropped_widget);
						box.update_display();
					}
				});
			$(hole_element).data("owner", empty_hole);
	        return empty_hole;
	    },
		toString: function () {
			return "_";
		}
	};
	
}(window.TOONTALK));