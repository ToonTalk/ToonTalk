 /**
 * Implements ToonTalk's path to widgets to enable robots to reference widgets
 * Authors: Ken Kahn
 * License: New BSD
 */
 
  /*jslint browser: true, devel: true, vars: true, white: true */

window.TOONTALK.path = 
(function (TT) {
    "use strict";

    var default_top_level_widget; // needed when running without a top-level backside

    TT.creators_from_json["path.to_entire_context"] = function () {
        return TT.path.to_entire_context();
    };

    TT.creators_from_json["path.to_widget_on_nest"] = function () {
        return TT.path.to_widget_on_nest();
    };
    
    TT.creators_from_json["path.top_level_backside"] = function () {
        return TT.path.top_level_backside;
    };

    TT.creators_from_json["path.to_backside_widget_of_context"] = function (json, additional_info) {
        var condition;
        if (typeof json.backside_index === 'undefined') {
            // older format
            return TT.path.get_path_to_backside_widget_of_context(json.type_name, additional_info && additional_info.robot);
        }
        return TT.path.get_path_to_backside_index_of_context(json.backside_index, json.type_name, additional_info && additional_info.robot);
    };

    TT.creators_from_json["path.to_resource"] = function (json, additional_info) {
        return TT.path.get_path_to_resource(TT.UTILITIES.create_from_json(json.resource, additional_info));
    };
    
    return { 
        get_path_to: function (widget, robot, or_any_backside_of_widget) {
            var compute_path = function (widget, robot) {
                var context = robot.get_training_context();
                var body = robot.get_body();
                var path, sub_path, widget_type, is_backside, robot_ancestor;
                if (widget.is_primary_backside && widget.is_primary_backside()) {
                    is_backside = true;
                    widget = widget.get_widget();
                }
                if (context === widget) {
                    path = TT.path.to_entire_context();
                    path.is_backside = is_backside;
                    return path;
                }
                widget_type = widget.get_type_name();
                if (widget_type === "top-level") {
                    return TT.path.top_level_backside;
                }
                path = body.get_path_to(widget, robot, or_any_backside_of_widget);
                if (path) {
                    path.is_backside = is_backside;
                    return path;
                }
                if (widget_type === "element attribute" && widget.get_original_attribute_widget() === widget) {
                    // if widget.get_parent_of_frontside() then is a copy of the attribute element
                    path = TT.element.create_attribute_path(widget, robot);
                    path.is_backside = is_backside;
                    return path;
                }
                // if context is undefined something is wrong much earlier
                if (TT.debugging && !context) {
                    TT.UTILITIES.report_internal_error("No context to compute the path");
                    return;
                }
                if (context.get_path_to) {
                    sub_path = context.get_path_to(widget, robot);
                    if (sub_path) {
                        sub_path.is_backside = is_backside;
                        path = TT.path.to_entire_context();
                        path.next = sub_path;
                        return path;
                    }
                }
                context.get_backside_widgets().some(function (backside_widget_side) {
                    // widget might be on the backside of the context
                    var backside_widget = backside_widget_side.get_widget();
                    var sub_path;
                    if (backside_widget === widget ||
                        (backside_widget.top_contents_is && backside_widget.top_contents_is(widget)) ) {
                        robot.add_to_backside_conditions(backside_widget); // does nothing if already added
                        path = TT.path.get_path_to_backside_widget_of_context(backside_widget, robot);
                        path.is_backside = is_backside;
                        return true; // stop searching
                    } else if (backside_widget.get_path_to) {
                        // e.g. might be in a box
                        sub_path = backside_widget.get_path_to(widget, robot);
                        if (sub_path) {
                            sub_path.is_backside = is_backside;
                            robot.add_to_backside_conditions(backside_widget);
                            path = TT.path.get_path_to_backside_widget_of_context(backside_widget, robot);
                            path.next = sub_path;
                            return true; // stop searching
                        }
                    }
                });
                if (path) {
                    path.is_backside = is_backside;
                    return path;
                }
                robot_ancestor = widget.ancestor_of_type('robot');
                if (robot_ancestor) {
                    // is a condition of a robot
                    return TT.robot.find_conditions_path(widget, robot_ancestor, robot);
                }
                path = TT.path.get_path_to_resource(widget.copy());
                path.is_backside = is_backside;
                return path;
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
        dereference_path: function (path, robot, widget) {
            // widget one of the robot's' backside conditions - if undefined is robot's context
            var dereferenced;
            if (path) {
                if (path.dereference_path) {
                    dereferenced = path.dereference_path(robot, widget);
                } else if (widget && widget.dereference_path) {
                    dereferenced = widget.dereference_path(path, robot);
                }
            } else {
                // no path means entire context -- TODO: determine if this is still true
                dereferenced = widget || robot.get_context();
            }
            if (dereferenced && path && path.is_backside) {
                return dereferenced.get_backside(true);
            }
            return dereferenced;
        },
        continue_dereferencing_path: function (path, referenced, robot) {
            // called when (partial) path has produced referenced
            var new_referenced;
            if (referenced === undefined) {
                if (robot.context_is_backside()) {
                    // if is a backside on a backside -- if no top_level_context then context used below
                    referenced = robot.get_top_level_context();
                }                   
            }
            if (referenced === undefined) {
                referenced = robot.get_context();
            }
            if (path.next) {
                if (referenced.dereference_contents && !path.next.not_to_be_dereferenced) {
                    new_referenced = referenced.dereference_contents(path.next, robot);
                    if (new_referenced && path.is_backside) {
                        return new_referenced.get_backside(true);
                    }
                    return new_referenced;
                } else {
                    new_referenced = referenced.dereference_path(path.next, robot);
                    if (new_referenced && path.next.is_backside) {
                        return new_referenced.get_backside(true);
                    }
                    return new_referenced;
                }                
            }
            if (referenced.dereference_contents && !path.not_to_be_dereferenced) {
                new_referenced = referenced.dereference_contents(path, robot);
                if (new_referenced && path.is_backside) {
                    return new_referenced.get_backside(true);
                }
                return new_referenced;
            }
            return referenced;
        },
        toString: function (a_path, to_string_info) {
            var prefix = "";
            var sub_path_string, path_description, original_string_info_resource;
            if (!a_path) {
                return "undefined path";
            }
            if (a_path.is_backside) {
                prefix = "the backside of ";
            }
            if (!to_string_info) {
                to_string_info = {};
            }
            original_string_info_resource = to_string_info.resource;
            to_string_info.resource = true;
            if (a_path.next) {
                sub_path_string = TT.path.toString(a_path.next, to_string_info);
                if (sub_path_string[sub_path_string.length-1] !== ' ') {
                    sub_path_string += ' ';
                }
                path_description = prefix + TT.path.toString(a_path.next, to_string_info).trim() + " of " + a_path.toString(to_string_info);
            } else {
                path_description = prefix + a_path.toString(to_string_info);
            }
            to_string_info.resource = original_string_info_resource;
            return path_description;
        },
        get_json: function (path, json_history, callback, start_time) {
            var json, new_callback, next_path_callback;
            if (!path.get_json) {
                callback(path, start_time); // is a constant
                return;
            }
            new_callback = function (json, start_time) {   
                if (path.is_widget) {
                    json = path.add_to_json(json, json_history);
                }
                if (path.next) {
                    next_path_callback = function (next_path_json) {
                        json.next_path = next_path_json;
                    };
                    TT.path.get_json(path.next, json_history, next_path_callback, start_time);
                }
                if (path.removing_widget) {
                    json.removing_widget = true;
                }
                if (path.not_to_be_dereferenced) {
                    json.not_to_be_dereferenced = true;
                }
                if (path.is_backside === true || (path.is_backside && path.is_backside())) {
                    // TODO: rationalise this -- in one case is_backside is a flag of a path 
                    // in the other the path is itself the backside of a widget
                    json.is_backside = true;
                }
                callback(json, start_time);
            };
            path.get_json(json_history, new_callback, start_time);
        },
        to_entire_context: function (to_string_info) {
            // an action that applies to the entire context (i.e. what the robot is working on)
            // need to create fresh ones since if there is a sub-path they shouldn't be sharing
            return {dereference_path: function (robot, widget) {
                        return TT.path.continue_dereferencing_path(this, widget, robot);
                    },
                    toString: function (to_string_info) {
                        if (to_string_info && to_string_info.robot) {
                            return to_string_info.robot.get_top_level_context_description(to_string_info);
                        }
                        if (to_string_info && to_string_info.person === "third") {
                            return "what he's working on";
                        }
                        return "what I'm working on";
                    },
                    get_json: function (json_history, callback, start_time) {
                        callback({type: "path.to_entire_context"}, start_time);
                    }
            };
        },
        to_widget_on_nest: function () {
            return {dereference_path: function (robot, widget) {
                        return TT.path.continue_dereferencing_path(this, widget, robot);
                    },
                    toString: function () {
                        return "what is on the nest";
                    },
                    get_json: function (json_history, callback, start_time) {
                        callback({type: "path.to_widget_on_nest"}, start_time);
                    }
            }; 
        },
        get_path_to_resource: function (widget) {
            // ignore the side information and just use the widget
            // revisit this if resources are ever backside resources
            if (!widget) {
                console.error("Widget missing in get_path_to_resource.");
            }
            widget = widget.get_widget(); // if widget is really the backside of the widget
            return {dereference_path: function (robot) {
                        var widget_copy = widget.copy({copying_resource: true});
                        var widget_frontside_element, widget_frontside_position, copy_frontside_element;
                        robot.add_newly_created_widget(widget_copy);
                        if (robot.visible()) {//} && !widget.visible()) {
                            // picking up a copy of a resource
                            // but robot isn't referring to the resource itself just the 'value'
                            widget_frontside_element = TT.UTILITIES.find_resource_equal_to_widget(widget, robot);
                            if (widget_frontside_element) {
                                widget_copy.save_dimensions_of(TT.UTILITIES.widget_side_of_element(widget_frontside_element));
                                copy_frontside_element = widget_copy.get_frontside_element();
                                widget_frontside_position = $(widget_frontside_element).position();
                                // TODO: determine if timeout still needed or could be replaced by DOM attachment callback
                                TT.UTILITIES.set_timeout(function ()  {
                                    $(copy_frontside_element).css({left:   widget_frontside_position.left,
                                                                   top:    widget_frontside_position.top,
                                                                   width:  $(widget_frontside_element).width(),
                                                                   height: $(widget_frontside_element).height()});
                                    });
                            }
                        }
                        return widget_copy;
                    },
                    toString: function (to_string_info) {
                        return TT.UTILITIES.add_a_or_an(widget.toString(to_string_info));
                    },
                    get_json: function (json_history, callback, start_time) {
                        var new_callback = function (json, start_time) {
                                               callback({type: "path.to_resource",
                                                         // following resets json_history since within a path there shouldn't be sharing with the 'outside'
                                                         // except for shared HTML (which is just an optimisation)
                                                         resource: json},
                                                        start_time);
                        };
                        widget.get_json(TT.UTILITIES.fresh_json_history(json_history), new_callback, start_time);
                    }
            };
        },
        get_path_to_backside_widget_of_context: function (backside_widget, robot) {
            var type_name;
            if (typeof backside_widget === 'string') {
                // old format
                // backside_widget is a type_name so return any bacvkside widget matching that type
                type_name = backside_widget;
                return {dereference_path: function (robot) {
                            var context = robot.get_context();
                            var referenced = robot.get_backside_widget_of_type(type_name, context);
                            if (!referenced) {
                                context.get_backside_widgets().some(function (backside_widget_side) {
                                    if (backside_widget_side.get_widget().is_of_type(type_name) &&
                                        // should be a widget that was there when robot matched backside conditions
                                        // not one that was created subsequently
                                        !robot.is_newly_created(backside_widget_side.get_widget())) {
                                        referenced = backside_widget_side.get_widget();
                                        return true; // stop searching
                                    }
                                });
                             }
                             if (referenced) {
                                return TT.path.continue_dereferencing_path(this, referenced, robot);
                             }
                       },
                       toString: function (to_string_info) {
                        var string = ((to_string_info && to_string_info.robot && to_string_info.robot.get_backside_conditions()) ? to_string_info.robot.get_backside_conditions()[type_name] :
                                                                                 TT.UTILITIES.add_a_or_an(type_name)) + 
                                     " on the back of what I'm working on";
                        if (this.removing_widget) {
                            return "what is on " + string;
                        }
                        return string;
                    },
                    get_json: function (json_history, callback, start_time) {
                            callback({type: "path.to_backside_widget_of_context",
                                      type_name: type_name},
                                     start_time);
                    }};
            }
            return this.get_path_to_backside_index_of_context(robot.get_backside_condition_index(backside_widget), backside_widget.get_type_name(), robot);   
        },
        get_path_to_backside_index_of_context: function (backside_index, type_name, robot) {
            // type_name is only used to generate better robot titles
            return {dereference_path: function (robot) {
                        var referenced = robot.get_backside_matched_widgets()[backside_index];
                        if (referenced) {
                            return TT.path.continue_dereferencing_path(this, referenced, robot);
                        }
                        // else signal an error?
                        if (TT.debugging) {
                            console.log("can this happen?"); 
                        }     
                    },
                    toString: function (to_string_info) {
                        var conditions =  robot.get_frontside_conditions();
                        var back = conditions && conditions.is_top_level() ? "work area" : "back of what";
                        var string = TT.UTILITIES.add_a_or_an(type_name || "thing") + 
                                     " on the " + back + " I'm working on";
                        if (this.removing_widget) {
                            return "what is on " + string;
                        }
                        return string;
                    },
                    get_json: function (json_history, callback, start_time) {
                        callback({type: "path.to_backside_widget_of_context",
                                  type_name: type_name,
                                  backside_index: backside_index},
                                 start_time);
                    }
            };
        },
        create_from_json: function (json, additional_info) {
            var path = TT.UTILITIES.create_from_json(json, additional_info);
            if (json.next_path) {
                path.next = this.create_from_json(json.next_path, additional_info);
            }
            if (json.removing_widget) {
                path.removing_widget = true;
            }
            if (json.not_to_be_dereferenced) {
                path.not_to_be_dereferenced = true;
            }
            if (json.is_backside) {
                path.is_backside = true;
            }
            return path;
        },
        top_level_backside: {
            // this can be shared by all since only used to drop on -- not to pick up
            // if pick up then needs to be a fresh copy like get_path_to_resource
            dereference_path: function (robot) {
                var top_level_widget = robot.get_context().ancestor_of_type('top-level');
                if (top_level_widget) {
                    return top_level_widget;
                }
                // might be running on a web page without a top-level backside_widget
                if (!default_top_level_widget) {
                    default_top_level_widget = TT.widget.create_top_level_widget();
                }
                return default_top_level_widget;
            },
            toString: function () {
                return "the top-level backside";
            },
            get_json: function (json_history, callback, start_time) {
                callback({type: "path.top_level_backside"}, start_time);
            }
        }
    };

}(window.TOONTALK));