 /**
 * Implements ToonTalk's boxes
 * Authors: Ken Kahn
 * License: New BSD
 */

/*jslint browser: true, devel: true, vars: true */

window.TOONTALK.box = (function (TT) {
    "use strict";
    
    var TT = window.TOONTALK; // for convenience and more legible code
    var box = Object.create(TT.widget);

    box.create = function (size, horizontal, contents) {
        var new_box = Object.create(box);
        if (!contents) {
			contents = [];
        }
        new_box.get_size = function () {
            return size;
        };
        new_box.set_size = function (new_size, update_frontside) {
            size = new_size;
			contents.length = size;
			if (update_frontside) {
			    this.update_frontside();
			}
			if (TT.debugging) {
				this.debug_string = this.toString();
			}
            return this;
        };
        new_box.get_horizontal = function () {
            // since horizontal is a boolean should this be called is_horizontal?
            if (horizontal === undefined) {
                return true; // horizontal by default
            }
            return horizontal;
        };
        new_box.set_horizontal = function (new_horizontal, update_frontside) {
            horizontal = new_horizontal;
			if (update_frontside) {
			    this.update_frontside();
			}
            return this;
        };
        new_box.get_hole = function (index) {
            return contents[index];
        };
        new_box.set_hole = function (index, new_value, update_frontside) {
            contents[index] = new_value;
			if (update_frontside) {
                this.update_hole_display(index);
			}
			if (TT.debugging) {
				this.debug_string = this.toString();
			}
        };
        return new_box.add_sides_functionality(new_box);
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
        if (this.get_erased()) {
            copy.set_erased(this.get_erased());
        }
        return copy;
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
        if (size != other_box.get_size()) {
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
            return context.match_with_any_box();
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
        if (size != pattern_box.get_size()) {
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
                if (hole_match != 'matched') {
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

	box.get_JSON = function () {
		var super_prototype = this.__proto__.__proto__;
		var contents_JSON = [];
		var size = this.get_size();
		var i;
		for (i = 0; i < size; i += 1) {
			contents_JSON[i] = this.get_hole(i).get_JSON();
		}
		return super_prototype.get_JSON(
		   {type: "box",
		    contents: contents_JSON,
			horizontal: this.get_horizontal()
		   });
	};
	
	box.create_from_JSON = function (JSON) {
		return box.create(JSON.contents.length, JSON.horizontal, TT.UTILITIES.create_array_from_JSON(JSON.contents));
	};
    
    box.to_HTML = function () {
        var horizontal = this.get_horizontal();
        var extra_classes = (horizontal ? 'horizontal' : 'vertical');
        var html = "<table class='toontalk-box toontalk-box-" + extra_classes + "'>";
        var size = this.get_size();
        var i, hole;
        var percentage = size === 0 ? 1 : 100 / size;
        var horizontal_style = horizontal ? " style='width:" + percentage + "%;'" : "";
        var vertical_style =   horizontal ? "" : " style='height:" + percentage + "%;'";
        html += "<tr" + vertical_style + ">";
        for (i = 0; i < size; i += 1) {
            hole = this.get_hole(i);
            html += "<td class='toontalk-box-hole toontalk-box-hole-" + extra_classes + "'" + horizontal_style + ">";
		    html += "<div class='toontalk-hole-about-to-be-replaced'>";
            html += "</td>";
            if (!horizontal) {
                html += "</tr><tr" + vertical_style + ">";
            }
        }
        if (horizontal) {
            html += "</tr>";
        }
        html += "</table>";
        return html;
    };
	
	box.update_frontside = function() {
		if (!this.visible()) {
            return;
        }
        var frontside = this.get_frontside();
        var frontside_element = frontside.get_element();
        var new_HTML = this.to_HTML();
		var size = this.get_size();
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
		if (old_hole_element) {
			hole_frontside_element = hole_frontside.get_element();
		    old_hole_element.parentNode.replaceChild(hole_frontside_element, old_hole_element);
			TT.UTILITIES.set_position_absolute(hole_frontside_element, false);
			$(hole_frontside_element).addClass("toontalk-frontside-in-box");
		} else {
			old_hole_element = hole.get_frontside(true).get_element();
			box_frontside = this.get_frontside();
			$element_container = $(box_frontside.get_element()).find(".toontalk-box-hole").eq(index); 
			$element_container.append(old_hole_element);
			// since drag and drop is set up with absolute as the default
			TT.UTILITIES.set_position_absolute(old_hole_element, false);
			$(old_hole_element).addClass("toontalk-frontside-in-box");
		}
		hole_frontside.update_frontside();
	};
	
	box.empty_hole = function (index, update_frontside) {
		this.set_hole(index, TT.box_empty_hole.create(index, this), update_frontside);
	};
    
    box.dereference = function (path) {
        var index, hole;
        if (path) {
            index = path.get_index && path.get_index();
            if (typeof index === 'number') {
                hole = this.get_hole(index);
				if (hole) {
                    return hole.dereference(path.next);
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
			other.update_frontside();
		}
		this.remove();
		return true;
    };
	
	box.box_dropped_on_me = function (other, event) {
		console.log("box on box not yet implemented");
		return false;
	}
	
	box.removed = function (part) {
		var size = this.get_size();
		var i;
		var part_frontside = part.get_frontside();
		if (part_frontside) {
			$(part_frontside.get_element()).removeClass("toontalk-frontside-in-box");
		}
		for (i = 0; i < size; i += 1) {
// 			console.log("Part is " + part.toString() + " hole " + i + " is " + this.get_hole(i).toString()); for debugging
            if (part === this.get_hole(i)) {
				this.empty_hole(i);
				return this;
			}
		}
	};
    
    box.create_path = function (index) {
        return {
            get_index: function () {
                return index;
            },         
            toString: function () {
                return "Box hole " + index + (this.next ? "; " + next.toString() : "");
            }
        };
    };
	
	if (TT.debugging) {
		this.debug_string = this.toString();
	}
    
    return box;
}(window.TOONTALK));

window.TOONTALK.box_backside = 
(function (TT) {
    "use strict";
	
	var add_test_button = function(backside, robot_name) {
		var $test_button = $("<button></button>").button({label: "add " + robot_name});
		var test_button = $test_button.get(0);
// 		var test_button = TT.UTILITIES.create_button("add " + robot_name + " robot", "test", "just testing");
		$test_button.click(function () {
			if (test_button.robot) {
				test_button.robot.stop();
				test_button.robot = undefined;
				test_button.innerHTML = "resume " + robot_name;
				return;
			}
			var robot;
			switch (robot_name) {
				case "copy-first-hole-to-second-hole": 
				robot = TOONTALK.tests.copy_first_hole_to_second_hole_robot(); 
				break;
			}
			test_button.robot = robot;
			robot.run(backside.get_widget());
			test_button.innerHTML = "stop " + robot_name;
		});
		backside.get_element().appendChild($test_button.get(0));
	};
	
    return {
        create: function (box) {
	        var backside = TT.backside.create(this);
            var size_input = TT.UTILITIES.create_text_input(box.get_size().toString(), 'toontalk-box-size-input', "Type here to edit the number of holes.");
			var horizontal_radio_button = TT.UTILITIES.create_radio_button("box_orientation", "horizontal"); // might be nicer replaced by an icon
			var vertical_radio_button = TT.UTILITIES.create_radio_button("box_orientation", "vertical");
            var update_value = function () {
                box.set_size(parseInt(size_input.value.trim(), 10));
            };
			var update_orientation = function () {
				box.set_horizontal((TT.UTILITIES.selected_radio_button(horizontal_radio_button, vertical_radio_button).value === "horizontal"), true);
			};
            size_input.onchange = update_value;
			horizontal_radio_button.onchange = update_orientation;
			vertical_radio_button.onchange = update_orientation;
			// TO DO position the new elements
            backside_element.appendChild(size_input);
			backside_element.appendChild(TT.UTILITIES.create_horizontal_table(
			    TT.UTILITIES.label_radio_button(horizontal_radio_button, "Left to right", "Show box horizontally", "toontalk-box-orientation-choice"),
				TT.UTILITIES.label_radio_button(vertical_radio_button, "Top to bottom", "Show box vertically", "toontalk-box-orientation-choice")));
			if (box.get_horizontal()) {
				horizontal_radio_button.checked = true;
			} else {
				vertical_radio_button.checked = true;
			}
			add_test_button(backside, "copy-first-hole-to-second-hole"); // for testing
            return backside;
        },		
		update_frontside: function () {
			var size_input = TT.UTILITIES.get_first_child_with_class(this.get_element(), "toontalk-box-size-input");
			var box = this.get_widget();
			size_input.value = box.get_size().toString();
		},

    };
}(window.TOONTALK));

window.TOONTALK.box_empty_hole = 
(function () {
    "use strict";
	return {
	    create: function (index, box) {
			var empty_hole = Object.create(this);
			var hole_element = document.createElement("div");
			hole_element.className = "toontalk-empty-hole toontalk-frontside toontalk-side";
			empty_hole.get_frontside = function () {
				return hole_element;
			};
			empty_hole.update_frontside = function () {
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
				box.update_frontside();
			};
			empty_hole.get_JSON = function () {
				// no need to put anything into the array
				return undefined;
			}
			$(hole_element).on('drop',
                function (event) {
					var $dropped = $(".toontalk-being-dragged");
					var dropped;
					if ($dropped.length >= 1) {
						dropped = $dropped.data("owner");
						box.set_hole(index, dropped, true);
						box.update_frontside();
						event.stopPropagation();
					}
				});
			$(hole_element).data("owner", empty_hole);
	        return empty_hole;
	    },
		toString: function () {
			return "_";
		},
	};
	
}());