 /**
 * Implements ToonTalk's path to widgets to enable robots to reference widgets
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
            if (widget_type === "element attribute") { 
                return TT.element.create_attribute_path(widget, robot);
            }
            // context is undefined something is wrong much earlier
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
                var backside_widget = backside_widget_side.widget;
                var sub_path;
                if (backside_widget === widget) {
                    path = TT.path.get_path_to_backside_widget_of_context(backside_widget.get_type_name());
                    return true; // stop searching
                } else if (backside_widget.get_path_to) {
                    // e.g. might be in a box
                    sub_path = backside_widget.get_path_to(widget, robot);
                    if (sub_path) {
                        path = TT.path.get_path_to_backside_widget_of_context(backside_widget.get_type_name());
                        path.next = sub_path;
                        return true; // stop searching
                    }
                }
            });
            if (path) {
                return path;
            }
            return TT.path.get_path_to_resource(widget.copy());
//             console.log("TT.path.get_path_to not fully implemented.");
        },
        dereference_path: function (path, context, robot) {
            if (path) {
                if (path.dereference) {
                    return path.dereference(context, robot);
                }
                return context.dereference(path, robot);
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
        get_json: function (a_path) {
            var json = a_path.get_json();
            if (a_path.next) {
                json.next_path = TT.path.get_json(a_path.next);
            }
            return json;
        },
        create_from_json: function (json, additional_info) {
            var path = TT.UTILITIES.create_from_json(json, additional_info);
            var next_path;
            if (json.next_path) {
                next_path = TT.UTILITIES.create_from_json(json.next_path, additional_info);
                path.next = next_path;
            }
            return path;
        },
        to_entire_context: function () {
            // an action that applies to the entire context (i.e. what the robot is working on)
            // need to create fresh ones since if there is a sub-path they shouldn't be sharing
            return {dereference: function (context, robot) {
                        if (this.next) {
                            if (context.dereference) {
                                return context.dereference(this.next, robot);
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
                    }
            };
        },
        entire_context_create_from_json: function () {
            return TT.path.to_entire_context();
        },
        get_path_to_resource: function (widget) {
            if (widget.widget) {
                // ignore the side information and just use the widget
                // revisit this if resources are ever backside resources
                widget = widget.widget;
            }
            return {dereference: function (context, robot) {
                        var widget_copy = widget.copy();
                        var widget_frontside_element, copy_frontside_element;
                        robot.add_newly_created_widget(widget_copy);
                        if (robot.visible() && !widget.visible()) {
                            // picking up a copy of a resource
                            // but robot isn't referring to the resource itself just the 'value'
                            widget_frontside_element = TT.UTILITIES.find_resource_equal_to_widget(widget);
                            if (widget_frontside_element) {
                                copy_frontside_element = widget_copy.get_frontside_element();
                                setTimeout(function ()  {
                                    $(copy_frontside_element).css({width:  widget_frontside_element.offsetWidth,
                                                                   height: widget_frontside_element.offsetHeight});
                                    },
                                    0);
                            }
                        }
                        return widget_copy;
                    },
                    toString: function () {
                        return TT.UTILITIES.add_a_or_an(widget.toString());
                    },
                    get_json: function () {
                        return {type: "path.to_resource",
                                resource: TT.path.get_json(widget)};
                    }
            };
        },
        path_to_resource_create_from_json: function (json) {
            return TT.path.get_path_to_resource(TT.UTILITIES.create_from_json(json.resource));
        },
        get_path_to_backside_widget_of_context: function (type_name) {
             return {dereference: function (context, robot) {
                        var referenced;
                        context.backside_widgets.some(function (backside_widget_side) {
                            if (backside_widget_side.widget.get_type_name() === type_name) {
                                referenced = backside_widget;
                                return true; // stop searching
                            }
                        });
                        if (referenced) {
                            if (this.next) {
                                if (referenced.dereference) {
                                    return referenced.dereference(this.next, robot);
                                } else {
                                    console.log("Expected " + referenced + " to support dereference.");
                                }                
                            }
                            return referenced;
                        }
                    },
                    toString: function () {
                        return "the " + type_name + " on the back of what he's working on";
                    },
                    get_json: function () {
                        return {type: "path.to_backside_widget_of_context",
                                type_name: type_name};
                    }
            };
        },
        path_to_backside_widget_of_context_create_from_json: function (json) {
            return TT.path.get_path_to_backside_widget_of_context(json.type_name)
        },
        top_level_backside: {
            // this can be shared by all since only used to drop on -- not to pick up
            // if pick up then needs to be a fresh copy like get_path_to_resource
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