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

    // following holds all the utility functions
    // defined here to support self-reference
    var utilities = {};    
    var dragee;
    var z_index = 100;
    // id needs to be unique across ToonTalks due to drag and drop
    var id_counter = new Date().getTime();
    var div_json   = "<div class='toontalk-json'>";
    var div_hidden = "<div style='display:none;'>"; // don't use a class since CSS might not be loaded
    var div_hidden_and_json_start = div_hidden + "{";
    var div_close  = "</div>";
    var path_to_toontalk_folder;
    var extract_json_from_div_string = function (div_string) {
        // expecting div_string to begin with div_open and end with div_close
        // but users may be dragging something different
        // but checking first for div_hidden_and_json_start because div_string might include a { as part of its textual comment
        var json_start = div_string.indexOf(div_hidden_and_json_start);
        if (json_start < 0) {
            json_start = div_string.indexOf('{');
        } else {
            json_start += div_hidden.length;
        }
        var json_end = div_string.lastIndexOf('}');
        if (json_start < 0 || json_end < 0) {
            return;
        }
        return div_string.substring(json_start, json_end+1);
    };
    var drag_start_handler = function (event, element) {
        var $source_element = $(element).closest(".toontalk-side");
        var client_x = utilities.get_mouse_or_first_touch_event_attribute("clientX", event);
        var client_y = utilities.get_mouse_or_first_touch_event_attribute("clientY", event);
        var bounding_rectangle, json_object, json_div, widget, is_resource;
        $(".ui-tooltip").remove();
        // stop animating it if grabbed
        $(".ui-tooltip").removeClass("toontalk-side-animating");
        // was using text/plain but IE complained
        // see http://stackoverflow.com/questions/18065840/html5-drag-and-drop-not-working-on-ie11
        if (event.dataTransfer && event.dataTransfer.getData("text") && event.dataTransfer.getData("text").length > 0) {
            // e.g. dragging some text off the backside of a widget
            return;
        }
        dragee = ($source_element || $(element));
        widget = utilities.widget_from_jquery(dragee);
        if (!widget) {
            widget = utilities.widget_of_element(element);
            utilities.report_internal_error("Possible bug that " + dragee + " doesn't have a known owner.");
            dragee = $(element);
        }
        if (widget.set_stopped) {
            widget.set_stopped(true);
        }
        if (widget.save_dimensions && (!widget.get_parent_of_frontside() || widget.get_parent_of_frontside().get_widget().is_top_level())) {
            widget.save_dimensions();
        }
        widget.being_dragged = true;
        bounding_rectangle = dragee.get(0).getBoundingClientRect();
        is_resource = dragee.is(".toontalk-top-level-resource");
        // should not wiggle if picked up
        $(element).removeClass("toontalk-wiggle");
        if (widget.get_json) {
            json_object = utilities.get_json_top_level(widget);
            json_object.view.drag_x_offset = client_x-bounding_rectangle.left;
            json_object.view.drag_y_offset = client_y-bounding_rectangle.top;
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
                json_div = utilities.toontalk_json_div(json_object, widget);
                event.dataTransfer.effectAllowed = is_resource ? 'copy' : 'move';
                // text is good for dragging to text editors
                event.dataTransfer.setData("text", json_div);
                // text/html should work when dragging to a rich text editor
                if (!utilities.is_internet_explorer()) {
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
        utilities.widget_from_jquery(dragee).being_dragged = undefined;
        if (dragee.is(".toontalk-frontside")) {
            if (dragee.parent().is(".toontalk-backside")) {
                // restore ordinary size styles
                var json_object = dragee.data("json");
                if (json_object) {
                    utilities.set_css(dragee,
                                      {width:  json_object.view.frontside_width,
                                       height: json_object.view.frontside_height});
                }
            } else if (!dragee.parent().is(".toontalk-top-level-resource, .toontalk-drop-area, .toontalk-json") &&
                       !dragee.is(".toontalk-carried-by-bird, .toontalk-element-attribute, .toontalk-function-bird-documentation-bird") &&
                       !utilities.has_animating_image(dragee.get(0))) {
                utilities.set_css(dragee,
                                  {width:  "100%",
                                   height: "100%"});
            }
        }
        drag_ended();
        event.stopPropagation();
    };
    var get_dropped_widget = function (event) {
        // TODO: use this within drop_handler
        var json_object;
        if (dragee) {
            return utilities.widget_from_jquery(dragee);
        }
        if (event) { 
            json_object = utilities.data_transfer_json_object(event);
            return utilities.create_from_json(json_object);
        }
    };
    var drop_handler = function (event, element) {
        // TODO: event.currentTarget should always be === element so this could simplified
        var json_object = utilities.data_transfer_json_object(event);
        var insert_widget_in_editable_text = function (json_object, event) {
            var widget = utilities.create_from_json(json_object);
            var top_level_element = document.createElement('div');
            var json_object_element = json_object.view.backside ? widget.get_backside_element(true) : widget.get_frontside_element(true);
            var $current_editable_text = $(element).closest(".toontalk-edit");
            var editable_text = TT.published_support.create_editable_text();
            var child_target = event.target;
            $(top_level_element).addClass("toontalk-json toontalk-top-level-resource toontalk-top-level-resource-container");
            $(json_object_element).addClass("toontalk-top-level-resource")
                                  .css({position: 'relative'});
            json_object_element.toontalk_widget = widget;
            top_level_element.toontalk_widget   = widget;
            top_level_element.appendChild(json_object_element);
            $(top_level_element).insertAfter($current_editable_text);
            while (child_target.nextSibling) {
                $(editable_text).children(".froala-element").get(0).appendChild(child_target.nextSibling);
            }
            $(editable_text).insertAfter(top_level_element);
            widget.update_display();
            // TODO: trigger save of this page?
        };
        var $source, source_widget, $target, target_widget, drag_x_offset, drag_y_offset, target_position, 
            new_target, source_is_backside, $container, container, width, height, i, page_x, page_y,
            source_widget_saved_width, source_widget_saved_height;
        if (!json_object && dragee) {
            json_object = dragee.data("json");
        }
        if (dragee) {
            dragee.data("json", ""); // no point wasting memory on this anymore
        }
        // should this set the dropEffect? 
        // https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer#dropEffect.28.29 
        // restore events to decendants
//         $(element).find("*").removeClass("toontalk-ignore-events");
        $source = dragee;
        drag_ended();
        if (!$source && !json_object && !event.dataTransfer.files && !non_data_URL_in_data_transfer(event)) {
            if (!event.dataTransfer) {
                utilities.report_internal_error("Drop failed since there is no event.dataTransfer");
            } else {
                utilities.report_internal_error("Drop failed since unable to parse as JSON."); 
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
            target_widget = utilities.widget_from_jquery($target);
            if (target_widget) {
                if ($source) {
                    source_widget = utilities.widget_from_jquery($source);
                } else {
                    source_widget = utilities.create_from_json(json_object);
                }
                utilities.restore_resource($source, source_widget);
                target_widget.dropped_on_style_attribute(source_widget, event.target.name, event);
                event.stopPropagation();
                return;
            }
        } else if ($(event.target).is(".toontalk-drop-area")) {
            $target = $(event.target);
       } else if (json_object && $(event.currentTarget).is(".froala-element")) {
            // dropped a widget on editable text - insert it after that
            insert_widget_in_editable_text(json_object, event);
            return;
        } else {
            // closest includes 'self'
            $target = $(event.target).closest(".toontalk-side");
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
        utilities.remove_highlight();
        target_widget = utilities.widget_from_jquery($target);
        if ($source && $source.length > 0 &&
            !(target_widget && target_widget.get_infinite_stack && target_widget.get_infinite_stack()) && // OK to drop on infinite stack since will become a copy
            ($source.get(0) === $target.get(0) || jQuery.contains($source.get(0), $target.get(0)))) {
            if ($source.is(".toontalk-top-level-backside")) {
                return; // let event propagate since this doesn't make sense
            }
            // not dropping on itself but on the widget underneath
            // to not find $target again temporarily hide it
            $target.hide();
            page_x = utilities.get_mouse_or_first_touch_event_attribute("pageX", event);
            page_y = utilities.get_mouse_or_first_touch_event_attribute("pageY", event);
            new_target = document.elementFromPoint(page_x-window.pageXOffset,page_y-window.pageYOffset);
            $target.show();
            if (new_target) {
                $target = $(new_target).closest(".toontalk-side");
                target_position = $target.offset();
                target_widget = utilities.widget_from_jquery($target);
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
                utilities.set_css($source,
                                  {left: $source.get(0).offsetLeft + (event.layerX - drag_x_offset),
                                   top:  $source.get(0).offsetTop  + (event.layerY - drag_y_offset)});
                event.stopPropagation();
                return;
            }
            source_is_backside = $source.is(".toontalk-backside");
            source_widget = utilities.widget_from_jquery($source);
            if ($source.parent().is(".toontalk-drop-area")) {
                $source.removeClass("toontalk-widget-in-drop_area");
                $source.parent().data("drop_area_owner").set_next_robot(undefined);
            } else {
                $container = $source.parents(".toontalk-side:first");
                container = utilities.widget_from_jquery($container);
                if (container) {
                    if (!source_is_backside && source_widget.get_infinite_stack && source_widget.get_infinite_stack()) {
                        // leave the source there but create a copy
                        source_widget_saved_width  = source_widget.saved_width;
                        source_widget_saved_height = source_widget.saved_height;
                        source_widget = source_widget.copy();
                        source_widget.saved_width  = source_widget_saved_width;
                        source_widget.saved_height = source_widget_saved_height;
                        width  = $source.width();
                        height = $source.height();
                        $source = $(source_widget.get_frontside_element(true));
                        if ($target.is(".toontalk-backside")) {
                            // if original dimensions available via json_object.view use it
                            // otherwise copy size of infinite_stack
                            utilities.set_css($source,
                                              {width:  json_object.view.frontside_width  || width,
                                               height: json_object.view.frontside_height || height});
                        }
                    } else if (container.removed_from_container) {
                        // can be undefined if container is a robot holding something
                        // but probably that should be prevented earlier
                        if ($container.is(".toontalk-backside")) {
                            container.remove_backside_widget(source_widget, source_is_backside, true);
                        } else {
                            container.removed_from_container(source_widget, source_is_backside, event, undefined, true);
                            if (source_widget.restore_dimensions && !container.is_empty_hole()) {
                                source_widget.restore_dimensions();
                            }
                        }
                    }
                } else {
                    utilities.restore_resource($source, source_widget);
                }
                if (source_widget.robot_in_training()) {
                    // maybe have been copied
                    // or removed from a container (and not 'seen' before)
                    source_widget.robot_in_training().add_newly_created_widget_if_new(source_widget);
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
            } else if (non_data_URL_in_data_transfer(event)) {
                // using URL instead of text/uri-list to be compatible with IE -- see http://www.developerfusion.com/article/144828/the-html5-drag-and-drop-api/
                handle_drop_from_uri_list(event.dataTransfer.getData("URL"), $target, target_widget, target_position, event);
                event.stopPropagation();
                return;
            } else {
                source_widget = utilities.create_from_json(json_object, {event: event});
            }
            if (!source_widget) {
                if (json_object) {
                    utilities.report_internal_error("Unable to construct a ToonTalk widget from the JSON.");
                } else if (TT.debugging) {
                    console.log("No data transfer in drop.");
                }
                event.stopPropagation();
                return;
            }
            if (source_widget.robot_in_training()) {
                // dropped something from a different window/tab so treat it like the robot picked it up
                source_widget.robot_in_training().drop_from_data_transfer(source_widget);
            }
            source_is_backside = json_object.view.backside;
            if (source_is_backside) {
                $source = $(source_widget.get_backside_element());
                utilities.set_css($source,
                                  {width: json_object.view.backside_width,
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
    var add_drop_handler_to_input_element = function (input_element, drop_handler) {
        // TODO: need touch version of the following
        var new_drop_handler = 
            function (event) {
                var dropped = get_dropped_widget(event);
                // if drag was from a resource then restore it
                utilities.restore_resource(utilities.get_dragee(), dropped);
                drop_handler(event);
            }
        input_element.addEventListener('drop', new_drop_handler);
    };
    var $toontalk_side_underneath = function (element) {
        var $target = $(element).closest(".toontalk-side");
        var dragee = utilities.get_dragee();
        if ($target.is("*") &&
            !$target.is(".toontalk-top-level-backside") && 
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
            utilities.highlight_element($element_underneath.get(0), event);
            // moving over decendants triggers dragleave unless their pointer events are turned off
            // they are restored on dragend
//             if (!$element_underneath.is(".toontalk-backside, .toontalk-drop-area") && utilities.widget_of_element(element).get_type_name() !== 'box') {
//                 // this breaks the dropping of elements on empty holes so not supported
//                 $element_underneath.find(".toontalk-side").addClass("toontalk-ignore-events");
//                 // except for toontalk-sides and their ancestors since they are OK to drop on
//             }
            return $element_underneath.get(0); // return highlighted element
        }
    };
    var drag_leave_handler = function (event, element) {
        utilities.remove_highlight(element);
    };
    var handle_drop = function ($target, $source, source_widget, target_widget, target_position, event, json_object, drag_x_offset, drag_y_offset, source_is_backside) {
        var page_x = utilities.get_mouse_or_first_touch_event_attribute("pageX", event);
        var page_y = utilities.get_mouse_or_first_touch_event_attribute("pageY", event);
        var new_target, backside_widgets_json, shared_widgets, top_level_element, top_level_backside_position, backside_widgets, 
            left, top, element_here, css, robot_in_training;
        source_widget.set_visible(true);
        if ($target.is(".toontalk-backside")) {
            if (source_widget.is_top_level()) {
               // add all top-level backsides contents but not the backside widget itself
               backside_widgets_json = json_object.semantic.backside_widgets;
               shared_widgets = json_object.shared_widgets;
               top_level_element = $target.get(0);
               robot_in_training = target_widget.robot_in_training();
               if (robot_in_training) {
                   robot_in_training.drop_from_data_transfer(source_widget, target_widget);  
               }
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
                   css = {left: position.left + left_offset,
                          top:  position.top  + top_offset,
                          width:  width,
                          height: height};
                   utilities.constrain_css_to_fit_inside(top_level_element, css);
                   utilities.set_css(element_of_backside_widget, css);
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
                utilities.report_internal_error("No source_widget");
            }
            // should the following use pageX instead?
            // for a while using target_position.top didn't work while
            // $target.get(0).offsetTop did and then it stopped working
            // not sure what is happening or even whey they are different
            // consider also using layerX and layerY
//             if (typeof drag_x_offset === 'undefined' && source_widget.is_element()) {
//                  drag_x_offset = 0;
//                  drag_y_offset = 0;
//                 // drag a picture from a non-ToonTalk source so at least Windows displays about about a 90x90 square while dragging
//                 // and, except for small images, it is 'held' at the bottom centre
//                 // while images from web pages are held in the center
//                 setTimeout(function () {
//                    var html   = source_widget.get_HTML();
//                    var width  = $source.width();
//                    var height = $source.height();
//                    var x_offset, y_offset;
//                    if (html.indexOf("data:image") >= 0) {
//                        x_offset = Math.min(80, width)/2;
//                        y_offset = 90;
//                        if (height < 90) {
//                            y_offset -= (90-height)/2;
//                        }
//                    } else {
//                        // is about 120x60
//                        // but drag offset can be anywhere...
//                        x_offset = Math.min(60, width/2);
//                        y_offset = Math.min(30, height/2);  
//                    }
//                    utilities.set_css($source,
//                                      {left: left-x_offset,
//                                       top:  top -y_offset}); 
//                 },
//                 50);
//             }
            if (typeof drag_x_offset !== 'undefined') {
                left = page_x - (target_position.left + (drag_x_offset || 0));
                top  = page_y - (target_position.top  + (drag_y_offset || 0));
                utilities.set_css($source,
                                  {left: TT.UTILITIES.left_as_percent(left, $source.get(0)),
                                   top:  TT.UTILITIES.top_as_percent (top,  $source.get(0))});
            }
            if (json_object && json_object.semantic.running && !utilities.get_dragee()) {
                // JSON was dropped here from outside so if was running before should be here
                // but not if just a local move
                source_widget.set_running(true);
            }
        } else if ($target.is(".toontalk-drop-area")) {
            $source.addClass("toontalk-widget-in-drop_area");
            $target.append($source.get(0));
            if ($source.is(".toontalk-robot")) {
                $target.data("drop_area_owner").set_next_robot(utilities.widget_from_jquery($source));
            }
        } else if ($source.is(".toontalk-backside-of-top-level")) {
            // dragging top-level backside to itself or one of its children is ignored
            return;
        } else if (!target_widget && !event.changedTouches) {
            utilities.report_internal_error("target widget missing");
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
                target_widget = utilities.widget_of_element(top_level_element).get_backside();
            }
            if (!top_level_element) {
                return; // give up
            }
            top_level_element.appendChild($source.get(0));
            top_level_backside_position = $(top_level_element).offset();
            utilities.set_css($source,
                              {left: page_x - (top_level_backside_position.left + drag_x_offset),
                               top:  page_y - (top_level_backside_position.top  + drag_y_offset)}
            );
            if (source_widget.drop_on && source_widget.drop_on(target_widget, source_is_backside, event)) {
            } else if (target_widget.widget_dropped_on_me && target_widget.widget_dropped_on_me(source_widget, source_is_backside, event)) {
            } else {
                // ignore the current target and replace with the backside it is on
                new_target = $target.closest(".toontalk-top-level-backside");
                if (new_target.length > 0) {
                    target_widget = utilities.widget_from_jquery(new_target);
                    if (target_widget) {
                        target_widget.get_backside().widget_dropped_on_me(source_widget, source_is_backside, event);
                    }
                }
            }
        }
        utilities.remove_highlight();
    };
    var handle_drop_from_file_contents = function (file, $target, target_widget, target_position, event) {
        var reader = new FileReader();
        var image_file = file.type.indexOf("image") === 0;
        var audio_file = file.type.indexOf("audio") === 0;
        var video_file = file.type.indexOf("video") === 0;
        var widget, json, element_HTML, json_object;
        reader.onloadend = function () {
            if (image_file) {
                widget = TT.element.create("<img src='" + reader.result + "' alt='" + file.name + "'/>");
            } else if (audio_file) {
                 widget = TT.element.create(file.name + " sound");
                 widget.set_sound_effect(new Audio(reader.result));
            } else if (video_file) {
                widget = TT.element.create("<video src='" + reader.result + "' alt='" + file.name + "'/>");
            } else {
                json = extract_json_from_div_string(reader.result);
                if (json) {
                    try {
                        json_object = JSON.parse(json);
                        widget = utilities.create_from_json(json_object);
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
            if (widget && widget.robot_in_training()) {
                widget.robot_in_training().drop_from_data_transfer(widget, target_widget);
            }
            handle_drop($target, $(widget.get_frontside_element(true)), widget, target_widget, target_position, event, json_object);
        }
        if (image_file || audio_file || video_file) {
            reader.readAsDataURL(file);
        } else {
            reader.readAsText(file);
        }
    };
    var handle_drop_from_uri_list = function (uri_list, $target, target_widget, target_position, event) {
        var handle_drop_from_uri = 
            function (uri, $target, target_widget, target_position, event) {                 
                var widget_callback = function (widget) {
                    if (widget) {
                        if (widget && widget.robot_in_training()) {
                            widget.robot_in_training().drop_from_data_transfer(widget, target_widget);
                        }
                        handle_drop($target, $(widget.get_frontside_element(true)), widget, target_widget, target_position, event);
                    }
                };
                var error_handler = function (error) {
                    var text =  event.dataTransfer.getData("text/html") || event.dataTransfer.getData("text");
                    if (text) {
                        widget_callback(TT.element.create(text));
                    } else {
                        utilities.display_message("Error: " + error + ". When trying to fetch " + uri);
                        console.log(error);
                    }
                    // is there more than be done if not text?
                };
//                 var error_handler = function (response_event) {
//                     // if can't make a widget from the URL then make an iframe of it
//                     var widget = TT.element.create("<div class='toontalk-iframe-container'><iframe src='" + uri + "' width='480' height='320'></iframe></div>");
//                     var frontside_element, iframe;
//                     frontside_element = widget.get_frontside_element(true);
//                     iframe = frontside_element.firstChild.firstChild;
//                     $(iframe).ready(function (event) {
//                         console.log(event);
//                     });
//                     handle_drop($target, $(frontside_element), widget, target_widget, target_position, event);
//                     iframe.addEventListener('load', function (event) {
//                         console.log(event);
//                     });
//                 };
                utilities.create_widget_from_URL(uri, widget_callback, error_handler);               
        };
        uri_list.split(/\r?\n/).forEach(function (uri) {
            if (uri[0] !== "#") {
                // is not a comment
                // see https://developer.mozilla.org/en-US/docs/Web/Guide/HTML/Recommended_Drag_Types
                handle_drop_from_uri(uri, $target, target_widget, target_position, event);
            }
        });
    };
    var initialize = function () {
       var translation_div, volume;
        TT.debugging = utilities.get_current_url_parameter('debugging');
        TT.logging   = utilities.get_current_url_parameter('log');
        volume = utilities.get_current_url_numeric_parameter('volume', 10); // 10% volume default
        if (volume > 0) {
            initialize_sounds(volume/100);
        }
        utilities.process_json_elements();
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
        TT.DEFAULT_QUEUE = window.TOONTALK.queue.create();
        // might want two queues: so new entries end up in the 'next queue'
        TT.DEFAULT_QUEUE.run();
        window.addEventListener('beforeunload', function (event) {
            try {
                utilities.backup_all_top_level_widgets(true);
            } catch (error) {
                console.log(error);
            }
        });
        // add tooltips to widget sides or tools
//         setTimeout(custom_tooltips_for_all_titles);
        TT.TRANSLATION_ENABLED = utilities.get_current_url_boolean_parameter("translate", false);
        if (TT.TRANSLATION_ENABLED) {
            $("a").each(function (index, element) {
                            element.href = utilities.add_URL_parameter(element.href, "translate", "1"); 
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
        if (!TT.vacuum.the_vacuum) {
            TT.vacuum.create();
        }
        utilities.add_test_all_button();
        // compute the default dimensions of robots, birds, nests, and scales (not really needed for scales and causes a bug in test-programs.html)
        discover_default_dimensions('toontalk-robot',       TT.robot);
        discover_default_dimensions('toontalk-empty-nest',  TT.nest);
        discover_default_dimensions('toontalk-bird-static', TT.bird);
        // all titles should use custom tool tips (e.g. those in documentation pages)
        $("[title]").each(function (index, element) {
                              window.TOONTALK.UTILITIES.use_custom_tooltip(element);
	    });
	    document.addEventListener("visibilitychange", function() {
	        if (!document.hidden) {
	            // make sure all widgets are redisplayed
                utilities.rerender_all();
	        }
	    });
//         discover_default_dimensions('toontalk-scale',       TT.scale);
    };
    var discover_default_dimensions = function (class_name, toontalk_module) {
        var $element_for_determining_dimensions = $("<div class='" + class_name + "'>");
        utilities.run_when_dimensions_known($element_for_determining_dimensions.get(0), 
                                               function () {
                                                   var default_width  = $element_for_determining_dimensions.width();
                                                   var default_height = $element_for_determining_dimensions.height();
                                                   toontalk_module.get_default_width = function () {
                                                       return default_width;
                                                   };
                                                   toontalk_module.get_default_height = function () {
                                                       return default_height;
                                                   };
                                               });
    };
    var initialize_sounds = function (volume) {
        var sounds_path = utilities.get_path_to_toontalk_folder() + "sounds/";
        var create_sound = function (file_name) {
            var sound = new Audio(sounds_path + file_name);
            sound.volume = volume;
            return sound;
        }
        TT.sounds = {hatching:      create_sound("SPARROW.mp3"),
                     bird_fly:      create_sound("PIGEON.mp3"),
                     bammer_hammer: create_sound("POP.mp3"),
                     vacuum_spit:   create_sound("SPIT.mp3"),
                     vacuum_suck:   create_sound("DUSTBUST.mp3"),
                     drop:          create_sound("BOOK_DROP.mp3"),
                     magic:         create_sound("MAGIC.mp3"),
                     fall_inside:   create_sound("FALL_INSIDE.mp3"),
                     click:         create_sound("TYPE.mp3"),
                     event_ignored: create_sound("PLOP.mp3")};
        TT.sounds.bird_fly.loop = true;
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
//         dragee.find("*").removeClass("toontalk-ignore-events");
        // need delay since there may be other listeners to drop events that need to know this
        // e.g. drop area for next robot
        utilities.set_timeout(function () {
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
    var process_encoded_HTML = function (s, encoded_HTML_function) {
        var cursor = 0;
        var token_start = encodeURIComponent("<span class='notranslate'>decodeURIComponent");
        var token_end   = encodeURIComponent("decodeURIComponent</span>");
        var encoding_token_start = s.indexOf(token_start);
        var decoded = "";
        var encoding_start, encoding_end;
        if (encoding_token_start < 0) {
            // no need to call substring if there are no encodings
            return s;
        }
        while (encoding_token_start >= 0) {
            encoding_start = encoding_token_start+token_start.length;
            encoding_end = s.indexOf(token_end,encoding_start);
            if (encoding_end < 0) {
                utilities.report_internal_error("Expected title to have matching pairs of " + token_start + " and " + token_end);
                return s;
            }
            decoded += s.substring(cursor, encoding_token_start) + encoded_HTML_function(s.substring(encoding_start, encoding_end));
            cursor = encoding_end+token_end.length;
            encoding_token_start = s.indexOf(token_start, cursor);
        }
        decoded += s.substring(cursor);
        return decoded; 
    };
    var non_data_URL_in_data_transfer = function (event) {
        var urls = event.dataTransfer && event.dataTransfer.getData("URL");
        // using URL instead of text/uri-list to be compatible with IE -- see http://www.developerfusion.com/article/144828/the-html5-drag-and-drop-api/
        // not clear what to do if some URLs are data and some not -- can that happen?
        return urls && urls.length > 0 && urls.indexOf("data:") < 0;
    };
    // for implementing zero_timeout
    var timeouts = [];
    var timeout_message_name = "zero-timeout-message";
    var messages_displayed = [];
    var backside_widgets_left, element_displaying_tooltip;
    window.addEventListener("message", 
                            function (event) {
                                if (event.data === timeout_message_name && event.source === window) {
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
    document.addEventListener('DOMContentLoaded', initialize);
//     $(document).ready(initialize);

    utilities.available_types = ["number", "box", "element", "robot", "nest", "sensor", "top-level"];
    
    utilities.create_from_json = function (json, additional_info, delay_backside_widgets) {
            var handle_delayed_backside_widgets = function (widget, additional_info, shared_widget_index) {
                additional_info.shared_widgets[shared_widget_index] = widget;
                if (widget && widget.finish_create_from_json_continuation) {
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
            if (!additional_info.guid_to_nest_table) {
                // Nests are uniquely identified by their guid
                additional_info.guid_to_nest_table = {};
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
                widget = utilities.create_from_json(json.widget, additional_info);
                if (widget && json.is_backside) {
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
                widget = utilities.create_from_json(json_of_shared_widget, additional_info, true);
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
                if (!additional_info.json_of_shared_widgets) {
                    utilities.report_internal_error("JSON refers to shared widgets but they can't be found. Sorry.");
                    return;
                }
                widget = utilities.create_from_json(additional_info.json_of_shared_widgets[json_semantic.shared_widget_index], additional_info, true);
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
                try {
                    widget = TT.creators_from_json[json_semantic.type](json_semantic, additional_info);
                } catch (e) {
                    console.error(e.stack);
                    utilities.report_internal_error("Unable to recreate a " + json_semantic.type + ". Error is " + e); 
                }
               // following was needed when get_json_top_level wasn't working properly
//             } else if (json_semantic.shared_widget_index >= 0) {
//                 widget = additional_info.shared_widgets[json_semantic.shared_widget_index];
//                 if (!widget) {
//                     // try again with the JSON of the shared widget
//                     widget = utilities.create_from_json(additional_info.json_of_shared_widgets[json_semantic.shared_widget_index], additional_info);
//                 }
            } else {
                utilities.report_internal_error("JSON type '" + json_semantic.type + "' not supported. Perhaps a JavaScript file implementing it is missing.");
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
                    if (widget.ok_to_set_dimensions()) {
                        // plain text elements don't need explicit width or height
                        size_css = {width:  json_view.frontside_width,
                                    height: json_view.frontside_height};
                        if (json_semantic.type === 'element') {
                            // delay until updated
                            widget.on_update_display(function () {
                                                         utilities.set_css(side_element, size_css);
                                                     });
                        } else {
                            utilities.set_css(side_element, size_css);
                        }
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
        };

        utilities.add_backside_widgets_from_json = function (widget, json_semantic_backside_widgets, additional_info) {
            var backside_widgets;
            if (!json_semantic_backside_widgets) {
                return;
            }
            if (!widget.is_top_level()) {
                // the backside widgets need to know parent to be
                // since they may be called recursively maintain a stack of them
                if (additional_info.to_be_on_backside_of) {
                    additional_info.to_be_on_backside_of.push(widget);
                } else {
                    additional_info.to_be_on_backside_of = [widget];    
                }
            }
            backside_widgets = this.create_array_from_json(json_semantic_backside_widgets, additional_info);
            widget.set_backside_widget_sides(backside_widgets, 
                                             json_semantic_backside_widgets.map(
                                                  function (json) {
                                                      if (!json) {
                                                          return json;
                                                      }
                                                      if (json.widget.shared_widget_index >= 0 && additional_info.json_of_shared_widgets[json.widget.shared_widget_index]) {
                                                          return additional_info.json_of_shared_widgets[json.widget.shared_widget_index].view;
                                                      }
                                                      return json.widget.view; 
                                                  }));
            if (!widget.is_top_level()) {
                additional_info.to_be_on_backside_of.pop();
            }
        };
        
        utilities.create_array_from_json = function (json_array, additional_info) {
            var new_array = [];
            json_array.forEach(function (json_item, index) {
                if (json_item) {
                    new_array[index] = utilities.create_from_json(json_item, additional_info);
                } else {
                    // e.g. could be null representing an empty hole
                    new_array[index] = json_item; 
                }
            });
            return new_array;
        };
        
        utilities.get_json_of_array = function (array, json_history) {
            var json = [];
            var widgets_jsonified = [];
            array.forEach(function (widget_side, index) {
                if (!widget_side) {
                    return; // leave it undefined
                }
                try {
                    if (widget_side.is_backside && widget_side.is_backside()) {
                        json[index] = {widget: utilities.get_json(widget_side.get_widget(), json_history),
                                       is_backside: true};
                    } else if (widget_side.get_type_name) {
                        // TODO: determine if .is_widget is a better conditon here
                        json[index] = {widget: utilities.get_json(widget_side, json_history)};
                    } else {
                        // isn't a widget -- e.g. is a path
                        json[index] = widget_side.get_json(json_history);
                    }
                } catch (e) {
                    utilities.report_internal_error("Error trying to save " + widget_side);
                }
            });
            return json;
        };
        
        utilities.fresh_json_history = function () {
            return {widgets_encountered: [],
                    shared_widgets: [],
                    json_of_widgets_encountered: []};
        };
        
        utilities.get_json_top_level = function (widget) {
            var json_history = this.fresh_json_history();
            var json = utilities.get_json(widget, json_history);
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
                        utilities.tree_replace_once(json.semantic, 
                                                       json_of_widget,
                                                       {shared_widget_index: widget_index},
                                                       get_json_of_widget_from_shared_widget_index,
                                                       utilities.generate_unique_id());
                        return json_of_widget;
                    }
                });
            }
            json.shared_html = json_history.shared_html;
            return json;
        };
        
        utilities.get_json = function (widget, json_history) {
            var index, widget_json, is_backside;
            if (TT.debugging && !json_history) {
                utilities.report_internal_error("no json_history");
            }
            index = json_history.shared_widgets.indexOf(widget);
            if (index >= 0) {
                return {shared_widget_index: index};
            }
            index = json_history.widgets_encountered.indexOf(widget);
            if (index >= 0) {
                // need to process children before ancestors when generating the final JSON
                index = utilities.insert_ancestors_last(widget, json_history.shared_widgets);
                return {shared_widget_index: index};
            }
            // need to keep track of the index rather than push json_of_widgets_encountered to keep them aligned properly
            index = json_history.widgets_encountered.push(widget)-1;
            is_backside = widget.is_backside();
            widget = widget.get_widget(); // ignore which side it was
            widget_json = widget.get_json(json_history);
            widget_json = widget.add_to_json(widget_json, json_history);
            widget_json.view.backside = is_backside;
            // need to push the widget on the list before computing the backside widget's jSON in case there is a cycle
            json_history.json_of_widgets_encountered[index] = widget_json;
            if (widget.add_backside_widgets_to_json) {
                widget.add_backside_widgets_to_json(widget_json, json_history);
            }
            return widget_json;
        };

        utilities.get_json_of_keys = function (object, exceptions) {
            var json;
            if (!exceptions) {
                exceptions = [];
            }
            Object.keys(object).forEach(function (key) {
                if (exceptions.indexOf(key) < 0) {
                    if (!json) {
                        json = {};
                    }
                    if (object[key].get_json) {
                        json[key] = {json: object[key].get_json()};
                    } else {
                        json[key] = object[key];
                    }
                }
            });
            return json;
        };

        utilities.create_keys_from_json = function (json, additional_info) {
            // reconstructs the object jsonified above
            var object = {};
            Object.keys(json).forEach(function (key) {
                if (json[key].json) {
                    object[key] = utilities.create_from_json(json[key].json, additional_info);
                } else {
                    object[key] = json[key];
                }
            });
            return object;
        };
        
        utilities.tree_replace_once = function (object, replace, replacement, get_json_of_widget_from_shared_widget_index, id) {
            // replaces object's first occurence of replace with replacement
            // whereever it occurs in object
            // id is unique to this 'task' and is used to ignore cycles
            if (object.id_of_tree_replace_once_task === id) {
                return; // seen this already
            }
            object.id_of_tree_replace_once_task = id;
            var keys = Object.keys(object);
            var value;
//             var messages = [];
            keys.forEach(function (property) {
                    value = object[property];
//                     console.log("tree_replace_once: " + property + " = " + value);
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
                        if (this.tree_replace_once(get_json_of_widget_from_shared_widget_index(value), replace, replacement, get_json_of_widget_from_shared_widget_index, id)) {
                            return true;
                        }
                    } else if (["string", "number", "function", "undefined", "boolean"].indexOf(typeof value) >= 0) {
                        // skip atomic objects
                    } else if (this.tree_replace_once(value, replace, replacement, get_json_of_widget_from_shared_widget_index, id)) {
    //                         messages.forEach(function (message) {
    //                             console.log(message);
    //                         });
    //                         console.log("Object is now " + JSON.stringify(object));
                        return true;
                    }
            }.bind(this));
            return false;            
        };

        utilities.insert_ancestors_last = function (widget, array_of_widgets) {
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
        };

        utilities.toontalk_json_div = function (json, widget) {
            // convenience for dragging into documents (e.g. Word or WordPad -- not sure what else)
            // also for publishing to the cloud
            var is_backside = json.view.backside;
            var backside_widgets = widget.get_backside_widgets();
            var type_description = widget.get_type_name();
            var title = widget.toString({for_json_div: true});
            var data_image_start, data_image_end;
            if (type_description === 'top-level') {
                if (is_backside) {
                    // drag and drop should not preserve current settings
                    // they are part of the JSON for when saving the current state to the cloud or local storage
                    json.semantic.settings = undefined;
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
                            type_description += utilities.add_a_or_an(backside_widget.get_type_name());
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
                type_description = utilities.add_a_or_an(type_description);
                if (is_backside) {
                    type_description = "the back of " + type_description;
                }
            }
            if (title) {
                data_image_start = title.indexOf("data:image/");
                if (data_image_start > 0) {
                    // elide data images
                    data_image_end = title.indexOf("alt=", data_image_start);
                    if (data_image_end < 0) {
                        data_image_end = title.indexOf(">", data_image_start);
                    }
                    title = title.substring(0, data_image_start+20) + " ... " + title.substring(data_image_end);
                }
            }
            return div_json + "\nThis will be replaced by " + type_description + ".\n" +
                              (title ? title + "\n" : "") +
                              div_hidden + JSON.stringify(json, utilities.clean_json, '  ') + div_close + 
                   div_close;
    };

    utilities.elide = function (s, length, fraction_in_first_part) {
        var first_part = Math.round(length*fraction_in_first_part);
        var last_part;
        var next_space;
        if (s.length <= length) {
            return s;
        }
        // break at word boundary -- could use regular expression
        first_part = Math.max(first_part, s.indexOf(" ", first_part));
        last_part = s.length-(length-first_part);
        last_part = Math.max(last_part, s.indexOf(" ", last_part)+1);
        return s.substring(0, first_part) + " ... " + s.substring(last_part, s.length);
    };

    utilities.clean_json = function (key, value) {
        if (key === "id_of_tree_replace_once_task") {
           return undefined;
        }
        return value;
    };

    utilities.create_widget_from_URL = function (url, widget_callback, error_callback) {
        var response_handler = function (response_event) {
            try {
                var type = this.getResponseHeader('content-type');
                var widget;
                if (!type) {
                    if (error_callback) {
                        error_callback("Could not determine the contents type of the url");
                    }
                    request.removeEventListener('readystatechange', response_handler);
                    return;
                }
                if (type.indexOf("audio") === 0) {
                    widget = TT.element.create(url);
                    widget.set_sound_effect(new Audio(url));
                } else if (type.indexOf("image") === 0) {
                    widget = TT.element.create("<img src='" + url + "'>");
                } else if (type.indexOf("video") === 0) {
                    widget = TT.element.create("<video src='" + url + " ' width='320' height='240'>");
                } else if (type.indexOf("text") === 0 && type.indexOf("text/html") < 0) {
                    // is text but not HTML
                    if (this.responseText) {
                        widget = TT.element.create(this.responseText);
                        widget.set_source_URL(url);
                    }
               } else {  
                   widget = TT.element.create("<div class='toontalk-iframe-container'><iframe src='" + url + "' width='480' height='320'></iframe></div>");
                   // tried various ways to find out if the loading was successful but failed 
                   // maybe try to follow the ideas in http://siderite.blogspot.com/2013/04/detecting-if-url-can-be-loaded-in-iframe.html                     
//                    iframe_frontside_element = widget.get_frontside_element(true);
//                    iframe = iframe_frontside_element.firstChild.firstChild;
               }
               if (widget) {
                   widget_callback(widget);
               }
            } catch (e) {
               if (error_callback) {
                   // TODO: deterine if it makes sense to conflate this error and error event listener
                   error_callback(e);
               }
               widget_callback();
            }
            request.removeEventListener('readystatechange', response_handler);
       };
       var request = new XMLHttpRequest();
       request.addEventListener('readystatechange', response_handler);
//        request.addEventListener('error', error_callback);
       request.open('GET', url, true);
       try {
           request.send();
       } catch (e) {
           if (error_callback) {
               error_callback(e);
           } else {
               utilities.display_message("Error trying to GET " + url + " " + e);
               console.error(e.stack);
           }
       }
    };
        
//         tree_replace_all = function (object, replace, replacement) {
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
//         };
        
        utilities.copy_widgets = function (widgets, parameters) {
            // rewrite using map
            var widgets_copy = [];
            var i;
            for (i = 0; i < widgets.length; i++) {
                widgets_copy[i] = widgets[i] && widgets[i].copy(parameters);
            }
            return widgets_copy;
        };
        
        utilities.copy_widget_sides = function (widget_sides, parameters) {
            var copy = [];
            widget_sides.forEach(function (widget_side) {
                var widget_copy;
                if (!widget_side) {
                    return;
                }
                widget_copy = widget_side.get_widget().copy(parameters);
                if (widget_side.is_backside()) {
                    copy.push(widget_copy.get_backside(true));
                } else {
                    copy.push(widget_copy);
                }
            });
            return copy;
        };
        
        utilities.copy_array = function (array) {
            return array.slice();
        };
        
        utilities.generate_unique_id = function () {
            id_counter += 1;
            return 'toontalk_id_' + id_counter;
        };
        
        utilities.get_style_property = function (element, style_property) {
            if (element.currentStyle) {
                return element.currentStyle[style_property];
            } 
            if (window.getComputedStyle) {
                return document.defaultView.getComputedStyle(element, null).getPropertyValue(style_property);
            }
        };

        utilities.get_style_numeric_property = function (element, style_property) {
            var as_string = this.get_style_property(element, style_property);
            var index;
            if (typeof as_string === 'string') {
                index = as_string.indexOf('px');
                if (index >= 0) {
                    as_string = as_string.substring(0, index);
                }
                if (as_string === 'auto') {
                    if (style_property === 'left') {
                        return $(element).position().left;
                    }
                    if (style_property === 'top') {
                        return $(element).position().top;
                    }
                    return as_string;
                }
                return parseInt(as_string, 10);
            }
            return as_string;
        };
        
        utilities.data_transfer_json_object = function (event) {
            var data, json;
            if (!event.dataTransfer) {
                // not really an error -- could be a drag of an image into ToonTalk
//              console.log("no dataTransfer in drop event");
                return;
            }
            if (event.dataTransfer.files.length > 0 || non_data_URL_in_data_transfer(event)) {
                // these create element widgets without going through JSON
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
                return utilities.get_json_top_level(TT.element.create(data));
            }
            try {
                return JSON.parse(json);
            } catch (exception) {
                utilities.report_internal_error("Exception parsing " + json + "\n" + exception.toString());
            }
        };
        
        utilities.drag_and_drop = function (element) {
            var maximum_click_duration;
            utilities.draggable(element);
            utilities.can_receive_drops(element);
            if (!$(element).is(".toontalk-backside-of-top-level")) {
                // touch interface doesn't (yet) support drag and drop of top-level backsides or dataTransfer
                // resources can only dragged so no need to wait to see if is a click
                // otherwise 1/2 second is the longest 'click'
                maximum_click_duration = $(element).is(".toontalk-top-level-resource") ? 0 : 500;
                utilities.enable_touch_events(element, maximum_click_duration);
            }
        };
        
        utilities.draggable = function (element) {
            $(element).attr("draggable", true);
            // JQuery UI's draggable causes dataTransfer to be null
            // rewrote after noticing that this works fine: http://jsfiddle.net/KWut6/
            // TODO: simplify the following since the event has a reference back to the element
            element.addEventListener('dragstart', 
                                     function (event) {
                                         drag_start_handler(event, element);
                                     });
            element.addEventListener('dragend',
                                     function (event) {
                                          drag_end_handler(event, element);
                                     });
        };
        
        utilities.can_receive_drops = function (element) {
            // was using JQuery's 'on' but that didn't support additional listeners
            var highlight_element = 
                function (event) {
                    var highlighted_element = drag_enter_handler(event, element);
                    if (highlighted_element && current_highlighted_element !== highlighted_element) {
                        utilities.remove_highlight(current_highlighted_element);
                    }
                    current_highlighted_element = highlighted_element;
                    event.stopPropagation();
            };
            var current_highlighted_element;
            // following makes drag of widgets work but not quite sure why
            element.addEventListener('dragover',
                                     function (event) {
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
                                             if (!utilities.inside_rectangle(event.clientX, event.clientY, current_highlighted_element.getBoundingClientRect())) {
                                                 utilities.remove_highlight(current_highlighted_element);
                                                 current_highlighted_element = undefined;
                                             }
                                         }
                                         // TODO: determine if the following is good
                                         event.stopPropagation();
                                     });
            // following attempt to use JQuery UI draggable but it provides mouseevents rather than dragstart and the like
            // and they don't have a dataTransfer attribute so forced to rely upon lower-level drag and drop functionality
//             $element.draggable({
//                 create = function (event, ui) {
//                     $(this).css({position: "absolute"})
//                 };
// //                  appendTo: $element.parents(".toontalk-side:last"), // top-most
//                 greedy: true,
// //                 containment: false, // doesn't seem to work... -- nor does "none"
//                 stack: ".toontalk-side",
//             }); 
        };
        
        utilities.create_drop_area = function (instructions) {
            // instructions can be HTML or plain text
            var drop_area = document.createElement("div");
            var $drop_area = $(drop_area);
            var drop_area_instructions = document.createElement("div");
            drop_area_instructions.innerHTML = instructions;
            $(drop_area_instructions).addClass("toontalk-drop-area-instructions ui-widget");
            $drop_area.addClass("toontalk-drop-area");
            $drop_area.append(drop_area_instructions);
            utilities.can_receive_drops(drop_area);
            return $drop_area;
        };
   
        utilities.process_json_elements = function () {
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
                    widget = utilities.create_from_json(json);
                    if (widget) {
                        element.textContent = ""; // served its purpose of being parsed as JSON
                        if (!widget.get_type_name) {
                            // isn't a widget. e.g. a tool
                            element.appendChild(widget.get_element());
                        } else if (widget.is_top_level()) {
                            if (!TT.no_local_storage) {
                                if (!utilities.get_current_url_boolean_parameter("reset", false)) {
                                    if (json.load_most_recent_program) {
                                        try {
                                            toontalk_last_key = window.localStorage.getItem('toontalk-last-key');
                                            if (toontalk_last_key) {
                                                stored_json_string = window.localStorage.getItem(toontalk_last_key);
                                            }
                                        } catch (error) {
                                            message = "Error reading previous state. Error message is " + error;
                                            if (utilities.is_internet_explorer()) {
                                                // TODO: determine if there still is a problem with IE11 and local storage
                                                console.error(message);
                                            } else {
                                                utilities.display_message(message);
                                            }
                                        }
                                    }
                                    if (stored_json_string) {
                                        json = JSON.parse(stored_json_string);
                                        // re-create the top-level widget with the additional info stored here:
                                        widget = utilities.create_from_json(json);
                                    }
                                }
                            }
                            backside = widget.get_backside(true);
                            backside_element = backside.get_element();
                            $(element).replaceWith(backside_element);
                            utilities.set_css(backside_element,
                                              {width:  json.view.backside_width,
                                               height: json.view.backside_height,
                                               // color may be undefined
                                               // do the following in a more general manner
                                               // perhaps using additional classes?
                                               "background-color": json.view.background_color,
                                               "border-width":     json.view.border_width});
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
                        utilities.report_internal_error("Could not recreate a widget from this JSON: " + json_string);
                    }
                });
        };
        
        utilities.set_absolute_position = function ($element, absolute_position) {
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
            utilities.set_css($element,
                              {left: left,
                               top:  top,
                               position: "absolute"});
            if ($element.is(".toontalk-side-animating")) {
                // animation doesn't work with JQuery css
                $element.get(0).style.left = left + "px";
                $element.get(0).style.top  = top  + "px";
            }
        };
        
        utilities.set_position_relative_to_top_level_backside = function ($element, absolute_position, stay_inside_parent) {
            return this.set_position_relative_to_element($element, $element.closest(".toontalk-top-level-backside"), absolute_position, stay_inside_parent);
        };

        utilities.set_position_relative_to_element = function ($element, $parent_element, absolute_position, stay_inside_parent) {
            var parent_position = $parent_element.offset();
            var left, top, element_width, element_height, parent_element_width, parent_element_height, css;
            if (!parent_position) {
                parent_position = {left: 0, top: 0};
            }
            left = absolute_position.left-parent_position.left;
            top  = absolute_position.top -parent_position.top;
            if (stay_inside_parent) {
                element_width  = $element.width();
                element_height = $element.height();
                parent_element_width  = $parent_element.width();
                parent_element_height = $parent_element.height();
                if (left > parent_element_width-element_width) {
                    left = parent_element_width-element_width;
                }
                if (left < 0) {
                    left = 0;
                }
                if (top > parent_element_height-element_height) {
                    top = parent_element_height-element_height;
                }
                if (top < 0) {
                    top = 0;
                }
            }
            css = {left: left,
                   top:  top,
                   position: "absolute"};
            utilities.set_css($element, css);
            if ($element.is(".toontalk-side-animating")) {
                // animation doesn't work with JQuery css
                $element.get(0).style.left = left+"px";
                $element.get(0).style.top  = top +"px";
                // remove animating CSS when transition is over
                utilities.add_one_shot_event_handler($element.get(0), "transitionend", 2000, function () {
                    $element.removeClass("toontalk-side-animating");
                    $element.get(0).style.transitionDuration = '';
                });
            }
            return css;
        };
        
        utilities.restore_resource = function ($dropped, dropped_widget) {
            var dropped_copy, dropped_element_copy;
            if ($dropped && $dropped.is(".toontalk-top-level-resource")) {
                // restore original
                dropped_copy = dropped_widget.copy({fresh_copy: true}); // nest copies should be fresh - not linked
                dropped_element_copy = dropped_copy.get_frontside_element();
                utilities.set_css(dropped_element_copy,
                                  {width:  $dropped.width(),
                                   height: $dropped.height()});
                $dropped.parent().removeClass("toontalk-top-level-resource toontalk-top-level-resource-container");
                $dropped.removeClass("toontalk-top-level-resource toontalk-top-level-resource-container");
                // elements are relative only when outside of ToonTalk (e.g. a resource on the page)
                $(dropped_element_copy).addClass("toontalk-top-level-resource toontalk-top-level-resource-container")
                                       .css({position: 'relative'});
                $dropped.css({position: 'absolute'});
                $dropped.get(0).parentElement.appendChild(dropped_element_copy);
                TT.DISPLAY_UPDATES.pending_update(dropped_copy);
                if (dropped_widget.set_active) {
                    dropped_widget.set_active(true);
                    dropped_copy.set_active(false);
                }
            }
        };
        
        utilities.find_resource_equal_to_widget = function (widget) {
            var element_found;
            // toontalk-top-level-resource is used for a DIV and its child -- TODO rationalise this
            // here only consider the child ones
            $(".toontalk-top-level-resource.toontalk-side").each(function (index, element) {
                var owner = utilities.widget_from_jquery($(element));
                if (owner && ((widget.equals && widget.equals(owner)) ||
                              (widget.matching_resource && widget.matching_resource(owner)) ||
                              (widget.match(owner) === 'matched'))) {
                    if (widget.is_hole() ||
                        owner.get_backside_widgets().length === widget.get_backside_widgets().length) {
                        // TODO: make sure the backside widgets are equivalent...
                        element_found = element;
                        return false; // stop the 'each'
                    }
                }
            });
            return element_found;
        };
        
        utilities.set_position_is_absolute = function (element, absolute, event) {
            // this computes left and top as percentages since the parent may be scaled
            // note that if scaled the upper left corner for drops is preserved
            var left, top, parent_offset;
            if (absolute) {
                left = utilities.get_style_numeric_property(element, 'left');
                top  = utilities.get_style_numeric_property(element, 'top');
                if (event) {
                    // dropped from another window so use event coordinates
                    parent_offset = $(element.parentElement).offset();
                    if (left === 'auto') {
                        left = event.pageX-parent_offset.left;
                        // following is needed for drops from other windows but not clear why
                        left -= $(element).width()/2;
                    }
                    if (top === 'auto') {
                        top  = event.pageY-parent_offset.top;
                        // following is needed for drops from other windows but not clear why
                        top -= 90;
                    }
                }
                utilities.set_css(element,
                                  {left: utilities.left_as_percent(left, element),
                                   top:  utilities.top_as_percent (top,  element),
                                   position: "absolute"});
            } else {
                element.style.position = "static";
            }
        };

        utilities.left_as_percent = function (left, element) {
            var parent_rectangle;
            if (!element.parentElement) {
                return left;
            }
            parent_rectangle = element.parentElement.getBoundingClientRect();
            if (left === 'auto' || isNaN(left)) {
                // typically is auto on IE11
                left = $(element).offset().left;
            } else {
                left = utilities.adjust_left_if_scaled(left, element);
            }
            return 100*($(element.parentElement).offset().left-window.pageXOffset+left-parent_rectangle.left)/parent_rectangle.width  + "%";
        };

        utilities.top_as_percent = function (top, element) {
            var parent_rectangle;
            if (!element.parentElement) {
                return top;
            }
            parent_rectangle = element.parentElement.getBoundingClientRect();
             if (top === 'auto' || isNaN(top)) {
                // typically is auto on IE11
                top = $(element).offset().top;
            } else {
                top = utilities.adjust_top_if_scaled(top, element);
            }
            return 100*($(element.parentElement).offset().top+-window.pageYOffset+top-parent_rectangle.top)/parent_rectangle.height + "%";
        };

        utilities.adjust_left_if_scaled = function (left, element) {
            var widget = utilities.widget_of_element(element);
            var original_width;
            if (widget && widget.get_original_width) {
                original_width = widget.get_original_width();
                if (original_width) {
                    return left-(original_width-widget.get_attribute('width'))/2;
                }
            }
            return left;
        };

        utilities.adjust_top_if_scaled = function (top, element) {
            var widget = utilities.widget_of_element(element);
            var original_height;
            if (widget && widget.get_original_height) {
                original_height = widget.get_original_height();
                if (original_height) {
                    return top-(original_height-widget.get_attribute('height'))/2;
                }
            }
            return top;
        };
        
        utilities.ordinal = function (n) {
            n++; // switch from zero-indexing to one-indexing
            switch (n) {
                case 1:
                return "first";
                case 2:
                return "second";
                case 3:
                return "third";
                case 4:
                return "fourth";
                case 5:
                return "fifth";
                case 6:
                return "sixth";
                case 7:
                return "seventh";
                case 8:
                return "eighth";
                case 9:
                return "ninth";
                case 10:
                return "tenth";
                default:
                if (n%10 === 1) {
                    return n + "st";
                }
                if (n%10 === 2) {
                    return n + "nd";
                }
                if (n%10 === 3) {
                    return n + "rd";
                }
                return n + "th";
            }
        };
            
        utilities.on_a_nest_in_a_box = function (frontside_element) {
            return $(frontside_element).closest(".toontalk-nest").is("*") && $(frontside_element).closest(".toontalk-box").is("*");
        };

        utilities.give_tooltip = function (element, new_title) {
            element.title = new_title;
            utilities.use_custom_tooltip(element);
        };

        utilities.use_custom_tooltip = function (element) {
            // nicer looking tool tips
            // customization to crude talk balloons thanks to http://jsfiddle.net/pragneshkaria/Qv6L2/49/
            var $element = $(element);
            var maximum_width_if_moved, feedback_horizontal, feedback_vertical;
            $element.tooltip(
                {position: {
                     my: "center bottom-20",
                     at: "center top",
                     using: function (position, feedback) {
                               var element_position;
                               if (position.top < 0) {
                                   // too much text to fit well so JQuery puts the extra part off the top
                                   // this moves it down but ensures it doesn't overlap with the element whose tooltip is being displayed
                                   position.top = 0;
                                   element_position = $element.offset();
                                   if (element_position.left < $(window).width()/2) {
                                       // widget is on left half of the window
                                       position.left = element_position.left+$element.width()+10;
                                    } else {
                                       position.left = 0;
                                       maximum_width_if_moved = element_position.left-40; // subtract something for borders and paddings
                                    };
                               }
                               // TODO: determine why the placement of tool tips for robots, boxes, and numbers is too low
                               // following fixes it - otherwise the tool tip can interfere with selection
                               if (feedback.vertical === 'bottom') {
                                   if ($element.is(".toontalk-robot")) {
                                        position.top  -= 30;
                                   } else if ($element.is(".toontalk-number")) {
                                        position.top -= 30;
                                   } else if ($element.is(".toontalk-box")) {
                                        position.top -= 30;
                                   } else {
                                       // can be too close to widget (or button) and interferes with clicks etc
                                       position.top -= 20;
                                   }
                                   if (position.left < 10) {
                                       position.left = 10;
                                   }
                                   if (position.top < 10) {
                                       position.top = 10;
                                   }
                               } else {
                                    position.top += 20;
                               }
                               position.left = Math.max(position.left, window.pageXOffset);
                               position.top  = Math.max(position.top,  window.pageYOffset);
                               utilities.set_css(this, position);
                               feedback_horizontal = feedback.horizontal;
                               feedback_vertical   = feedback.vertical;
                     }},
                open: function (event, ui) {
                          var text_length = ui.tooltip.get(0).textContent.length;
                          var default_capacity = 100;
                          var tooltip = ui.tooltip.get(0);
                          var new_width, position;
                          // replace all new lines with <br> breaks
                          tooltip.innerHTML = process_encoded_HTML(ui.tooltip.get(0).textContent.replace(/(\r\n|\n|\r)/g, "<br>"), decodeURIComponent);
                          // width is 340 by default but if more than fits then make wider
                          if (text_length > default_capacity) {
                              new_width = Math.min(800, maximum_width_if_moved || $(window).width()-100);
                              position = $(tooltip).position();
                              // //width: (340 + 340*(text_length-default_capacity)/default_capacity),
                              ui.tooltip.css({maxWidth: new_width});
                          }
                          if (element_displaying_tooltip) {
                              element_displaying_tooltip.remove();
                          }
                          // need to add the arrow here since the replacing of the innerHTML above removed the arrow
                          // when it was added earlier
                          // TODO: position it better
                          // until it is positioned reliably better to not have it
//                           $("<div>").addClass("toontalk-arrow")
//                                     .addClass(feedback_vertical)
//                                     .addClass(feedback_horizontal)
//                                     .appendTo(ui.tooltip);
                          element_displaying_tooltip = ui.tooltip;
    //                       if (height_adjustment) {
    //                           $(ui.tooltip).css({maxHeight: $(ui.tooltip).height()+height_adjustment/2});
    //                       }
                          // auto hide after duration proportional to text_length
                          // TODO: if longer than fits on the screen then autoscroll after some time
                          setTimeout(function () {
                                         ui.tooltip.remove();
                                         element_displaying_tooltip = undefined;
                                     }, 
                                     text_length*(TT.MAXIMUM_TOOLTIP_DURATION_PER_CHARACTER || 100));
                      },
               close: function () {
                          element_displaying_tooltip = undefined;
               }});
        };

        utilities.encode_HTML_for_title = function (html) {
            return encodeURIComponent("<span class='notranslate'>decodeURIComponent" + html + "decodeURIComponent</span>"); 
        };

        utilities.remove_encoded_HTML = function (s) {
            return process_encoded_HTML(s, 
                                        function () {
                                            return ""; // replace encodings with the empty string
                                        });
        };
        
        utilities.add_one_shot_event_handler = function (element, event_name, maximum_wait, handler) {
            // could replace the first part of this by http://api.jquery.com/one/
            var handler_run = false;
            var one_shot_handler = function (event) {
                // could support any number of parameters but not needed
                handler_run = true;
                if (handler) { // could it be otherwise?
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
                        one_shot_handler();
                    }
                },
                maximum_wait);
        };

        // default is a half a pixel per millisecond -- so roughly two seconds to cross a screen
        utilities.default_animation_speed = .5;
        
        utilities.animate_to_absolute_position = function (source_element, target_absolute_position, continuation, speed, more_animation_follows, duration) {
            var source_absolute_position = $(source_element).offset();
            var source_relative_position = $(source_element).position();
            var distance = utilities.distance(target_absolute_position, source_absolute_position);
            var left, top;
            if (duration === 0) {
                utilities.set_absolute_position($(source_element), target_absolute_position);
                if (continuation) {
                    continuation();
                }
                return;
            }
            // ensure that the animated element is "on top"
            $(source_element).css({"z-index": utilities.next_z_index()});
            if (!duration) {
                duration = Math.round(distance/(speed || utilities.default_animation_speed));
            }
            $(source_element).addClass("toontalk-side-animating");
            source_element.style.transitionDuration = duration+"ms";
            left = source_relative_position.left + (target_absolute_position.left - source_absolute_position.left);
            top  = source_relative_position.top  + (target_absolute_position.top -  source_absolute_position.top);
            source_element.style.left = left + "px";
            source_element.style.top =  top  + "px";
            if (source_element.toontalk_followed_by) {
                target_absolute_position.left += source_element.toontalk_followed_by.left_offset;
                target_absolute_position.top  += source_element.toontalk_followed_by.top_offset;
                utilities.animate_to_absolute_position(source_element.toontalk_followed_by.element, target_absolute_position, undefined, speed, more_animation_follows);
            }
            // replaced add_one_shot_event_handler with time outs because transition end can be triggered by changes in the frontside_element
            // e.g. when a robot is holding a tool
            if (more_animation_follows) {
               setTimeout(continuation, duration);
            } else {
                setTimeout(function () {
                              $(source_element).removeClass("toontalk-side-animating");
                              source_element.style.transitionDuration = '';
                              if (continuation) {
                                  continuation();
                              }
                          },
                          duration);
            }         
        };
        
        utilities.distance = function (position_1, position_2) {
            var delta_x = position_1.left-position_2.left;
            var delta_y = position_1.top-position_2.top;
            return Math.sqrt(delta_x*delta_x+delta_y*delta_y);
        };
        
        utilities.highlight_element = function (element, event, duration) {
            var widget, frontside_element;
            if (!element) {
                return;
            }
            // only one element can be highlighted
            // first remove old highlighting (if any)
            utilities.remove_highlight();
            if (!($(element).is(".toontalk-backside"))) {
                widget = utilities.widget_of_element(element);
                if (!widget) {
                    return;
                }
                if (widget.element_to_highlight && event) {
                    element = widget.element_to_highlight(event);
                    if (!element) {
                        return;
                    }      
                }
            }
            if ($(element).is(".toontalk-highlight")) {
                return; // already highlighted
            }
            $(element).addClass("toontalk-highlight");
            // this used to also change the CSS to give this element a high z-index but didn't work well
            // and was hard to resotre after the highlight
            if (duration) {
                setTimeout(function () {
                        utilities.remove_highlight(element);
                    },
                    duration);
            }
        };

        utilities.remove_highlight = function (element) {
            if (element) {
                $(element).removeClass("toontalk-highlight");
            } else {
                $(".toontalk-highlight").removeClass("toontalk-highlight");
            }
        };
        
        utilities.cursor_of_image = function (url) {
            var extensionStart = url.lastIndexOf('.');
            if (extensionStart >= 0) {
                return url.substring(0, extensionStart) + ".32x32" + url.substring(extensionStart);
            }
            return url;
        };

        utilities.inside_rectangle = function (x, y, rectangle) {
            return (x >= rectangle.left && x <= rectangle.right &&
                    y >= rectangle.top  && y <= rectangle.bottom);
        };

        utilities.constrain_css_to_fit_inside = function (container_element, css) {
            // updates left and top to fit inside element
            var container_width  = $(container_element).width();
            if (container_width === 0) {
                return;
            }
            var container_height = $(container_element).height();
            // css is relative to element
            css.left = Math.min(Math.max(css.left, 0), container_width);
            css.top  = Math.min(Math.max(css.top,  0), container_height);
        };
        
        utilities.next_z_index = function () {
            z_index++;
            return z_index;
        };

        utilities.create_button = function (label, class_name, title, click_handler) {
            var $button = $("<button>" + label + "</button>").button();
            $button.addClass(class_name)
                   .click(click_handler);
            utilities.give_tooltip($button.get(0), title);
            return $button.get(0);
        };
                
        utilities.create_close_button = function (handler, title) {
            var close_button = document.createElement("div");
            var x = document.createElement("div");
            $(close_button).addClass("toontalk-close-button");
            $(close_button).click(handler);
            utilities.give_tooltip(close_button, title);
            x.innerHTML = "&times;";
            close_button.appendChild(x);
            return close_button;
        };
        
        utilities.check_radio_button = function (button_elements) {
            $(button_elements.button).prop("checked", true);
            $(button_elements.label).addClass('ui-state-active');
        };
        
        utilities.create_button_set = function () { 
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
        };

        utilities.create_alert_element = function (text) {
            var alert_element = utilities.create_text_element(text);
            $(alert_element).addClass("toontalk-alert-element");
            return alert_element;
        };
        
        utilities.create_text_element = function (text) {
            var div = document.createElement("div");
            div.innerHTML = text;
            $(div).addClass('ui-widget');
            return div;
        };

        utilities.create_space = function () {
           var span = document.createElement("span");
           span.innerHTML = '&nbsp;';
           $(span).addClass('ui-widget');
           return span;    
        };
        
        utilities.create_anchor_element = function (html, url) {
            var anchor = document.createElement("a");
            anchor.innerHTML = html;
            if (TT.TRANSLATION_ENABLED) {
                url = utilities.add_URL_parameter(url, "translate", "1");
            }
            anchor.href= url;
            anchor.target = '_blank';
            return anchor;
        };
        
        // the following methods uses htmlFor instead of making the input a child of the label
        // because couldn't get JQuery buttons to work for radio buttons otherwise
        // and because of a comment about disability software
        // see http://stackoverflow.com/questions/774054/should-i-put-input-tag-inside-label-tag
        
        utilities.create_text_input = function (value, class_name, label, title, documentation_url, type, drop_handler) {
            var text_input = document.createElement("input");
            var label_element, container, documentation_anchor;
            text_input.type = "text";
            text_input.className = class_name;
            text_input.value = value;
            utilities.give_tooltip(text_input, title);
            if (type) {
                text_input.type = type;
            }
            if (label) {
                label_element = document.createElement("label");
                label_element.innerHTML = label;
                text_input.id = utilities.generate_unique_id();
                label_element.htmlFor = text_input.id;
                if (documentation_url) {
                    documentation_anchor = utilities.create_anchor_element("i", documentation_url);
                    $(documentation_anchor).addClass("toontalk-help-button notranslate");
                    documentation_anchor.translate = false; // should not be translated
                }
                container = utilities.create_horizontal_table(label_element, text_input, documentation_anchor);
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
            if (drop_handler) {
                add_drop_handler_to_input_element(text_input, drop_handler);
            }
            utilities.use_custom_tooltip(text_input);
            return {container: container,
                    button: text_input};
        };
        
        utilities.create_text_area = function (value, class_name, label, title, drop_handler, type) {
            var text_area = document.createElement("textarea");
            var label_element, container, new_drop_handler;
            text_area.className = class_name;
            text_area.value = value;
            utilities.give_tooltip(text_area, title);
            // the intent here was to be able to change the default virtual keyboard to numeric
            // but only works for input not textarea elements
            // and because numbers can be so large need textarea
            // could use type for "small" numbers only
//             if (type) {
//                 text_area.type = type;
//             }
            label_element = document.createElement("label");
            label_element.innerHTML = label;
            text_area.id = utilities.generate_unique_id();
            label_element.htmlFor = text_area.id;
            container = utilities.create_horizontal_table(label_element, text_area);
            $(text_area).button()
                        .addClass("toontalk-text-area")
                        .css({"background": "white"}); // somehow JQuery gives a background color despite toontalk-text-area's CSS
            text_area.addEventListener('touchstart', function () {
                $(text_area).select();
            });
            if (drop_handler) {
                add_drop_handler_to_input_element(text_area, drop_handler);
            }
            $(label_element).addClass("ui-widget");
            utilities.use_custom_tooltip(text_area);
            return {container: container,
                    button: text_area};
        };

        utilities.input_area_drop_handler = function (event, setter, receiver) {
            var dropped, target_widget, new_text;
            event.preventDefault();
            dropped = get_dropped_widget(event);
            // ignore when dropped === receiver since that is dropping backside on one of its drop zones
            if (dropped && dropped !== receiver) {
                new_text = setter(dropped, event);
                if (new_text) {
                    $(event.currentTarget).trigger('change');
                    event.currentTarget.value = new_text;
                    // at least for robot actions it is clear that the dropped widget should be removed
                    dropped.remove();
                    event.stopPropagation();
                }
            }
            // returns the dropped widget only if it generated new text
            return typeof new_text === 'string' && dropped;
        };
        
        utilities.create_radio_button = function (name, value, class_name, label, title) {
            var container = document.createElement("div");
            var input = document.createElement("input");
            var label_element = document.createElement("label");
            input.type = "radio";
            input.className = class_name;
            input.name = name;
            input.value = value;
            label_element.innerHTML = label;
            input.id = utilities.generate_unique_id();
            label_element.htmlFor = input.id;
            container.appendChild(input);
            container.appendChild(label_element);
            utilities.give_tooltip(container, title);
            // the following breaks the change listener
            // used to work with use htmlFor to connect label and input
            $(input).button();
            utilities.use_custom_tooltip(input);
//             $(label_element).button();
            return {container: container,
                    button: input,
                    label: label_element};
        };

        utilities.create_select_menu = function (name, items, class_name, label, title, item_titles) {
            var container = document.createElement("div");
            var select = document.createElement("select");
            var label_element = document.createElement("label");
            select.className = class_name;
            select.name = name;
            select.id = utilities.generate_unique_id();
            label_element.innerHTML = label;
            label_element.htmlFor = select.id;
            container.appendChild(label_element);
            container.appendChild(select);
            utilities.give_tooltip(container, title);
            items.forEach(function (item, index) {
                var option = document.createElement('option');
                option.value = item;
                option.innerHTML = item;
                if (item_titles && item_titles[index]) {
                    utilities.give_tooltip(option, item_titles[index]);
                    utilities.use_custom_tooltip(option);
                }
                select.appendChild(option);
            });
            // following produces a select menu that works when added to document.body but not the backside of a widget
            // looks OK but nothing pops up when clicked
//             setTimeout(function () {
//                 $(select).selectmenu({width: 200});
//             });
            $(select).addClass("ui-widget");
            $(label_element).addClass("ui-widget");
            utilities.use_custom_tooltip(select);
            return {container: container,
                    menu:      select,
                    label:     label_element};
        };
        
        utilities.create_check_box = function (value, class_name, label, title) {
            var container = document.createElement("div");
            var input = document.createElement("input");
            var label_element = document.createElement("label");
            input.type = "checkbox";
            input.className = class_name;
            input.checked = value;
            label_element.innerHTML = label;
            input.id = utilities.generate_unique_id();
            label_element.htmlFor = input.id;
            $(label_element).addClass("ui-widget");
            container.appendChild(input);
            container.appendChild(label_element);
            utilities.give_tooltip(container, title);
            utilities.use_custom_tooltip(input);
            return {container: container,
                    button: input,
                    label: label_element};
        };

        utilities.create_horizontal_table = function () { // takes any number of parameters
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
        };
        
        utilities.create_vertical_table = function () { // takes any number of parameters
            var table = document.createElement("table");
            var i, row;
            for (i = 0; i < arguments.length; i++) {
                if (arguments[i]) {
                    row = utilities.create_row(arguments[i]);
                    table.appendChild(row);
                }
            }
            return table;
        };
        
        utilities.create_row = function () { // any number of elements
            var row = document.createElement("tr");
            var table_element = document.createElement("td");
            var i;
            for (i = 0; i < arguments.length; i++) {
                row.appendChild(arguments[i]);
            }
            table_element.appendChild(row);
            return row;
        };

        utilities.create_table_entry = function (element) {
            var td = document.createElement('td');
            td.appendChild(element);
            return td;
        };
        
        utilities.selected_radio_button = function () {
            var i, selected;
            for (i = 0; i < arguments.length; i++) {
                if (arguments[i].checked) {
                    return arguments[i];
                }
            }
            return selected;
        };
        
        utilities.create_image = function (url, class_name) {
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
        };

        utilities.create_tabs = function (labels, elements) {
            var tabs = document.createElement('div');
            var ul   = document.createElement('ul');
            var id;
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
            // use JQuery UI widget for tabs
            $(tabs).tabs();
            return tabs;
        };

        utilities.create_file_data_table = function (extra_classes) {
            var $table = $('<table cellpadding="0" cellspacing="0" border="0"></table>');
            if (extra_classes) {
                $table.addClass(extra_classes);
            }
            return $table.get(0);
        };

        utilities.become_file_data_table = function (table, files_data, in_cloud, button_class) {
            $(table).DataTable({
                   data: files_data,
                   autoWidth: false,
                   order: [[1, 'desc']], // initially sort by modified data with most recent first
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
                                                    url = utilities.add_URL_parameter(url, "translate", "1");
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
        };

        utilities.get_local_files_data = function () {
            var all_program_names = utilities.get_all_locally_stored_program_names();
            return all_program_names.map(function (program_name) {
                var meta_data = utilities.get_local_storage_meta_data(program_name);
                if (meta_data) {
                    return {title: program_name,
                            modifiedDate: meta_data.last_modified,
                            createdDate:  meta_data.created,
                            fileSize:     meta_data.file_size
                            };
                }
                                        });
        };

        utilities.create_local_files_table = function () {
            var data = utilities.get_local_files_data();
            var table = utilities.create_file_data_table();
            setTimeout(function () {
                utilities.become_file_data_table(table, data, false, "toontalk-file-load-button toontalk-file-load-button-without-click-handler");
            });
            return table;
        };
        
        utilities.get_dragee = function () {
            return dragee;
        };

        utilities.add_URL_parameter = function (url, parameter, value) {
            url = utilities.remove_URL_parameter(url, parameter);
            var query_index, parameter_conjunction;
            query_index = url.indexOf('?');
            parameter_conjunction = query_index >= 0 ? '&' : '?';
            return url + parameter_conjunction + parameter + "=" + value;
        };

        utilities.remove_URL_parameter = function (url, parameter) {
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
        };
        
        utilities.add_a_or_an = function (word, upper_case) {
            var first_character = word.charAt(0);
            if (first_character === "'" || first_character === '"') {
                // ignoe quotes -- e.g. an 'advark' widget
                first_character = word.charAt(1);
            }
            if (word.indexOf("the ") === 0 || word.indexOf("a ") === 0 || word.indexOf("an ") === 0 || word.indexOf("any ") === 0 ||
                word.indexOf('"the ') === 0 || word.indexOf('"a ') === 0 || word.indexOf('"an ') === 0 || word.indexOf('"any ') === 0) {
                // don't generate a the box, an a bird, an any bird
                // or any of them quoted
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
        };

        utilities.lower_case_first_letter = function (string) {
            return string.charAt(0).toLowerCase() + string.slice(1);
        };
        
        utilities.maximum_string_length = function (string, maximum_length) {
            // replaces middle of string with ... if needed -- doesn't count the ... as part of the length
            var first_part;
            if (string.length <= maximum_length) {
                return string;
            }
            first_part = string.substring(0, Math.round(maximum_length * .75));
            return first_part + " ... " + string.substring(string.length-(maximum_length-first_part.length));
        };

        utilities.backup_all_top_level_widgets = function (immediately) {
            $(".toontalk-top-level-backside").each(function (index, element) {
                var top_level_widget = utilities.widget_of_element(element);
                top_level_widget.save(immediately);
            });
        };
        
        utilities.make_resizable = function ($element, widget) {
            var previous_width, previous_height;
            $element.resizable({start: function (event, ui) {
                                           previous_width  = ui.originalSize.width;
                                           previous_height = ui.originalSize.height;
                                },
                                resize: function (event, ui) {
                                            if ($element.is(".toontalk-element-frontside")) {
                                                if (ui.size.width != previous_width) {
                                                    widget.increment_width(ui.size.width-previous_width);
                                                    previous_width = ui.size.width;                                       
                                                }
                                                if (ui.size.height != previous_height) {
                                                    widget.increment_height(ui.size.height-previous_height);
                                                    previous_height = ui.size.height;                                                   
                                                }
                                            }
                                            widget.rerender();
                                },
                                stop: function (event, ui) {
                                    if (widget.robot_in_training && widget.robot_in_training()) {
                                        // backsides don't define robot_in_training -- might reconsider this someday
                                        widget.robot_in_training().resized_widget(widget, previous_width, previous_height, ui.size.width, ui.size.height);
                                    }
                                },
                               // the corner handles looked bad on element widgets
                               // and generally got in the way
                               handles: "n,e,s,w"
                               });
        };
        
        utilities.match = function (pattern, widget) {
            var match_status = pattern.match(widget);
            if (match_status.is_widget && widget.matched_by) {
                // e.g. widget is a nest             
                return widget.matched_by(pattern);
            }
            return match_status;
        };
        
        utilities.current_URL = function () {
            return window.location.pathname;
        };

        utilities.absolute_file_path = function (relative_path) {
            var current_URL = window.location.pathname;
            var file_name_index = current_URL.lastIndexOf('ToonTalk/');
            if (file_name_index < 0) {
                return relative_path;
            }
            return current_URL.substring(0, file_name_index+9) + relative_path;
        };
        
        utilities.copy_side = function (side, parameters, dimensions_too) {
            var widget_copy = side.get_widget().copy(parameters);
            var frontside_element, copy_frontside_element;
            if (dimensions_too) {
                // TODO: make this work for backsides as well
                utilities.copy_frontside_dimensions(side.get_widget(), widget_copy);
            }
            if (side.is_backside()) {
                return widget_copy.get_backside();
            }
            return widget_copy;
        };

        utilities.copy_frontside_dimensions = function (from_widget, to_widget) {
            var from_frontside_element = from_widget.get_widget().get_frontside_element();
            var to_frontside_element;
            if (from_frontside_element) {
                to_frontside_element = to_widget.get_frontside_element(true);
                if (to_frontside_element) {
                    utilities.set_css(to_frontside_element,
                                      {width:  $(from_frontside_element).width(),
                                       height: $(from_frontside_element).height()});
                }
            }
        };
        
        utilities.scale_to_fit = function (this_element, other_element, original_width, original_height) {
            if ($(other_element).is(".toontalk-backside")) {
                return utilities.scale_element(this_element, original_width, original_height, original_width, original_height);
            }
            return utilities.scale_element(this_element, $(other_element).width(), $(other_element).height(), original_width, original_height);  
        };

        utilities.scale_element = function (element, new_width, new_height, original_width, original_height, other_transforms, pending_css, original_parent) {
            var update_css = function () {
                var need_to_translate = true;
                // for things to fit in box holes or for scales to be placed as other widgets 
                // need them to use left top instead of center center as the transform-origin
                var parent_element = (original_parent && original_parent !== document.body) ? original_parent : element.parentElement;
                // use center if not in a hole and not a scale
                var transform_origin_center = (parent_element && parent_element.className.indexOf("toontalk-box-hole") < 0) && 
                                              (element.className.indexOf("toontalk-scale") < 0);
                var translate = "";
                if (!pending_css) {
                    pending_css = {};
                }
                // coordinates are no longer in terms of left top corner so adjust them
                if (typeof pending_css.left === 'number') {
                    pending_css.left -= (original_width-new_width)/2;
                    need_to_translate = false;
                }
                if (typeof pending_css.top === 'number') {
                    pending_css.top -= (original_height-new_height)/2;
                    need_to_translate = false;
                }
                if (need_to_translate && transform_origin_center) {
                    if (new_width) {
                        translate += "translateX(" + (new_width-original_width)/2 + "px) ";
                    }
                    if (new_height) {
                        translate += "translateY(" + (new_height-original_height)/2 + "px) ";
                    }
                }
                utilities.add_transform_to_css((other_transforms || "") + " scale(" + x_scale + ", " + y_scale + ")",
                                               translate,
                                               pending_css,
                                               transform_origin_center);  
                pending_css.width =  original_width,
                pending_css.height = original_height;
//                 if (pending_css["transform-origin"] === "center center") {
//                     // coordinates are no longer in terms of left top corner so adjust them
//                     if (typeof pending_css.left === 'number') {
//                         pending_css.left -= (original_width-new_width)/2;
//                     }
//                     if (typeof pending_css.left === 'number') {
//                         pending_css.top -= (original_height-new_height)/2;
//                     }
//                 }
                utilities.set_css(element, pending_css);
            };
            var x_scale, y_scale;
            if (!original_width) {
                original_width = $(element).width();
            }
            if (!original_height) {
                original_height = $(element).height();
            }
            if (new_width) {
                x_scale = new_width/original_width;
            } else {
                x_scale = 1;
            }
            if (new_height) {
                y_scale = new_height/original_height;
            } else {
                y_scale = 1;
            }
            // e.g. new_width was 0
            if (x_scale === 0) {
                x_scale = 1;
            }
            if (y_scale === 0) {
                y_scale = 1;
            }
            update_css();
            return {x_scale: x_scale,
                    y_scale: y_scale};
        };

        utilities.add_transform_to_css = function (transform, translate, css, transform_origin_center) {
            if (!transform) {
                return;
            }
            if (!css) {
                css = {};
            }
            if (!css['transform-origin']) {
               if (transform_origin_center) {
                   css["transform-origin"] = "center center";           
                } else {
                   css["transform-origin"] = "left top";
                }
            }
            transform = translate+transform;
            utilities.set_css_transform(css, transform);
        };

        utilities.set_css_transform = function (css, transform) {
            css['-webkit-transform'] = transform;
            css['-moz-transform']    = transform;
            css['-ms-transform']     = transform;
            css['o-transform']       = transform;
            css['transform']         = transform;
        };

        utilities.run_when_dimensions_known = function (element, callback, recompute) {
            var original_parent = element.parentElement;
            var not_in_a_hole = function (parent_element) {
                return parent_element && parent_element.className.indexOf("toontalk-box-hole") < 0;
            };
            var check_if_dimensions_known;
            if (!recompute && $(element).width() && not_in_a_hole(original_parent)) {
                // already known -- delaying it fixes problems with elements in box holes not computing the right scaling
                // but size in a box hole is should not count
                setTimeout(function () {
                               callback(original_parent);
                           });
                return;
            }
            check_if_dimensions_known = function (delay_if_not) {
                // add to DOM temporarily so can get dimensions
                setTimeout(function () {
                               var width  = $(element).width();
                               var height = $(element).height();
                               if (width && height) { // } && !$(element).is(".toontalk-carried-by-bird")) {
                                   if (not_in_a_hole(element.parentElement)) {
                                       callback(original_parent);
                                       if (original_parent) {
                                           original_parent.appendChild(element);
                                       } else if (element.parentElement === document.body) {
                                           $(element).remove();
                                       }
                                       $(element).removeClass("toontalk-not-observable");
                                   } else {
                                       // try again -- probably because in the meanwhile this has been
                                       // added to some container and its dimensions aren't original
                                       utilities.run_when_dimensions_known(element, callback, true);
                                   }
                               } else {
                                   setTimeout(function () {
                                                  // still not known so wait twice as long and try again
                                                  var widget = utilities.widget_of_element(element);
                                                  if (delay_if_not < 10000) {
                                                      // might be an anima gadget on the back of something
                                                      // and back isn't visible in which case no point waiting very long
                                                      // 10 seconds should be more than long enough for the DOM to be updated
                                                      check_if_dimensions_known(delay_if_not*2);
                                                  }
                                              },
                                              delay_if_not);
                               }
                }); 
            }
            $(element).addClass("toontalk-not-observable");
            document.body.appendChild(element);
            if (recompute) {
                utilities.set_css(element,
                                  {width:     '',
                                   height:    '',
                                   transform: ''});
            }
            check_if_dimensions_known(1);
        };

        utilities.original_dimensions = function (widget, set_original_dimensions, recompute) {
            // this relies upon run_when_dimensions_known which keeps trying until it finds out the dimensions of this element
            // TODO: discover if there is a better way
            var frontside_element = widget.get_frontside_element();
            var update_original_dimensions =
                function () {
                    set_original_dimensions($(frontside_element).width(), $(frontside_element).height());
                };
            if (frontside_element.parentElement === document.body) {
                return; // this was called twice -- probably by update_display
            }
            utilities.run_when_dimensions_known(frontside_element, update_original_dimensions, recompute);
        };
        
        utilities.relative_position = function (target_element, reference_element) {
             var target_offset = $(target_element).offset();
             var reference_offset;
             if (reference_element) {
                 reference_offset = $(reference_element).offset();
                 target_offset.left -= reference_offset.left;
                 target_offset.top  -= reference_offset.top;
             }
             return target_offset;
        };
        
        utilities.add_animation_class = function (element, class_name) {
            // if any code set the size explicitly then the animation won't display correctly
            utilities.set_css(element,
                               {width:  '',
                                height: ''});
            $(element).addClass(class_name);
        };
        
        utilities.widget_from_jquery = function ($element) {
             if ($element.length > 0) {
                 return $element.get(0).toontalk_widget;
             }
        };

        utilities.widget_of_element = function (element) {
            return element.toontalk_widget;
        };
        
        utilities.has_animating_image = function (element) {
            var $element = $(element);
            var animation = $element.css("animation") ||
                            $element.css("webkit-animation") ||
                            $element.css("moz-animation") ||
                            $element.css("ms-animation") ||
                            $element.css("o-animation");
            // rewrite using startsWith in Ecma 6
            return animation && animation.indexOf("none") !== 0;
        };

        utilities.display_message_if_new = function (message) {
            if (messages_displayed.indexOf(message) < 0) {
                utilities.display_message(message);
                messages_displayed.push(message);
            }
        };

        utilities.display_message = function (message) {
            var alert_element = utilities.create_alert_element(message);
            $(".toontalk-alert-element").remove(); // remove any pre-existing alerts
            console.log(message);
            console.trace();
            document.body.insertBefore(alert_element, document.body.firstChild);
            setTimeout(function () {
                           $(alert_element).remove();
                       },
                       Math.max(2000, message.length * (TT.MAXIMUM_TOOLTIP_DURATION_PER_CHARACTER || 100)));
        };

        utilities.display_tooltip = function ($element) {
            utilities.use_custom_tooltip($element.get(0));
            $element.tooltip('open');
        };

        utilities.report_internal_error = function (message) {
            // these are ToonTalk errors not user errors
            console.log(message);
            console.trace();
            if (TT.debugging) {
                utilities.display_message("Error: " + message);
            }
        };

        utilities.get_current_url_boolean_parameter = function (parameter, default_value) {
            if (window.location.href.indexOf(parameter + "=") < 0) {
                return default_value;
            }
            if (window.location.href.indexOf(parameter + "=1") >= 0) {
                return true;
            }
            // any value other than 1 is false
            return false;
        };

        utilities.get_current_url_numeric_parameter = function (parameter, default_value) {
            var string_value = utilities.get_current_url_parameter(parameter);
            if (typeof string_value === 'undefined') {
                return default_value;
            }
            try {
                return parseInt(string_value, 10);
            } catch (e) {
                // any other value is 0
                return 0;
            }
        };

        utilities.get_current_url_parameter = function (parameter, default_value) {
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
        };

        utilities.get_path_to_toontalk_folder = function () {
            var toontalk_start, next_slash;
            if (typeof path_to_toontalk_folder === 'string') {
                return path_to_toontalk_folder;
            }
            path_to_toontalk_folder = "";
            toontalk_start = window.location.href.indexOf("/ToonTalk/");
            if (toontalk_start < 0) {
                // give up
                return path_to_toontalk_folder;
            } else {
                next_slash = toontalk_start+"/ToonTalk".length;
            }
            while (true) {
                next_slash = window.location.href.indexOf("/", next_slash+1);
                if (next_slash < 0) {
                    return path_to_toontalk_folder;
                }
                path_to_toontalk_folder += "../";
            };
        };

        utilities.is_browser_of_type = function (type) {
            // type can be "MSIE", "Firefox", "Safari", "Chrome", "Opera"
            return window.navigator.userAgent.indexOf(type) >= 0;
        };

        utilities.is_internet_explorer = function () {
            return utilities.is_browser_of_type("MSIE") || // before version 11
                   utilities.is_browser_of_type("Trident");
        };

        utilities.add_position = function (position_1, position_2) {
            return {left: position_1.left+position_2.left,
                    top:  position_1.top +position_2.top};
        };

        utilities.subtract_position = function (position_1, position_2) {
            return {left: position_1.left-position_2.left,
                    top:  position_1.top -position_2.top};
        };

        utilities.remove_z_index = function (html) {
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
        };

       utilities.add_test_all_button = function () {
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
                    utilities.rerender_all();
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
        };

        utilities.set_timeout = function (delayed, delay) {
            if (!delay) {
                // see http://dbaron.org/log/20100309-faster-timeouts
                timeouts.push(delayed);
                window.postMessage(timeout_message_name, "*");
            } else {
                setTimeout(delayed, delay);
            }
        };

        utilities.get_first_property = function (object) {
            return Object.keys(object)[0];
        };

        utilities.get_all_locally_stored_program_names = function () {
            var all_program_names_json_string = window.localStorage.getItem('toontalk-all-program-names');
            if (all_program_names_json_string) {
                return JSON.parse(all_program_names_json_string);
            } else {
                return [];
            }
        };

        utilities.set_all_locally_stored_program_names = function (new_value) {
            window.localStorage.setItem('toontalk-all-program-names', JSON.stringify(new_value));   
        };

        utilities.get_local_storage_meta_data = function (program_name) {
            var meta_data_key = utilities.local_storage_program_meta_data_key(program_name);
            var meta_data;
            try {
                meta_data = window.localStorage.getItem(meta_data_key);
                if (meta_data) {
                    return JSON.parse(meta_data);
                }
            } catch (e) {
                // return nothing
            }
        };

        utilities.local_storage_program_key = function (program_name) {
            return "toontalk-json: " + program_name;
        };

        utilities.local_storage_program_meta_data_key = function (program_name) {
            return "toontalk-meta-data: " + program_name;
        };

        utilities.enable_editor = function (editor_window, url, file_id, widgets_json) {
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
        };

        utilities.touch_available = function () {
            // see for example http://stackoverflow.com/questions/3974827/detecting-touch-screen-devices-with-javascript
            return "ontouchstart" in window || navigator.msMaxTouchPoints;
        };

        utilities.enable_touch_events = function (element, maximum_click_duration) {
            var original_element = element;
            var touch_start_handler = function (event) {
                // rewrite using startsWith in ECMAScript version 6
                if (TT.logging && TT.logging.indexOf('touch') === 0) {
                    TT.debugging += "\ntouch start";
                }
                event.preventDefault();
                // text area input and resize handles work differently
                if (event.srcElement.tagName === 'TEXTAREA' || 
                    event.srcElement.tagName === 'INPUT' ||
                    $(event.srcElement).is(".ui-resizable-handle")) {
                    // rewrite using startsWith in ECMAScript version 6
                    if (TT.logging && TT.logging.indexOf('touch') === 0) {
                        TT.debugging += "\ntouch start ignored due to tag name or class";
                    }
                   return;
                }
                event.stopPropagation();
                utilities.set_timeout(
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
                            if (TT.logging && TT.logging.indexOf('touch') === 0) {
                                TT.debugging += "\ntouch end treated as click";
                                alert(TT.debugging);
                                TT.debugging = 'touch';
                            }   
                        } else {
                            drag_started = true;
                            widget = utilities.widget_of_element(element);
                            if (widget && widget.get_infinite_stack()) {
                                widget_copy = widget.copy();
                                widget.add_copy_to_container(widget_copy, 0, 0);
                                widget.set_infinite_stack(false);
                                widget_copy.set_infinite_stack(true);
                            } else if ($(element).is(".toontalk-top-level-resource")) {
                                widget_copy = widget.copy();
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
                            if (TT.logging && TT.logging.indexOf('touch') === 0) {
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
                    widget = utilities.widget_of_element(element); //utilities.find_widget_on_page(touch, element, 0, 0);
                    if (TT.logging && TT.logging.indexOf('touch') === 0) {
                        TT.debugging += "\ndrag ended";
                    }
                    if (widget) {
                        drop_handler(event, element); // widget.get_frontside_element());
                        if (TT.logging && TT.logging.indexOf('touch') === 0) {
                            TT.debugging += "\ndrop happened";
                        }
                    }
                    if (TT.logging && TT.logging.indexOf('touch') === 0) {
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
                    utilities.set_absolute_position($(element), {left: touch.pageX-drag_x_offset,
                                                                 top:  touch.pageY-drag_y_offset});
                    widget_under_element = utilities.find_widget_on_page(touch, element, 0, 0);
                    if (widget_drag_entered && widget_drag_entered !== widget_under_element) {
                        drag_leave_handler(touch, widget_drag_entered.get_frontside_element());
                        widget_drag_entered = undefined;
                    }
                    if (widget_under_element) {
                        drag_enter_handler(touch, widget_under_element.get_frontside_element());
                        widget_drag_entered = widget_under_element;
                    }
                    if (TT.logging && TT.logging.indexOf('touch') === 0) {
                        TT.debugging += "\ndragged to " + (touch.pageX-drag_x_offset) + ", " + (touch.pageY-drag_y_offset);
                    }
                } else if (TT.logging && TT.logging.indexOf('touch') === 0) {
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
        };

        utilities.get_mouse_or_first_touch_event_attribute = function (attribute, event) {
            // either mouse event's attribute or first touch' location's attribute
            if (event.changedTouches) {
                return event.changedTouches[0][attribute];
            }
            return event[attribute];
        };

        utilities.find_widget_on_page = function (event, element, x_offset, y_offset) {
            // return what is under the element
            var page_x = utilities.get_mouse_or_first_touch_event_attribute("pageX", event);
            var page_y = utilities.get_mouse_or_first_touch_event_attribute("pageY", event);
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
       };

       utilities.closest_top_level_backside = function (x, y) {
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
           return utilities.widget_of_element(best_so_far);
       };

       utilities.set_css = function (element, css) {
           // this is mostly useful debugging computed CSS problems since can break here
           var widget;
           if (!css) {
               return;
           }
           widget = utilities.widget_of_element(element);
           if (widget && widget.location_constrained_by_container()) {
               css.left = '';
               css.top  = '';
           }
           if (!css.transform && css.width !== undefined && css.height !== undefined && widget && widget.use_scaling_transform) {
               // leave CSS width and height alone and recompute scaling transform
               // following will call set_css again with modified css
               widget.use_scaling_transform(css);
           } else {
               $(element).css(css);
           }
       };

       utilities.map_arguments = function (args, fun) {
           // args need not be an ordinary array but could be the arguments of a function
           var size = args.length;
           var index = 0;
           var result = [];
           while (index < size) {
               result.push(fun(args[index]));
               index++;
           }
           return result;
       };

       utilities.conjunction = function (list, add_a_or_an) {
           // turns a list into an English conjunction
           return list.map(function (element, index) {
                               var item;
                               if (typeof element === 'undefined') {
                                   return "anything";
                               }
                               item = add_a_or_an ? utilities.add_a_or_an(element) : element;
                               if (index === list.length-2) {
                                   return item + " and ";
                               } else if (index === list.length-1) {
                                   return item;
                               }
                               return item + ", ";
                           }).join("");
       };

       utilities.insert_function_bird_documentation = function (type_name) {
           var function_table = TOONTALK[type_name]['function'];
           var function_names = Object.keys(function_table);
           var table = "<table class='toontalk-function-bird-documentation-table'>";
           function_names.forEach(function (function_name, index) {
               var function_object = function_table[function_name];
               table += "<tr><td><div id='bird_id_" + index + "'></div></td><td class='toontalk-function-bird-name'>" + function_name + 
                        "</td><td class='toontalk-function-bird-title-documentation'>" +
                        function_object.title + "</td></tr>";
           });
           table += "</table>";
           document.write(table);
           function_names.forEach(function (function_name, index) {
               var bird = window.TOONTALK.bird.create_function(type_name, undefined, function_name);
               var bird_frontside_element = bird.get_frontside_element();
               bird.update_display();
               $("#bird_id_" + index).replaceWith($(bird_frontside_element).addClass("toontalk-function-bird-documentation-bird"));
               // sanitise the id -- id enables links to specific function birds
               bird_frontside_element.id = encodeURIComponent(function_name);
           });  
       };

       utilities.rerender_all = function () {
           $(".toontalk-side").each(function (index, element) {
                                        var widget = utilities.widget_of_element(element);
                                        if (widget) {
                                            widget.rerender();
                                        }
                                    });
       };

       utilities.visible_element = function (element) {
           var $element = $(element);
           return $element.is(":visible") && $element.css('opacity') !== '0';
       };

//         enable_touch_events = function (maximum_click_duration) {
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
//         };

        utilities.create_queue = function () {
/*  Following based upon 

Created by Stephen Morley - http://code.stephenmorley.org/ - and released under
the terms of the CC0 1.0 Universal legal code:

http://creativecommons.org/publicdomain/zero/1.0/legalcode

Creates a new queue. A queue is a first-in-first-out (FIFO) data structure -
items are added to the end of the queue and removed from the front.

Edited by Ken Kahn for better integration with the rest of the ToonTalk code
 */

          // initialize the queue and offset
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
                  enqueue: function(item) {
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
        };

        return utilities;
    
}(window.TOONTALK));
