 /**
 * Implements ToonTalk's robots
 * box.Authors = Ken Kahn
 * License: New BSD
 */

window.TOONTALK.robot = (function (TT) {
    "use strict";
    var robot = Object.create(TT.widget);
    
    robot.create = function (bubble, body, image_url) {
        // bubble holds the conditions that need to be matched to run
        // body holds the actions the robot does when it runs
        var result = Object.create(this);
        if (!image_url) {
            image_url = "images/robot.png";
        }
        result.get_bubble = function () {
            return bubble;
        };
        result.get_body = function () {
            return body;
        };
        result.get_image_url = function () {
            return image_url;
        };
        result.set_image_url = function (new_value) {
            image_url = new_value;
        };
        body.set_robot(result);
		if (TT.debugging) {
			result.debug_string = result.toString();
		}
        return robot.add_sides_functionality(result);
    };
    
    robot.create_backside = function () {
		return TT.robot_backside.create(this);
	};
    
    robot.copy = function () {
        return this.create(this.get_bubble().copy(), this.get_body());
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
    
    robot.stop = function () {
        this.stopped = true;
    };
    
    robot.run_actions = function(context, queue) {
        return this.get_body().run(context, queue);
    };
	
	robot.update_display = function() {
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
		$(frontside_element.firstChild).addClass("toontalk-widget");
    };
	
	robot.to_HTML = function () {
		// to do: add thought bubble
		return "<p>This robot <img src='" + this.get_image_url() + "'></img> adds 1 to any number given to it.</p>";
	};
	
	robot.toString = function () {
		"robot with bubble " + this.get_bubble().toString() + " with these actions " + this.get_body().toString + " with this image " + this.get_image_url();
	}
	
	robot.get_json = function () {
		var super_prototype = this.__proto__.__proto__;
		return super_prototype.get_json(
		    {type: "robot",
		     bubble: this.get_bubble().get_json(),
		     body: this.get_body().get_json(),
			 image_url: this.get_image_url()}
		);
	};
    
    robot.create_from_json = function (json) {
		return TT.robot.create(TT.UTILITIES.create_from_json(json.bubble),
		                       TT.UTILITIES.create_from_json(json.body),
							   json.image_url);
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
            var image_url_input = TT.UTILITIES.create_text_input(robot.get_image_url(), 'toontalk-image-url-input', "Type here to provide a URL for the appearance of this robot.");
            // later should have 'name' and other stuff
            var update_value = function () {
                robot.set_image_url(image_url_input.value.trim(), true);
            };
            image_url_input.onchange = update_value; 
            backside_element.appendChild(image_url_input);
            return backside;
        },
		
		update_display: function () {
            // use JQuery instead of get_first_child_with_class???
			var image_url_input = TT.UTILITIES.get_first_child_with_class(this.get_element(), "toontalk-image-url-input");
			var robot = this.get_widget();
			image_url_input.value = robot.get_image_url();
		},
    };
}(window.TOONTALK));