 /**
 * Implements ToonTalk's robots
 * box.Authors = Ken Kahn
 * License: New BSD
 */
 
 /*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */

window.TOONTALK.robot = (function (TT) {
    "use strict";
    var robot = Object.create(TT.widget);
    
    robot.create = function (bubble, body, image_url, description, width, height, thing_in_hand) {
        // bubble holds the conditions that need to be matched to run
        // body holds the actions the robot does when it runs
        var result = Object.create(this);
        if (!image_url) {
            image_url = "images/robot.png";
        }
		if (!width) {
			// probably should be based upon toontalk-top-level-resource's width
			width = 100;
		}
		if (!height) {
			height = 100;
		}
        result.get_bubble = function () {
            return bubble;
        };
		result.set_bubble = function (new_value) {
			bubble = new_value;
		};
        result.get_body = function () {
            return body;
        };
        result.get_image_url = function () {
            return image_url;
        };
        result.set_image_url = function (new_value, update_display) {
            image_url = new_value;
			if (update_display) {
				this.update_display();
			}
        };
		// should the following use 'width' from the frontside element?
		result.get_width = function () {
			return width;
		};
		result.set_width = function (new_value) {
			width = new_value;
		};
		result.get_height = function () {
			return height;
		};
		result.set_height = function (new_value) {
			height = new_value;
		};
		result.get_description = function () {
			if (!description) {
				return result.toString();
			}
			return description;
		};
		result.set_description = function (new_value, update_display) {
			description = new_value;
			if (update_display) {
				this.update_display();
			}
		};
		result.get_thing_in_hand = function () {
			return thing_in_hand;
		};
		result.set_thing_in_hand = function (new_value) {
			thing_in_hand = new_value;
		};
        body.set_robot(result);
		if (TT.debugging) {
			result.debug_string = result.toString();
		}
		result = robot.add_sides_functionality(result);
		result = robot.erasable(result);
        return result;
    };
    
    robot.create_backside = function () {
		return TT.robot_backside.create(this);
	};
    
    robot.copy = function (just_value) {
		var copy = this.create(this.get_bubble().copy(), this.get_body(), this.get_image_url(), this.get_description(), this.get_width(), this.get_height());
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
		if (is_resource) {
			step = TT.copy_constant.create(widget);
		} else {
			// to do
		}
		this.set_thing_in_hand(widget);
		this.get_body().add_step(step);
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
		this.get_body().add_step(step);
	};
	
	robot.get_context = function () {
		var frontside_element = this.get_frontside_element();
		var $parent_element = $(frontside_element).parent();
		return $parent_element.data("owner");
	};
	
	robot.training_started = function () {
		this.set_bubble(this.get_context());
	};
	
	robot.training_finished = function () {
		// not sure anything needs to be done
	};
	
	robot.update_display = function() {
		// perhaps this should be moved to widget and number and box updated to differ in the to_HTML part
        var frontside = this.get_frontside();
		var new_HTML, frontside_element;
        if (!frontside) {
            return;
        }
        frontside_element = frontside.get_element();
        new_HTML = this.to_HTML();
        if (!frontside_element.firstChild) {
            frontside_element.appendChild(document.createElement('div'));
        }
        frontside_element.firstChild.innerHTML = new_HTML;
		$(frontside_element).addClass("toontalk-robot");
		frontside_element.style.width = this.get_width();
		frontside_element.style.height = this.get_height();
		// following interfered with resizable
// 		$(frontside_element).css({width: this.get_width(),
// 		                          height: this.get_height()});
		$(frontside_element.firstChild).addClass("toontalk-widget");
    };
	
	robot.to_HTML = function () {
		// to do: add thought bubble
		var description = this.get_description();
		var title = description ? "This robot " + description : "This is a " + this.toString();
		return "<img src='" + this.get_image_url() + "' title='" + title + "' width='100%' height='100%'></img>";
	};
	
	robot.toString = function () {
		var bubble_erased = this.get_bubble().get_erased() ? " an erased " : " a ";
		return "when given something that matches" + bubble_erased + this.get_bubble().toString() + " will " + this.get_body().toString();
	};
	
	robot.get_type_name = function () {
		return "robot (" + this.get_description() + ")";
	};
	
	robot.get_json = function () {
// 		var super_prototype = Object.getPrototypeOf(Object.getPrototypeOf(this));
		return this.add_to_json(
		    {type: "robot",
		     bubble: this.get_bubble().get_json(),
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
            var image_url_input = TT.UTILITIES.create_text_input(robot.get_image_url(), "toontalk-image-url-input", "Image URL", "Type here to provide a URL for the appearance of this robot.");
			var description_input = TT.UTILITIES.create_text_input(robot.get_description(), "toontalk-robot-description-input", "Description", "Type here to provide a better descprion of this robot.");
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
			var training = false;
			var change_label_and_title = function () {
				if (training) {
					$train_button.button("option", "label", "Stop training");
					$train_button.attr("title", "Click to stop training this robot.");
				} else {
					if (robot.get_body().is_empty()) {
						$train_button.attr("title", "Click to start training this robot.");
						$train_button.addClass("toontalk-train-backside-button");
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