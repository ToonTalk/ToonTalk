 /**
 * Implements ToonTalk's robots
 * box.Authors = Ken Kahn
 * License: New BSD
 */
 
 /*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */

window.TOONTALK.robot = (function (TT) {
    "use strict";
    var robot = Object.create(TT.widget);
    
    robot.create = function (image_url, bubble, body, description, width, height, thing_in_hand, run_once, next_robot) {
        // bubble holds the conditions that need to be matched to run
        // body holds the actions the robot does when it runs
        var new_robot = Object.create(robot);
		var first_in_team; // who should do the 'repeating'
		var animating = false; // true if animating due to being run while watched
        if (!image_url) {
            image_url = "images/RB00.PNG";
        }
		if (!body) {
			body = TT.actions.create();
		}
		if (!description) {
			description = "";
		}
		if (!width) {
			// probably should be based upon toontalk-top-level-resource's width
			width = 100;
		}
		if (!height) {
			height = 100;
		}
		if (!first_in_team) {
			first_in_team = new_robot;
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
				TT.DISPLAY_UPDATES.pending_update(this);
			}
        };
		new_robot.get_animating = function () {
			return animating;
		};
	    new_robot.set_animating = function (new_value) {
			animating = new_value;
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
			return description;
		};
		new_robot.set_description = function (new_value, update_display) {
			description = new_value;
			if (update_display) {
				TT.DISPLAY_UPDATES.pending_update(this);
			}
		};
		new_robot.get_thing_in_hand = function () {
			return thing_in_hand;
		};
		new_robot.set_thing_in_hand = function (new_value) {
			thing_in_hand = new_value;
		};
		new_robot.get_next_robot = function () {
			return next_robot;
		};
		new_robot.set_next_robot = function (new_value) {
			var backside_element = this.get_backside_element();
			var drop_area_instructions;
			if (new_value) {
				new_value.set_first_in_team(this.get_first_in_team());
			}
			if (!new_value && next_robot) {
				// next guy is no longer in this team
				next_robot.set_first_in_team(next_robot);
			}
			next_robot = new_value;
			if (backside_element) {
				if (new_value) {
					drop_area_instructions = "When the robot can't run then this one will try: ";
				} else {
					drop_area_instructions = window.TOONTALK.robot.empty_drop_area_instructions;
				}
				$(backside_element).find(".toontalk-drop-area-instructions").get(0).innerHTML = drop_area_instructions;
			}
		};
		new_robot.get_first_in_team = function () {
			return first_in_team;
		};
		new_robot.set_first_in_team = function (new_value) {
			first_in_team = new_value;
			if (next_robot) {
				next_robot.set_first_in_team(new_value);
			}
		};
		new_robot.get_run_once = function () {
			return run_once;
		};
		new_robot.set_run_once = function (new_value) {
			run_once = new_value;
		};
		new_robot = new_robot.add_standard_widget_functionality(new_robot);
        return new_robot;
    };
    
    robot.create_backside = function () {
		return TT.robot_backside.create(this).update_run_button_disabled_attribute();;
	};
    
    robot.copy = function (just_value) {
		var bubble = this.get_bubble();
		var bubble_copy = bubble ? bubble.copy(true) : undefined;
		var next_robot = this.get_next_robot();
		var next_robot_copy = next_robot ? next_robot.copy(just_value) : undefined;
		var copy = this.create(this.get_image_url(), 
		                       bubble_copy,
							   this.get_body().copy(),
							   this.get_description(),
							   this.get_width(),
							   this.get_height(),
							   this.get_thing_in_hand(),
							   this.get_run_once(),
							   next_robot_copy);
        return this.add_to_copy(copy, just_value);
    };
	
	robot.match = function () {
		console.log("Robot-to-robot matching could be more sophisticated.");
		return "matched";
	};
    
    robot.run = function (context, queue) {
        var match_status, i;
		var bubble = this.get_bubble();
        if (this.stopped || this.being_trained) {
            return 'not matched';
        }
		if (!bubble) {
			console.log("Training robots without a context not yet implemented.");
			return 'not matched';
		}
        match_status = bubble.match(context);
        switch (match_status) {
        case 'matched':
            if (!queue) {
                queue = TT.QUEUE;
            }
			this.get_body().reset_newly_created_widgets();
            queue.enqueue({robot: this, context: context, queue: queue});
            return match_status;
        case 'not matched':
            if (this.get_next_robot()) {
                return this.get_next_robot().run(context, queue);
            }
            return match_status;
        default:
			if (!match_status) {
				return 'not matched';
			}
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
		if (this.stopped) { // replace with a method?
			return false;
		}
		if (this.visible()) {
			return this.get_body().run_watched(context, queue, this);
		}
        return this.get_body().run_unwatched(context, queue, this);
    };
	
	robot.picked_up = function (widget, json, is_resource) {
		var path, action_name, widget_copy;
		// current_action_name is used to distinguish between removing something from its container versus referring to it
		if (widget.get_infinite_stack()) {
			// does this cause an addition to newly created backside widgets?
			this.current_action_name = "pick up a copy";
		} else {
			this.current_action_name = "pick up";
		}		
		if (is_resource) {
			// robot needs a copy of the resource to avoid sharing it with training widget
			widget_copy = widget.copy();
			path = TT.path.get_path_to_resource(widget_copy);
		} else {
			path = TT.path.get_path_to(widget, this);
		}
		if (path) {
			this.add_step(TT.robot_action.create(path, this.current_action_name), widget_copy);
		}
		this.current_action_name = undefined;
		this.set_thing_in_hand(widget);
	};
	
	robot.dropped_on = function (target_widget) {
		var path; 
		this.current_action_name = "drop it on";
		path = TT.path.get_path_to(target_widget, this);
		if (path) {
			this.add_step(TT.robot_action.create(path, this.current_action_name));
		}
		this.current_action_name = undefined;
		this.set_thing_in_hand(undefined);
	};
	
	robot.copied = function (widget, widget_copy, picked_up) {
		var path;
		if (picked_up) {
			this.current_action_name = "pick up a copy";
		} else {
			this.current_action_name = "copy";
		}
		path = TT.path.get_path_to(widget, this);
		if (path) {
			this.add_step(TT.robot_action.create(path, this.current_action_name), widget_copy);
		}
		this.current_action_name = undefined;
	};
	
	robot.removed = function (widget) {
		var path;
		this.current_action_name = "remove"; 
		path = TT.path.get_path_to(widget, this);
		if (path) {
			this.add_step(TT.robot_action.create(path, this.current_action_name));
		}
		this.current_action_name = undefined;
	};
	
	robot.edited = function (widget, details) {
		var path;
		this.current_action_name = "edit";
		path = TT.path.get_path_to(widget, this);
		if (path) {
			this.add_step(TT.robot_action.create(path, current_action_name, details));
		}
		this.current_action_name = undefined;
	}
	
	robot.set_erased = function (widget, erased) {
		var path;
		this.current_action_name = "set_erased";
		path = TT.path.get_path_to(widget, this);
		if (path) {
			this.add_step(TT.robot_action.create(path, this.current_action_name, {erased: erased,
			                                                                      toString: erased ? "erase" : "un-erase"}));
		}
		this.current_action_name = undefined;
	};
	
	robot.add_step = function (step, new_widget) {
		this.get_body().add_step(step, new_widget);
		this.get_frontside_element().title = this.get_title();
	};
	
	robot.get_context = function () {
		var frontside_element = this.get_frontside_element();
		var $parent_element = $(frontside_element).parent();
		return $parent_element.data("owner");
	};
	
	robot.training_started = function () {
		var context = this.get_context();
		if (!context) {
			console.log("Robot started training but can't find its 'context'.");
			return;
		}
	    this.being_trained = true;
		this.set_bubble(context.copy(true));
		// use minature image as cursor (if there is one)
		$("div").css({cursor: 'url(' + TT.UTILITIES.cursor_of_image(this.get_image_url()) + '), default'});
		this.get_frontside_element().title = this.get_title();
	};
	
	robot.training_finished = function () {
		$("div").css({cursor: ''}); // restore cursor
		TT.DISPLAY_UPDATES.pending_update(this);
		TT.DISPLAY_UPDATES.pending_update(this.get_backside());
		this.being_trained = false;
		this.get_frontside_element().title = this.get_title();
	};
	
	robot.update_display = function() {
		// perhaps this should be moved to widget and number and box updated to differ in the to_HTML part
        var frontside = this.get_frontside();
		var backside = this.get_backside();
		var bubble = this.get_bubble();
		var new_first_child, robot_image, thought_bubble, frontside_element, bubble_contents_element, resource_becoming_instance;
		var thing_in_hand = this.get_thing_in_hand();
		var thing_in_hand_frontside_element;
		// following can't happen during robot creation since robot actions references to newly_created_widgets is premature
		if (TT.debugging) {
			this.debug_string = this.toString();
			if (!this.debug_id) {
				this.debug_id = TT.UTILITIES.generate_unique_id();
			}
		}
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
			if (thing_in_hand) {
				thing_in_hand_frontside_element = thing_in_hand.get_frontside_element();
				new_first_child.appendChild(thing_in_hand_frontside_element);
			}
			new_first_child.appendChild(robot_image);
			bubble_contents_element = bubble.get_frontside_element();
			$(bubble_contents_element).addClass("toontalk-thought-bubble-contents");
			thought_bubble.appendChild(bubble_contents_element);
			resource_becoming_instance = frontside_element.firstChild && $(frontside_element.firstChild).is(".toontalk-robot-image");
		}
		// remove what's there first
        while (frontside_element.firstChild) {
            frontside_element.removeChild(frontside_element.firstChild);
        }
		frontside_element.title = this.get_title();
		$(frontside_element).addClass("toontalk-robot");
		$(new_first_child).addClass("toontalk-widget");
		frontside_element.style.width = this.get_width() + "px";
		frontside_element.style.height = this.get_height() + "px";
		// following interfered with resizable
// 		$(frontside_element).css({width: this.get_width(),
// 		                          height: this.get_height()});
		frontside_element.appendChild(new_first_child);
		if (bubble_contents_element) {
			TT.DISPLAY_UPDATES.pending_update(bubble);
		}
		if (thing_in_hand) {
			$(thing_in_hand_frontside_element).addClass("toontalk-held-by-robot");
			TT.DISPLAY_UPDATES.pending_update(thing_in_hand);
		}
		if (backside && backside.visible()) {
			TT.DISPLAY_UPDATES.pending_update(backside);
		}
		setTimeout( // wait for layout to settle down
			function () {
				if (resource_becoming_instance) {
					// need to adjust for thought bubble
					frontside_element.style.top = ($(frontside_element).position().top - $(robot_image).height()) + "px";
				}
			},
			1);
    };
	
	robot.add_newly_created_widget = function (new_widget) {
		return this.get_body().add_newly_created_widget(new_widget);
	};
	
	robot.get_recently_created_widget = function () {
		var newly_created_widgets = this.get_body().get_newly_created_widgets();
		return newly_created_widgets[newly_created_widgets.length-1];
	};
	
	robot.get_title = function() {
		var description = this.get_description();
		var frontside_element;
		if (description) {
			description = "This robot " + description;
			if (description.lastIndexOf('.') < 0) {
				description = description + ".";
			}
			return description + "\n" + this.toString();
		}
		frontside_element = this.get_frontside_element();
		if ($(frontside_element).is(".toontalk-top-level-resource")) {
            return "Drag this robot to a work area.";   
        }
		return this.toString();
	};
	
	robot.image = function () {
		var image = document.createElement("img");
		image.src = this.get_image_url(); // causes Caja error
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
		var prefix = "";
		var postfix = "";
		var bubble_string;
		var next_robot = this.get_next_robot();
		var robot_description;
		if (!bubble) {
			return "has yet to be trained.";
		}
		bubble_string = bubble.get_description();
		if (this.being_trained) {
			prefix = "is being trained.\n";
			postfix = "\n..."; // to indicates still being constructed
		}
		bubble_string = TT.UTILITIES.add_a_or_an(bubble_string);
		robot_description = prefix + "When working on something that matches " + bubble_string + " he will \n" + body.toString() + postfix;
		if (next_robot) {
			robot_description += "\nIf it doesn't match then the next robot will try to run.\n" + next_robot.toString();
		}
		return robot_description;
	};
	
	robot.get_type_name = function () {
		return "robot";
	};
	
	robot.get_json = function () {
		var bubble = this.get_bubble();
		var bubble_json, next_robot_json;
		if (bubble) {
			if (bubble.get_type_name() === 'top-level') {
				bubble_json = {type: "top_level"};
			} else {
				bubble_json = bubble.get_json();
		    }
		}
		if (this.get_next_robot()) {
			next_robot_json = this.get_next_robot().get_json();
		}
		return this.add_to_json(
			{semantic:
				 {type: "robot",
				  bubble: bubble_json,
				  body: this.get_body().get_json(),
				  run_once: this.get_run_once(),
				  next_robot: next_robot_json
				  },
	         view:
			     {image_url: this.get_image_url(),
// 			 width: this.get_width(),
// 			 height: this.get_height(),
			      description: this.get_description()}});
	};
    
    robot.create_from_json = function (json_semantic, json_view) {
		var next_robot, thing_in_hand;
		if (json_semantic.thing_in_hand) {
			thing_in_hand = TT.UTILITIES.create_from_json(json_semantic.thing_in_hand);
		}
		if (json_semantic.next_robot) {
			next_robot = TT.UTILITIES.create_from_json(json_semantic.next_robot);
		}
		return TT.robot.create(json_view.image_url,
		                       TT.UTILITIES.create_from_json(json_semantic.bubble),
		                       TT.UTILITIES.create_from_json(json_semantic.body),
							   json_view.description,
							   json_view.width,
							   json_view.height,
							   thing_in_hand,
							   json_semantic.run_once,
							   next_robot);
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
            var image_url_input = TT.UTILITIES.create_text_input(robot.get_image_url(), "toontalk-image-url-input", "Image URL&nbsp;", "Type here to provide a URL for the appearance of this robot.");
			var description_text_area = TT.UTILITIES.create_text_area(robot.get_description(), 
			                                                          "toontalk-robot-description-input", 
																      "This&nbsp;robot&nbsp;",
																      "Type here to provide additional information about this robot.");
			var run_once_input = TT.UTILITIES.create_check_box(!robot.get_run_once(), 
			                                                   "When finished start again",
														       "Check this if you want the robot to start over again after finishing what he was trained to do.");
			var $next_robot_area = TT.UTILITIES.create_drop_area(window.TOONTALK.robot.empty_drop_area_instructions);
			var next_robot = robot.get_next_robot();
			var standard_buttons = TT.backside.create_standard_buttons(backside, robot);
			var infinite_stack_check_box = TT.backside.create_infinite_stack_check_box(backside, robot);
			var input_table;
			$next_robot_area.data("drop_area_owner", robot);
			// don't do the following if already trained -- or offer to retrain?
			standard_buttons.insertBefore(this.create_train_button(backside, robot), standard_buttons.firstChild);
			image_url_input.button.addEventListener('change', function () {
				var image_url = image_url_input.button.value.trim();
                robot.set_image_url(image_url, true);
				if (TT.robot.in_training) {
					TT.robot.in_training.edited(robot, {setter_name: "set_image_url",
			                                            argument_1: image_url,
												        toString: "change the image URL to " + image_url + " of the robot"});
				}
            });
			description_text_area.button.addEventListener('change', function () {
				var description = description_text_area.button.value.trim();
                robot.set_description(description, true);
				if (TT.robot.in_training) {
					TT.robot.in_training.edited(robot, {setter_name: "set_description",
			                                            argument_1: description,
												        toString: "change the description to '" + description + "'' of the robot"});
				}
            });
			$(run_once_input.button).click(function (event) {
				var keep_running = run_once_input.button.checked;
				robot.set_run_once(!keep_running);
				if (TT.robot.in_training) {
					TT.robot.in_training.edited(robot, {setter_name: "set_run_once",
			                                            argument_1: !keep_running,
												        toString: "change to " + (keep_running ? "run again" : "run once") + " of the robot"});
				}
				event.stopPropagation();
			});
			input_table = TT.UTILITIES.create_vertical_table(description_text_area.container, image_url_input.container, run_once_input.container);
			$(input_table).css({width: "90%"});
			backside_element.appendChild(input_table);
			backside_element.appendChild(standard_buttons);
			backside_element.appendChild(infinite_stack_check_box.container);
			if (next_robot) {
				$next_robot_area.append(next_robot.get_frontside_element());
			}
			backside_element.appendChild($next_robot_area.get(0));
			backside.update_display = function () {
				var frontside_element = robot.get_frontside_element();
				var $containing_backside_element;
				$(description_text_area.button).val(robot.get_description());
				$(image_url_input.button).val(robot.get_image_url());
				$(run_once_input.button).prop("checked", !robot.get_run_once());
				if (frontside_element) {
					frontside_element.title = robot.get_title();
					$containing_backside_element = $(frontside_element).closest(".toontalk-backside");
					if ($containing_backside_element.length > 0) {
						$containing_backside_element.data("owner").get_backside().update_run_button_disabled_attribute();
					}					
				}
				backside.update_run_button_disabled_attribute();
			};
            return backside;
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
						$train_button.attr("title", "Click to start training this robot.");
					} else {
						$train_button.button("option", "label", "Re-train");
						$train_button.attr("title", "Click to start training this robot all over again.");
					}
				}
			};
			change_label_and_title();
			$train_button.click(function (event) {
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
				event.stopPropagation();
			});
			return $train_button.get(0);
		}
		
    };
}(window.TOONTALK));

window.TOONTALK.robot.empty_drop_area_instructions = "Drop a robot here to run when this robot can't."