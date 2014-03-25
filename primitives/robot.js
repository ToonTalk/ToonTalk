 /**
 * Implements ToonTalk's robots
 * box.Authors = Ken Kahn
 * License: New BSD
 */
 
 /*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */

window.TOONTALK.robot = (function (TT) {
    "use strict";
    var robot = Object.create(TT.widget);
    
    robot.create = function (image_url, bubble, body, description, width, height, thing_in_hand) {
        // bubble holds the conditions that need to be matched to run
        // body holds the actions the robot does when it runs
        var new_robot = Object.create(this);
        if (!image_url) {
            image_url = "images/rb00.png";
        }
		if (!body) {
			body = TT.actions.create();
		}
		if (!width) {
			// probably should be based upon toontalk-top-level-resource's width
			width = 100;
		}
		if (!height) {
			height = 100;
		}
        new_robot.get_bubble = function () {
            return bubble;
        };
		new_robot.set_bubble = function (new_value) {
			bubble = new_value;
		};
        new_robot.get_body = function () {
            return body;
        };
        new_robot.get_image_url = function () {
            return image_url;
        };
        new_robot.set_image_url = function (new_value, update_display) {
            image_url = new_value;
			if (update_display) {
				this.update_display();
			}
        };
		// should the following use 'width' from the frontside element?
		new_robot.get_width = function () {
			return width;
		};
		new_robot.set_width = function (new_value) {
			width = new_value;
		};
		new_robot.get_height = function () {
			return height;
		};
		new_robot.set_height = function (new_value) {
			height = new_value;
		};
		new_robot.get_description = function () {
			if (!description) {
				return new_robot.toString();
			}
			return description;
		};
		new_robot.set_description = function (new_value, update_display) {
			description = new_value;
			if (update_display) {
				this.update_display();
			}
		};
		new_robot.get_thing_in_hand = function () {
			return thing_in_hand;
		};
		new_robot.set_thing_in_hand = function (new_value) {
			thing_in_hand = new_value;
		};
        body.set_robot(new_robot);
		if (TT.debugging) {
			new_robot.debug_string = new_robot.toString();
		}
		new_robot = robot.add_sides_functionality(new_robot);
		new_robot = robot.erasable(new_robot);
        return new_robot;
    };
    
    robot.create_backside = function () {
		return TT.robot_backside.create(this);
	};
    
    robot.copy = function (just_value) {
		var bubble = this.get_bubble();
		var bubble_copy = bubble ? bubble.copy() : undefined;
		var copy = this.create(this.get_image_url(), bubble_copy, this.get_body().copy(), this.get_description(), this.get_width(), this.get_height());
		if (just_value) {
			return copy;
		}
        return this.add_to_copy(copy);
    };
    
    robot.run = function (context, queue) {
        var match_status, i;
        if (this.stopped) {
            return 'not matched';
        }
        match_status = this.get_bubble().match(context);
        switch (match_status) {
        case 'matched':
            if (!queue) {
                queue = TT.QUEUE;
            }
            queue.enqueue({robot: this, context: context, queue: queue});
            return match_status;
        case 'not matched':
            // replace next_robot with get_next_robot()
            if (this.next_robot) {
                return this.next_robot.run(context, queue);
            }
            return match_status;
        default:
            for (i = 0; i < match_status.length; i += 1) {
                match_status[i].run_when_non_empty(this);
            }
            return match_status;                    
        }
    };
    
    robot.set_stopped = function (new_value) {
        this.stopped = new_value;
    };
    
    robot.run_actions = function(context, queue) {
        return this.get_body().run(context, queue);
    };
	
	robot.picked_up = function (widget, json, is_resource) {
		// note widget may be inside of something like a box
		// widget is a resource then is like copy_constant...
		var path, step;
		var body = this.get_body();
		if (is_resource) {
			step = TT.copy_constant.create(widget);
		} else {
			// abstract the following
			path = body.get_path_to(widget);
			// if !path try other things
			if (path) {
				step = TT.pick_up(path);
			}
		}
		this.set_thing_in_hand(widget);
		if (step) {
			body.add_step(step);
		}
	};
	
	robot.dropped_on = function (target_widget) {
		var path, step;
		var context = this.get_context();
		if (context === target_widget) {
			step = TT.drop_on.create(TT.path_to_entire_context);
		} else {
			// to do
		}
		this.set_thing_in_hand(null);
		if (step) {
			this.get_body().add_step(step);
		}
	};
	
	robot.copied = function (widget, widget_copy) {
		var path, step;
		if (widget === this.get_context()) {
			path = TT.path_to_entire_context;
		} else {
			// to do
		}
		if (path) {
			step = TT.copy.create(path);
			this.get_body().add_step(step);
		}
	}
	
	robot.get_context = function () {
		var frontside_element = this.get_frontside_element();
		var $parent_element = $(frontside_element).parent();
		return $parent_element.data("owner");
	};
	
	robot.training_started = function () {
		this.set_bubble(this.get_context());
		$("div").css({cursor: 'url(' + TT.UTILITIES.cursor_of_image(this.get_image_url()) + '), default'});
	};
	
	robot.training_finished = function () {
		$("div").css({cursor: ''});
	};
	
	robot.update_display = function() {
		// perhaps this should be moved to widget and number and box updated to differ in the to_HTML part
        var frontside = this.get_frontside();
		var description = this.get_description();
		var bubble = this.get_bubble();
		var new_first_child, robot_image, thought_bubble, frontside_element, bubble_contents_element, resource_becoming_instance;
        if (!frontside) {
            return;
        }
        frontside_element = frontside.get_element();
        robot_image = this.image();
		if ($(frontside_element).parent(".toontalk-top-level-resource").length > 0 || !bubble) {
			new_first_child = robot_image;
		} else {
			thought_bubble = this.thought_bubble_div();
			new_first_child = document.createElement("div");
			$(new_first_child).css({position: "absolute"});
			new_first_child.appendChild(thought_bubble);
			$(robot_image).css({top: "30%"});
			new_first_child.appendChild(robot_image);
			bubble_contents_element = bubble.get_frontside_element();
			$(bubble_contents_element).addClass("toontalk-thought-bubble-contents");
			thought_bubble.appendChild(bubble_contents_element);
			resource_becoming_instance = frontside_element.firstChild && $(frontside_element.firstChild).is(".toontalk-robot-image");
		}
        while (frontside_element.firstChild) {
            frontside_element.removeChild(frontside_element.firstChild);
        }
		frontside_element.title = description ? "This robot " + description : "This is a " + this.toString();
		$(frontside_element).addClass("toontalk-robot");
		$(new_first_child).addClass("toontalk-widget");
		frontside_element.style.width = this.get_width();
		frontside_element.style.height = this.get_height();
		// following interfered with resizable
// 		$(frontside_element).css({width: this.get_width(),
// 		                          height: this.get_height()});
		frontside_element.appendChild(new_first_child);
		setTimeout( // wait for layout to settle down
			function () {
				if (bubble_contents_element) {
					bubble.update_display();
				}
				if (resource_becoming_instance) {
					// need to adjust for thought bubble
					frontside_element.style.top = ($(frontside_element).position().top - $(robot_image).height()) + "px";
				}
			},
			1);
    };
	
	robot.image = function () {
		var image = document.createElement("img");
		image.src = this.get_image_url();
		image.style.width = "100%";
		image.style.height = "70%"; // other part is for thought bubble
		$(image).addClass("toontalk-robot-image");
		return image;	
	};
	
	robot.thought_bubble_div = function () {
		var thought_bubble = document.createElement("div");
		$(thought_bubble).addClass("toontalk-thought-bubble");
		return thought_bubble;
	};
	
	robot.toString = function () {
		var bubble = this.get_bubble();
		var body = this.get_body();
		var bubble_erased;
		if (!bubble || !body || body.is_empty()) {
			return "has yet to be trained";
		}
		bubble_erased = bubble.get_erased() ? " an erased " : " a ";
		return "when given something that matches" + bubble_erased + bubble.toString() + " will " + body.toString();
	};
	
	robot.get_type_name = function () {
		return "robot (" + this.get_description() + ")";
	};
	
	robot.get_json = function () {
		var bubble_json;
		if (this.get_bubble()) {
			bubble_json = this.get_bubble().get_json();
		} 
		return this.add_to_json(
		    {type: "robot",
		     bubble: bubble_json,
		     body: this.get_body().get_json(),
			 image_url: this.get_image_url(),
// 			 width: this.get_width(),
// 			 height: this.get_height(),
			 description: this.get_description()
			});
	};
    
    robot.create_from_json = function (json) {
		return TT.robot.create(TT.UTILITIES.create_from_json(json.bubble),
		                       TT.UTILITIES.create_from_json(json.body),
							   json.image_url,
							   json.width,
							   json.height,
							   json.description);
	};
    
    return robot;
}(window.TOONTALK));

