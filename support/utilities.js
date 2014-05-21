 /**
 * Implements ToonTalk's JavaScript functions shared between files
 * Authors: Ken Kahn
 * License: New BSD
 */
 
/*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */

// jQuery.event.props.push('dataTransfer'); // some posts claim this needed -- unsure...

window.TOONTALK.UTILITIES = 
(function (TT) {
    "use strict";
    var dragee;
    var json_creators = {"box": TT.box.create_from_json,
                         "number": TT.number.create_from_json,
                         "robot": TT.robot.create_from_json,
                         "element": TT.element.create_from_json,
                         "body": TT.actions.create_from_json,
                         "robot_action": TT.robot_action.create_from_json,
                         "box_path": TT.box.path.create_from_json,
                         "path.to_entire_context": TT.path.entire_context_create_from_json,
                         "path.top_level_backside": TT.path.top_level_backside.create_from_json,
                         "path.to_resource": TT.path.path_to_resource_create_from_json,
                         "newly_created_widgets_path": TT.newly_created_widgets_path.create_from_json,
                         "path.to_backside_widget_of_context": TT.path.path_to_backside_widget_of_context_create_from_json,
                         "path_to_style_attribute": TT.element.create_path_from_json,
                         "top_level": TT.widget.top_level_create_from_json};
    // id needs to be unique across ToonTalks due to drag and drop
    var id_counter = new Date().getTime();
    var div_open = "<div class='toontalk-json'>";
    var div_close = "</div>";
    var toontalk_json_div = function (json) {
        // convenience for dragging into documents (e.g. Word or WordPad -- not sure what else)
        return div_open + json + div_close;
    };    
    var extract_json_from_div_string = function (div_string) {
        // expecting div_string to begin with div_open and end with div_close
        // but users may be dragging something different
        var json_start = div_string.indexOf('{');
        var json_end = div_string.lastIndexOf('}');
        if (json_start < 0 || json_end < 0) {
//             console.log("Paste missing JSON encoding.");
            return;
        }
        return div_string.substring(json_start, json_end+1);
    };
    var handle_drop = function ($target, $source, source_widget, target_widget, target_position, event, json_object, drag_x_offset, drag_y_offset, source_is_backside) {
        var drop_handled = true;
        var new_target;
        if ($target.is(".toontalk-backside")) {
            // widget_dropped_on_me needed here to get geometry right
            if (source_widget) {
                target_widget.get_backside().widget_dropped_on_me(source_widget, source_is_backside, event);
            } else {
                console.log("No source_widget");
            }
            // should the following use pageX instead?
            // for a while using target_position.top didn't work while
            // $target.get(0).offsetTop did and then it stopped working
            // not sure what is happening or even whey they are different
            // consider also using layerX and layerY
            if (!drag_x_offset) {
                drag_x_offset = 0;
            }
            if (!drag_y_offset) {
                drag_y_offset = 0;
            }
            $source.css({
                left: event.originalEvent.pageX - (target_position.left + drag_x_offset),
                top: event.originalEvent.pageY - (target_position.top + drag_y_offset)
            });
            if ($source.is(".toontalk-frontside") && !$source.is('.ui-resizable')) {
                // without the setTimeout the following prevents dragging components (e.g. widgets in boxes)
                setTimeout(function () {
                        $source.resizable({
                            resize: function (event, ui) {
                                TT.DISPLAY_UPDATES.pending_update(source_widget);
                            },
                            // the corner handles looked bad on element widgets
                            // and generally got in the way
                            handles: "n,e,s,w"
                        });
                    },
                    0);
            }
            if (json_object && json_object.semantic.running) {
                source_widget.set_running(true);
            }
        } else if ($target.is(".toontalk-drop-area")) {
            $source.addClass("toontalk-widget-in-drop_area");
            $target.append($source.get(0));
            if ($source.is(".toontalk-robot")) {
                $target.data("drop_area_owner").set_next_robot($source.data("owner"));
            }
            drop_handled = true;
        } else if (!target_widget) {
            console.log("target element has no 'owner'");
            return; // let event propagate
        } else if (source_widget.drop_on && source_widget.drop_on(target_widget, $target, event)) {
            drop_handled = true;
        } else if (target_widget.widget_dropped_on_me && target_widget.widget_dropped_on_me(source_widget, source_is_backside, event)) {
            drop_handled = true;
        } else {
            // ignore the current target and replace with the backside it is on
            new_target = $target.closest(".toontalk-backside");
            if (new_target.length > 0) {
                target_widget = new_target.data("owner");
                if (target_widget) {
                    target_widget.get_backside().widget_dropped_on_me(source_widget, source_is_backside, event);
                    // place it directly underneath the original target
                    $source.css({
                        left: $target.position().left,
                        top: $target.position().top + $target.height()
                    });
                    drop_handled = true;
                }
            }
        }
        if (target_widget && !drop_handled) {
            // is the obsolete? If so is drop_handled?
            if (target_widget.widget_dropped_on_me) {
                target_widget.widget_dropped_on_me(source_widget, source_is_backside, event);
            }
        }
    };
    var handle_drop_from_file_contents = function (file, $target, target_widget, target_position, event) {
        var reader = new FileReader();
        var image_file = file.type.indexOf("image") === 0;
        var widget, json, element_HTML;
        reader.onloadend = function () {
            if (image_file) {
                widget = TT.element.create("<img src='" + reader.result + "' alt='" + file.name + "'/>");
            } else {
                json = extract_json_from_div_string(reader.result);
                if (json) {
                    try {
                        widget = TT.UTILITIES.create_from_json(JSON.parse(json));
                    } catch (e) {
                        // no need to report this is need not contain ToonTalk JSON
                        // console.log("Exception parsing " + json + "\n" + e.toString());
                    }
                }
                if (!widget) {
                    // just use the text as the HTML
                    widget = TT.element.create(reader.result);
                }
            }
            handle_drop($target, $(widget.get_frontside_element(true)), widget, target_widget, target_position, event);
        }
        if (image_file) {
            reader.readAsDataURL(file);
        } else {
            reader.readAsText(file);
        }
    };
    var initialise = function () {
        var includes_top_level_backside = false;
        TT.debugging = true; // remove this for production releases
        $(".toontalk-json").each(
            function (index, element) {
                var json_string = element.textContent;
                var json, widget, frontside_element, backside_element, backside;
                if (!json_string) {
                    return;
                }
                json = JSON.parse(json_string);
                widget = TT.UTILITIES.create_from_json(json);
                if (widget) {
                    element.textContent = ""; // served its purpose of being parsed as JSON
                    if (json.view.backside) {
                        backside = widget.get_backside(true);
                        backside_element = backside.get_element();
                        $(element).replaceWith(backside_element);
                        $(backside_element).css({width: json.view.backside_width,
                                                 height: json.view.backside_height,
                                                 // color may be undefined
                                                 "background-color": json.view.background_color});
                        includes_top_level_backside = true;
                    } else {
                        $(element).addClass("toontalk-top-level-resource");
                        frontside_element = widget.get_frontside_element();
                        $(frontside_element).addClass("toontalk-top-level-resource");
                        element.appendChild(frontside_element);
                        // delay until geometry settles down
                        setTimeout(function () {
                            widget.update_display();
                            if (json.semantic.running) {
                                widget.set_running(true);
                            }
                        },
                        1);
                    }
                } else {
                    console.log("Could not recreate a widget from this JSON: " + json_string);
                }
            });
            if (!includes_top_level_backside) {
                // since there is no backside 'work space' need a way to turn things off
                $(document).click(function () {
                    $(".toontalk-frontside").each(function (index, element) {
                        var widget = $(element).data("owner");
                        if (widget && widget.set_running) {
                            widget.set_running(false); // !widget.get_running());
                        }
                    });
                });
            }
//             var backside = TT.backside.create(TT.widget.top_level_widget());
//             var backside_element = backside.get_element();
//             var $backside_element = $(backside_element);
//             $("body").append(backside_element);
//             $backside_element.addClass("toontalk-top-level-backside");
//             backside_element.draggable = false;
            TT.QUEUE.run();
            window.addEventListener('beforeunload', function (event) {
                var message = "Have you saved your creations by dragging them to a program such as WordPad?";
                event.returnValue = message;
                return message;
            });
        };
    $(document).ready(initialise);
    return {
        create_from_json: function (json, additional_info) {
            var widget, side_element, backside_widgets, json_semantic, json_view;
            if (!json) {
                // was undefined and still is
                return;
            }
            if (json.widget) {
                // is a context where need to know which side of the widget
                return {widget: TT.UTILITIES.create_from_json(json.widget, additional_info),
                        is_backside: json.is_backside};
            }
            json_semantic = json.semantic;
            if (!json_semantic) {
                // e.g. body, paths, etc.
                json_semantic = json;
            }
            json_view = json.view;
            if (json_creators[json_semantic.type]) {
                widget = json_creators[json_semantic.type](json_semantic, json_view, additional_info);
            } else {
                console.log("json type '" + json_semantic.type + "' not yet supported.");
                return;
            }
            if (widget) {
                if (json_semantic.erased) {
                    TT.widget.erasable(widget);
                    widget.set_erased(json_semantic.erased);
                }
                if (json_semantic.infinite_stack) {
                    widget.set_infinite_stack(json_semantic.infinite_stack);
                }
                if (json_view && json_view.frontside_width) {
                    side_element = json.view.backside ? widget.get_backside(true).get_element() : widget.get_frontside_element();
                    $(side_element).css({width: json_view.frontside_width,
                                         height: json_view.frontside_height});
                }
                if (json_view && json_view.backside_geometry) {
                    widget.backside_geometry = json_view.backside_geometry;                    
                }
                if (json_semantic.backside_widgets) {
                    backside_widgets = this.create_array_from_json(json_semantic.backside_widgets);
                    widget.set_backside_widget_sides(backside_widgets, json_semantic.backside_widgets.map(function (json) { return json.widget.view; }));
                }
            }
            return widget;
        },
        
        create_array_from_json: function (json_array, additional_info) {
            var new_array = [];
            json_array.forEach(function (json_item, index) {
                if (json_item) {
                    new_array[index] = TT.UTILITIES.create_from_json(json_item, additional_info);
                }
            });
            return new_array;
        },
        
        get_json_of_array: function (array) {
            var json = [];
            array.forEach(function (widget_side, index) {
                if (widget_side) {
                    if (!widget_side.widget) {
                        if (widget_side.get_type_name) {
                            // older scheme where 'naked' widget is there meaning frontside
                            json[index] = {widget: widget_side.get_json()};
                        } else {
                            // isn't a widget -- e.g. is a path
                            json[index] = widget_side.get_json();
                        }
                    } else if (widget_side.widget.get_json) {
                        json[index] = {widget: widget_side.widget.get_json(),
                                       is_backside: widget_side.is_backside};
                    } else {
                        console.log("No get_json for " + array[i].toString());
                    }
                }
            });
            return json;
        },
        
        copy_widgets: function (widgets, just_value) {
            // rewrite using map
            var widgets_copy = [];
            var i;
            for (i = 0; i < widgets.length; i++) {
                widgets_copy[i] = widgets[i].copy(just_value);
            }
            return widgets_copy;
        },
        
        copy_widget_sides: function (widget_sides, just_value) {
            return widget_sides.map(function (widget_side) {
                return {widget: widget_side.widget.copy(just_value),
                        is_backside: widget_side.is_backside};
            });
        },
        
        copy_array: function (array) {
            return array.slice();
        },
        
        generate_unique_id: function () {
            id_counter += 1;
            return 'toontalk_id_' + id_counter;
        },
        
        get_style_property: function (element, style_property) {
            if (element.currentStyle) {
                return element.currentStyle[style_property];
            } 
            if (window.getComputedStyle) {
                 return document.defaultView.getComputedStyle(element, null).getPropertyValue(style_property);
            }
        },

        get_style_numeric_property: function (element, style_property) {
            var as_string = this.get_style_property(element, style_property);
            var index;
            if (typeof as_string === 'string') {
                index = as_string.indexOf('px');
                if (index >= 0) {
                    as_string = as_string.substring(0, index);
                }
                return parseInt(as_string, 10);
            }
            return as_string;
        },
        
        data_transfer_json_object: function (event) {
            var data, json;
            if (!event.originalEvent.dataTransfer) {
                console.log("no dataTransfer in drop event");
                return;
            }
            // following code could be simplified by using event.originalEvent.dataTransfer.types
            // unless in IE9 should use text/html to enable dragging of HTML elements
            try {
                // the following causes errors in IE9
                data = event.originalEvent.dataTransfer.getData("text/html");
            } catch (e) {
                // should only occur in IE9
                data = event.originalEvent.dataTransfer.getData("text");
            }
            if (!data || data.match(/[\u3400-\u9FBF]/)) {
                // match(/[\u3400-\u9FBF]/) tests for Chinese which FireFox does
                // see https://bugzilla.mozilla.org/show_bug.cgi?id=900414
                // may not have been text/html but just plain text
                data = event.originalEvent.dataTransfer.getData("text");
                if (data) {
                    data = "<div class='ui-widget'>" + data + "</div>";
                }
            }
            if (!data) {
                console.log("No data in dataTransfer in drop.");
                return;
            }
            json = extract_json_from_div_string(data);
            if (!json) {
                return TT.element.create(data).get_json();
            }
            try {
                return JSON.parse(json);
            } catch (e) {
                console.log("Exception parsing " + json + "\n" + e.toString());
            }
        },
        
        drag_and_drop: function ($element) {
            TT.UTILITIES.draggable($element);
            TT.UTILITIES.can_receive_drops($element);
        },
        
        draggable: function ($element) {
            $element.attr("draggable", true);
            // JQuery UI's draggable causes dataTransfer to be null
            // rewrote after noticing that this works fine: http://jsfiddle.net/KWut6/
            $element.on('dragstart', 
                function (event) {
                    var $source_element = $(event.originalEvent.srcElement).closest(".toontalk-side");
                    var position, json_object, json_div, widget, is_resource;
                    if (event.originalEvent.dataTransfer.getData("text/plain").length > 0) {
                        // e.g. dragging some text off the backside of a widget
                        return;
                    }
                    dragee = ($source_element || $element);
                    widget = dragee.data("owner");
                    if (!widget) {
                        widget = $element.data("owner");
                        dragee = $element;
                    }
                    position = dragee.get(0).getBoundingClientRect()
                    is_resource = dragee.is(".toontalk-top-level-resource");
                    if (dragee.is(".toontalk-frontside")) {
                        // save the current dimension so size doesn't change while being dragged
                        dragee.css({width:  this.offsetWidth + "px",
                                    height: this.offsetHeight + "px"});
                    }
                    if (event.originalEvent.dataTransfer && widget.get_json) {
                        event.originalEvent.dataTransfer.effectAllowed = is_resource ? 'copy' : 'move';
                        json_object = widget.get_json();
                        // not sure if the following is obsolete
                        json_object.view.drag_x_offset = event.originalEvent.clientX - position.left;
                        json_object.view.drag_y_offset = event.originalEvent.clientY - position.top;
                        if (!json_object.width) {
                            if (dragee.parent().is(".toontalk-backside")) {
                                json_object.view.original_width_fraction = dragee.outerWidth() / dragee.parent().outerWidth();
                                json_object.view.original_height_fraction = dragee.outerHeight() / dragee.parent().outerHeight();
                            } else {
                                // following should be kept in synch with toontalk-frontside-on-backside CSS
                                json_object.view.original_width_fraction = 0.2;
                                json_object.view.original_height_fraction = 0.1;
                            }
                        }
                        if (dragee.is(".toontalk-backside")) {
                            json_object.view.backside = true;
                        }
                        $element.data("json", json_object);
                        json_div = toontalk_json_div(JSON.stringify(json_object));
                        event.originalEvent.dataTransfer.setData("text/html", json_div);
                        // the above causes IE9 errors when received so the following added just for IE9
                        event.originalEvent.dataTransfer.setData("text", json_div);
                        widget.drag_started(json_object, is_resource);
                    }
                    $element.addClass("toontalk-being-dragged");
                    event.stopPropagation();
//                     console.log("drag start. dragee is " + dragee);
                });
            $element.on('dragend', 
                function (event) {
//                     console.log("drag end. dragee is " + dragee);
                    $element.removeClass("toontalk-being-dragged");
                    if (!dragee) {
                        dragee = $(event.originalEvent.srcElement).closest(".toontalk-side");
                    }
                    if (dragee.is(".toontalk-frontside")) {
                        if (dragee.parent().is(".toontalk-backside")) {
                            // restore ordinary size styles
                            var json_object = dragee.data("json");
                            if (json_object) {
                                dragee.data("json", ""); // no point wasting memory on this anymore
                                dragee.css({width:  json_object.view.frontside_width || json_object.view.original_width_fraction * 100 + "%",
                                            height: json_object.view.frontside_height || json_object.view.original_height_fraction * 100 + "%"});
                            }
                        } else if (!dragee.parent().is(".toontalk-top-level-resource, .toontalk-drop-area")) {
                            dragee.css({width:  "100%",
                                        height: "100%"});
                        }
                    }
                    // restore events to decendants
                    $element.find("*").removeClass("toontalk-ignore-events");
                    dragee = undefined;
                    event.stopPropagation();
                });       
        },
        
        can_receive_drops: function ($element) {
            $element.on('dragover',
                function (event) {
                    // think about drop feedback
                    event.preventDefault();
                    return false;
                });
            $element.on('drop',
                function (event) {
                    var $source, source_widget, $target, target_widget, drag_x_offset, drag_y_offset, target_position, new_target, source_is_backside, $container, container, i;
                    var json_object = TT.UTILITIES.data_transfer_json_object(event);
                    // should this set the dropEffect? https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer#dropEffect.28.29 
                    // prevent default first so if there is an exception the default behaviour for some drags of going to a new page is prevented
                    event.preventDefault();
                    // restore events to decendants
                    $element.find("*").removeClass("toontalk-ignore-events");
//                     console.log("drop. dragee is " + dragee);
                    $source = dragee;
                    if (!$source && !json_object && !event.originalEvent.dataTransfer.files) {
                        if (!event.originalEvent.dataTransfer) {
                            console.log("Drop failed since there is no event.originalEvent.dataTransfer");
                        } else {
                            console.log("Drop failed since unable to parse as JSON."); 
                        }
                        dragee = undefined;
                        // without the following it may load a new page
                        event.stopPropagation();
                        return;
                    }
                    if ($(event.target).is(".toontalk-drop-area-instructions")) {
                        $target = $(event.target).parent();
                    } else if ($(event.target).is(".toontalk-element-attribute-input")) {
                        // should work for any input -- need to generalise this
                        $target = $(event.target).closest(".toontalk-side");
                        target_widget = $target.data("owner");
                        if (target_widget) {
                            if ($source) {
                                source_widget = $source.data("owner");
                            } else {
                                source_widget = TT.UTILITIES.create_from_json(json_object);
                            }
                            TT.UTILITIES.restore_resource($source, source_widget);
                            target_widget.dropped_on_style_attribute(source_widget, event.target.name);
                            event.stopPropagation();
                            return;
                        }
                    } else if ($(event.target).is(".toontalk-drop-area")) {
                        $target = $(event.target);
                    } else {
                        // closest includes 'self'
                        $target = $(event.target).closest(".toontalk-side");
                    }
                    if ($target.length === 0) {
                        dragee = undefined;
                        return;
                    }
                    // if this is computed when needed and  if dragging a resource it isn't the correct value
                    target_position = $target.offset();
                    $target.removeClass("toontalk-highlight");
                    if ($source && $source.length > 0 &&
                        ($source.get(0) === $target.get(0) || jQuery.contains($source.get(0), $target.get(0)))) {
                        if ($source.is(".toontalk-top-level-backside")) {
                            return; // let event propagate since this doesn't make sense
                        }
                        // not dropping on itself but on the widget underneath
                        // to not find $target again temporarily hide it
                        $target.hide();
                        new_target = document.elementFromPoint(event.originalEvent.pageX, event.originalEvent.pageY);
                        $target.show();
                        if (new_target) {
                            $target = $(new_target).closest(".toontalk-side");
                        }
                    }
                    target_widget = $target.data("owner");
                    if (json_object && json_object.view && json_object.view.drag_x_offset) {
                        drag_x_offset = json_object.view.drag_x_offset;
                        drag_y_offset = json_object.view.drag_y_offset;
                    } else {
                        drag_x_offset = 0;
                        drag_y_offset = 0;
                    }
                    if ($source && $source.length > 0) {
                        if ($source.get(0) === $target.get(0) || jQuery.contains($source.get(0), $target.get(0))) {
                            // dropped of itself or dropped on a part of itself
                            // just moved it a little bit
                            // only called now that elementFromPoint is used to find another target when dropped on part of itself
                            $source.css({left: $source.get(0).offsetLeft + (event.originalEvent.layerX - drag_x_offset),
                                          top: $source.get(0).offsetTop + (event.originalEvent.layerY - drag_y_offset)});
                            event.stopPropagation();
                            dragee = undefined;
                            return;
                        }
                        source_is_backside = $source.is(".toontalk-backside");
                        source_widget = $source.data("owner");
                        if ($source.parent().is(".toontalk-drop-area")) {
                            $source.removeClass("toontalk-widget-in-drop_area");
                            $source.parent().data("drop_area_owner").set_next_robot(undefined);
                        } else {
                            $container = $source.parents(".toontalk-side:first");
                            container = $container.data("owner");
                            if (container) {
                                if (!source_is_backside && source_widget.get_infinite_stack()) {
                                    // leave the source there but create a copy
                                    source_widget = source_widget.copy();
                                    $source = $(source_widget.get_frontside_element(true));
                                    if ($target.is(".toontalk-backside")) {
                                        $source.css({width:  json_object.view.frontside_width,
                                                     height: json_object.view.frontside_height});
                                    }
                                } else {
                                    container.removed_from_container(source_widget, source_is_backside, event);
                                }
                            } else {
                                TT.UTILITIES.restore_resource($source, source_widget);
                            }
                            if (TT.robot.in_training) {
                                // maybe have been copied
                                // or removed from a container (and not 'seen' before)
                                TT.robot.in_training.add_newly_created_widget_if_new(source_widget);
                            }
                        }
                    } else {
                        if (event.originalEvent.dataTransfer.files.length > 0) {
                            // forEach doesn't work isn't really an array
                            for (i = 0; i < event.originalEvent.dataTransfer.files.length; i++) {
                                handle_drop_from_file_contents(event.originalEvent.dataTransfer.files[i], $target, target_widget, target_position, event);
                            };
                            event.stopPropagation();
                            return;
                        } else {
                            source_widget = TT.UTILITIES.create_from_json(json_object);
                        }
                        if (!source_widget) {
                            console.log("Unable to construct a ToonTalk widget from the JSON.");
                            dragee = undefined;
                            event.stopPropagation();
                            return;
                        }
                        source_is_backside = json_object.view.backside;
                        if (source_is_backside) {
                            $source = $(source_widget.get_backside_element());
                            $source.css({width: json_object.view.backside_width,
                                         height: json_object.view.backside_height,
                                         // color may be undefined
                                         "background-color": json_object.view.background_color});
                        } else {
                            $source = $(source_widget.get_frontside_element());
                        }
                    }    
                    if (source_widget === target_widget) {
                        // dropping front side on back side so ignore
                        dragee = undefined;
                        event.stopPropagation();
                        return;
                    }
                    handle_drop($target, $source, source_widget, target_widget, target_position, event, json_object, drag_x_offset, drag_y_offset, source_is_backside);
                    event.stopPropagation();
                    dragee = undefined;
                });
            $element.on('dragenter', function (event) {
//              console.log($element.get(0).className); -- not clear why this is never triggered for inputs on backside
//              probably because backside itself has a dragenter?
                if (!$element.is(".toontalk-top-level-backside") && 
                    !$element.is(".toontalk-top-level-resource") &&
                    !$element.is(".toontalk-being-dragged")) {
                    $element.addClass("toontalk-highlight");
                    // moving over decendants triggers dragleave unless their pointer events are turned off
                    // they are restored on dragend
                    if (!$element.is(".toontalk-backside") && $element.data("owner").get_type_name() !== 'box') {
                        // this breaks the dropping of elements on empty holes so not supported
                        $element.find("*").addClass("toontalk-ignore-events");
                        // except for toontalk-sides and their ancestors since they are OK to drop on
                        // following was intended to deal with box holes but didn't work
//                         $element.find(".toontalk-side").parents().removeClass("toontalk-ignore-events");
                    }
                }
                event.stopPropagation();
            });
            $element.on('dragleave', function (event) {
                if (!$element.is(".toontalk-top-level-backside") && !$element.is(".toontalk-top-level-resource")) {
                    $element.removeClass("toontalk-highlight");
                }
                event.stopPropagation();
            });
//                $element.on('mousemove', function (event) {
//                    if (dragee && dragee !== $lement.get(0) && !$element.is(".toontalk-top-level-backside") && !$element.is(".toontalk-top-level-resource")) {
//                        $element.addClass("toontalk-highlight");
//                    }
//                 });
            // following provides mouseevents rather than dragstart and the like
            // which doesn't have a dataTransfer attribute
//             $element.draggable({
//                 create: function (event, ui) {
//                     $(this).css({position: "absolute"})
//                 },
// //                  appendTo: $element.parents(".toontalk-side:last"), // top-most
//                 greedy: true,
// //                 containment: false, // doesn't seem to work... -- nor does "none"
//                 stack: ".toontalk-side",
//             }); 
        },
        
        create_drop_area: function (instructions) {
            // instructions can be HTML or plain text
            var $drop_area = $(document.createElement("div"));
            var drop_area_instructions = document.createElement("div");
            drop_area_instructions.innerHTML = instructions;
            $(drop_area_instructions).addClass("toontalk-drop-area-instructions ui-widget");
            $drop_area.addClass("toontalk-drop-area");
            $drop_area.append(drop_area_instructions);
            TT.UTILITIES.can_receive_drops($drop_area);
            return $drop_area;
        },
        
//         absolute_position: function ($element) {
//             var element_position;
//             var absolute_position = {left: 0, top: 0};
//             while ($element.parent().length > 0) {
//                 element_position = $element.position();
//                 absolute_position.left += element_position.left;
//                 absolute_position.top += element_position.top;
//                 $element = $element.parent();
//             }
//             return absolute_position;
//         },
        
        set_absolute_position: function ($element, absolute_position) {
            var ancestor_position;
            var $ancestor = $element.parent();
            while (!$ancestor.is("html")) {
                ancestor_position = $ancestor.position();
                absolute_position.left -= ancestor_position.left;
                absolute_position.top -= ancestor_position.top;
                $ancestor = $ancestor.parent();
            }
            $element.css({left: absolute_position.left,
                          top:  absolute_position.top,
                          position: "absolute"});
        },
        
        restore_resource: function ($dropped, dropped_widget) {
            var dropped_copy, dropped_element_copy;
            if ($dropped.is(".toontalk-top-level-resource")) {
                // restore original
                dropped_copy = dropped_widget.copy();
                dropped_element_copy = dropped_copy.get_frontside_element();
                $(dropped_element_copy).css({width:  $dropped.width(),
                                             height: $dropped.height()});
                $dropped.removeClass("toontalk-top-level-resource");
                $(dropped_element_copy).addClass("toontalk-top-level-resource");
                $dropped.get(0).parentElement.appendChild(dropped_element_copy);
//                 $dropped.parent().append(dropped_element_copy);
                TT.DISPLAY_UPDATES.pending_update(dropped_copy);
            }
        },
        
        find_resource_equal_to_widget: function (widget) {
            var element_found;
            $(".toontalk-top-level-resource").each(function (index, element) {
                var $resource_element = $(element).children(":first");
                var owner = $resource_element.data("owner");
                if (owner && widget.equals(owner)) {
                    element_found = $resource_element.get(0);
                    return false; // stop the 'each'
                }
            });
            return element_found;
        },
        
//         recursively_change_dimensions_to_percentages: function ($element) {
//             var parent_width = $element.width();
//             var parent_height = $element.height();
//             $element.children().each(function (index, child) {
//                 if (!$(child).is(".ui-resizable-handle")) {
//                     var child_width = $(child).width();
//                     var child_height = $(child).height();
//                     var width_percentage = Math.min(100, (100 * child_width / parent_width)) + "%";
//                     var height_percentage = Math.min(100, (100 * child_height / parent_height)) + "%";
//                     $(child).css({width: width_percentage,
//                                   height: height_percentage});
//                     TT.UTILITIES.recursively_change_dimensions_to_percentages($(child));
//                 }
//             });
//         },
        
        set_position_absolute: function (element, absolute, event) {
            var position, left, top, ancestor;
            if (event) {
                // either DOM or JQuery event
                if (event.originalEvent) {
                    event = event.originalEvent;
                }
            }
            if (absolute) {
//                 if (element.style.position === "absolute") {                    
//                     if (!event || (event.pageX === event.clientX && event.pageY === event.clientY)) {
//                         // is already absolute and no need to adjust for scrolling
//                         return;
//                     }
//                 }
//                 if (event) {
//                     left = event.pageX;
//                     top = event.pageY;
//                     ancestor = element.parentElement;
//                     while (ancestor) {
//                         left -= ancestor.offsetLeft;
//                         top -= ancestor.offsetTop;
//                         ancestor = ancestor.parentElement;
//                     }
//                 } else {
                    position = $(element).position();
                    left = position.left;
                    top = position.top;
//                 }
                $(element).css({left: left,
                                 top: top,
                                 position: "absolute"});
            } else {
                element.style.position = "static";
            }
        },
        
        cardinal: function (n) {
            switch (n) {
                case 0:
                return "first";
                case 1:
                return "second";
                case 2:
                return "third";
                default:
                return n + "th";
            }
        },
        
        add_one_shot_transition_end_handler: function (element, handler) {
            // could replace the first part of this by http://api.jquery.com/one/
            var handler_run = false;
            var one_shot_handler = function () {
                // could support any number of parameters but not needed
                handler_run = true;
                if (handler) {
                    handler();
                }
                element.removeEventListener("transitionend", one_shot_handler);
            }
            element.addEventListener("transitionend", one_shot_handler);
            // transitionend events might not be triggered
            // As https://developer.mozilla.org/en-US/docs/Web/Guide/CSS/Using_CSS_transitions says: 
            // The transitionend event doesn't fire if the transition is aborted because the animating property's value is changed before the transition is completed.
            setTimeout(
                function () {
                    if (!handler_run) {
                        one_shot_handler();
                    }
                },
                2500);
        },
        
        highlight_element: function (element, duration) {
            if (!duration) {
                duration = 1000;
            }
            $(element).addClass("toontalk-highlight");
            setTimeout(function () {
                $(element).removeClass("toontalk-highlight");
            },
            duration);
        },
        
//         add_frontside_element_to_container: function (widget, widget_with_container) {
//             var widget_frontside_element = widget.get_frontside_element();
//             var element_with_container = widget_with_container.get_frontside_element();
//             var element_with_container_position = $(element_with_container).position();
//             var element_with_container_width = $(element_with_container).width();
//             var element_with_container_height = $(element_with_container).height();
// //             element_with_container.appendChild(widget_frontside_element);
//             $(element_with_container).closest(".toontalk-side").append(widget_frontside_element);
//             $(widget_frontside_element).css({left: element_with_container_position.left + element_with_container_width * 0.25,
//                                              top: element_with_container_position.top + element_with_container_height * 0.75,
//                                              width: element_with_container_width/2,
//                                              height: element_with_container_height/2});
//             widget_frontside_element.style.zIndex = 1000;
//         },            
        
        cursor_of_image: function (url) {
            var extensionStart = url.lastIndexOf('.');
            if (extensionStart >= 0) {
                return url.substring(0, extensionStart) + ".32x32" + url.substring(extensionStart);
            }
            return url;
        },
        
        check_radio_button: function (button_elements) {
            $(button_elements.button).prop("checked", true);
            $(button_elements.label).addClass('ui-state-active');
        },
        
        create_button_set: function () { 
            // takes any number of parameters, any of which can be an array of buttons
            var container = document.createElement("div");
            var i, j;
            // arguments isn't an ordinary array so can't use forEach
            for (i = 0; i < arguments.length; i++) {
                if (arguments[i].length >= 0) {
                    for (j = 0; j < arguments[i].length; j++) {
                        container.appendChild(arguments[i][j]);
                    }
                } else { 
                    container.appendChild(arguments[i]);
                }
            }
            $(container).buttonset();
            return container;
        },
        
        create_text_element: function (text) {
            var div = document.createElement("div");
            div.textContent = text;
            $(div).addClass('ui-widget');
            return div;
        },
        
        create_anchor_element: function (html, url) {
            var anchor = document.createElement("a");
            anchor.innerHTML = html;
            anchor.href= url;
            anchor.target = '_blank';
            return anchor;
        },
        
        // the following methods uses htmlFor instead of making the input a child of the label
        // because couldn't get JQuery buttons to work for radio buttons otherwise
        // and because of a comment about disability software
        // see http://stackoverflow.com/questions/774054/should-i-put-input-tag-inside-label-tag
        
        create_text_input: function (value, class_name, label, title) {
            var input = document.createElement("input");
            var label_element, container;
            input.type = "text";
            input.className = class_name;
            input.value = value;
            input.title = title;
            if (label) {
                label_element = document.createElement("label");
                label_element.innerHTML = label;
                input.id = TT.UTILITIES.generate_unique_id();
                label_element.htmlFor = input.id;
                container = TT.UTILITIES.create_horizontal_table(label_element, input);
                $(label_element).addClass("ui-widget");
            } else {
                container = input;
            }     
            $(input).button().addClass("toontalk-text-input");
            $(input).css({"background-color": "white"});
            return {container: container,
                    button: input};
        },
        
        create_text_area: function (value, class_name, label, title) {
            var text_area = document.createElement("textarea");
            var label_element, container;
            text_area.className = class_name;
            text_area.value = value;
            text_area.title = title;
            label_element = document.createElement("label");
            label_element.innerHTML = label;
            text_area.id = TT.UTILITIES.generate_unique_id();
            label_element.htmlFor = text_area.id;
            container = TT.UTILITIES.create_horizontal_table(label_element, text_area);
            $(text_area).button().addClass("toontalk-text-text_area");
            $(text_area).css({"background": "white"});
            $(label_element).addClass("ui-widget");
            return {container: container,
                    button: text_area};
        },
        
        create_radio_button: function (name, value, class_name, label, title) {
            var container = document.createElement("div");
            var input = document.createElement("input");
            var label_element = document.createElement("label");
            input.type = "radio";
            input.className = class_name;
            input.name = name;
            input.value = value;
            label_element.innerHTML = label;
            input.id = TT.UTILITIES.generate_unique_id();
            label_element.htmlFor = input.id;
            container.appendChild(input);
            container.appendChild(label_element);
            container.title = title;
            // the following breaks the change listener
            // used to work with use htmlFor to connect label and input
            $(input).button();
//             $(label_element).button();
            return {container: container,
                    button: input,
                    label: label_element};
        },
        
        create_check_box: function (value, class_name, label, title) {
            var container = document.createElement("div");
            var input = document.createElement("input");
            var label_element = document.createElement("label");
            input.type = "checkbox";
            input.className = class_name;
            input.checked = value;
            label_element.innerHTML = label;
            input.id = TT.UTILITIES.generate_unique_id();
            label_element.htmlFor = input.id;
            $(label_element).addClass("ui-widget");
            container.appendChild(input);
            container.appendChild(label_element);
            container.title = title;
//             $(input).button(); // commented out since looked bad
            return {container: container,
                    button: input,
                    label: label_element};
        },

        create_horizontal_table: function () { // takes any number of parameters
            var table = document.createElement("table");
            var i, row, table_element;
            row = document.createElement("tr");
            table.appendChild(row);
            for (i = 0; i < arguments.length; i += 1) {
                table_element = document.createElement("td");
                row.appendChild(table_element);
                table_element.appendChild(arguments[i]);
            }
            return table;
        },
        
        create_vertical_table: function () { // takes any number of parameters
            var table = document.createElement("table");
            var i, row, table_element;
            for (i = 0; i < arguments.length; i += 1) {
                row = document.createElement("tr");
                table.appendChild(row);
                table_element = document.createElement("td");
                row.appendChild(table_element);
                table_element.appendChild(arguments[i]);
            }
            return table;
        },
        
        selected_radio_button: function () {
            var i, selected;
            for (i = 0; i < arguments.length; i += 1) {
                if (arguments[i].checked) {
                    return arguments[i];
                }
            }
            return selected;
        },
        
        get_dragee: function () {
            return dragee;
        },
        
        add_a_or_an: function (word, upper_case) {
            var first_character = word.charAt(0);
            if ("aeiou".indexOf(first_character) < 0) {
                if (upper_case) {
                    return "A " + word;
                }
                return "a " + word;
            }
            if (upper_case) {
                return "An " + word;
            }
            return "an " + word;
        }
        
//         create_menu_item: function (text) {
//             var item = document.createElement("li");
//             var anchor = document.createElement("a");
//             anchor.innerHTML = text;
//             anchor.href = "#";
//             item.appendChild(anchor);
//             return item;
//         }
    
    };
    
}(window.TOONTALK));
