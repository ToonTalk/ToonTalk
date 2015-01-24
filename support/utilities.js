 /**
 * Implements ToonTalk's JavaScript functions shared between files
 * Authors: Ken Kahn
 * License: New BSD
 */
 
/*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */

// so can optionally have Google Translate
function googleTranslateElementInit() {
    "use strict";
    new google.translate.TranslateElement({pageLanguage: 'en', layout: google.translate.TranslateElement.InlineLayout.SIMPLE}, 'google_translate_element');
}

window.TOONTALK.UTILITIES = 
(function (TT) {
    "use strict";
    var dragee;
    var z_index = 100;
    // id needs to be unique across ToonTalks due to drag and drop
    var id_counter = new Date().getTime();
    var div_json   = "<div class='toontalk-json'>";
    var div_hidden = "<div style='display:none;'>"; // don't use a class since CSS might not be loaded
    var div_close  = "</div>";
    var backside_widgets_left;
    var extract_json_from_div_string = function (div_string) {
        // expecting div_string to begin with div_open and end with div_close
        // but users may be dragging something different
        var json_start = div_string.indexOf('{');
        var json_end = div_string.lastIndexOf('}');
        if (json_start < 0 || json_end < 0) {
//          console.log("Paste missing JSON encoding.");
            return;
        }
        return div_string.substring(json_start, json_end+1);
    };
    var drag_start_handler = function (event, element) {
        var $source_element = $(element).closest(".toontalk-side");
        var client_x = TT.UTILITIES.get_mouse_or_first_touch_event_attribute("clientX", event);
        var client_y = TT.UTILITIES.get_mouse_or_first_touch_event_attribute("clientY", event);
        var bounding_rectangle, json_object, json_div, widget, is_resource;
        $(".ui-tooltip").remove();
        // was using text/plain but IE complained
        // see http://stackoverflow.com/questions/18065840/html5-drag-and-drop-not-working-on-ie11
        if (event.dataTransfer && event.dataTransfer.getData("text") && event.dataTransfer.getData("text").length > 0) {
            // e.g. dragging some text off the backside of a widget
            return;
        }
        dragee = ($source_element || $(element));
        widget = TT.UTILITIES.widget_from_jquery(dragee);
        if (!widget) {
            widget = TT.UTILITIES.widget_of_element(element);
            TT.UTILITIES.report_internal_error("Possible bug that " + dragee + " doesn't have a known owner.");
            dragee = $(element);
        }
        widget.being_dragged = true;
        bounding_rectangle = dragee.get(0).getBoundingClientRect();
        is_resource = dragee.is(".toontalk-top-level-resource");
//         if (dragee.is(".toontalk-frontside")) {
//             // save the current dimension so size doesn't change while being dragged
//             dragee.css({width:  bounding_rectangle.width,
//                         height: bounding_rectangle.height});
//         }
        if (widget.get_json) {
            json_object = TT.UTILITIES.get_json_top_level(widget);
            json_object.view.drag_x_offset = client_x - bounding_rectangle.left;
            json_object.view.drag_y_offset = client_y - bounding_rectangle.top;
            if (!json_object.view.frontside_width) {
                if (dragee.parent().is(".toontalk-backside")) {
                    json_object.view.frontside_width  = dragee.width();
                    json_object.view.frontside_height = dragee.height();
                }
            }
            if (dragee.is(".toontalk-backside")) {
                json_object.view.backside = true;
            }
            dragee.data("json", json_object);   
            if (event.dataTransfer) {
                json_div = TT.UTILITIES.toontalk_json_div(json_object, widget);
                event.dataTransfer.effectAllowed = is_resource ? 'copy' : 'move';
                // text is good for dragging to text editors
                event.dataTransfer.setData("text", json_div);
                // text/html should work when dragging to a rich text editor
                if (!TT.UTILITIES.is_internet_explorer()) {
                    // text/html causes an error in IE
                    event.dataTransfer.setData("text/html", json_div);
                }
            }         
            widget.drag_started(json_object, is_resource);
        }
        dragee.addClass("toontalk-being-dragged");
        event.stopPropagation();
    };
    var drag_end_handler = function (event) {
        if (!dragee) {
            dragee = $(event.target).closest(".toontalk-side");
        }
        TT.UTILITIES.widget_from_jquery(dragee).being_dragged = undefined;
        if (dragee.is(".toontalk-frontside")) {
            if (dragee.parent().is(".toontalk-backside")) {
                // restore ordinary size styles
                var json_object = dragee.data("json");
                if (json_object) {
                    dragee.css({width:  json_object.view.frontside_width,
                                height: json_object.view.frontside_height});
                }
            } else if (!dragee.parent().is(".toontalk-top-level-resource, .toontalk-drop-area, .toontalk-json") &&
                       !dragee.is(".toontalk-carried-by-bird, .toontalk-element-attribute") &&
                       !TT.UTILITIES.has_animating_image(dragee.get(0))) {
                dragee.css({width:  "100%",
                            height: "100%"});
            }
        }
        drag_ended();
        event.stopPropagation();
    };
    var drop_handler = function (event, element) {
        var $source, source_widget, $target, target_widget, drag_x_offset, drag_y_offset, target_position, 
            new_target, source_is_backside, $container, container, width, height, i, page_x, page_y;
        var json_object = TT.UTILITIES.data_transfer_json_object(event);
        if (!json_object) {
            json_object = dragee.data("json");
        }
        if (dragee) {
            dragee.data("json", ""); // no point wasting memory on this anymore
        }
        // should this set the dropEffect? 
        // https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer#dropEffect.28.29 
        // restore events to decendants
        $(element).find("*").removeClass("toontalk-ignore-events");
        $source = dragee;
        drag_ended();
        if (!$source && !json_object && !event.dataTransfer.files) {
            if (!event.dataTransfer) {
                TT.UTILITIES.report_internal_error("Drop failed since there is no event.dataTransfer");
            } else {
                TT.UTILITIES.report_internal_error("Drop failed since unable to parse as JSON."); 
            }
            // without the following it may load a new page
            event.stopPropagation();
            return;
        }
        if ($(event.target).is(".toontalk-drop-area-instructions")) {
            $target = $(event.target).parent();
        } else if ($(event.target).is(".toontalk-element-attribute-input")) {
            // TODO: determine if this is obsolete and not used
            // should work for any input -- need to generalise this
            $target = $(event.target).closest(".toontalk-side");
            target_widget = TT.UTILITIES.widget_from_jquery($target);
            if (target_widget) {
                if ($source) {
                    source_widget = TT.UTILITIES.widget_from_jquery($source);
                } else {
                    source_widget = TT.UTILITIES.create_from_json(json_object);
                }
                TT.UTILITIES.restore_resource($source, source_widget);
                target_widget.dropped_on_style_attribute(source_widget, event.target.name, event);
                event.stopPropagation();
                return;
            }
        } else if ($(event.target).is(".toontalk-drop-area")) {
            $target = $(event.target);
        } else {
            // closest includes 'self'
            $target = $(element).closest(".toontalk-side");
        }
        if ($target.length === 0) {
            return;
        }
        if ($target.is(".toontalk-top-level-resource")) {
            // maybe should ensure they are not drop targets
            return;
        }
        // if this is computed when needed and if dragging a resource it isn't the correct value
        target_position = $target.offset();
        TT.UTILITIES.remove_highlight();
        target_widget = TT.UTILITIES.widget_from_jquery($target);
        if ($source && $source.length > 0 &&
            !(target_widget && target_widget.get_infinite_stack && target_widget.get_infinite_stack()) && // OK to drop on infinite stack since will become a copy
            ($source.get(0) === $target.get(0) || jQuery.contains($source.get(0), $target.get(0)))) {
            if ($source.is(".toontalk-top-level-backside")) {
                return; // let event propagate since this doesn't make sense
            }
            // not dropping on itself but on the widget underneath
            // to not find $target again temporarily hide it
            $target.hide();
            page_x = TT.UTILITIES.get_mouse_or_first_touch_event_attribute("pageX", event);
            page_y = TT.UTILITIES.get_mouse_or_first_touch_event_attribute("pageY", event);
            new_target = document.elementFromPoint(page_x-window.pageXOffset,page_y-window.pageYOffset);
            $target.show();
            if (new_target) {
                $target = $(new_target).closest(".toontalk-side");
                target_position = $target.offset();
                target_widget = TT.UTILITIES.widget_from_jquery($target);
            }
        }
        if (json_object && json_object.view && json_object.view.drag_x_offset) {
            drag_x_offset = json_object.view.drag_x_offset;
            drag_y_offset = json_object.view.drag_y_offset;
        } else {
            drag_x_offset = 0;
            drag_y_offset = 0;
        }
        if ($source && $source.length > 0) {
            if (!(target_widget && target_widget.get_infinite_stack && target_widget.get_infinite_stack()) && 
                ($source.get(0) === $target.get(0) || jQuery.contains($source.get(0), $target.get(0)))) {
                // OK to drop on infinite stack since will become a copy
                // dropped of itself or dropped on a part of itself
                // just moved it a little bit
                // only called now that elementFromPoint is used to find another target when dropped on part of itself
                $source.css({left: $source.get(0).offsetLeft + (event.layerX - drag_x_offset),
                              top: $source.get(0).offsetTop  + (event.layerY - drag_y_offset)});
                event.stopPropagation();
                return;
            }
            source_is_backside = $source.is(".toontalk-backside");
            source_widget = TT.UTILITIES.widget_from_jquery($source);
            if ($source.parent().is(".toontalk-drop-area")) {
                $source.removeClass("toontalk-widget-in-drop_area");
                $source.parent().data("drop_area_owner").set_next_robot(undefined);
            } else {
                $container = $source.parents(".toontalk-side:first");
                container = TT.UTILITIES.widget_from_jquery($container);
                if (container) {
                    if (!source_is_backside && source_widget.get_infinite_stack && source_widget.get_infinite_stack()) {
                        // leave the source there but create a copy
                        source_widget = source_widget.copy({});
                        width  = $source.width();
                        height = $source.height();
                        $source = $(source_widget.get_frontside_element(true));
                        if ($target.is(".toontalk-backside")) {
                            // if original dimensions available via json_object.view use it
                            // otherwise copy size of infinite_stack
                            $source.css({width:  json_object.view.frontside_width  || width,
                                         height: json_object.view.frontside_height || height});
                        }
                    } else if (container.removed_from_container) {
                        // can be undefined if container is a robot holding something
                        // but probably that should be prevented earlier
                        if ($container.is(".toontalk-backside")) {
                            container.remove_backside_widget(source_widget, source_is_backside, true);
                        } else {
                            container.removed_from_container(source_widget, source_is_backside, event);
                            if (source_widget.restore_dimensions) {
                                source_widget.restore_dimensions();
                            }
                        }
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
            if (event.dataTransfer.files.length > 0) {
                // forEach doesn't work isn't really an array
                for (i = 0; i < event.dataTransfer.files.length; i++) {
                    handle_drop_from_file_contents(event.dataTransfer.files[i], $target, target_widget, target_position, event);
                };
                event.stopPropagation();
                return;
            } else {
                source_widget = TT.UTILITIES.create_from_json(json_object, {event: event});
            }
            if (!source_widget) {
                if (json_object) {
                    TT.UTILITIES.report_internal_error("Unable to construct a ToonTalk widget from the JSON.");
                } else if (TT.debugging) {
                    console.log("No data transfer in drop.");
                }
                event.stopPropagation();
                return;
            }
            source_is_backside = json_object.view.backside;
            if (source_is_backside) {
                $source = $(source_widget.get_backside_element());
                $source.css({width: json_object.view.backside_width,
                             height: json_object.view.backside_height,
                             // color may be undefined
                             "background-color": json_object.view.background_color,
                             "border-width": json_object.view.border_width});
                source_widget.apply_backside_geometry();
            } else {
                $source = $(source_widget.get_frontside_element());
            }
        }    
        if (source_widget === target_widget) {
            // dropping front side on back side so ignore
            return;
        }
        handle_drop($target, $source, source_widget, target_widget, target_position, event, json_object, drag_x_offset, drag_y_offset, source_is_backside);

    };
    var $toontalk_side_underneath = function (element) {
        var $target = $(element).closest(".toontalk-side");
        var dragee = TT.UTILITIES.get_dragee();
        if (!$target.is(".toontalk-top-level-backside") && 
            !$target.closest(".toontalk-top-level-resource").is("*") &&
            !$target.is(".toontalk-being-dragged") && // is dragee.get(0) === $target.get(0) a better way to express this?
            !(dragee && has_ancestor_element($target.get(0), dragee.get(0)))) {
            return $target;
        }
    };
    var drag_enter_handler = function (event, element) {
        var $element_underneath = $toontalk_side_underneath(element);
        if ($element_underneath) {
            // could support a can_drop protocol and use it here
            TT.UTILITIES.highlight_element($element_underneath.get(0), event);
            // moving over decendants triggers dragleave unless their pointer events are turned off
            // they are restored on dragend
            if (!$element_underneath.is(".toontalk-backside, .toontalk-drop-area") && TT.UTILITIES.widget_of_element(element).get_type_name() !== 'box') {
                // this breaks the dropping of elements on empty holes so not supported
                $element_underneath.find(".toontalk-side").addClass("toontalk-ignore-events");
                // except for toontalk-sides and their ancestors since they are OK to drop on
            }
            return $element_underneath.get(0); // return highlighted element
        }
    };
    var drag_leave_handler = function (event, element) {
        TT.UTILITIES.remove_highlight(element);
    };
    var handle_drop = function ($target, $source, source_widget, target_widget, target_position, event, json_object, drag_x_offset, drag_y_offset, source_is_backside) {
        var page_x = TT.UTILITIES.get_mouse_or_first_touch_event_attribute("pageX", event);
        var page_y = TT.UTILITIES.get_mouse_or_first_touch_event_attribute("pageY", event);
        var new_target, backside_widgets_json, shared_widgets, top_level_element, top_level_backside_position, backside_widgets, 
            left, top, element_here;
        source_widget.set_visible(true);
        if ($target.is(".toontalk-backside")) {
            if (source_widget.is_of_type('top-level')) {
               // add all top-level backsides contents but not the backside widget itself
               backside_widgets_json = json_object.semantic.backside_widgets;
               shared_widgets = json_object.shared_widgets;
               top_level_element = $target.get(0);
               // need to copy the array because the function in the forEach updates the list
               backside_widgets = source_widget.get_backside_widgets().slice();
               backside_widgets.forEach(function (backside_widget_side, index) {
                   var widget = backside_widget_side.get_widget();
                   var json_view, element_of_backside_widget, left_offset, top_offset, width, height, position;
                   source_widget.remove_backside_widget(widget, backside_widget_side.is_backside());
                   if (backside_widgets_json[index].widget.shared_widget_index >= 0) {
                       json_view = shared_widgets[backside_widgets_json[index].widget.shared_widget_index].view;
                   } else {
                       json_view = backside_widgets_json[index].widget.view;
                   }
                   if (backside_widget_side.is_backside()) {
                       element_of_backside_widget = widget.get_backside_element(true);
                       left_offset = json_view.backside_left;
                       top_offset =  json_view.backside_top;
                       width =  json_view.backside_width;
                       height = json_view.backside_height;
                   } else {
                       element_of_backside_widget = widget.get_frontside_element(true);
                       left_offset = json_view.frontside_left;
                       top_offset =  json_view.frontside_top;
                       width =  json_view.frontside_width;
                       height = json_view.frontside_height;
                   }
                   target_widget.add_backside_widget(widget, backside_widget_side.is_backside());
                   top_level_element.appendChild(element_of_backside_widget);
                   position = $(element_of_backside_widget).position();
                   $(element_of_backside_widget).css(
                       {left: position.left + left_offset,
                              top:  position.top  + top_offset,
                              width:  width,
                              height: height});
                   if (backside_widget_side.is_backside()) {
                       widget.backside_geometry = json_view.backside_geometry;
                       widget.apply_backside_geometry();
                   }
               }.bind(this));
               return;
            }
            // widget_dropped_on_me needed here to get geometry right
            if (source_widget) {
                target_widget.get_backside().widget_dropped_on_me(source_widget, source_is_backside, event);
            } else {
                TT.UTILITIES.report_internal_error("No source_widget");
            }
            // should the following use pageX instead?
            // for a while using target_position.top didn't work while
            // $target.get(0).offsetTop did and then it stopped working
            // not sure what is happening or even whey they are different
            // consider also using layerX and layerY
            if (typeof drag_x_offset === 'undefined') {
                 drag_x_offset = 0;
                 drag_y_offset = 0;
                // drag a picture from a non-ToonTalk source so at least Windows displays about about a 90x90 square while dragging
                // and, except for small images, it is 'held' at the bottom centre
                // while images from web pages are held in the center
                setTimeout(function () {
                   var html   = source_widget.get_HTML();
                   var width  = $source.width();
                   var height = $source.height();
                   var x_offset, y_offset;
                   if (html.indexOf("data:image") >= 0) {
                       x_offset = Math.min(80, width)/2;
                       y_offset = 90;
                       if (height < 90) {
                           y_offset -= (90-height)/2;
                       }
                   } else {
                       // is about 120x60
                       // but drag offset can be anywhere...
                       x_offset = Math.min(60, width/2);
                       y_offset = Math.min(30, height/2);  
                   }
                   $source.css({left: left-x_offset,
                                top:  top -y_offset}); 
              },
              50);
            }
            left = page_x - (target_position.left + drag_x_offset);
            top  = page_y - (target_position.top  + drag_y_offset);
            $source.css({left: left,
                         top:  top});
//             if ($source.is(".toontalk-frontside") && !$source.is('.ui-resizable')) {
//                 // without the setTimeout the following prevents dragging components (e.g. widgets in boxes)
//                 setTimeout(function () {
//         TT.UTILITIES.make_resizable($source, source_widget);
//         },
//         0);
//             }
            if (json_object && json_object.semantic.running) {
                source_widget.set_running(true);
            }
        } else if ($target.is(".toontalk-drop-area")) {
            $source.addClass("toontalk-widget-in-drop_area");
            $target.append($source.get(0));
            if ($source.is(".toontalk-robot")) {
                $target.data("drop_area_owner").set_next_robot(TT.UTILITIES.widget_from_jquery($source));
            }
        } else if ($source.is(".toontalk-backside-of-top-level")) {
            // dragging top-level backside to itself or one of its children is ignored
            return;
        } else if (!target_widget && !event.changedTouches) {
            TT.UTILITIES.report_internal_error("target widget missing");
            return; // let event propagate
        } else {
            // before processing drop ensure that dropped item (source_widget) is visible and where dropped
            top_level_element = $target.closest(".toontalk-top-level-backside").get(0);
            if (!top_level_element && event.changedTouches) {
                // i.e. when dragging using touch events
                element_here = document.elementFromPoint(page_x-window.pageXOffset, page_y-window.pageYOffset);
                if ($(element_here).is(".toontalk-top-level-backside")) {
                    top_level_element = element_here;
                } else {
                    top_level_element = $(element_here).closest(".toontalk-top-level-backside").get(0);
                }
                if (!top_level_element) {
                    // pick any top level backside
                    top_level_element = $(".toontalk-top-level-backside").get(0);
                }
                target_widget = TT.UTILITIES.widget_of_element(top_level_element).get_backside();
            }
            top_level_element.appendChild($source.get(0));
            top_level_backside_position = $(top_level_element).offset();
            $source.css({
                left: page_x - (top_level_backside_position.left + drag_x_offset),
                top:  page_y - (top_level_backside_position.top  + drag_y_offset)}
            );
            if (source_widget.drop_on && source_widget.drop_on(target_widget, source_is_backside, event)) {
            } else if (target_widget.widget_dropped_on_me && target_widget.widget_dropped_on_me(source_widget, source_is_backside, event)) {
            } else {
                // ignore the current target and replace with the backside it is on
                new_target = $target.closest(".toontalk-top-level-backside");
                if (new_target.length > 0) {
                    target_widget = TT.UTILITIES.widget_from_jquery(new_target);
                    if (target_widget) {
                        target_widget.get_backside().widget_dropped_on_me(source_widget, source_is_backside, event);
            // place it directly underneath the original target
//             $source.css({
//                 left: $target.position().left,
//                 top:  $target.position().top + $target.height()
//             });
                    }
                }
            }
        }
        TT.UTILITIES.remove_highlight();
//         if (target_widget && !drop_handled) {
//             // is the obsolete? If so is drop_handled?
//             if (target_widget.widget_dropped_on_me) {
//                 target_widget.widget_dropped_on_me(source_widget, source_is_backside, event);
//             }
//         }
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
                        // no need to report this it need not contain ToonTalk JSON
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
        var translation_div;
        TT.debugging = TT.UTILITIES.get_current_url_parameter('debugging');
        TT.UTILITIES.process_json_elements();
        // for top-level resources since they are not on the backside 'work space' we need a way to turn them off
        // clicking on a running widget may not work since its HTML may be changing constantly
        $(document).click(function (event) {
//          event.stopPropagation();
            $(".toontalk-top-level-resource-container").each(function (index, element) {
                var widget = element.toontalk_widget;
                if (widget && widget.set_running) {
                    widget.set_running(false);
                }
            });
        });
        // frontside's click handler will run the top-level resource widgets if clicked
        TT.QUEUE = window.TOONTALK.queue.create();
        // might want two queues: so new entries end up in the 'next queue'
        TT.QUEUE.run();
        window.addEventListener('beforeunload', function (event) {
            try {
                TT.UTILITIES.backup_all_top_level_widgets(true);
            } catch (error) {
                console.log(error);
            }
        });
        // nicer looking tool tips
        // customization to crude talk balloons thanks to http://jsfiddle.net/pragneshkaria/Qv6L2/49/
        $(document).tooltip(
            {position: {
                 my: "center bottom-20",
                 at: "center top",
                 using: function (position, feedback) {
                     $(this).css(position);
                     $("<div>").addClass("toontalk-arrow")
                               .addClass(feedback.vertical)
                               .addClass(feedback.horizontal)
                               .appendTo(this);
                 }},
            open: function (event, ui) {
                      setTimeout(function () {
                                     $(ui.tooltip).hide();
                      }, 
                      ui.tooltip.get(0).innerText.length * (TT.MAXIMUM_TOOLTIP_DURATION_PER_CHARACTER || 100));
                  }
           });
        TT.TRANSLATION_ENABLED = TT.UTILITIES.get_current_url_boolean_parameter("translate", false);
        if (TT.TRANSLATION_ENABLED) {
            $("a").each(function (index, element) {
                            element.href = TT.UTILITIES.add_URL_parameter(element.href, "translate", "1"); 
                        });
            if (!$("#google_translate_element").is("*")) {
                // if one wasn't added to the page then add it at the top of the body
                translation_div = document.createElement("div");
                translation_div.id = "google_translate_element";
                document.body.insertBefore(translation_div, document.body.firstChild);
            }
            document.head.appendChild($('<meta name="google-translate-customization" content="7e20c0dc38d147d6-a2c819007bfac9d1-gc84ee27cc12fd5d1-1b"></meta>')[0]);
            load_script("https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit");
        } else {
            $("#google_translate_element").remove();
        }
        TT.UTILITIES.add_test_all_button();
    };
    var load_script = function (url) {
        var script = document.createElement('script');
        script.src = url;
        document.body.appendChild(script);
    };
    var drag_ended = function () {
        if (!dragee) {
            return;
        }
        dragee.removeClass("toontalk-being-dragged");
        // restore events to decendants
        dragee.find("*").removeClass("toontalk-ignore-events");
        // need delay since there may be other listeners to drop events that need to know this
        // e.g. drop area for next robot
        TT.UTILITIES.set_timeout(function () {
            dragee = undefined;
            }); 
    };
    var has_ancestor_element = function (element, possible_ancestor) {
        if (element === possible_ancestor) {
            return true;
        }
        if (element.parentNode) {
            return has_ancestor_element(element.parentNode, possible_ancestor);
        }
    };
    // for implementing zero_timeout
    var timeouts = [];
    var timeout_message_name = "zero-timeout-message";
    window.addEventListener("message", 
                            function (event) {
                                if (event.source === window && event.data === timeout_message_name) {
                                    event.stopPropagation();
                                    if (timeouts.length > 0) {
                                        (timeouts.shift())();
                                    }
                                    return;
                                }
                                if (event.data.editable_contents) {
                                    TT.publish.republish(event.data);
                                }
                            },
                            false); // don't capture events
    $(document).ready(initialise);
    return {
        create_from_json: function (json, additional_info, delay_backside_widgets) {
            var handle_delayed_backside_widgets = function (widget, additional_info, shared_widget_index) {
                additional_info.shared_widgets[shared_widget_index] = widget;
                if (widget.finish_create_from_json_continuation) {
                    // this part of the work was postponed so that shared_widgets could be set above
                    // this prevents infinite recursion when processing self-referential JSON, e.g. element with attribute_object on back
                    widget.finish_create_from_json_continuation();
                    widget.finish_create_from_json_continuation = undefined;
                }    
                return widget;   
            };
            var widget, side_element, backside_widgets, json_semantic, json_view, size_css, json_of_shared_widget, shared_widget;
            if (!json) {
                // was undefined and still is
                return;
            }
            if (!additional_info) {
                additional_info = {};
            }
            if (json.shared_widgets) {
                additional_info.json_of_shared_widgets = json.shared_widgets;
                additional_info.shared_widgets = [];
            }
            if (json.shared_html) {
                additional_info.shared_html = json.shared_html;   
            }
            if (json.widget) {
                // is a context where need to know which side of the widget
                widget = TT.UTILITIES.create_from_json(json.widget, additional_info);
                if (json.is_backside) {
                    return widget.get_backside(true);
                }
                return widget;
            }
            if (additional_info && additional_info.shared_widgets && json.shared_widget_index >= 0) {
                shared_widget = additional_info.shared_widgets[json.shared_widget_index];
                if (shared_widget) {
//                     if (shared_widget.shared_widget_index >= 0) {
//                         console.log("Warning cyclic JSON not fully supported")
//                         // this isn't a widget but a promise of one -- so must be a cycle
//                         if (!additional_info.cyclic_widgets_json) {
//                             additional_info.cyclic_widgets_json = [];
//                         }
//                         if (additional_info.cyclic_widgets_json.indexOf(shared_widget) < 0) {
//                             additional_info.cyclic_widgets_json.push(shared_widget);
//                         }
//                     }
                    return shared_widget;
                }
                // otherwise create it from the JSON and store it
                json_of_shared_widget = additional_info.json_of_shared_widgets[json.shared_widget_index];
                // following is to deal with reconstructing cyclic references
                // if this is encountered again recursively will discover the JSON with shared_widget_index
//                 additional_info.shared_widgets[json.shared_widget_index] = json;
                // following postpones creation of backside widgets to deal with cycles
                widget = TT.UTILITIES.create_from_json(json_of_shared_widget, additional_info, true);
//                 if (additional_info.cyclic_widgets_json && typeof json_of_shared_widget.shared_widget_index === 'undefined') {
//                     if (additional_info.cyclic_widgets_json.indexOf(json) >= 0) {
//                         // contains cyclic references so make json into the widget
//                         // clobber json to have all the (deep) properties of the widget
//                         $.extend(true, json, widget);
//                         json.shared_widget_index = undefined;
//                         // all references shared including the top-level one
//                         widget = json;
//                     }
//                 }
                return handle_delayed_backside_widgets(widget, additional_info, json.shared_widget_index);
            }
            json_semantic = json.semantic;
            if (!json_semantic) {
                // e.g. body, paths, etc.
                json_semantic = json;
            }
            json_view = json.view;
            if (json_semantic.shared_widget_index >= 0) {
                widget = TT.UTILITIES.create_from_json(additional_info.json_of_shared_widgets[json_semantic.shared_widget_index], additional_info, true);
                return handle_delayed_backside_widgets(widget, additional_info, json_semantic.shared_widget_index);
            } else if (TT.creators_from_json[json_semantic.type]) {
                if (!additional_info) {
                    additional_info = {};
                }
                if (json_view) {
                    additional_info.json_view = json_view;
                } else {
                    json_view = additional_info.json_view;
                }
                widget = TT.creators_from_json[json_semantic.type](json_semantic, additional_info);
               // following was needed when get_json_top_level wasn't working properly
//             } else if (json_semantic.shared_widget_index >= 0) {
//                 widget = additional_info.shared_widgets[json_semantic.shared_widget_index];
//                 if (!widget) {
//                     // try again with the JSON of the shared widget
//                     widget = TT.UTILITIES.create_from_json(additional_info.json_of_shared_widgets[json_semantic.shared_widget_index], additional_info);
//                 }
            } else {
                TT.UTILITIES.report_internal_error("JSON type '" + json_semantic.type + "' not supported. Perhaps a JavaScript file implementing it is missing.");
                return;
            }
            if (widget && widget.get_backside) {
                // widget may be a robot body or some other part of a widget
                if (json_semantic.erased) {
                    TT.widget.erasable(widget);
                    widget.set_erased(json_semantic.erased);
                }
                if (json_semantic.infinite_stack) {
                    widget.set_infinite_stack(json_semantic.infinite_stack);
                }
                if (json_view && json_view.frontside_width) {
                    side_element = json_view.backside ? widget.get_backside(true).get_element() : widget.get_frontside_element();
                    size_css = {width: json_view.frontside_width,
                                height: json_view.frontside_height};
                    if (json_semantic.type === 'element') {
                        // delay until updated
                        widget.on_update_display(function () {
                                                     $(side_element).css(size_css);
                                                 });
                    } else {
                        $(side_element).css(size_css);
                    }
                }
                if (json_view && json_view.saved_width) {
                    widget.saved_width =  json_view.saved_width;
                    widget.saved_height = json_view.saved_height;
                }
                if (json_view && json_view.backside_geometry) {
                    widget.backside_geometry = json_view.backside_geometry;                    
                }
                if (json_semantic.backside_widgets) {
                    if (delay_backside_widgets) {
                        // caller will call this 
                        widget.finish_create_from_json_continuation = function () {
                             this.add_backside_widgets_from_json(widget, json_semantic.backside_widgets, additional_info);   
                        }.bind(this);
                    } else {
                        this.add_backside_widgets_from_json(widget, json_semantic.backside_widgets, additional_info);
                    }
                }
            }
            return widget;
        },

        add_backside_widgets_from_json: function (widget, json_semantic_backside_widgets, additional_info) {
            var backside_widgets;
            if (!json_semantic_backside_widgets) {
                return;
            }
            backside_widgets = this.create_array_from_json(json_semantic_backside_widgets, additional_info);
            widget.set_backside_widget_sides(backside_widgets, 
                                             json_semantic_backside_widgets.map(
                                                  function (json) {
                                                      if (json.widget.shared_widget_index >= 0) {
                                                          return additional_info.json_of_shared_widgets[json.widget.shared_widget_index].view;
                                                      }
                                                      return json.widget.view; 
                                                  }));
        },
        
        create_array_from_json: function (json_array, additional_info) {
            var new_array = [];
            json_array.forEach(function (json_item, index) {
                if (json_item) {
                    new_array[index] = TT.UTILITIES.create_from_json(json_item, additional_info);
                } else {
                    // e.g. could be null representing an empty hole
                    new_array[index] = json_item; 
                }
            });
            return new_array;
        },
        
        get_json_of_array: function (array, json_history) {
            var json = [];
            var widgets_jsonified = [];
            array.forEach(function (widget_side, index) {
                if (widget_side.is_backside && widget_side.is_backside()) {
                    json[index] = {widget: TT.UTILITIES.get_json(widget_side.get_widget(), json_history),
                                   is_backside: true};
                } else if (widget_side.get_type_name) {
                    json[index] = {widget: TT.UTILITIES.get_json(widget_side, json_history)};
                } else {
                    // isn't a widget -- e.g. is a path
                    json[index] = widget_side.get_json(json_history);
                }
            });
            return json;
        },
        
        fresh_json_history: function () {
            return {widgets_encountered: [],
                    shared_widgets: [],
                    json_of_widgets_encountered: []};
        },
        
        get_json_top_level: function (widget) {
            var json_history = this.fresh_json_history();
            var json = TT.UTILITIES.get_json(widget, json_history);
            if (json_history.shared_widgets.length > 0) {
                json.shared_widgets = json_history.shared_widgets.map(function (shared_widget, widget_index) {
                    // get the JSON of only those widgets that occurred more than once
                    var get_json_of_widget_from_history = function (widget) {
                        var index_among_all_widgets = json_history.widgets_encountered.indexOf(widget);
                        return json_history.json_of_widgets_encountered[index_among_all_widgets];
                    };
                    var get_json_of_widget_from_shared_widget_index = function (index) {
                        return get_json_of_widget_from_history(json_history.shared_widgets[index]);
                    }
                    var json_of_widget = get_json_of_widget_from_history(shared_widget);
                    if (widget === shared_widget) {
                        // top-level widget itself is shared_widget_index
                        // return shallow clone of json_of_widget since don't want to create circularity via shared_widgets
                        json_of_widget = {semantic: json_of_widget.semantic,
                                          view: json_of_widget.view,
                                          version: json_of_widget.version};
                        json.semantic = {shared_widget_index: widget_index}; 
                        return json_of_widget;
                    } else {
                        // start searching tree for json_of_widget with the semantic component
                        // because json might === json_of_widget
                        TT.UTILITIES.tree_replace_once(json.semantic, json_of_widget, {shared_widget_index: widget_index}, get_json_of_widget_from_shared_widget_index);
                        return json_of_widget;
                    }
                });
            }
            json.shared_html = json_history.shared_html;
            return json;
        },
        
        get_json: function (widget, json_history) {
            var index, widget_json;
            if (TT.debugging && !json_history) {
                TT.UTILITIES.report_internal_error("no json_history");
            }
            index = json_history.shared_widgets.indexOf(widget);
            if (index >= 0) {
                return {shared_widget_index: index};
            }
            index = json_history.widgets_encountered.indexOf(widget);
            if (index >= 0) {
                // need to process children before ancestors when generating the final JSON
                index = TT.UTILITIES.insert_ancestors_last(widget, json_history.shared_widgets);
                return {shared_widget_index: index};
            }
            // need to keep track of the index rather than push json_of_widgets_encountered to keep them aligned properly
            index = json_history.widgets_encountered.push(widget)-1;
            widget_json = widget.get_json(json_history);
            widget_json = widget.add_to_json(widget_json, json_history);
            // need to push the widget on the list before computing the backside widget's jSON in case there is a cycle
            json_history.json_of_widgets_encountered[index] = widget_json;
            if (widget.add_backside_widgets_to_json) {
                widget.add_backside_widgets_to_json(widget_json, json_history);
            }
            return widget_json;
        },
        
        tree_replace_once: function (object, replace, replacement, get_json_of_widget_from_shared_widget_index) {
            // replaces object's first occurence of replace with replacement
            // whereever it occurs in object
            var value;
//             var messages = [];
            for (var property in object) {
                if (object.hasOwnProperty(property)) {
                    value = object[property];
//                     messages[0] = "Replaced " + JSON.stringify(replace);
//                     messages[1] = "with " + JSON.stringify(replacement);
//                     messages[2] = "in " + JSON.stringify(object);
                    if (!value) {
                        // ignore it
                    } else if (value === replace) {
                        object[property] = replacement;
//                         messages.forEach(function (message) {
//                             console.log(message);
//                         });
//                         console.log("Object is now " + JSON.stringify(object));
                        return true;
                    } else if (property === 'shared_widget_index') {
                        if (this.tree_replace_once(get_json_of_widget_from_shared_widget_index(value), replace, replacement, get_json_of_widget_from_shared_widget_index)) {
                            return true;
                        }
                    } else if (["string", "number", "function", "undefined"].indexOf(typeof value) >= 0) {
                        // skip atomic objects
                    } else if (this.tree_replace_once(value, replace, replacement, get_json_of_widget_from_shared_widget_index)) {
//                         messages.forEach(function (message) {
//                             console.log(message);
//                         });
//                         console.log("Object is now " + JSON.stringify(object));
                        return true;
                    }
                }
            }
            return false;            
        },

        insert_ancestors_last: function (widget, array_of_widgets) {
            // inserts widget before any of its ancestors into the array
            // returns the index of the widget
            var insertion_index = -1;
            array_of_widgets.some(function (other, index) {
                if (widget.has_ancestor(other)) {
                    insertion_index = index;
                    return true;
                }
            });
            if (insertion_index < 0) {
                insertion_index = array_of_widgets.length;
            }
            array_of_widgets.splice(insertion_index, 0, widget);
            return insertion_index;
        },

        toontalk_json_div: function (json, widget) {
            // convenience for dragging into documents (e.g. Word or WordPad -- not sure what else)
            // also for publishing to the cloud
            var is_backside = json.view.backside;
            var backside_widgets = widget.get_backside_widgets();
            var type_description = widget.get_type_name();
            if (type_description === 'top-level') {
                if (is_backside) {
                    type_description = "a work area containing ";
                    if (backside_widgets.length === 0) {
                        type_description = "an empty work area";
                    } else {
                        if (backside_widgets.length === 1) {
                            type_description += "one thing: ";
                        } else {
                            type_description += backside_widgets.length + " things: ";
                        }
                        backside_widgets_left = backside_widgets.length;
                        backside_widgets.forEach(function (backside_widget) {
                            backside_widgets_left--;
                            type_description += TT.UTILITIES.add_a_or_an(backside_widget.get_type_name());
                            if (backside_widgets_left === 1) {
                                type_description += ", and ";
                            } else if (backside_widgets_left > 1) {
                                type_description += ", ";
                            }
                        });
                    }
                } else {
                    type_description = "a top-level widget";
                }
            } else {
                type_description = TT.UTILITIES.add_a_or_an(type_description);
                if (is_backside) {
                    type_description = "the back of " + type_description;
                }
            }
            return div_json + "\nThis will be replaced by " + type_description + ".\n" +
                              div_hidden + JSON.stringify(json, null, '  ') + div_close +
                              div_close;
    },
        
//         tree_replace_all: function (object, replace, replacement) {
//             // returns object with all occurences of replace replaced with replacement
//             // whereever it occurs in object
//             var value;
//             for (var property in object) {
//                 if (object.hasOwnProperty(property)) {
//                     value = object[property];
//                     if (value === replace) {
//                         object[property] = replacement;
//                     } else if (["string", "number", "function"].indexOf(typeof value) < 0) {
//                         // recur on non-atomic objects
//                         this.tree_replace_all(value, replace, replacement);
//                     }
//                 }
//             }      
//         },
        
        copy_widgets: function (widgets, parameters) {
            // rewrite using map
            var widgets_copy = [];
            var i;
            for (i = 0; i < widgets.length; i++) {
                widgets_copy[i] = widgets[i] && widgets[i].copy(parameters);
            }
            return widgets_copy;
        },
        
        copy_widget_sides: function (widget_sides, parameters) {
            return widget_sides.map(function (widget_side) {
                var widget_copy = widget_side.get_widget().copy(parameters);
                if (widget_side.is_backside()) {
                    widget_copy.get_backside();
                }
                return widget_copy;
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
            if (!event.dataTransfer) {
                // not really an error -- could be a drag of an image into ToonTalk
//              console.log("no dataTransfer in drop event");
                return;
            }
            // following code could be simplified by using event.dataTransfer.types
            // unless in IE should use text/html to enable dragging of HTML elements
            // perhaps better than catching error to use is_internet_explorer()
            try {
                // the following causes errors in IE
                data = event.dataTransfer.getData("text/html");
            } catch (e) {
                // should only occur in IE
                data = event.dataTransfer.getData("text");
            }
            if (!data || data.match(/[\u3400-\u9FBF]/)) {
                // match(/[\u3400-\u9FBF]/) tests for Chinese which FireFox does
                // see https://bugzilla.mozilla.org/show_bug.cgi?id=900414
                // may not have been text/html but just plain text
                data = event.dataTransfer.getData("text");
//                 if (data) {
//                     data = "<div class='ui-widget'>" + data + "</div>";
//                 }
            }
            if (!data) {
                // not really an error -- could be a drag of an image into ToonTalk
//              console.log("No data in dataTransfer in drop.");
                return;
            }
            json = extract_json_from_div_string(data);
            if (!json) {               
                return TT.UTILITIES.get_json_top_level(TT.element.create(data));
            }
            try {
                return JSON.parse(json);
            } catch (exception) {
                TT.UTILITIES.report_internal_error("Exception parsing " + json + "\n" + exception.toString());
            }
        },
        
        drag_and_drop: function (element) {
            var maximum_click_duration;
            TT.UTILITIES.draggable(element);
            TT.UTILITIES.can_receive_drops(element);
            if (!$(element).is(".toontalk-backside-of-top-level")) {
                // touch interface doesn't (yet) support drag and drop of top-level backsides or dataTransfer
                // resources can only dragged so no need to wait to see if is a click
                // otherwise 1/2 second is the longest 'click'
                maximum_click_duration = $(element).is(".toontalk-top-level-resource") ? 0 : 500;
                TT.UTILITIES.enable_touch_events(element, maximum_click_duration);
            }
        },
        
        draggable: function (element) {
            $(element).attr("draggable", true);
            // JQuery UI's draggable causes dataTransfer to be null
            // rewrote after noticing that this works fine: http://jsfiddle.net/KWut6/
            element.addEventListener('dragstart', 
                                     function (event) {
                                         drag_start_handler(event, element);
                                     });
            element.addEventListener('dragend',
                                     function (event) {
                                          drag_end_handler(event, element);
                                     });
        },
        
        can_receive_drops: function (element) {
            // was using JQuery's 'on' but that didn't support additional listeners
            var highlight_element = 
                function (event) {
                    var highlighted_element = drag_enter_handler(event, element);
                    if (highlighted_element && current_highlighted_element !== highlighted_element) {
                        TT.UTILITIES.remove_highlight(current_highlighted_element);
                    }
                    current_highlighted_element = highlighted_element;
                    event.stopPropagation();
            };
            var current_highlighted_element;
            element.addEventListener('dragover',
                                     function (event) {
                                         highlight_element(event); // for drop feedback
                                         event.preventDefault();
                                         return false;
                                     });
            element.addEventListener('drop',
                                     function (event) {
                                         // prevent default first so if there is an exception the default behaviour for some drags of going to a new page is prevented
                                         event.preventDefault();
                                         drop_handler(event, element);
                                         event.stopPropagation();
                                     });
            element.addEventListener('dragenter', highlight_element);
            element.addEventListener('dragleave', 
                                     function (event) {
                                         if (current_highlighted_element) {
                                             if (!TT.UTILITIES.inside_rectangle(event.clientX, event.clientY, current_highlighted_element.getBoundingClientRect())) {
                                                 TT.UTILITIES.remove_highlight(current_highlighted_element);
                                                 current_highlighted_element = undefined;
                                             }
                                         }
                                         event.stopPropagation();
                                     });
            // following attempt to use JQuery UI draggable but it provides mouseevents rather than dragstart and the like
            // and they don't have a dataTransfer attribute so forced to rely upon lower-level drag and drop functionality
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
            var drop_area = document.createElement("div");
            var $drop_area = $(drop_area);
            var drop_area_instructions = document.createElement("div");
            drop_area_instructions.innerHTML = instructions;
            $(drop_area_instructions).addClass("toontalk-drop-area-instructions ui-widget");
            $drop_area.addClass("toontalk-drop-area");
            $drop_area.append(drop_area_instructions);
            TT.UTILITIES.can_receive_drops(drop_area);
            return $drop_area;
        },
   
        process_json_elements: function () {
            $(".toontalk-json").each(
                function (index, element) {
                    var json_string = element.textContent;
                    var json, widget, frontside_element, backside_element, backside,
                        stored_json_string, message, toontalk_last_key;
                    if (!json_string) {
                        return;
                    }
                    json_string = json_string.substring(json_string.indexOf("{"), json_string.lastIndexOf("}")+1);
                    json = JSON.parse(json_string);
                    widget = TT.UTILITIES.create_from_json(json);
                    if (widget) {
                        element.textContent = ""; // served its purpose of being parsed as JSON
                        if (!widget.get_type_name) {
                            // isn't a widget. e.g. a tool
                            element.appendChild(widget.get_element());
                        } else if (widget.is_of_type('top-level')) {
                            if (!TT.no_local_storage) {
                                if (!TT.UTILITIES.get_current_url_boolean_parameter("reset", false)) {
                                    if (json.load_most_recent_program) {
                                        try {
                                            toontalk_last_key = window.localStorage.getItem('toontalk-last-key');
                                            if (toontalk_last_key) {
                                                stored_json_string = window.localStorage.getItem(toontalk_last_key);
                                            }
                                        } catch (error) {
                                            message = "Error reading previous state. Error message is " + error;
                                                if (TT.UTILITIES.is_internet_explorer()) {
                                                // TODO: determine if there still is a problem with IE11 and local storage
                                                console.error(message);
                                            } else {
                                                TT.UTILITIES.display_message();
                                            }
                                        }
                                    }
                                    if (stored_json_string) {
                                        json = JSON.parse(stored_json_string);
                                        widget = TT.UTILITIES.create_from_json(json);
                                    }
                                }
                            }
                            backside = widget.get_backside(true);
                            backside_element = backside.get_element();
                            $(element).replaceWith(backside_element);
                            $(backside_element).css({width: json.view.backside_width,
                                                     height: json.view.backside_height,
                                                     // color may be undefined
                                                     // do the following in a more general manner
                                                     // perhaps using additional classes?
                                                     "background-color": json.view.background_color,
                                                     "border-width": json.view.border_width});
                        } else {
                            // TODO: determine why both levels have the same class here
                            $(element).addClass("toontalk-top-level-resource toontalk-top-level-resource-container");
                            frontside_element = widget.get_frontside_element();
                            $(frontside_element).addClass("toontalk-top-level-resource")
                                                .css({position: 'relative'});
                            element.toontalk_widget = widget;
                            element.appendChild(frontside_element);
                        }
                        if (widget.set_active) {
                            // sensor resources shouldn't run -- currently they are only ones support set_active
                            widget.set_active(false);
                        }
                        if (widget.set_visible) {
                            widget.set_visible(true);
                        }
                        // delay until geometry settles down
                        setTimeout(function () {
                                if (widget.update_display) {
                                    widget.update_display();
                                } // otherwise might be a tool
                                if (json.semantic.running) {
                                    widget.set_running(true);
                                }
                            },
                            1);
                    } else {
                        TT.UTILITIES.report_internal_error("Could not recreate a widget from this JSON: " + json_string);
                    }
                });
        },
        
        set_absolute_position: function ($element, absolute_position) {
            var $ancestor = $element.parent();
            var left = absolute_position.left;
            var top  = absolute_position.top;
            var ancestor_position;
            while ($ancestor.is("*") && !$ancestor.is("html")) {
                ancestor_position = $ancestor.position();
                left -= ancestor_position.left;
                top  -= ancestor_position.top;
                $ancestor = $ancestor.parent();
            }
            $element.css({left: left,
                          top:  top,
                          position: "absolute"});
            if ($element.is(".toontalk-side-animating")) {
                // animation doesn't work with JQuery css
                $element.get(0).style.left = left+"px";
                $element.get(0).style.top  = top +"px";
            }
        },
        
        set_position_relative_to_top_level_backside: function ($element, absolute_position) {
            var top_level_position = $element.closest(".toontalk-top-level-backside").offset();
            if (!top_level_position) {
                console.log("Unable to find top-level backside. Perhaps is 'visible' but not attached.");
                top_level_position = {left: 0, top: 0};
            }
            var left = absolute_position.left-top_level_position.left;
            var top  = absolute_position.top -top_level_position.top;
            $element.css({left: left,
                          top:  top,
                          position: "absolute"});
            if ($element.is(".toontalk-side-animating")) {
                // animation doesn't work with JQuery css
                $element.get(0).style.left = left+"px";
                $element.get(0).style.top  = top +"px";
            }
        },
        
        restore_resource: function ($dropped, dropped_widget) {
            var dropped_copy, dropped_element_copy;
            if ($dropped.is(".toontalk-top-level-resource")) {
                // restore original
                dropped_copy = dropped_widget.copy({fresh_copy: true}); // nest copies should be fresh - not linked
                dropped_element_copy = dropped_copy.get_frontside_element();
                $(dropped_element_copy).css({width:  $dropped.width(),
                                             height: $dropped.height()});
                $dropped.parent().removeClass("toontalk-top-level-resource toontalk-top-level-resource-container");
                $dropped.removeClass("toontalk-top-level-resource toontalk-top-level-resource-container");
                $(dropped_element_copy).addClass("toontalk-top-level-resource toontalk-top-level-resource-container")
                                       .css({position: 'relative'});
                $dropped.get(0).parentElement.appendChild(dropped_element_copy);
                TT.DISPLAY_UPDATES.pending_update(dropped_copy);
                if (dropped_widget.set_active) {
                    dropped_widget.set_active(true);
                    dropped_copy.set_active(false);
                }
            }
        },
        
        find_resource_equal_to_widget: function (widget) {
            var element_found;
            $(".toontalk-top-level-resource").each(function (index, element) {
                var $resource_element = $(element).children(":first");
                var owner = TT.UTILITIES.widget_from_jquery($resource_element);
                if (owner && ((widget.equals && widget.equals(owner)) ||
                              ((widget.matching_resource && widget.matching_resource(owner))))) {
                    element_found = $resource_element.get(0);
                    return false; // stop the 'each'
                }
            });
            return element_found;
        },
        
        set_position_is_absolute: function (element, absolute, event) {
            var position, left, top, ancestor;
            if (event) {
                // either DOM or JQuery event
                if (event) {
                    event = event;
                }
            }
            if (absolute) {
                position = $(element).position();
                left = position.left;
                top = position.top;
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
            
        on_a_nest_in_a_box: function (frontside_element) {
            return $(frontside_element).closest(".toontalk-nest").is("*") && $(frontside_element).closest(".toontalk-box").is("*");
        },
        
        add_one_shot_event_handler: function (element, event_name, maximum_wait, handler) {
            // could replace the first part of this by http://api.jquery.com/one/
            var handler_run = false;
            var one_shot_handler = function (event) {
                // could support any number of parameters but not needed
                handler_run = true;
                if (handler) {
                    handler();
                }
                element.removeEventListener(event_name, one_shot_handler);
            }
            element.addEventListener(event_name, one_shot_handler);
            // transitionend events might not be triggered
            // As https://developer.mozilla.org/en-US/docs/Web/Guide/CSS/Using_CSS_transitions says: 
            // The transitionend event doesn't fire if the transition is aborted because the animating property's value is changed before the transition is completed.
            setTimeout(
                function () {
                    if (!handler_run) {
//                         if (TT.debugging) {
//                             console.log("Timed out after " + maximum_wait +"ms while waiting for " + event_name);
//                         }
                        one_shot_handler();
                    }
                },
                maximum_wait);
        },
        
        animate_to_absolute_position: function (source_element, target_absolute_position, continuation, speed, more_animation_follows) {
            var source_absolute_position = $(source_element).offset();
            var source_relative_position = $(source_element).position();
            var distance = TT.UTILITIES.distance(target_absolute_position, source_absolute_position);
            var remove_transition_class, duration;
            if (!speed) {
                speed = .5; // a half a pixel per millisecond -- so roughly two seconds to cross a screen
            }
            duration = Math.round(distance/speed);
            $(source_element).addClass("toontalk-side-animating");
            source_element.style.transitionDuration = duration+"ms";
            source_element.style.left = (source_relative_position.left + (target_absolute_position.left - source_absolute_position.left)) + "px";
            source_element.style.top =  (source_relative_position.top  + (target_absolute_position.top -  source_absolute_position.top )) + "px";
            if (!more_animation_follows) {
                remove_transition_class = function () {
                    $(source_element).removeClass("toontalk-side-animating");
                    source_element.style.transitionDuration = '';
                };
                // if transitionend is over 500ms late then run handler anyway
                TT.UTILITIES.add_one_shot_event_handler(source_element, "transitionend", duration+500, remove_transition_class);
            }
            TT.UTILITIES.add_one_shot_event_handler(source_element, "transitionend", duration+500, continuation);
        },
        
        distance: function (position_1, position_2) {
            var delta_x = position_1.left-position_2.left;
            var delta_y = position_1.top-position_2.top;
            return Math.sqrt(delta_x*delta_x+delta_y*delta_y);
        },
        
        highlight_element: function (element, point, duration) {
            var widget, frontside_element;
            if (!element) {
                return;
            }
            // only one element can be highlighted
            // first remove old highlighting (if any)
            TT.UTILITIES.remove_highlight(); 
            widget = TT.UTILITIES.widget_of_element(element);
            if (!widget) {
                return;
            }
            if (widget.element_to_highlight && point) {
                element = widget.element_to_highlight(point);
                if (!element) {
                    return;
                }      
            }
            if ($(element).is(".toontalk-highlight")) {
                return; // already highlighted
            }
            $(element).addClass("toontalk-highlight")
                      .css({"z-index": TT.UTILITIES.next_z_index()});
            if (duration) {
                setTimeout(function () {
                        TT.UTILITIES.remove_highlight();
                    },
                    duration);
            }
        },

        remove_highlight: function (element) {
            if (element) {
                $(element).removeClass("toontalk-highlight");
            } else {
                $(".toontalk-highlight").removeClass("toontalk-highlight");
            }
        },
        
        cursor_of_image: function (url) {
            var extensionStart = url.lastIndexOf('.');
            if (extensionStart >= 0) {
                return url.substring(0, extensionStart) + ".32x32" + url.substring(extensionStart);
            }
            return url;
        },

        inside_rectangle: function (x, y, rectangle) {
            return (x >= rectangle.left && x <= rectangle.right &&
                    y >= rectangle.top  && y <= rectangle.bottom);
        },
        
        next_z_index: function () {
            z_index++;
            return z_index;
        },

        create_button: function (label, class_name, title, click_handler) {
            var $button = $("<button>" + label + "</button>").button();
            $button.addClass(class_name)
                   .click(click_handler)
                   .attr("title", title);
            return $button.get(0);
        },
                
        create_close_button: function (handler, title) {
            var close_button = document.createElement("div");
            var x = document.createElement("div");
            $(close_button).addClass("toontalk-close-button");
            $(close_button).click(handler);
            $(close_button).attr("title", title);
            x.innerHTML = "&times;";
            close_button.appendChild(x);
            return close_button;
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

        create_space: function () {
           var span = document.createElement("span");
           span.innerHTML = '&nbsp;';
           $(span).addClass('ui-widget');
           return span;    
        },
        
        create_anchor_element: function (html, url) {
            var anchor = document.createElement("a");
            anchor.innerHTML = html;
            if (TT.TRANSLATION_ENABLED) {
                url = TT.UTILITIES.add_URL_parameter(url, "translate", "1");
            }
            anchor.href= url;
            anchor.target = '_blank';
            return anchor;
        },
        
        // the following methods uses htmlFor instead of making the input a child of the label
        // because couldn't get JQuery buttons to work for radio buttons otherwise
        // and because of a comment about disability software
        // see http://stackoverflow.com/questions/774054/should-i-put-input-tag-inside-label-tag
        
        create_text_input: function (value, class_name, label, title, documentation_url, type) {
            var text_input = document.createElement("input");
            var label_element, container, documentation_anchor;
            text_input.type = "text";
            text_input.className = class_name;
            text_input.value = value;
            text_input.title = title;
            if (type) {
                text_input.type = type;
            }
            if (label) {
                label_element = document.createElement("label");
                label_element.innerHTML = label;
                text_input.id = TT.UTILITIES.generate_unique_id();
                label_element.htmlFor = text_input.id;
                if (documentation_url) {
                    documentation_anchor = TT.UTILITIES.create_anchor_element("i", documentation_url);
                    $(documentation_anchor).addClass("toontalk-help-button notranslate");
                    documentation_anchor.translate = false; // should not be translated
                }
                container = TT.UTILITIES.create_horizontal_table(label_element, text_input, documentation_anchor);
                $(label_element).addClass("ui-widget");
            } else {
                container = text_input;
            }     
            $(text_input).button()
                         .addClass("toontalk-text-input")
                         .css({"background-color": "white"});
            text_input.addEventListener('touchstart', function () {
                $(text_input).select();
            });
            return {container: container,
                    button: text_input};
        },
        
        create_text_area: function (value, class_name, label, title, type) {
            var text_area = document.createElement("textarea");
            var label_element, container;
            text_area.className = class_name;
            text_area.value = value;
            text_area.title = title;
            // the intent here was to be able to change the default virtual keyboard to numeric
            // but only works for input not textarea elements
            // and because numbers can be so large need textarea
//             if (type) {
//                 text_area.type = type;
//             }
            label_element = document.createElement("label");
            label_element.innerHTML = label;
            text_area.id = TT.UTILITIES.generate_unique_id();
            label_element.htmlFor = text_area.id;
            container = TT.UTILITIES.create_horizontal_table(label_element, text_area);
            $(text_area).button()
                        .addClass("toontalk-text-area")
                        .css({"background": "white"}); // somehow JQuery gives a background color despite toontalk-text-area's CSS
            text_area.addEventListener('touchstart', function () {
                $(text_area).select();
            });
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
            for (i = 0; i < arguments.length; i++) {
                if (arguments[i]) {
                    table_element = document.createElement("td");
                    row.appendChild(table_element);
                    table_element.appendChild(arguments[i]);
                }
            }
            return table;
        },
        
        create_vertical_table: function () { // takes any number of parameters
            var table = document.createElement("table");
            var i, row;
            for (i = 0; i < arguments.length; i++) {
                if (arguments[i]) {
                    row = TT.UTILITIES.create_row(arguments[i]);
                    table.appendChild(row);
                }
            }
            return table;
        },
        
        create_row: function () { // any number of elements
            var row = document.createElement("tr");
            var table_element = document.createElement("td");
            var i;
            for (i = 0; i < arguments.length; i++) {
                row.appendChild(arguments[i]);
            }
            table_element.appendChild(row);
            return row;
        },

        create_table_entry: function (element) {
            var td = document.createElement('td');
            td.appendChild(element);
            return td;
        },
        
        selected_radio_button: function () {
            var i, selected;
            for (i = 0; i < arguments.length; i++) {
                if (arguments[i].checked) {
                    return arguments[i];
                }
            }
            return selected;
        },
        
        create_image: function (url, class_name) {
            // if URL is relative and the images folder then an error handler is added
            // that attempts to use a version on a server
            var image = document.createElement("img");
            var error_handler;
            image.src = url; // causes Caja error
            if (class_name) {
                $(image).addClass(class_name);
            }
            if (url.indexOf('images/') === 0) {
                // is a relative URL to images folder so add error handler
                // that tries again with github server
                error_handler = function (event) {
                    image.removeEventListener('error', error_handler);
                    image.src = "http://toontalk.github.io/ToonTalk/" + url;
                }
                image.addEventListener('error', error_handler);
            }
            return image;  
        },

        create_tabs: function (labels, elements) {
            var tabs = document.createElement('div');
            var ul   = document.createElement('ul');
            var id;
//             if (elements.length === 1) {
//                 // no point making a tab of one thing
//                 return elements[0];
//             }
            if (labels.length !== elements.length) {
                console.error("UTILITIES.create_tabs called with different length lists.");
                return tabs;  
            }
            labels.forEach(function (label, index) {
                var li     = document.createElement('li');
                var anchor = document.createElement('a');
                var label_element;
                if (typeof label === 'string') {
                    label_element = document.createElement('span');
                    label_element.innerHTML = label;
                } else {
                    label_element = label; // is already an element
                }
                id = "tab-" + index;
                anchor.href = "#" + id;
                anchor.appendChild(label_element);
                li.appendChild(anchor);
                ul.appendChild(li);
                elements[index].id = id;
            });
            tabs.appendChild(ul);
            elements.forEach(function (element) {
                tabs.appendChild(element);
            });
            $(tabs).tabs(); // use JQuery UI widget
            return tabs;
        },

        create_file_data_table: function (files_data, in_cloud, button_class) {
            var table = document.createElement('table');
            $(table).DataTable({
               data: files_data,
               columns: [{data: 'title', 
                          title: "Name",
                          render: function (data, type, full, meta) {
                                        var name = in_cloud ? data.substring(0, data.length-5) : data;
                                        var url = in_cloud ? TT.google_drive.google_drive_url(full.id) : "Click to load this program.";
                                        // fileId becomes fileid in Chrome (and maybe other browsers)
                                        if (button_class) {
                                            return "<div class='" + button_class + "' title='" + url + "'id='" + full.id + "'>" + name + "</div>";
                                        } else {
                                            // is just an ordinarly link now
                                            if (TT.TRANSLATION_ENABLED) {
                                                url = TT.UTILITIES.add_URL_parameter(url, "translate", "1");
                                            }
                                            return "<a href='" + url + "'target='_blank' title='Click to open published page.'>" + name + "</a>";
                                        }
                          }}, 
                         {data: 'modifiedDate', 
                          title: "Modified",
                          render: function (data, type, full, meta) {
                                      return new Date(data).toUTCString();
                          }},
                         {data: 'createdDate', 
                          title: "Created",
                          render: function (data, type, full, meta) {
                                      return new Date(data).toUTCString();
                          }},
                         {data: 'fileSize', 
                          title: "Size"}]});
            $(table).addClass("toontalk-file-table");
            return table;
        },

        create_local_files_table: function (widget) {
            var all_program_names = TT.UTILITIES.get_all_locally_stored_program_names();
            var data = all_program_names.map(function (program_name) {
                var meta_data = TT.UTILITIES.get_local_storage_meta_data(program_name);
                if (meta_data) {
                    return {title: program_name,
                            modifiedDate: meta_data.last_modified,
                            createdDate:  meta_data.created,
                            fileSize:     meta_data.file_size
                            };
                }
            });
            return TT.UTILITIES.create_file_data_table(data, false, "toontalk-file-load-button");
        },
        
        get_dragee: function () {
            return dragee;
        },

        add_URL_parameter: function (url, parameter, value) {
            url = TT.UTILITIES.remove_URL_parameter(url, parameter);
            var query_index, parameter_conjunction;
            query_index = url.indexOf('?');
            parameter_conjunction = query_index >= 0 ? '&' : '?';
            return url + parameter_conjunction + parameter + "=" + value;
        },

        remove_URL_parameter: function (url, parameter) {
            var old_parameter_index = url.indexOf("&" + parameter + "=");
            var query_index, parameter_conjunction, value_end_index;
            if (old_parameter_index < 0) {
                old_parameter_index = url.indexOf("?" + parameter + "=");   
            }
            if (old_parameter_index < 0) {
                return url; // nothing to removeClass
            }
            value_end_index = url.indexOf('&', old_parameter_index+1);
            if (value_end_index < 0) {
               value_end_index = url.length;
            }
            url = url.substring(0, old_parameter_index) + url.substring(value_end_index);
            if (url[url.length-1] === '?') {
                // remove ? if at end of the URL
                url = substring(0, url.length-1);
            }
            return url;
        },
        
        add_a_or_an: function (word, upper_case) {
            var first_character = word.charAt(0);
            if (word.indexOf("the ") === 0) {
                // don't generate a the box
                return word;
            }
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
        },
        
        maximum_string_length: function (string, maximum_length) {
            // replaces middle of string with ... if needed -- doesn't count the ... as part of the length
            var first_part;
            if (string.length <= maximum_length) {
                return string;
            }
            first_part = string.substring(0, Math.round(maximum_length * .75));
            return first_part + " ... " + string.substring(string.length-(maximum_length-first_part.length));
        },

        backup_all_top_level_widgets: function (immediately) {
            $(".toontalk-top-level-backside").each(function (index, element) {
                var top_level_widget = TT.UTILITIES.widget_of_element(element);
                top_level_widget.save(immediately);
            });
        },
        
        make_resizable: function ($element, widget) {
            $element.resizable({resize: function (event, ui) {
                                    // following needed for element widgets that are images
                                    $element.find("img").css({width:  ui.size.width,
                                                              height: ui.size.height});
                                    widget.render();
                                },
                               // the corner handles looked bad on element widgets
                               // and generally got in the way
                               handles: "n,e,s,w"
                               });
        },
        
        match: function (pattern, widget) {
            var match_status = pattern.match(widget);
            if (match_status.is_widget && widget.matched_by) {
                // e.g. widget is a nest             
                return widget.matched_by(pattern);
            }
            return match_status;
        },
        
        current_URL: function () {
            return window.location.pathname;
        },

        absolute_file_path: function (relative_path) {
            var current_URL = window.location.pathname;
            var file_name_index = current_URL.lastIndexOf('ToonTalk/');
            if (file_name_index < 0) {
                return relative_path;
            }
            return current_URL.substring(0, file_name_index+9) + relative_path;
        },
        
        copy_side: function (side, parameters, dimensions_too) {
            var widget_copy = side.get_widget().copy(parameters);
            var frontside_element, copy_frontside_element;
            if (dimensions_too) {
                frontside_element = side.get_widget().get_frontside_element();
                if (frontside_element) {
                    copy_frontside_element = widget_copy.get_frontside_element(true);
                    $(copy_frontside_element).css({width:  $(frontside_element).width(),
                                                   height: $(frontside_element).height()});
                }
            }
            if (side.is_backside()) {
                return widget_copy.get_backside();
            }
            return widget_copy;
        },
        
        scale_to_fit: function (this_element, other_element, original_width, original_height, delay) {
            var update_css = function () {
                 $(this_element).css({transform: "scale(" + x_scale + ", " + y_scale + ")",
                                      "transform-origin": "top left", 
                                      width:  original_width,
                                      height: original_height});
            };
            var new_width, new_height, x_scale, y_scale;
            if (!original_width) {
                original_width = $(this_element).width();
            }
            if (!original_height) {
                original_height = $(this_element).height();
            }
            if ($(other_element).is(".toontalk-backside")) {
                x_scale = 1;
                y_scale = 1;
            } else {
                new_width  = $(other_element).width();
                new_height = $(other_element).height();
                x_scale = new_width/original_width;
                y_scale = new_height/original_height;
                // e.g. other_element doesn't know it dimensions
                if (x_scale === 0) {
                    x_scale = 1;
                }
                if (y_scale === 0) {
                    y_scale = 1;
                }
            }
            if (delay) {
                setTimeout(update_css, delay);
            } else {
                update_css();
            }
            return {x_scale: x_scale,
                    y_scale: y_scale};
        },
        
        relative_position: function (target_element, reference_element) {
             var target_offset = $(target_element).offset();
             var reference_offset;
             if (reference_element) {
                 reference_offset = $(reference_element).offset();
                 target_offset.left -= reference_offset.left;
                 target_offset.top  -= reference_offset.top;
             }
             return target_offset;
        },
        
        add_animation_class: function (element, class_name) {
            // if any code set the size explicitly then the animation won't display correctly
            $(element).css({width:  '',
                            height: ''})
                      .addClass(class_name);
        },
        
        widget_from_jquery: function ($element) {
             if ($element.length > 0) {
                 return $element.get(0).toontalk_widget;
             }
        },

        widget_of_element: function (element) {
            return element.toontalk_widget;
        },
        
        has_animating_image: function (element) {
            var $element = $(element);
            var animation = $element.css("animation") ||
                            $element.css("webkit-animation") ||
                            $element.css("moz-animation") ||
                            $element.css("ms-animation") ||
                            $element.css("o-animation");
            // rewrite using startsWith in Ecma 6
            return animation && animation.indexOf("none") !== 0;
        },

        display_message: function (message) {
            console.error(message);
            alert(message); // for now
        },

        report_internal_error: function (message) {
            // these are ToonTalk errors not user errors
            console.log(message);
            if (TT.debugging) {
                TT.UTILITIES.display_message(message);
            }
        },

        get_current_url_boolean_parameter: function (parameter, default_value) {
            if (window.location.href.indexOf(parameter + "=") < 0) {
                return default_value;
            }
            if (window.location.href.indexOf(parameter + "=1") >= 0) {
                return true;
            }
            // any value other than 1 is false
            return false;
        },

         get_current_url_parameter: function (parameter, default_value) {
             var parameter_start = window.location.href.indexOf(parameter+"=");
             var parameter_end, next_parameter_start;
             if (parameter_start < 0) {
                 return default_value;
             }
             parameter_end = parameter_start+parameter.length+1;
             next_parameter_start = window.location.href.indexOf("&", parameter_end);
             if (next_parameter_start < 0) {
                 next_parameter_start = window.location.href.length;
             }
             return window.location.href.substring(parameter_end, next_parameter_start);             
         },

        is_browser_of_type: function (type) {
            // type can be "MSIE", "Firefox", "Safari", "Chrome", "Opera"
            return window.navigator.userAgent.indexOf(type) >= 0;
        },

        is_internet_explorer: function () {
            return TT.UTILITIES.is_browser_of_type("MSIE") || // before version 11
                   TT.UTILITIES.is_browser_of_type("Trident");
        },

        remove_z_index: function (html) {
            var $element;
            if (html.length === 0 || html.charAt(0) !== '<') {
                // is plain text
                return html;
            }
            if (html.indexOf("z-index") < 0) {
                // doesn't have a z-index
                return html;
            }
            $element = $(html);
            $element.attr('z-index', '');
            return $element.html();
        },

        add_test_all_button: function () {
            var $div = $("#toontalk-test-all-button");
            var div;
            if ($div.length === 0) {
                return;
            }
            $div.button();
            div = $div.get(0);
            div.innerHTML = "Run all tests";
            var running = false;
            $div.click(function (event) {
                if (running) {
                    $(".toontalk-stop-sign").each(function () {
                        if ($(this).parent().is(".toontalk-top-level-backside")) {
                            $(this).click();
                        }
                    });
                    div.innerHTML = "Run all tests";
                } else {
                    $(".toontalk-green-flag").each(function () {
                        if ($(this).parent().is(".toontalk-top-level-backside")) {
                            $(this).click();
                        }
                    });
                    div.innerHTML = "Stop all tests";
                }
                running = !running;
            });
        },

        set_timeout: function (delayed, delay) {
            if (!delay) {
                // see http://dbaron.org/log/20100309-faster-timeouts
                timeouts.push(delayed);
                window.postMessage(timeout_message_name, "*");
            } else {
                setTimeout(delayed, delay);
            }
        },

        get_all_locally_stored_program_names: function () {
            var all_program_names_json_string = window.localStorage.getItem('toontalk-all-program-names');
            if (all_program_names_json_string) {
                return JSON.parse(all_program_names_json_string);
            } else {
                return [];
            }
        },

        set_all_locally_stored_program_names: function (new_value) {
            window.localStorage.setItem('toontalk-all-program-names', JSON.stringify(new_value));   
        },

        get_local_storage_meta_data: function (program_name) {
            var meta_data_key = TT.UTILITIES.local_storage_program_meta_data_key(program_name);
            var meta_data;
            try {
                meta_data = window.localStorage.getItem(meta_data_key);
                if (meta_data) {
                    return JSON.parse(meta_data);
                }
            } catch (e) {
                // return nothing
            }
        },

        local_storage_program_key: function (program_name) {
            return "toontalk-json: " + program_name;
        },

        local_storage_program_meta_data_key: function (program_name) {
            return "toontalk-meta-data: " + program_name;
        },

        enable_editor: function (editor_window, url, file_id, widgets_json) {
            // widgets_json can be undefined
            var repeatedly_post_message_until_reply = function (message_poster, file_id) {
                var message_listener = function (event) {
                    if (event.data.editor_enabled_for && event.data.editor_enabled_for === file_id) {
                        message_acknowledged = true;
                        window.removeEventListener("message", message_listener);
                    }
                };
                var repeat_until_acknowledged = function (message_poster, file_id) {
                    if (message_acknowledged) {
                        return;
                    }
                    setTimeout(function () {
                                   message_poster();
                                   // and try again after a delay (unless acknowledged)
                                   repeat_until_acknowledged(message_poster, file_id);
                               },
                               500);
                };
                var message_acknowledged = false;
                window.addEventListener("message", message_listener);
                repeat_until_acknowledged(message_poster, file_id);
            };
            repeatedly_post_message_until_reply(function () {
                                                    // using * instead of url
                                                    // since https://googledrive.com/host/...
                                                    // becomes https://a1801c08722da65109a4efa9e0ae4bdf83fafed0.googledrive.com/host/...
                                                    editor_window.postMessage({save_edits_to: window.location.href,
                                                                               file_id: file_id,
                                                                               widgets_json: widgets_json},
                                                                              "*");
                                                },
                                                file_id);
        },

        enable_touch_events: function (element, maximum_click_duration) {
            var original_element = element;
            var touch_start_handler = function (event) {
                // rewrite using startsWith in ECMAScript version 6
                if (TT.debugging && TT.debugging.indexOf('touch') === 0) {
                    TT.debugging += "\ntouch start";
                }
                event.preventDefault();
                // text area input and resize handles work differently
                if (event.srcElement.tagName === 'TEXTAREA' || 
                    event.srcElement.tagName === 'INPUT' ||
                    $(event.srcElement).is(".ui-resizable-handle")) {
                    // rewrite using startsWith in ECMAScript version 6
                    if (TT.debugging && TT.debugging.indexOf('touch') === 0) {
                        TT.debugging += "\ntouch start ignored due to tag name or class";
                    }
                   return;
                }
                event.stopPropagation();
                TT.UTILITIES.set_timeout(
                    function () {
                        var touch = event.changedTouches[0];
                        var simulatedEvent, bounding_rectangle, widget, widget_copy, element_position;
                        if (touch_end_occurred) {
                            touch_end_occurred = false;   
                            simulatedEvent = document.createEvent("MouseEvent");
                            simulatedEvent.initMouseEvent('click', true, true, window, 1,
                                                          touch.screenX, touch.screenY,
                                                          touch.clientX, touch.clientY, false,
                                                          false, false, false, 0, null);
                            touch.target.dispatchEvent(simulatedEvent);
                            if (TT.debugging && TT.debugging.indexOf('touch') === 0) {
                                TT.debugging += "\ntouch end treated as click";
                                alert(TT.debugging);
                                TT.debugging = 'touch';
                            }   
                        } else {
                            drag_started = true;
                            widget = TT.UTILITIES.widget_of_element(element);
                            if (widget && widget.get_infinite_stack()) {
                                widget_copy = widget.copy({});
                                widget.add_copy_to_container(widget_copy, 0, 0);
                                widget.set_infinite_stack(false);
                                widget_copy.set_infinite_stack(true);
                            } else if ($(element).is(".toontalk-top-level-resource")) {
                                widget_copy = widget.copy({});
                                widget.add_copy_to_container(widget_copy, 0, 0);
                                // need to capture the position of the original
                                element_position = $(element).offset();
                                element = widget_copy.get_frontside_element(true);                              
                            }
                            if (!element_position) {
                                element_position = $(element).offset();
                            }
                            drag_start_handler(event, element);
                            drag_x_offset = touch.clientX - element_position.left;
                            drag_y_offset = touch.clientY - element_position.top;
                            if (TT.debugging && TT.debugging.indexOf('touch') === 0) {
                                TT.debugging += "\ndrag started";
                            }
                        }
                    },
                    maximum_click_duration);
            };
            var touch_end_handler = function (event) {
                var touch, widget;
                event.stopPropagation();
                event.preventDefault();
                if (drag_started) {
                    drag_started = false;
                    touch = event.changedTouches[0];
                    drag_end_handler(event, element);
                    widget = TT.UTILITIES.widget_of_element(element); //TT.UTILITIES.find_widget_on_page(touch, element, 0, 0);
                    if (TT.debugging && TT.debugging.indexOf('touch') === 0) {
                        TT.debugging += "\ndrag ended";
                    }
                    if (widget) {
                        drop_handler(event, element); // widget.get_frontside_element());
                        if (TT.debugging && TT.debugging.indexOf('touch') === 0) {
                            TT.debugging += "\ndrop happened";
                        }
                    }
                    if (TT.debugging && TT.debugging.indexOf('touch') === 0) {
                        alert(TT.debugging);
                        TT.debugging = 'touch';
                    }
                } else {
                    // touch_start time out will see this and treat it all as a click
                    touch_end_occurred = true;
                }
                // restore the original element
                element = original_element;
            };
            var touch_move_handler = function (event) {
                var widget_under_element, widget, widget_copy, touch;
                event.preventDefault();
                if (drag_started) {
                    touch = event.changedTouches[0];
                    TT.UTILITIES.set_absolute_position($(element), {left: touch.pageX-drag_x_offset,
                                                                    top:  touch.pageY-drag_y_offset});
                    widget_under_element = TT.UTILITIES.find_widget_on_page(touch, element, 0, 0);
                    if (widget_drag_entered && widget_drag_entered !== widget_under_element) {
                        drag_leave_handler(touch, widget_drag_entered.get_frontside_element());
                        widget_drag_entered = undefined;
                    }
                    if (widget_under_element) {
                        drag_enter_handler(touch, widget_under_element.get_frontside_element());
                        widget_drag_entered = widget_under_element;
                    }
                    if (TT.debugging && TT.debugging.indexOf('touch') === 0) {
                        TT.debugging += "\ndragged to " + (touch.pageX-drag_x_offset) + ", " + (touch.pageY-drag_y_offset);
                    }
                } else if (TT.debugging && TT.debugging.indexOf('touch') === 0) {
                    TT.debugging += "\ntouch move ignored since drag_started not yet set. " + Date.now();
                }
            };
            var drag_started       = false;
            var touch_end_occurred = false;
            var drag_x_offset = 0;
            var drag_y_offset = 0;
            var widget_drag_entered, closest_top_level_backside;
            element.addEventListener("touchstart",  touch_start_handler, true);
            element.addEventListener("touchmove",   touch_move_handler,  true);
            element.addEventListener("touchend",    touch_end_handler,   true);
            element.addEventListener("touchcancel", touch_end_handler,   true); // good enough?
        },

        get_mouse_or_first_touch_event_attribute: function (attribute, event) {
            // either mouse event's attribute or first touch' location's attribute
            if (event.changedTouches) {
                return event.changedTouches[0][attribute];
            }
            return event[attribute];
        },

        find_widget_on_page: function (event, element, x_offset, y_offset) {
            // return what is under the element
            var page_x = TT.UTILITIES.get_mouse_or_first_touch_event_attribute("pageX", event);
            var page_y = TT.UTILITIES.get_mouse_or_first_touch_event_attribute("pageY", event);
            var element_on_page, widget_on_page, widget_type;
            // hide the tool so it is not under itself
            $(element).hide();
            // select using the leftmost part of tool and vertical center
            element_on_page = document.elementFromPoint(page_x - (window.pageXOffset + x_offset), (page_y - (window.pageYOffset + y_offset)));
            $(element).show();
            while (element_on_page && !element_on_page.toontalk_widget && 
                   (!$(element_on_page).is(".toontalk-backside") || $(element_on_page).is(".toontalk-top-level-backside"))) {
                // element might be a 'sub-element' so go up parent links to find ToonTalk widget
                element_on_page = element_on_page.parentNode;
            }
            if (element_on_page) {
                widget_on_page = element_on_page.toontalk_widget;
            }
            if (!widget_on_page) {
                return;
            }
            if (widget_on_page && widget_on_page.get_contents && widget_on_page.get_contents()) {
                widget_on_page = widget_on_page.get_contents();
            }
            widget_type = widget_on_page.get_type_name();
            if (widget_on_page && widget_type === "empty hole") {
                return widget_on_page.get_parent_of_frontside();
            }
            return widget_on_page;
       },

       closest_top_level_backside: function (x, y) {
           var best_so_far, best_distance_so_far;
           $(".toontalk-top-level-backside").each(function () {
               var position = $(this).offset();
               var this_distance = (position.left + $(this).width()/2 - x)^2 + 
                                   (position.top  + $(this).height()/2 - x)^2;;
               if (best_so_far) {
                   if (this_distance < best_distance_so_far) {
                        best_so_far = this;
                        best_distance_so_far = this_distance;
                   }
               } else {
                   best_so_far = this;
                   best_distance_so_far = this_distance;
               }
           });
           return TT.UTILITIES.widget_of_element(best_so_far);
       },

//         enable_touch_events: function (maximum_click_duration) {
//             // based on ideas in http://stackoverflow.com/questions/5186441/javascript-drag-and-drop-for-touch-devices/6362527#6362527
//             var last_touch_down_time;
//             var touch_handler = function (event) {
//                 var touch = event.changedTouches[0];
//                 var mouse_event_type;
//                 var simulatedEvent = document.createEvent("MouseEvent");
//                 switch (event.type) {
//                 case "touchstart": 
//                     mouse_event_type = "dragstart"; 
//                     last_touch_down_time = Date.now(); 
//                     break;
//                 case "touchmove": 
//                     mouse_event_type = "drag"; 
//                     last_touch_down_time = undefined; 
//                     break;        
//                 case "touchend": 
// //                     if (last_touch_down_time && (Date.now() - last_touch_down_time) <= maximum_click_duration){
// //                         last_touch_down_time = undefined;
// //                         mouse_event_type = "click"; 
// //                         break;
// //                     } 
//                     mouse_event_type = "dragend"; 
//                     break;
//                 }
//                 if (!mouse_event_type) {
//                     return;
//                 }
//                 simulatedEvent.initMouseEvent(mouse_event_type, true, true, window, 1,
//                                               touch.screenX, touch.screenY,
//                                               touch.clientX, touch.clientY, false,
//                                               false, false, false, 0, null);
//                 touch.target.dispatchEvent(simulatedEvent);
//                 event.preventDefault();
//             };
//             document.addEventListener("touchstart",  touch_handler, true);
//             document.addEventListener("touchmove",   touch_handler, true);
//             document.addEventListener("touchend",    touch_handler, true);
//             document.addEventListener("touchcancel", touch_handler, true);
//         },

        create_queue: function () {
/*  Following based upon 

Created by Stephen Morley - http://code.stephenmorley.org/ - and released under
the terms of the CC0 1.0 Universal legal code:

http://creativecommons.org/publicdomain/zero/1.0/legalcode

Creates a new queue. A queue is a first-in-first-out (FIFO) data structure -
items are added to the end of the queue and removed from the front.

Edited by Ken Kahn for better integration with the rest of the ToonTalk code
 */

          // initialise the queue and offset
          var queue  = [];
          var offset = 0;

          return {
                  getLength: function() {
                      return (queue.length - offset);
                  },
                  // Returns true if the queue is empty, and false otherwise.
                  isEmpty: function() {
                      return (queue.length == 0);
                  },
                  // Enqueues the specified item.
                  enqueue:function(item) {
                      queue.push(item);
                  },
                  // Dequeues an item and returns it. 
                  // If the queue is empty, the value'undefined' is returned.
                  dequeue: function () {
                      var item;
                      if (queue.length == 0) {
                          return undefined;
                      }
                      item = queue[offset];
                      // increment the offset and remove the free space if necessary
                      if (++ offset * 2 >= queue.length){
                         queue  = queue.slice(offset);
                         offset = 0;
                      }
                      // return the dequeued item
                      return item;
                  },
                  // Returns the item at the front of the queue (without dequeuing it).
                  // If the queue is empty then undefined is returned.
                  peek: function() {
                     return (queue.length > 0 ? queue[offset] : undefined);
                  },
                  // Ken Kahn added this the following
                  // useful for debugging but should be avoided in production code
                  does_any_item_satisfy: function (predicate) {
                      var i;
                      for (i = offset; i < queue.length; i++) {
                           if (predicate(queue[i])) {
                               return true;
                           }
                      }
                      return false;
                  }
            };
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

window.TOONTALK.UTILITIES.available_types = ["number", "box", "element", "robot", "nest", "sensor", "top-level"];
