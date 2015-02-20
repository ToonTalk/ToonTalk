 /**
 * Implements ToonTalk's path to widgets to enable robots to reference widgets
 * Authors: Ken Kahn
 * License: New BSD
 */
 
  /*jslint browser: true, devel: true, vars: true, white: true */

window.TOONTALK.path = 
(function (TT) {
    "use strict";

    TT.creators_from_json["path.to_entire_context"] = function () {
        return TT.path.to_entire_context();
    };

    TT.creators_from_json["path.top_level_backside"] = function () {
        return TT.path.top_level_backside;
    };

    TT.creators_from_json["path.to_backside_widget_of_context"] = function (json) {
        return TT.path.get_path_to_backside_widget_of_context(json.type_name);
    };

    TT.creators_from_json["path.to_resource"] = function (json, additional_info) {
        return TT.path.get_path_to_resource(TT.UTILITIES.create_from_json(json.resource, additional_info));
    };
    
    return { 
        get_path_to: function (widget, robot) {
            var compute_path = function (widget, robot) {
                var context = robot.get_context();
                var body = robot.get_body();
                var path, sub_path, widget_type;
                if (context === widget) {
                    return TT.path.to_entire_context();
                }
                widget_type = widget.get_type_name();
                if (widget_type === "top-level") {
                    return TT.path.top_level_backside;
                }
                path = body.get_path_to(widget, robot);
                if (path) {
                    return path;
                }
                if (widget_type === "element attribute" && widget.get_original_attribute_widget() === widget) {
                    // if widget.get_parent_of_frontside() then is a copy of the attribute element
                    return TT.element.create_attribute_path(widget, robot);
                }
                // if context is undefined something is wrong much earlier
                if (TT.debugging && !context) {
                    TT.UTILITIES.report_internal_error("No context to compute the path");
                    return;
                }
                if (context.get_path_to) {
                    sub_path = context.get_path_to(widget, robot);
                    if (sub_path) {
                        path = TT.path.to_entire_context();
                        path.next = sub_path;
                        return path;
                    }
                }
                context.backside_widgets.some(function (backside_widget_side) {
                    // widget might be on the backside of the context
                    var backside_widget = backside_widget_side.get_widget();
                    var sub_path;
                    if (backside_widget === widget ||
                        (backside_widget.top_contents_is && backside_widget.top_contents_is(widget)) ) {
                        path = TT.path.get_path_to_backside_widget_of_context(backside_widget.get_type_name());
                        robot.add_to_backside_conditions(backside_widget); // does nothing if already added
                        return true; // stop searching
                    } else if (backside_widget.get_path_to) {
                        // e.g. might be in a box
                        sub_path = backside_widget.get_path_to(widget, robot);
                        if (sub_path) {
                            path = TT.path.get_path_to_backside_widget_of_context(backside_widget.get_type_name());
                            path.next = sub_path;
                            robot.add_to_backside_conditions(backside_widget);
                            return true; // stop searching
                        }
                    }
                });
                if (path) {
                    return path;
                }
                return TT.path.get_path_to_resource(widget.copy());
            }
            var path = compute_path(widget, robot);
            if (path && widget.dereference_contents) {
                // widget is normally transparently dereferenced but here the widget (e.g. a nest)
                // only widgets that respond to dereference_contents need to conditionally be dereferenced
                // is being manipulated itself rather than its contents
                TT.path.path_end(path).not_to_be_dereferenced = true;
            }
            if (path && (robot.current_action_name === 'pick up' || robot.current_action_name === 'remove')) {
                TT.path.path_end(path).removing_widget = true;
            }
            return path;
        },
        path_end: function (path) {
            var path_end = path;
            while (path_end.next) {
                path_end = path_end.next;
            }
            return path_end;
        },
        dereference_path: function (path, context, top_level_context, robot) {
            var dereferenced;
            if (path) {
                if (path.dereference) {
                    dereferenced = path.dereference(context, top_level_context, robot);
                } else if (context.dereference) {
                    dereferenced = context.dereference(path, top_level_context, robot);
                }
            } else {
                // no path means entire context -- TODO: determine if this is still true
                dereferenced = context;
            }
            return dereferenced;
        },
        continue_dereferencing_path: function (path, referenced, top_level_context, robot) {
            // called when (partial) path has produced referenced
            if (path.next) {
                if (referenced.dereference_contents && !path.next.not_to_be_dereferenced) {
                    return referenced.dereference_contents(path.next, top_level_context, robot);
                } else {
                    return referenced.dereference(path.next, top_level_context, robot);
                }                
            }
            if (referenced.dereference_contents && !path.not_to_be_dereferenced) {
                return referenced.dereference_contents(path, top_level_context, robot);
            }
            return referenced;
        },
        toString: function (a_path) {
            var sub_path_string;
            if (a_path.next) {
                sub_path_string = TT.path.toString(a_path.next);
                if (sub_path_string[sub_path_string.length-1] !== ' ') {
                    sub_path_string += ' ';
                }
                return TT.path.toString(a_path.next) + "of " + a_path.toString();
            } else {
                return a_path.toString();
            }
        },
        get_json: function (path, json_history) {
            var json;
            if (!path.get_json) {
                return path; // is a constant
            }
            json = path.get_json(json_history);
            if (path.next) {
                json.next_path = TT.path.get_json(path.next, json_history);
            }
            if (path.removing_widget) {
                json.removing_widget = true;
            }
            if (path.not_to_be_dereferenced) {
                json.not_to_be_dereferenced = true;
            }
            return json;
        },
        to_entire_context: function () {
            // an action that applies to the entire context (i.e. what the robot is working on)
            // need to create fresh ones since if there is a sub-path they shouldn't be sharing
            return {dereference: function (context, top_level_context, robot) {
                        return TT.path.continue_dereferencing_path(this, context, top_level_context, robot);
                    },
                    toString: function () {
                        return "what he's working on";
                    },
                    get_json: function () {
                        return {type: "path.to_entire_context"};
                    }
            };
        },
        get_path_to_resource: function (widget, json_history) {
            // ignore the side information and just use the widget
            // revisit this if resources are ever backside resources
            widget = widget.get_widget(); // if widget is really the backside of the widget
            return {dereference: function (context, top_level_context, robot) {
                        var widget_copy = widget.copy();
                        var widget_frontside_element, widget_frontside_position, copy_frontside_element;
                        robot.add_newly_created_widget(widget_copy);
                        if (robot.visible() && !widget.visible()) {
                            // picking up a copy of a resource
                            // but robot isn't referring to the resource itself just the 'value'
                            widget_frontside_element = TT.UTILITIES.find_resource_equal_to_widget(widget);
                            if (widget_frontside_element) {
                                copy_frontside_element = widget_copy.get_frontside_element();
                                widget_frontside_position = $(widget_frontside_element).position();
                                TT.UTILITIES.set_timeout(function ()  {
                                    $(copy_frontside_element).css({left:   widget_frontside_position.left,
                                                                   top:    widget_frontside_position.top,
                                                                   width:  widget_frontside_element.offsetWidth,
                                                                   height: widget_frontside_element.offsetHeight});
                                    });
                            }
                        }
                        return widget_copy;
                    },
                    toString: function () {
                        return TT.UTILITIES.add_a_or_an(widget.toString());
                    },
                    get_json: function () {
                        return {type: "path.to_resource",
                                // following resets json_history since within a path there shouldn't be sharing without the 'outside'
                                resource: TT.path.get_json(widget, TT.UTILITIES.fresh_json_history())};
                    }
            };
        },
        get_path_to_backside_widget_of_context: function (type_name) {
             return {dereference: function (context, top_level_context, robot) {
                        var referenced;
                        context.backside_widgets.some(function (backside_widget_side) {
                            if (backside_widget_side.get_widget().is_of_type(type_name)) {
                                referenced = backside_widget_side.get_widget();
                                return true; // stop searching
                            }
                        });
                        if (referenced) {
                            return TT.path.continue_dereferencing_path(this, referenced, top_level_context, robot);
                        }
                    },
                    toString: function () {
                        var string = "the " + type_name + " on the back of what he's working on";
                        if (this.removing_widget) {
                            return "what is on " + string;
                        }
                        return string;
                    },
                    get_json: function () {
                        return {type: "path.to_backside_widget_of_context",
                                type_name: type_name};
                    }
            };
        },
        create_from_json: function (json, additional_info) {
            var path = TT.UTILITIES.create_from_json(json, additional_info);
            var next_path;
            if (json.next_path) {
                next_path = TT.UTILITIES.create_from_json(json.next_path, additional_info);
                if (json.next_path.removing_widget) {
                    next_path.removing_widget = true;
                }
                if (json.next_path.not_to_be_dereferenced) {
                    next_path.not_to_be_dereferenced = true;
                }
                path.next = next_path;
            }
            if (json.removing_widget) {
                path.removing_widget = true;
            }
            if (json.not_to_be_dereferenced) {
                path.not_to_be_dereferenced = true;
            }
            return path;
        },
        top_level_backside: {
            // this can be shared by all since only used to drop on -- not to pick up
            // if pick up then needs to be a fresh copy like get_path_to_resource
            dereference: function (context, top_level_context, robot) {
                return context.ancestor_of_type('top-level');
            },
            toString: function () {
                return "the top-level backside";
            },
            get_json: function () {
                return {type: "path.top_level_backside"};
            }
        }
    };

}(window.TOONTALK));