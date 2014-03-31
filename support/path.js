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
			if (widget === "top-level-backside") {
				return TT.path.top_level_backside;
			}
			if (context.get_path_to) {
				sub_path = context.get_path_to(widget, robot);
				if (sub_path) {
					path = TT.path.to_entire_context;
					path.next = sub_path;
					return path;
				}
			}
            path = body.get_path_to(widget, robot);
            if (path) {
                return path;
            }
			console.log("TT.path.get_path_to not fully implemented.");
        },			
		dereference_path: function (path, context) {
			var reference;
		    if (path) {
				if (path.dereference) {
					reference = path.dereference(context);
				}
				if (!reference) {
                	reference = context.dereference(path);
				}
			    if (!reference) {
			        console.log("Unable to dereference path: " + path.toString() + " in context: " + context.toString());
			    }
			    return reference;
            }
            // no path means entire context
            return context;
        },
        to_entire_context: {
            // an action that applies to the entire context (i.e. what the robot is working on)
			dereference: function (context) {
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