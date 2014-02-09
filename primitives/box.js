 /**
 * Implements ToonTalk's boxes
 * Authors: Ken Kahn
 * License: New BSD
 */

/*jslint browser: true, devel: true, vars: true */

window.TOONTALK.box = (function () {
    "use strict";
    
    var TT = window.TOONTALK; // for convenience and more legible code
    var box = Object.create(TT.widget);

    box.create = function (size, horizontal) {
        var new_box = Object.create(box);
        var contents = [];
        new_box.get_size = function () {
            return size;
        };
        new_box.set_size = function (new_size) {
            size = new_size;
			contents.length = size;
			this.update_display();
            return this;
        };
        new_box.get_horizontal = function () {
            // since horizontal is a boolean should this be called is_horizontal?
            if (horizontal === undefined) {
                return true; // horizontal by default
            }
            return horizontal;
        };
        new_box.set_horizontal = function (new_horizontal) {
            horizontal = new_horizontal;
			this.update_display();
            return this;
        };
        new_box.get_hole = function (n) {
            return contents[n];
        };
        new_box.set_hole = function (n, new_value) {
            contents[n] = new_value;
			// following re-computes the whole thing -- could be more clever
			this.update_display();
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
        if (this.erased) {
            copy.erased = this.erased;
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
        if (this.erased) {
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
            contents += hole ? hole.toString() : '_';
            if (i < size - 1) {
                contents += " | ";
            }
        }
        return '[' + contents + ']';
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
            if (hole) {
				html += "<div class='toontalk-hole-about-to-be-replaced'>";
            } else {
				html += "<div class=='toontalk-empty-hole'>";
			}
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
	
	box.update_display = function() {
        var frontside = this.get_frontside();
        if (!frontside) {
            return;
        }
        var frontside_element = frontside.get_element();
        var new_HTML = this.to_HTML();
		var size = this.get_size();
		var i, box_element, hole_element, hole_frontside, hole, hole_elements;
        if (!frontside_element.firstChild) {
			box_element = document.createElement('div');
            frontside_element.appendChild(box_element);
        }
		box_element = frontside_element;
        frontside_element.firstChild.innerHTML = new_HTML;
		hole_elements = box_element.getElementsByClassName("toontalk-hole-about-to-be-replaced");
		if (hole_elements.length > 0) {
		   for (i = 0; i < size; i += 1) {
                hole = this.get_hole(i);
			    if (hole) {
			    	hole_element = hole_elements[0]; // list is shrunk by the following
					hole_frontside = hole.get_frontside(true);
					hole_frontside.update_display();
				    hole_element.parentNode.replaceChild(hole_frontside.get_element(), hole_element);
			    }
		    }
		}
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
    
    return box;
}());

window.TOONTALK.box_backside = 
(function () {
    "use strict";
	
	var add_test_button = function(backside, robot_name) {
		var test_button = window.TOONTALK.UTILITIES.create_button("add " + robot_name + " robot", "test", "just testing");
		test_button.onclick = function () {
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
		};
		backside.get_element().appendChild(test_button );
	};
	
    return {
        create: function (box) {
			var backside_element = document.createElement("div");
			backside_element.className = "toontalk-backside";
	        var backside = Object.create(this);
            var size_input = window.TOONTALK.UTILITIES.create_text_input(box.get_size().toString(), 'toontalk-box-size-input', "Type here to edit the number of holes.");
            var update_value = function () {
                box.set_size(parseInt(size_input.value.trim(), 10));
            };
			backside.get_element = function () {
                return backside_element;
            };
            backside.get_widget = function () {
                return box;
            };
            size_input.onchange = update_value;
			// TO DO position the new elements
            backside_element.appendChild(size_input);
			add_test_button(backside, "copy-first-hole-to-second-hole");
            return backside;
        },
		
		update_display: function () {
			var size_input = window.TOONTALK.UTILITIES.get_first_child_with_class(this.get_element(), "toontalk-box-size-input");
			var box = this.get_widget();
			size_input.value = box.get_size().toString();
		},

    };
}());