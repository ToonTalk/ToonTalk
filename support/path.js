 /**
 * Implements ToonTalk's path to widgets 
 * Authors: Ken Kahn
 * License: New BSD
 */
 
  /*jslint browser: true, devel: true, vars: true, white: true */

window.TOONTALK.path = 
(function (TT) {
    "use strict";
    return {
        get_path_to: function (widget, robot) {
            var context = robot.get_context();
            var body = robot.get_body();
			var path, sub_path;
            if (context === widget) {
			    return TT.path.to_entire_context;
		    }
			if (widget === "top-level-backside" || widget.get_type_name() === "top-level") {
				return TT.path.top_level_backside;
			}
			path = body.get_path_to(widget, robot);
            if (path) {
                return path;
            }
			if (context.get_path_to) {
				sub_path = context.get_path_to(widget, robot);
				if (sub_path) {
					path = TT.path.to_entire_context;
					path.next = sub_path;
					return path;
				}
			}
			console.log("TT.path.get_path_to not fully implemented.");
        },
		dereference_path: function (path, context) {
		    if (path) {
				if (path.dereference) {
					return path.dereference(context);
				}
                return context.dereference(path);
            }
            // no path means entire context -- I don't think this is still true
            return context;
        },
		toString: function (a_path) {
			if (a_path.next) {
				// will the first part always end in a space?
				return TT.path.toString(a_path.next) + "of " + a_path.toString();
			} else {
				return a_path.toString();
			}
		},
        to_entire_context: {
            // an action that applies to the entire context (i.e. what the robot is working on)
			dereference: function (context) {
				if (this.next) {
					if (context.dereference) {
						return context.dereference(this.next);
					} else {
						console.log("Expected context to support dereference.");
					}				
				}
				return context;
			},
            toString: function () {
                return "what he's working on";
            },
            get_json: function () {
                return {type: "path.to_entire_context"};
            },
            create_from_json: function () {
                return TT.path.to_entire_context;
            }
        },
		get_path_to_resource: function (widget) {
			return {dereference: function (context) {
						return widget.copy();
					},
					toString: function () {
						var widget_string = widget.toString();
						var first_character = widget_string.charAt(0);
						if ("aeiou".indexOf(first_character) < 0) {
							return "a " + widget_string;
						}
						return "an " + widget_string;
					},
					get_json: function () {
						return {type: "path.to_resource",
								widget: TT.UTILITIES.get_json(widget)};
					}
			};
		},
        path_to_resource_create_from_json: function (json) {
            return TT.path.path_to_resource(json.create_from_json(json.widget));
		},
		top_level_backside: {
			dereference: function () {
				return $(".toontalk-top-level-backside");
			},
            toString: function () {
                return "the top-level backside";
            },
            get_json: function () {
                return {type: "path.top_level_backside"};
            },
            create_from_json: function () {
               return TT.path.top_level_backside;
            }
		}
    };
}(window.TOONTALK));