window.TOONTALK.robot_backside = 
(function (TT) {
    "use strict";
    return {
        create: function (robot) {
	        var backside = TT.backside.create(robot);
			var backside_element = backside.get_element();
            // create_text_input should use JQuery????
            var image_url_input = TT.UTILITIES.create_text_input(robot.get_image_url(), "toontalk-image-url-input", "Image URL&nbsp;", "Type here to provide a URL for the appearance of this robot.");
			var description_input = TT.UTILITIES.create_text_input(robot.get_description(), "toontalk-robot-description-input", "Description&nbsp;", "Type here to provide a better descprion of this robot.");
            var input_table;
			var standard_buttons = TT.backside.create_standard_buttons(backside, robot);
			// don't do the following if already trained -- or offer to retrain?
			standard_buttons.insertBefore(this.create_train_button(backside, robot), standard_buttons.firstChild);
			image_url_input.button.onchange = function () {
                robot.set_image_url(image_url_input.button.value.trim(), true);
            };
			description_input.button.onchange = function () {
                robot.set_description(description_input.button.value.trim(), true);
            };
			input_table = TT.UTILITIES.create_vertical_table(description_input.container, image_url_input.container);
			$(input_table).css({width: "90%"});
			backside_element.appendChild(input_table);
			backside_element.appendChild(standard_buttons);
            return backside;
        },
		
		update_display: function () {
            // use JQuery instead of get_first_child_with_class???
			var image_url_input = TT.UTILITIES.get_first_child_with_class(this.get_element(), "toontalk-image-url-input");
			var robot = this.get_widget();
			image_url_input.value = robot.get_image_url();
		},
		
		create_train_button: function (backside, robot) {
			var backside_element = backside.get_element();
			var $backside_element = $(backside_element);
			var $train_button = $("<button>Train</button>").button();
			$train_button.addClass("toontalk-train-backside-button");
			var training = false;
			var change_label_and_title = function () {
				if (training) {
					$train_button.button("option", "label", "Stop training");
					$train_button.attr("title", "Click to stop training this robot.");
				} else {
					if (robot.get_body().is_empty()) {
						$train_button.button("option", "label", "Train");
						$train_button.attr("title", "Click to stop training this robot.");
					} else {
						$train_button.button("option", "label", "Re-train");
						$train_button.attr("title", "Click to start training this robot all over again.");
					}
				}
			};
			change_label_and_title();
			$train_button.click(function () {
				training = !training;
				change_label_and_title();
				if (training) {
					robot.get_body().reset_steps();
					TT.robot.in_training = robot;
					robot.training_started();
				} else {
					robot.training_finished();
					TT.robot.in_training = null;
				}
			});
			return $train_button.get(0);
		},
		
    };
}(window.TOONTALK));