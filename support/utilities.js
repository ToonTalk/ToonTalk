 /**
 * Implements ToonTalk's JavaScript functions shared between files
 * Authors: Ken Kahn
 * License: New BSD
 */
 
/*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */

// so can optionally have Google Translate
function googleTranslateElementInit() {
    "use strict";
    window.TOONTALK.translate_element = new google.translate.TranslateElement({pageLanguage: 'en', layout: google.translate.TranslateElement.InlineLayout.SIMPLE}, 'google_translate_element');
}

window.TOONTALK.UTILITIES = 
(function (TT) {
    "use strict";

    // following holds all the utility functions
    // defined here to support self-reference
    var utilities = {};  
    var toontalk_initialized = false;  
    var z_index = 100;
    // id needs to be unique across ToonTalks due to drag and drop
    var id_counter = new Date().getTime();
    // Google translate and the like should not translate the JSON
    // The JSON should not be displayed - but once element is processed the display property will be removed
    var div_json   = "<div class='toontalk-json' translate='no' style='display:none'>"; 
    var div_hidden = "<div style='display:none;'>"; // don't use a class since CSS might not be loaded
    var div_hidden_and_json_start = div_hidden + "{";
    var div_close  = "</div>";
    var muted_audio_objects = [];
    var audio_objects_playing = [];
    // used when doing something to large arrays to break it up and give other processes a chance to running
    // also prevents stack overflow for large arrays in get_json_of_array
    var default_batch_size = 100;
    var browser_is_internet_explorer;
    // need to prevent utterances from being prematurely garbage collected
    // see https://bugs.chromium.org/p/chromium/issues/detail?id=509488
    // so they are added to this array until they are finished speaking
    var speech_utterances = []; 
    var observer = new MutationObserver(function (mutations) {
                                            mutations.forEach(function(mutation) {
                                                                  var i, added_node;
                                                                  // mutation.addedNodes is a NodeList so can't use forEach
                                                                  for (i = 0; i < mutation.addedNodes.length; i++) {
                                                                      added_node = mutation.addedNodes.item(i);
                                                                      if (added_node.nodeType === 1) {
                                                                          // is an element
                                                                          setTimeout(function () {
                                                                              // delay seems necessary since callbacks below can trigger new mutations
                                                                              if (added_node.toontalk_attached_callback) {
                                                                                  if (!$(added_node).is(".toontalk-not-observable") ||
                                                                                      added_node.toontalk_run_even_if_not_observable) {
                                                                                      // was only attached to compute original dimensions and is not computing now
                                                                                      $(added_node).removeClass("toontalk-has-attached-callback");
                                                                                      added_node.toontalk_attached_callback();
                                                                                      added_node.toontalk_attached_callback = undefined;
                                                                                      added_node.toontalk_run_even_if_not_observable = undefined;     ;
                                                                                  }
                                                                              }
                                                                              $(added_node).find(".toontalk-has-attached-callback").each(function (index, element) {
                                                                                  $(element).removeClass("toontalk-has-attached-callback");
                                                                                  if (element.toontalk_attached_callback) {
                                                                                      // Test "A team of 3 that each adds 1 to 1" calls this with element.toontalk_attached_callback undefined
                                                                                      // When stepping through the code it works fine so must be some kind of timing dependent problem
                                                                                      element.toontalk_attached_callback();
                                                                                      element.toontalk_attached_callback = undefined;
                                                                                  }
                                                                              });
                                                                          });
                                                                      }
                                                                  }                                                                
                                                              });    
                                        });
    var translate = function (element, translate_attribute, scale_attribute) {
        var translation, ancestor;
        if (!element) {
            return;
        }
        translation = element[translate_attribute] || 0;
        if (element[scale_attribute]) {
            translation /= element[scale_attribute];
        }
        ancestor = element.parentElement;
        while (ancestor) {
            translation += ancestor[translate_attribute] || 0;
            if (ancestor[scale_attribute]) {
                translation /= ancestor[scale_attribute];
            }
            ancestor = ancestor.parentElement;
        }
        return translation;
    };
    var add_to_touch_log = function (message, display_now) {
        // since hard to see console log on phone or tablet this uses both console and eventually alert
        TT.debugging += "\n" + message;
        console.log(message);
        if (display_now) {
            alert(TT.debugging);
            TT.debugging = 'touch';
        }
    };
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
        if ($(element).is(".toontalk-conditions-contents")) {
            // don't drag widget out of condition container
            return;
        }
        var $source_element = $(element).closest(".toontalk-side");
        var client_x = utilities.get_mouse_or_first_touch_event_attribute("clientX", event);
        var client_y = utilities.get_mouse_or_first_touch_event_attribute("clientY", event);
        var bounding_rectangle, json, json_callback, json_div, widget_side, is_resource, held_listeners;
        $(".ui-tooltip").remove();
        // stop animating it if grabbed
        $(".ui-tooltip").removeClass("toontalk-side-animating");
        // was using text/plain but IE complained
        // see http://stackoverflow.com/questions/18065840/html5-drag-and-drop-not-working-on-ie11
        if (event.dataTransfer && event.dataTransfer.getData("text") && event.dataTransfer.getData("text").length > 0) {
            // e.g. dragging some text off the backside of a widget
            return;
        }
        $dragee = ($source_element || $(element));
        widget_side = utilities.widget_side_of_jquery($dragee);
        if (!widget_side) {
            widget_side = utilities.widget_side_of_element(element);
            utilities.report_internal_error("Possible bug that " + $dragee + " doesn't have a known owner.");
            if (!widget_side) {
                utilities.report_internal_error("The element doesn't have an owner either.");
                return;
            }
            $dragee = $(element);
        }
        widget_side = widget_side.get_selection();
        $dragee = $(widget_side.get_element());
        if (widget_side.set_stopped) {
            widget_side.set_stopped(true);
        }
        if (widget_side.save_dimensions && (!widget_side.get_parent_of_frontside() || widget_side.get_parent_of_frontside().get_widget().is_top_level())) {
            widget_side.save_dimensions();
        }
        widget_side.being_dragged = true;
        bounding_rectangle = $dragee.get(0).getBoundingClientRect();
        // TODO: determine if the following is still accurate and useful
        is_resource = $dragee.is(".toontalk-top-level-resource");
        // should not wiggle if picked up
        $(element).removeClass("toontalk-wiggle");
        if (widget_side.get_json) {
            json_callback = function (json) {
                json.view.drag_x_offset = client_x-bounding_rectangle.left;
                json.view.drag_y_offset = client_y-bounding_rectangle.top;
                if (!json.view.frontside_width) {
                    if ($dragee.parent().is(".toontalk-backside")) {
                        json.view.frontside_width  = $dragee.width();
                        json.view.frontside_height = $dragee.height();
                    }
                }
                $dragee.data("json", json);   
                if (event.dataTransfer) {
                    json_div = utilities.toontalk_json_div(json, widget_side);
                    event.dataTransfer.effectAllowed = is_resource ? 'copy' : 'move';
                    // text is good for dragging to text editors
                    event.dataTransfer.setData("text", json_div);
                    // text/html should work when dragging to a rich text editor
                    if (!utilities.is_internet_explorer()) {
                        // text/html causes an error in IE
                        event.dataTransfer.setData("text/html", json_div);
                    }
                }         
                if (widget_side.drag_started) {
                    widget_side.drag_started(json, is_resource);
                }
            };
            if (event.dataTransfer) {
                event.dataTransfer.setData("text", "Sorry, it took too long to generate the data structure needed to reconstruct " + widget_side + ".");
            }
            // this may freeze the browser if a very large JSON is generated but the alternative is that drag and drop breaks
            // so let it take 10 minutes maximum
            TT.UTILITIES.get_json_top_level(widget_side, json_callback, 1000*60*10);
        }
        $dragee.addClass("toontalk-being-dragged");
        held_listeners = widget_side.get_listeners('picked up');
        if (held_listeners) {
            held_listeners.map(function (listener) {
                listener();
            });
        }
        event.stopPropagation();
    };
    var drag_end_handler = function (event, element) {
        var widget_side, drop_listeners;
        if ($(element).is(".toontalk-conditions-contents")) {
            // don't drag widget out of condition container
            return;
        }
        if (!$dragee) {
            $dragee = $(event.target).closest(".toontalk-side");
        }
        widget_side = utilities.widget_side_of_jquery($dragee);
        if (widget_side) {
            widget_side.being_dragged = undefined;
            drop_listeners = widget_side.get_listeners('dropped');
                if (drop_listeners) {
                    drop_listeners.map(function (listener) {
                            listener();
                    });
                }
        }
        if ($dragee.is(".toontalk-frontside")) {
            if ($dragee.parent().is(".toontalk-backside")) {
                // restore ordinary size styles
                var json_object = $dragee.data("json");
                if (json_object) {
                    utilities.set_css($dragee,
                                      {width:  json_object.view.frontside_width,
                                       height: json_object.view.frontside_height});
                }
            } else if (!$dragee.parent().is(".toontalk-top-level-resource, .toontalk-drop-area, .toontalk-json") &&
                       !$dragee.is(".toontalk-carried-by-bird, .toontalk-element-attribute, .toontalk-function-bird-documentation-bird") &&
                       !utilities.has_animating_image($dragee.get(0))) {
                utilities.set_css($dragee,
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
        if ($dragee) {
            return utilities.widget_side_of_jquery($dragee);
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
            var json_object_element = widget.get_element(true);
            var $current_editable_text = $(element).closest(".toontalk-edit");
            var editable_text = TT.published_support.create_editable_text();
            var child_target = event.target;
            $(top_level_element).addClass("toontalk-json toontalk-top-level-resource toontalk-top-level-resource-container");
            $(json_object_element).addClass("toontalk-top-level-resource")
                                  .css({position: 'relative',
                                        width:  widget.saved_width,
                                        height: widget.saved_height});
            json_object_element.toontalk_widget_side = widget;
            top_level_element.toontalk_widget_side   = widget;
            top_level_element.appendChild(json_object_element);
            $(top_level_element).insertAfter($current_editable_text);
            while (child_target.nextSibling) {
                $(editable_text).children(".froala-element").get(0).appendChild(child_target.nextSibling);
            }
            $(editable_text).insertAfter(top_level_element);
            widget.set_visible(true);
            widget.render();
            // published_support will notice this and save soon
        };
        var element_under_page_x_y = function () {
            // don't include the current $source so temporarily hide it
            var new_target;
            $source.hide();
            new_target = document.elementFromPoint(page_x-window.pageXOffset-TT.USABILITY_DRAG_OFFSET.x, page_y-window.pageYOffset-TT.USABILITY_DRAG_OFFSET.y);
            $source.show();
            if (new_target) {
                return $(new_target).closest(".toontalk-side");
            }
        };
        var $source, source_widget_side, $target, target_widget_side, drag_x_offset, drag_y_offset, target_position, 
            new_target, $container, container, width, height, i, page_x, page_y,
            source_widget_saved_width, source_widget_saved_height;
        if (json_object === undefined && $dragee) {
            json_object = $dragee.data("json");
        }
        if ($dragee) {
            $dragee.data("json", ""); // no point wasting memory on this anymore
        }
        // should this set the dropEffect? 
        // https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer#dropEffect.28.29 
        $source = $dragee;
        drag_ended();
        if (!$source && json_object === undefined && !event.dataTransfer.files && !non_data_URL_in_data_transfer(event)) {
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
            // TODO: rename to $target_side
            target_widget_side = utilities.widget_side_of_jquery($target);
            if (target_widget_side) {
                if ($source) {
                    source_widget_side = utilities.widget_side_of_jquery($source);
                } else {
                    source_widget_side = utilities.create_from_json(json_object);
                }
                utilities.restore_resource($source, source_widget_side);
                target_widget_side.dropped_on_style_attribute(source_widget_side, event.target.name, event);
                event.stopPropagation();
                return;
            }
        } else if ($(event.target).is(".toontalk-drop-area")) {
            $target = $(event.target);
        } else if (json_object && $(event.currentTarget).is(".froala-element")) {
            // dropped a widget on editable text - insert it after that
            insert_widget_in_editable_text(json_object, event);
            return;
        } else if ($source && $source.is(".toontalk-backside")) {
            // backsides can only be dropped on other backsides, birds, nests, or boxes
            $target = $(event.target).closest(".toontalk-backside, .toontalk-bird, .toontalk-nest, .toontalk-box");
        } else {
            // closest includes 'self'
            $target = $(event.target).closest(".toontalk-side");
        }
        if ($target.length === 0) {
            return;
        }
        page_x = utilities.get_mouse_or_first_touch_event_attribute("pageX", event);
        page_y = utilities.get_mouse_or_first_touch_event_attribute("pageY", event);
        if ($target.is(".toontalk-top-level-resource")) {
            if (event.type === 'touchend') {
                // simulating a drop so use the closest top-level
                // first use the highlighted element
                $target = $(".toontalk-highlight"); 
                if ($target.length === 0 || $target.get(0) === $source.get(0)) {
                    $target = element_under_page_x_y();
                }
                if (!$target || $target.length === 0) {
                    return;
                }
            } else {
                // maybe should ensure they are not drop targets
                return;
            }
        }
        // if this is computed when needed and if dragging a resource it isn't the correct value
        target_position = $target.offset();
        target_widget_side = utilities.widget_side_of_jquery($target);
        if ($source && $source.length > 0 &&
            // OK to drop on infinite stack since will become a copy
            !(target_widget_side && target_widget_side.get_widget().get_infinite_stack && target_widget_side.get_widget().get_infinite_stack()) &&
            ($source.get(0) === $target.get(0) || jQuery.contains($source.get(0), $target.get(0)))) {
            if ($source.is(".toontalk-backside-of-top-level")) {
                return; // let event propagate since this doesn't make sense
            }
            // not dropping on itself but on the widget underneath
            // first use the highlighted element
            $target = $(".toontalk-highlight"); 
            if ($target.length === 0 || $target.get(0) === $source.get(0)) {
                $target = element_under_page_x_y();
            }
            if (!$target || $target.length === 0) {
                return;
            }
            target_position = $target.offset();
            target_widget_side = utilities.widget_side_of_jquery($target);
        }
        utilities.remove_highlight();
        if (json_object && json_object.view && json_object.view.drag_x_offset) {
            drag_x_offset = json_object.view.drag_x_offset;
            drag_y_offset = json_object.view.drag_y_offset;
        } else {
            drag_x_offset = 0;
            drag_y_offset = 0;
        }
        if ($source && $source.length > 0) {
            if (!(target_widget_side && target_widget_side.get_widget().get_infinite_stack && target_widget_side.get_widget().get_infinite_stack()) && 
                ($source.get(0) === $target.get(0) || jQuery.contains($source.get(0), $target.get(0)))) {
                // OK to drop on infinite stack since will become a copy
                // dropped on itself or dropped on a part of itself
                // just moved it a little bit
                // only called now that elementFromPoint is used to find another target when dropped on part of itself
                utilities.set_css($source,
                                  {left: $source.get(0).offsetLeft + (event.layerX - drag_x_offset),
                                   top:  $source.get(0).offsetTop  + (event.layerY - drag_y_offset)});
                event.stopPropagation();
                return;
            }
            source_widget_side = utilities.widget_side_of_jquery($source);
            if ($source.parent().is(".toontalk-drop-area")) {
                $source.removeClass("toontalk-widget-in-drop_area");
                $source.parent().data("drop_area_owner").set_next_robot(undefined);
            } else {
                container = source_widget_side && source_widget_side.get_parent();
                if (container) {
                    $container = $(container.get_element());
                    if (!source_widget_side.is_backside() && source_widget_side.get_widget().get_infinite_stack && source_widget_side.get_widget().get_infinite_stack()) {
                        // leave the source there but create a copy
                        source_widget_saved_width  = source_widget_side.get_widget().saved_width;
                        source_widget_saved_height = source_widget_side.get_widget().saved_height;
                        source_widget_side = TT.UTILITIES.get_dragee_copy();
                        source_widget_side.get_widget().saved_width  = source_widget_saved_width;
                        source_widget_side.get_widget().saved_height = source_widget_saved_height;
                        width  = $source.width();
                        height = $source.height();
                        $source = $(source_widget_side.get_element(true));
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
                            container.remove_backside_widget(source_widget_side, true);
                        } else {
                            container.removed_from_container(source_widget_side, event);
                            if (source_widget_side.restore_dimensions && !container.is_empty_hole()) {
                                // TODO: unclear whether callers removed_from_container should restore_dimensions
                                // or removed_from_container itself
                                source_widget_side.restore_dimensions();
                            }
                        }
                    }
                } else {
                    utilities.restore_resource($source, source_widget_side);
                }
                if (source_widget_side && source_widget_side.robot_in_training()) {
                    // maybe have been copied
                    // or removed from a container (and not 'seen' before)
                    source_widget_side.robot_in_training().add_newly_created_widget_if_new(source_widget_side);
                }
            }
        } else {
            if (event.dataTransfer.files.length > 0) {
                // forEach doesn't work isn't really an array
                for (i = 0; i < event.dataTransfer.files.length; i++) {
                    handle_drop_from_file_contents(event.dataTransfer.files[i], $target, target_widget_side, target_position, event);
                };
                event.stopPropagation();
                return;
            } else if (non_data_URL_in_data_transfer(event)) {
                // using URL instead of text/uri-list to be compatible with IE -- see http://www.developerfusion.com/article/144828/the-html5-drag-and-drop-api/
                handle_drop_from_uri_list(event.dataTransfer.getData("URL"), $target, target_widget_side, target_position, event);
                event.stopPropagation();
                return;
            } else {
                source_widget_side = utilities.create_from_json(json_object, {event: event});
            }
            if (!source_widget_side) {
                if (json_object) {
                    utilities.report_internal_error("Unable to construct a ToonTalk widget from the JSON.");
                } else if (TT.debugging) {
                    console.log("No data transfer in drop.");
                }
                event.stopPropagation();
                return;
            }
            if (source_widget_side.robot_in_training()) {
                // dropped something from a different window/tab so treat it like the robot picked it up
                source_widget_side.robot_in_training().drop_from_data_transfer(source_widget_side);
            }
            $source = $(source_widget_side.get_element(true));
            if (source_widget_side.is_primary_backside && source_widget_side.is_primary_backside()) {
                utilities.set_css($source,
                                  {width: json_object.view.backside_width,
                                   height: json_object.view.backside_height,
                                   // color may be undefined
                                   "background-color": json_object.view.background_color,
                                   "border-width": json_object.view.border_width});
                source_widget_side.apply_backside_geometry();
            }
        }    
        if (target_widget_side && source_widget_side.get_widget() === target_widget_side.get_widget()) {
            // dropping front side on backside so ignore
            return;
        }
        handle_drop($target, $source, source_widget_side, target_widget_side, target_position, event, json_object, drag_x_offset, drag_y_offset);
    };
    var add_drop_handler_to_input_element = function (input_element, drop_handler) {
        // TODO: need touch version of the following
        var new_drop_handler = 
            function (event) {
                var dropped = get_dropped_widget(event);
                // if drag was from a resource then restore it
                utilities.restore_resource(utilities.get_$dragee(), dropped);
                drop_handler(event);
            }
        input_element.addEventListener('drop', new_drop_handler);
    };
    var $toontalk_side_underneath = function (element) {
        var $dragee = utilities.get_$dragee();
        var $target;
        if ($dragee && $dragee.is(".toontalk-backside")) {
            // backsides can only be dropped on other backsides, birds, nests, or boxes
            $target = $(element).closest(".toontalk-backside, .toontalk-bird, .toontalk-nest, .toontalk-box");
        } else {
            $target = $(element).closest(".toontalk-side");
        }
        if ($target.is("*") &&
            !$target.is(".toontalk-backside-of-top-level") && 
            !$target.closest(".toontalk-top-level-resource").is("*") &&
            !$target.is(".toontalk-being-dragged") && // is $dragee.get(0) === $target.get(0) a better way to express this?
            !($dragee && has_ancestor_element($target.get(0), $dragee.get(0)))) {
            return $target;
        }
    };
    var drag_enter_handler = function (event, element) {
        var $element_underneath = $toontalk_side_underneath(element);
        if ($element_underneath) {
            // could support a can_drop protocol and use it here
            utilities.highlight_element($element_underneath.get(0), event);
            return $element_underneath.get(0); // return highlighted element
        }
    };
    var drag_leave_handler = function (event, element) {
        utilities.remove_highlight(element);
    };
    var handle_drop = function ($target, $source, source_widget_side, target_widget_side, target_position, event, json_object, drag_x_offset, drag_y_offset) {
        var page_x = utilities.get_mouse_or_first_touch_event_attribute("pageX", event);
        var page_y = utilities.get_mouse_or_first_touch_event_attribute("pageY", event);
        var new_target, backside_widgets_json, shared_widgets, top_level_element, top_level_backside_position, backside_widgets, 
            left, top, element_here, css, robot_in_training;
        if (!drag_x_offset) {
            drag_x_offset = 0;
        }
        if (!drag_y_offset) {
            drag_y_offset = 0;
        }
        source_widget_side.set_visible(true);
        if (json_object && json_object.semantic && json_object.semantic.running) {
            utilities.set_timeout(function () {
                                      source_widget_side.set_running(true);
                                  },
                                  100);
        }
        if ($target.is(".toontalk-backside")) {
            if (source_widget_side.get_widget().is_top_level()) {
               // add all top-level backsides contents but not the backside widget itself
               backside_widgets_json = json_object.semantic.backside_widgets;
               shared_widgets = json_object.shared_widgets;
               top_level_element = $target.get(0);
               robot_in_training = target_widget_side.robot_in_training();
               if (robot_in_training) {
                   robot_in_training.drop_from_data_transfer(source_widget_side, target_widget_side);  
               }
               // need to copy the array because the function in the forEach updates the list
               backside_widgets = source_widget_side.get_widget().get_backside_widgets().slice();
               TT.UTILITIES.for_each_batch(
                   backside_widgets,
                   function (backside_widget_side, index) {
                       var widget = backside_widget_side.get_widget();
                       var json_view, element_of_backside_widget, left_offset, top_offset, width, height, position;
                       source_widget_side.remove_backside_widget(backside_widget_side);
                       if (backside_widgets_json[index].widget.shared_widget_index >= 0) {
                           json_view = shared_widgets[backside_widgets_json[index].widget.shared_widget_index].view;
                       } else {
                           json_view = backside_widgets_json[index].widget.view;
                       }
                       element_of_backside_widget = backside_widget_side.get_element(true);
                       if (backside_widget_side.is_backside()) {                
                           left_offset = json_view.backside_left;
                           top_offset  = json_view.backside_top;
                           width       = json_view.backside_width;
                           height      = json_view.backside_height;
                       } else {
                           left_offset = json_view.frontside_left;
                           top_offset  = json_view.frontside_top;
                           width       = json_view.frontside_width;
                           height      = json_view.frontside_height;
                       }
                       target_widget_side.add_backside_widget(backside_widget_side);
                       top_level_element.appendChild(element_of_backside_widget);
                       position = $(element_of_backside_widget).position();
                       css = {left: position.left+left_offset,
                              top:  position.top +top_offset,
                              width:  width,
                              height: height};
                       utilities.constrain_css_to_fit_inside(top_level_element, css);
                       utilities.set_css(element_of_backside_widget, css);
                       if (source_widget_side.set_location_attributes) {
                           // e.g. an element needs to know its position attributes
                           widget.set_location_attributes(css.left, css.top);
                       }
                       if (backside_widget_side.is_backside()) {
                           widget.backside_geometry = json_view.backside_geometry;
                           widget.apply_backside_geometry();
                       }
                   }.bind(this));
               return;
            }
            if (!target_widget_side) {
                utilities.report_internal_error("No target_widget");
                return;
            }
            // widget_side_dropped_on_me needed here to get geometry right
            if (source_widget_side) {
                target_widget_side.widget_side_dropped_on_me(source_widget_side, event);
            } else {
                utilities.report_internal_error("No source_widget");
            }
            left = page_x - (target_position.left + (drag_x_offset || 0));
            top  = page_y - (target_position.top  + (drag_y_offset || 0));
            css = {left: utilities.left_as_percent(left, $source.get(0)),
                   top:  utilities.top_as_percent (top,  $source.get(0))};
            utilities.set_css($source, css);
            if (!source_widget_side.is_backside() && source_widget_side.set_location_attributes) {
                // e.g. an element needs to know its position attributes
                source_widget_side.set_location_attributes(left, top);
            }
            if (json_object && json_object.semantic && json_object.semantic.running && !utilities.get_$dragee()) {
                // JSON was dropped here from outside so if was running before should be here
                // but not if just a local move
                source_widget_side.set_running(true);
            }
        } else if ($target.is(".toontalk-drop-area")) {
            $source.addClass("toontalk-widget-in-drop_area");
            if ($target.length > 0) {
                $target.get(0).appendChild($source.get(0));
            }
            if ($source.is(".toontalk-robot")) {
                $target.data("drop_area_owner").set_next_robot(utilities.widget_side_of_jquery($source));
            }
        } else if ($source.is(".toontalk-backside-of-top-level")) {
            // dragging top-level backside to itself or one of its children is ignored
            return;
        } else if (!target_widget_side && !event.changedTouches) {
            utilities.report_internal_error("target widget missing");
            return; // let event propagate
        } else {
            // before processing drop ensure that dropped item (source_widget) is visible and where dropped
            top_level_element = $target.closest(".toontalk-backside-of-top-level").get(0);
            if (!top_level_element && event.changedTouches) {
                // i.e. when dragging using touch events
                element_here = document.elementFromPoint(page_x-window.pageXOffset, page_y-window.pageYOffset);
                if ($(element_here).is(".toontalk-backside-of-top-level")) {
                    top_level_element = element_here;
                } else {
                    top_level_element = $(element_here).closest(".toontalk-backside-of-top-level").get(0);
                }
                if (!top_level_element) {
                    // pick any top level backside
                    top_level_element = $(".toontalk-backside-of-top-level").get(0);
                }
                target_widget_side = utilities.widget_side_of_element(top_level_element).get_backside();
            }
            if (!top_level_element) {
                return; // give up
            }
            top_level_element.appendChild($source.get(0));
            top_level_backside_position = $(top_level_element).offset();
            css = {left: page_x - (top_level_backside_position.left + drag_x_offset + TT.USABILITY_DRAG_OFFSET.x),
                   top:  page_y - (top_level_backside_position.top  + drag_y_offset + TT.USABILITY_DRAG_OFFSET.y)};
            utilities.set_css($source, css);
            if (source_widget_side.drop_on && source_widget_side.drop_on(target_widget_side, event)) {
            } else if (target_widget_side.widget_side_dropped_on_me && target_widget_side.widget_side_dropped_on_me(source_widget_side, event)) {
            } else {
                // ignore the current target and replace with the backside it is on
                new_target = $target.closest(".toontalk-backside-of-top-level");
                if (new_target.length > 0) {
                    target_widget_side = utilities.widget_side_of_jquery(new_target);
                    if (target_widget_side) {
                        target_widget_side.widget_side_dropped_on_me(source_widget_side, event);
                    }
                }
            }
        }
        if (TT.logging && TT.logging.indexOf("drop") >= 0) {
            console.log("Drop of " + source_widget_side._debug_id + " on " + target_widget_side._debug_id);
            console.log("Left: " + css.left + "; top: " + css.top + "; page_x: " + page_x + "; page_y: " + page_y + "; drag_x_offset: " + drag_x_offset + "; drag_y_offset: " + drag_y_offset)
        }
        utilities.remove_highlight();
    };
    var handle_drop_from_file_contents = function (file, $target, target_widget_side, target_position, event) {
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
                widget.robot_in_training().drop_from_data_transfer(widget, target_widget_side);
            }
            handle_drop($target, $(widget.get_frontside_element(true)), widget, target_widget_side, target_position, event, json_object);
        }
        if (image_file || audio_file || video_file) {
            reader.readAsDataURL(file);
        } else {
            reader.readAsText(file);
        }
    };
    var handle_drop_from_uri_list = function (uri_list, $target, target_widget_side, target_position, event) {
        var handle_drop_from_uri = 
            function (uri, $target, target_position, event) {                 
                var widget_callback = function (widget) {
                    if (widget) {
                        if (widget && widget.robot_in_training()) {
                            widget.robot_in_training().drop_from_data_transfer(widget, target_widget_side);
                        }
                        handle_drop($target, $(widget.get_frontside_element(true)), widget, target_widget_side, target_position, event);
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
                utilities.create_widget_from_URL(uri, widget_callback, error_handler);               
        };
        uri_list.split(/\r?\n/).forEach(function (uri) {
            if (uri[0] !== "#") {
                // is not a comment
                // see https://developer.mozilla.org/en-US/docs/Web/Guide/HTML/Recommended_Drag_Types
                handle_drop_from_uri(uri, $target, target_position, event);
            }
        });
    };
    var discover_default_dimensions = function (class_name, toontalk_module) {
        // finds and then defines the default dimensions of ToonTalk primitives (e.g. robot, nest, and bird)
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
    var initialize_sounds = function () {
        var sounds_path = utilities.get_path_to_toontalk_folder() + "sounds/";
        var create_sound = function (file_name) {
            var sound = new Audio(sounds_path + file_name);
            sound.volume = utilities.get_audio_volume(sound);
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
        if (!$dragee) {
            return;
        }
        $dragee.removeClass("toontalk-being-dragged");
        // need delay since there may be other listeners to drop events that need to know this
        // e.g. drop area for next robot
        utilities.set_timeout(function () {
            $dragee = undefined;
            dragee_copy = undefined;
            resource_copy = undefined;
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
        var token_start = encodeURIComponent("<span class='notranslate' translate='no'>decodeURIComponent");
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
    var replace_body = function (callback) {
        var encoded_url = utilities.get_current_url_parameter('replace-with-url');
        if (!encoded_url) {
            utilities.display_message("Expected a url=... parameter in the URL.");
            return;
        }
        var url = decodeURIComponent(encoded_url);
        utilities.download_file(url,
                                function (contents) {
                                    var body, id, title, div;
                                    if (!contents) {
                                        utilities.display_message("Unable to read contents of " + url);
                                        return;
                                    }
                                    body = extract_html_by_tag(contents, 'body');
                                    if (!body) {
                                        utilities.display_message("Expected contents of " + url + " to contain a body element.");
                                        return;
                                    }
                                    title = extract_html_by_tag(contents, 'title', true);
                                    if (title) {
                                        document.title = title;
                                    }
                                    // can't just do document.body.innerHTML = body
                                    // since that clobbers hidden elements added by Google API
                                    div = document.createElement('div');
                                    div.innerHTML = body;                                
                                    document.body.appendChild(div);
                                    callback();
                                    if ((url.indexOf("googleapis.com") >= 0 || url.indexOf("googleusercontents.com") >= 0) &&
                                        TT.google_drive.connection_to_google_drive_possible()) {
                                        id = url.substring(url.lastIndexOf('/')+1,url.indexOf('?'));
                                        $(".toontalk-edit").editable({inlineMode:  !TT.UTILITIES.get_current_url_boolean_parameter('edit', false),
                                                                      imageUpload: false, 
                                                                      crossDomain: true});
                                        TT.published_support.send_edit_updates(id);
                                    }
                                },
                                gapi && gapi.auth && gapi.auth.getToken() && gapi.auth.getToken().access_token);
    };
    var extract_html_by_tag = function (html, tag, contents_only) {
        var start = html.indexOf("<" + tag);
        var end;
        if (start < 0) {
           return;
        }
        end = html.indexOf("</" + tag + ">");
        if (end < 0) {
            return;
        }
        if (contents_only) {
            return html.substring(start+2+tag.length, end); // include < and > -- assumes tag is <tag>
        }
        return html.substring(start, end+3+tag.length); // include < / and >
    };
    var waiting_for_speech = false;
    // for implementing zero_timeout
    var timeouts = [];
    var timeout_message_name = "zero-timeout-message";
    var messages_displayed = [];
    var $dragee, dragee_copy, resource_copy;
    var speech_recognition, path_to_toontalk_folder, widgets_left, element_displaying_tooltip;
    window.addEventListener("message", 
                            function (event) {
                                if (event.data === timeout_message_name && event.source === window) {
                                    event.stopPropagation();
                                    if (timeouts.length > 0) {
                                        (timeouts.shift())();
                                    }
                                    return;
                                }
//                                 if (event.data.editable_contents) {
//                                     TT.publish.republish(event.data);
//                                 }
                            },
                            false); // don't capture events
    observer.observe(window.document, {childList: true,
                                       subtree:   true});
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
            var widget_side, side_element, backside_widgets, json_semantic, json_view, size_css, json_of_shared_widget, shared_widget;
            if (!json) {
                // was undefined and still is
                return;
            }
//             console.log(json);
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
                widget_side = utilities.create_from_json(json.widget, additional_info);
                if (widget_side && json.is_backside) { 
                    return widget_side.get_backside(true);
                }
                return widget_side;
            }
            if (additional_info && additional_info.shared_widgets && json.shared_widget_index >= 0) {
                shared_widget = additional_info.shared_widgets[json.shared_widget_index];
                if (shared_widget) {
                    return shared_widget;
                }
                // otherwise create it from the JSON and store it
                json_of_shared_widget = additional_info.json_of_shared_widgets[json.shared_widget_index];
                widget_side = utilities.create_from_json(json_of_shared_widget, additional_info, true);
                // following is to deal with reconstructing cyclic references
                // but not needed anymore 
//              additional_info.shared_widgets[json.shared_widget_index] = widget_side;
                return handle_delayed_backside_widgets(widget_side, additional_info, json.shared_widget_index);
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
                widget_side = utilities.create_from_json(additional_info.json_of_shared_widgets[json_semantic.shared_widget_index], additional_info, true);
                return handle_delayed_backside_widgets(widget_side, additional_info, json_semantic.shared_widget_index);
            } else if (TT.creators_from_json[json_semantic.type]) {
                if (!additional_info) {
                    additional_info = {};
                }
                if (json_view) {
                    additional_info.json_view = json_view;
                } else {
                    json_view = additional_info.json_view;
                }
                if (TT.debugging) {
                    // much easier to debug since JQuery has plenty of caught exceptions
                    widget_side = TT.creators_from_json[json_semantic.type](json_semantic, additional_info);
                } else {
                    try {
                        widget_side = TT.creators_from_json[json_semantic.type](json_semantic, additional_info);
                    } catch (e) {
                        console.error(e.stack);
                        utilities.report_internal_error("Unable to recreate a " + json_semantic.type + ". Error is " + e); 
                    }
                }
            } else {
                utilities.report_internal_error("JSON type '" + json_semantic.type + "' not supported. Perhaps a JavaScript file implementing it is missing.");
                return;
            }
            if (widget_side && !widget_side.is_widget) {
                // is really a path not a full widget
                TT.path.process_path_json(widget_side, json, additional_info);
            }
            if (widget_side && widget_side.get_backside) {
                // widget_side may be a robot body or some other part of a widget
                if (json_semantic.erased) {
                    TT.widget.erasable(widget_side);
                    widget_side.set_erased(json_semantic.erased);
                }
                if (json_semantic.infinite_stack) {
                    widget_side.set_infinite_stack(json_semantic.infinite_stack);
                }
                if (json_semantic.open_backside_only_if_stopped) {
                    widget_side.set_open_backside_only_if_stopped(true);
                }
                if (json_view) {
                    if (json_view.frontside_width) {
                        side_element = widget_side.get_element();
                        if (side_element) {
                            if (widget_side.ok_to_set_dimensions()) {
                                // plain text elements don't need explicit width or height
                                size_css = {width:  json_view.frontside_width,
                                            height: json_view.frontside_height};
                                if (json_semantic.type === 'element') {
                                    // delay until updated
                                    widget_side.on_update_display(function () {
                                                                      utilities.set_css(side_element, size_css);
                                                                  });
                                } else {
                                    utilities.set_css(side_element, size_css);
                                }
                            }
                        } else if (!json_view.saved_width) {
                            // save the size until element is created (if this widget_side is ever viewed)
                            widget_side.saved_width =  json_view.frontside_width;
                            widget_side.saved_height = json_view.frontside_height;
                        }
                    }
                    if (json_view.saved_width) {
                        widget_side.saved_width =  json_view.saved_width;
                        widget_side.saved_height = json_view.saved_height;
                    }
                    if (json_view.backside_geometry) {
                        widget_side.backside_geometry = json_view.backside_geometry;                    
                    }
                    widget_side.json_view = json_view; // needed while loading for at least the width and height
                }
                if (json_semantic.backside_widgets) {
                    if (delay_backside_widgets) {
                        // caller will call this 
                        widget_side.finish_create_from_json_continuation = function () {
                            this.add_backside_widgets_from_json(widget_side, json_semantic.backside_widgets, additional_info);  
                        }.bind(this);
                    } else {
                        this.add_backside_widgets_from_json(widget_side, json_semantic.backside_widgets, additional_info);
                    }
                }
            }
            return widget_side;
        };

        utilities.add_backside_widgets_from_json = function (widget_side, json_semantic_backside_widgets, additional_info) {
            var backside_widgets;
            if (!json_semantic_backside_widgets) {
                return;
            }
            // the following caused elements on the back of elements to misbehave
            // they acquired the wrong owner and parent and child dragged together
            // running tests seems as if things are working without this
//             if (!widget_side.is_top_level()) {
//                 // the backside widgets need to know parent to be
//                 // since they may be called recursively maintain a stack of them
//                 if (additional_info.to_be_on_backside_of) {
//                     additional_info.to_be_on_backside_of.push(widget_side);
//                 } else {
//                     additional_info.to_be_on_backside_of = [widget_side];    
//                 }
//             }
            backside_widgets = this.create_array_from_json(json_semantic_backside_widgets, additional_info);
            widget_side.set_backside_widgets(backside_widgets, 
                                             json_semantic_backside_widgets.map(
                                                 function (json) {
                                                     if (!json || !json.widget) {
                                                         // json.widget will be undefined if json is for a backside
                                                         return json;
                                                     }
                                                     if (json.widget.shared_widget_index >= 0 && additional_info.json_of_shared_widgets[json.widget.shared_widget_index]) {
                                                         return additional_info.json_of_shared_widgets[json.widget.shared_widget_index].view;
                                                     }
                                                     return json.widget.view; 
                                                 }));
//             if (!widget_side.is_top_level()) {
//                 additional_info.to_be_on_backside_of.pop();
//             }
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
        
        utilities.get_json_of_array = function (array, json_array, index, json_history, callback, start_time) {
            var widget_side, new_callback;
            if (index >= array.length) {
                callback();
                return;
            }
            widget_side = array[index];
            if (!widget_side) {
                utilities.get_json_of_array(array, json_array, index+1, json_history, callback, start_time);
                return; 
            }
            if (widget_side.is_primary_backside && widget_side.is_primary_backside()) {
                new_callback = function (json, new_start_time) {
                    json_array.push({widget: json,
                                     is_backside: true});
                    this.get_json_of_array(array, json_array, index+1, json_history, callback, new_start_time);
                }.bind(this);
                utilities.get_json(widget_side.get_widget(), json_history, new_callback, start_time);
            } else if (widget_side.is_widget) {
                new_callback = function (json, new_start_time) {
                    json_array.push({widget: json});
                    if (index%default_batch_size === 0 &&
                         (!utilities.maximum_json_generation_duration || Date.now()-start_time > utilities.maximum_json_generation_duration)) {
                        // every so often let other processes run
                        // also this way stack size not exceeded for large arrays
                        // however if maximum_json_generation_duration is set then drag and drop needs the JSON without a timeout
                        utilities.set_timeout(function () {
                            this.get_json_of_array(array, json_array, index+1, json_history, callback, new_start_time);
                        }.bind(this));
                    } else {
                        this.get_json_of_array(array, json_array, index+1, json_history, callback, new_start_time);
                    }
                }.bind(this);
                utilities.get_json(widget_side, json_history, new_callback, start_time);
            } else {
                // isn't a widget -- e.g. is a path
                new_callback = function (json, new_start_time) {
                    json_array.push(json);
                    this.get_json_of_array(array, json_array, index+1, json_history, callback, new_start_time);
                }.bind(this);
                widget_side.get_json(json_history, new_callback, start_time);
            }
        };
        
        utilities.fresh_json_history = function (current_json_history) {
            var json_history = {widgets_encountered: [],
                                shared_widgets: [],
                                json_of_widgets_encountered: []};
            if (current_json_history && current_json_history.shared_html) {
                // fresh except for shared_html which just to avoid repeating large chunks of HTML
                json_history.shared_html = current_json_history.shared_html;
            }
            return json_history;
        };
        
        utilities.get_json_top_level = function (widget_side, callback, maximum_json_generation_duration) {
            // if maximum_json_generation_duration is exceeded then the browser will be given a chance to run (via setTimeout)
            // this breaks dataTransfer in drag and drop
            var json_history = this.fresh_json_history();
            var new_callback = function (json) {
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
                        if (widget_side === shared_widget) {
                            // top-level widget itself is shared_widget_index
                            // return shallow clone of json_of_widget since don't want to create circularity via shared_widgets
                            json_of_widget = {semantic: json_of_widget.semantic,
                                              view: json_of_widget.view,
                                              version: json_of_widget.version};
                            json.semantic = {shared_widget_index: widget_index}; 
                            return json_of_widget;
                        }
                        // start searching tree for json_of_widget with the semantic component
                        // because json might === json_of_widget
                        if (json.semantic) {
                            utilities.tree_replace_once(json.semantic, 
                                                        json_of_widget,
                                                        {shared_widget_index: widget_index},
                                                        get_json_of_widget_from_shared_widget_index,
                                                        utilities.generate_unique_id());
                         } // otherwise might be JSON for a backside - TODO: should it also be searched?                        
                         return json_of_widget;
                    });
                }
                json.shared_html = json_history.shared_html;
                callback(json);
            };
            // may need to time out several times if is short so need to store it
            utilities.maximum_json_generation_duration = maximum_json_generation_duration;
            utilities.get_json(widget_side, json_history, new_callback, Date.now());
        };
        
        utilities.get_json = function (widget_side, json_history, callback, start_time) {
            var index, widget_json, is_primary_backside, new_callback;
            if (TT.debugging && !json_history) {
                utilities.report_internal_error("no json_history");
                return;
            }
            index = json_history.shared_widgets.indexOf(widget_side);
            if (index >= 0) {
                callback({shared_widget_index: index}, start_time);
                return;
            }
            index = json_history.widgets_encountered.indexOf(widget_side);
            if (index >= 0) {
                // need to process children before ancestors when generating the final JSON
                index = utilities.insert_ancestors_last(widget_side, json_history.shared_widgets);
                callback({shared_widget_index: index}, start_time);
                return;
            }
            // need to keep track of the index rather than push json_of_widgets_encountered to keep them aligned properly
            index = json_history.widgets_encountered.push(widget_side)-1;
            is_primary_backside = widget_side.is_primary_backside && widget_side.is_primary_backside();
            if (is_primary_backside) {
                // save as widget with a flag that it is the backside
                widget_side = widget_side.get_widget();
            }
            new_callback = function (json, start_time) {
                var add_backside_widgets_callback;
                if (widget_side.add_to_json) {
                    json = widget_side.add_to_json(json, json_history);
                }
                // need to push the widget on the list before computing the backside widgets' jSON in case there is a cycle
                json_history.json_of_widgets_encountered[index] = json;
                if (widget_side.add_backside_widgets_to_json) {
                    add_backside_widgets_callback = function () {
                        callback(json, start_time);
                    };
                    widget_side.add_backside_widgets_to_json(json, json_history, add_backside_widgets_callback, start_time);
                } else {
                    callback(json, start_time);
                }
            };
            if (Date.now()-start_time <= utilities.maximum_json_generation_duration) {
                widget_side.get_json(json_history, new_callback, start_time);
            } else {
                // taking too long so let browser run
                setTimeout(function () {
                               widget_side.get_json(json_history, new_callback, Date.now());     
                           });
            }
        };

        utilities.get_json_of_keys = function (object, exceptions, callback, start_time) {
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
                        var key_callback = function (json_key, start_time) {
                            json[key] = {json: json_key};
                        };
                        object[key].get_json(undefined, key_callback, start_time);
                    } else {
                        json[key] = object[key];
                    }
                }
            });
            callback(json, start_time);
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
                        return true;
                    }
            }.bind(this));
            return false;            
        };

        utilities.insert_ancestors_last = function (widget_side, array_of_widgets) {
            // inserts widget before any of its ancestors into the array
            // returns the index of the widget
            var widget = widget_side.get_widget();
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

        utilities.toontalk_json_div = function (json, widget_side) {
            // convenience for dragging into documents (e.g. Word or WordPad -- not sure what else)
            // also for publishing to the cloud
            var widget = widget_side.get_widget();
            var backside_widgets = widget.get_backside_widgets();
            var type_description = widget.get_type_name();
            var title = widget.toString({for_json_div: true});
            var data_image_start, data_image_end;
            if (type_description === 'top-level') {
                if (widget_side.is_backside()) {
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
                        type_description += utilities.describe_widgets(backside_widgets);
                    }
                } else {
                    type_description = "a top-level widget";
                }
            } else {
                type_description = utilities.add_a_or_an(type_description);
                if (widget_side.is_backside()) {
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

    utilities.describe_widgets = function (widget_array) {
        var description = "";
        var widgets_left = widget_array.length;
        widget_array.forEach(function (widget_side) {
                                 widgets_left--;
                                 description += utilities.add_a_or_an(widget_side.get_type_name());
                                 if (widgets_left === 1) {
                                     description += ", and ";
                                 } else if (widgets_left > 1) {
                                     description += ", ";
                                 }
                             });
        return description;
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

    utilities.strip_trailling_digits = function (s) {
        var last_character;
        if (s.length === 0) {
            return s;
        }
        last_character = s[s.length-1];
        if (last_character >= '0' && last_character <= '9') {
            return utilities.strip_trailling_digits(s.substring(0, s.length-2));
        }
        return s;
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
                var widget, origin;
                if (!type) {
                    origin = window.location.protocol + "//" + window.location.hostname + (window.location.port ? ':' + window.location.port: '');
                    if (url.indexOf(origin) === 0) {
                        // will fall through to iframe which should work since same origin
                        type = "";
                    } else {
                        // if different origin likely to get blocked by browser's same origin policy and permission to include in iframes
                        if (error_callback) {
                            error_callback("Could not determine the contents type of the url");
                        }
                        request.removeEventListener('readystatechange', response_handler);
                        return;
                    }
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
                   // tried listening to load event and trying to catch errors but still can't tell apart iframes that are allowed and those not                   
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
            var value;
            if (element.currentStyle) {
                return element.currentStyle[style_property];
            } 
            if (window.getComputedStyle) {
                if (element.parentElement) {
                    return document.defaultView.getComputedStyle(element, null).getPropertyValue(style_property);
                }
                // for example, may have just been dropped so not yet attached
                // so attach, get property value, and then unattach 
                document.body.appendChild(element);
                value = document.defaultView.getComputedStyle(element, null).getPropertyValue(style_property);
                document.body.removeChild(element);
                return value;
            }
        };

        utilities.get_style_numeric_property = function (element, style_property) {
            var as_string = this.get_style_property(element, style_property);
            var index, numeric_value;
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
                numeric_value = parseFloat(as_string, 10);
                if (isNaN(numeric_value)) {
                    // return undefined
                    return;
                }
                return numeric_value;
            }
            return as_string;
        };

        // following provide the correct dimensions even if the element has been scaled by a transform
        // note that for CSS purposes this isn't what is needed since the transform should be part of the CSS

        utilities.get_element_width = function (element) {
            if (!element) {
                return 0;
            }
            return element.getBoundingClientRect().width;
        };

        utilities.get_element_height = function (element) {
            if (!element) {
                return 0;
            }
            return element.getBoundingClientRect().height;
        };
        
        utilities.data_transfer_json_object = function (event) {
            var data, json_string, json, element;
            if (!event.dataTransfer) {
                // not really an error -- could be a drag of an image into ToonTalk
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
            json_string = extract_json_from_div_string(data);
            if (json_string) {
                try {
                    return JSON.parse(json_string);
                } catch (exception) {
                    utilities.report_internal_error("Exception parsing " + json_string + "\n" + exception.toString());
                }
            }
            // treat the data as rich text (HTML) or a plain text element
            element = TT.element.create("");
            element.get_frontside_element(true);
            if (data && data[0] === '<') {
                element.set_HTML(data);
            } else {
                element.set_text(data);
            }
            element.get_json(utilities.fresh_json_history(), 
                             function (element_json, start_time, json_history) {
                                 if (element_json.html.shared_html_index >= 0) {
                                     // replace shared HTML index with HTML
                                     element_json.html = json_history.shared_html[element_json.html.shared_html_index];
                                 }
                                 json = element_json;
                             });
            return json;
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
            drop_area.appendChild(drop_area_instructions);
            utilities.can_receive_drops(drop_area);
            return drop_area;
        };
   
        utilities.process_json_elements = function ($elements, index) {
            // because retrieve_object is treated as asychronous need to make each element wait for a response_handler
            var element, json_string, json, widget, frontside_element, backside_element, backside,
                message, toontalk_last_key, process_widget_callback, key_callback;
            if (!$elements) {
                $elements = $(".toontalk-json");
                index = 0;
            }
            if ($elements.length === 0) {
                return;
            }
            process_widget_callback = function () {
                if (widget) {
                    element.textContent = ""; // served its purpose of being parsed as JSON
                    // may have been been display:none while loading so looks better while loading
                    $(element).css({display: ''});
                    if (!widget.get_type_name) {
                        // isn't a widget. e.g. a tool
                        element.appendChild(widget.get_element());
                    } else if (widget.is_top_level()) {
                        backside = widget.get_backside(true);
                        backside_element = backside.get_element();
                        $(element).replaceWith(backside_element);
                        // use JQuery css directly rather than set_css since that does processing
                        // of plain text widgets appropriate only for frontside
                        $(backside_element).css({width:  widget.json_view ? widget.json_view.backside_width  : json.view.backside_width,
                                                 height: widget.json_view ? widget.json_view.backside_height : json.view.backside_height,
                                                 // color may be undefined
                                                 // do the following in a more general manner
                                                 // perhaps using additional classes?
                                                 "background-color": json.view.background_color,
                                                 "border-width":     json.view.border_width});
                        widget.json_view = undefined; // not needed anymore
                   } else {
                       // TODO: determine why both levels have the same class here
                       $(element).addClass("toontalk-top-level-resource toontalk-top-level-resource-container");
                       frontside_element = widget.get_frontside_element(true);
                       if (frontside_element) {
                           $(frontside_element).addClass("toontalk-top-level-resource")
                                                .css({position: 'relative', // should this be part of the CSS instead?
                                                      width:  widget.saved_width,
                                                      height: widget.saved_height});
                            element.toontalk_widget_side = widget;
                            element.appendChild(frontside_element);
                        }
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
                if (index < $elements.length-1) {
                    utilities.process_json_elements($elements, index+1);
                }
            };
            element = $elements.get(index);
            json_string = element.textContent;
            if (!json_string) {
                return;
            }
            json_string = json_string.substring(json_string.indexOf("{"), json_string.lastIndexOf("}")+1);
            json = JSON.parse(json_string);
            if (json.semantic && 
                json.semantic.type === 'top_level' &&
                !TT.no_local_storage &&
                !TT.reset && // if reset=1 then just use the JSON on the page itself
                json.load_most_recent_program) {
                // perhaps local storage will be used instead of the current json
               try {
                    key_callback = function (toontalk_last_key) {    
                                       if (toontalk_last_key) {
                                           utilities.retrieve_object(toontalk_last_key,
                                                                     function (json_from_storage) {
                                                                         if (json_from_storage) {
                                                                             // create the top-level widget with the additional info stored here:
                                                                             // json is a closure variable that is updated here
                                                                             json = json_from_storage;
                                                                             widget = utilities.create_from_json(json);
                                                                             process_widget_callback();
                                                                         }
                                                                      });
                                        } else {
                                            widget = utilities.create_from_json(json);
                                            process_widget_callback();
                                        }                            
                                   };
                    utilities.retrieve_string('toontalk-last-key', key_callback);
               } catch (error) {
                    message = "Error reading previous state. Error message is " + error;
                    if (utilities.is_internet_explorer()) {
                        // TODO: determine what the problem is with IE11 and local storage
                        console.error("window.localStorage in IE11 not available with file://...: " + message);
                    } else {
                        utilities.display_message(message);
                    }
                }
            } else {
                widget = utilities.create_from_json(json);
                process_widget_callback()
            }
        };

        utilities.relative_position_from_absolute_position = function (element, absolute_position) {
            var ancestor = element.parentElement;
            var left = absolute_position.left;
            var top  = absolute_position.top;
            var ancestor_position;
            while (ancestor && ancestor.nodeType !== "html") {
                ancestor_position = $(ancestor).position();
                left -= ancestor_position.left;
                top  -= ancestor_position.top;
                ancestor = ancestor.parentElement;
            }
            return {left: left,
                    top:  top};
        };
        
        utilities.set_absolute_position = function (element, absolute_position) {
            var relative_position = utilities.relative_position_from_absolute_position(element, absolute_position);
            utilities.set_css(element,
                              {left: relative_position.left,
                               top:  relative_position.top,
                               position: "absolute"});
            if ($(element).is(".toontalk-side-animating")) {
                // animation doesn't work with JQuery css
                element.style.left = relative_position.left + "px";
                element.style.top  = relative_position.top  + "px";
            }
        };
        
        utilities.set_position_relative_to_top_level_backside = function ($element, absolute_position, stay_inside_parent) {
            return this.set_position_relative_to_element($element, $element.closest(".toontalk-backside-of-top-level"), absolute_position, stay_inside_parent);
        };

        utilities.set_position_relative_to_element = function ($element, $parent_element, absolute_position, stay_inside_parent) {
            var parent_position = $parent_element.offset();
            var left, top, element_width, element_height, parent_element_width, parent_element_height, css;
            // make sure element is a child of parent_element
            $parent_element.get(0).appendChild($element.get(0));
            if (!parent_position) {
                parent_position = {left: 0, top: 0};
            }
            left = absolute_position.left-parent_position.left;
            top  = absolute_position.top -parent_position.top;
            if (stay_inside_parent) {
                element_width         = TT.UTILITIES.get_element_width ($element.get(0));
                element_height        = TT.UTILITIES.get_element_height($element.get(0));
                parent_element_width  = TT.UTILITIES.get_element_width ($parent_element.get(0));
                parent_element_height = TT.UTILITIES.get_element_height($parent_element.get(0));
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
            left = utilities.scale_left(left, $parent_element.get(0))
            top  = utilities.scale_top (top,  $parent_element.get(0));
            css = {left: left,
                   top:  top,
                   position: "absolute"};
            if ($element.is(".toontalk-side-animating")) {
                // animation doesn't work with JQuery css
                $element.get(0).style.left = left+"px";
                $element.get(0).style.top  = top +"px";
                // remove animating CSS when transition is over
                utilities.add_one_shot_event_handler($element.get(0), "transitionend", 2000, function () {
                    $element.removeClass("toontalk-side-animating");
                    $element.get(0).style.transitionDuration = '';
                });
            } else {    
                utilities.set_css($element, css);
            }
            return css;
        };
        
        utilities.restore_resource = function ($dropped, dropped_widget_side) {
            // does it makes sense to have backside resources?
            var dropped_copy, dropped_element_copy;
            if ($dropped && $dropped.is(".toontalk-top-level-resource")) {
                // restore original
                dropped_copy = utilities.get_resource_copy() || dropped_widget_side.copy({fresh_copy: true}); // nest copies should be fresh - not linked
                dropped_element_copy = dropped_copy.get_frontside_element(true);
                $dropped.parent().removeClass("toontalk-top-level-resource toontalk-top-level-resource-container");
                $dropped.removeClass("toontalk-top-level-resource toontalk-top-level-resource-container");
                // elements are relative only when outside of ToonTalk (e.g. a resource on the page)
                $(dropped_element_copy).addClass("toontalk-top-level-resource toontalk-top-level-resource-container")
                                       .css({position: 'relative'});
                $dropped.css({position: 'absolute'});
                utilities.set_css(dropped_element_copy,
                                  {width:  $dropped.width(),
                                   height: $dropped.height()});
                $dropped.get(0).parentElement.appendChild(dropped_element_copy);
                TT.DISPLAY_UPDATES.pending_update(dropped_copy);
                if (dropped_widget_side.set_active) {
                    dropped_widget_side.set_active(true);
                    dropped_copy.set_active(false);
                }
            }
        };

        utilities.closest_element = function ($elements, location) {
            var element_offset, least_distance, closest, best_so_far;
            if (!location) {
                return $elements.get(0); // any will do
            }
            least_distance = Number.MAX_VALUE;
            $elements.each(function (index, backside_element) {
                               var offset = $(backside_element).offset();
                               var distance = TT.UTILITIES.distance(offset, location);
                               if (least_distance > distance) {
                                   best_so_far = backside_element;
                                   least_distance = distance;
                               }
                          });
            return best_so_far;
        };
        
        utilities.find_resource_equal_to_widget = function (widget, closest_to_this_widget) {
            var least_distance = Number.MAX_VALUE;
            var widget_offset = $(closest_to_this_widget.get_frontside_element()).offset();
            var best_so_far;
            // toontalk-top-level-resource is used for a DIV and its child -- TODO rationalise this
            // here only consider the child ones
            $(".toontalk-top-level-resource.toontalk-side").each(function (index, element) {
                var owner = utilities.widget_side_of_jquery($(element));
                var distance;
                if (owner && ((widget.equals && widget.equals(owner)) ||
                              (widget.matching_resource && widget.matching_resource(owner)) ||
                              // check type name equality since don't want class and sub-class to match (e.g. nest and sensor nest)
                              ((widget.get_type_name() === owner.get_type_name()) && widget.match(owner) === 'matched'))) {
                    if (widget.is_hole() ||
                        owner.get_backside_widgets().length === widget.get_backside_widgets().length) {
                        // TODO: make sure the backside widgets are equivalent...
                        distance = utilities.distance($(element).offset(), widget_offset);
                        if (least_distance > distance) {
                            best_so_far = element;
                            least_distance = distance;
                        }                        
                    }
                }
            });
            return best_so_far;
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

        utilities.left_as_percent = function (left, element, parent_element) {
            var parent_rectangle;
            if (!parent_element && element) {
                parent_element = element.parentElement;
            }
            if (!element || !parent_element) {
                return left;
            }
            parent_rectangle = parent_element.getBoundingClientRect();
            if (left === 'auto' || isNaN(left)) {
                // typically is auto on IE11
                left = $(element).offset().left;
            } else {
                left = utilities.adjust_left_if_scaled(left, element);
            }
            return 100*($(parent_element).offset().left-window.pageXOffset+left-parent_rectangle.left)/parent_rectangle.width + "%";
        };

        utilities.top_as_percent = function (top, element, parent_element) {
            var parent_rectangle;
            if (!parent_element && element) {
                parent_element = element.parentElement;
            }
            if (!element || !parent_element) {
                return top;
            }
            parent_rectangle = parent_element.getBoundingClientRect();
             if (top === 'auto' || isNaN(top)) {
                // typically is auto on IE11
                top = $(element).offset().top;
            } else {
                top = utilities.adjust_top_if_scaled(top, element);
            }
            return 100*($(parent_element).offset().top+-window.pageYOffset+top-parent_rectangle.top)/parent_rectangle.height + "%";
        };

        utilities.adjust_left_if_scaled = function (left, element) {
            var widget = utilities.widget_side_of_element(element);
            var original_width;
            if (widget && widget.get_original_width) {
                original_width = widget.get_original_width();
                if (original_width && widget.get_attribute) {
                    return left-(original_width-widget.get_attribute('width'))/2;
                }
            }
            return left;
        };

        utilities.adjust_top_if_scaled = function (top, element) {
            var widget = utilities.widget_side_of_element(element);
            var original_height;
            if (widget && widget.get_original_height) {
                original_height = widget.get_original_height();
                if (original_height && widget.get_attribute) {
                    return top-(original_height-widget.get_attribute('height'))/2;
                }
            }
            return top;
        };

        utilities.scale_left = function (left, element) {
            var widget = utilities.widget_side_of_element(element);
            var original_width;
            if (widget && widget.get_original_width) {
                original_width = widget.get_original_width();
                if (original_width && widget.get_attribute) {
                    return left*original_width/widget.get_attribute('width');
                }
            }
            return left;
        };

        utilities.scale_top = function (top, element) {
            var widget = utilities.widget_side_of_element(element);
            var original_height;
            if (widget && widget.get_original_height) {
                original_height = widget.get_original_height();
                if (original_height && widget.get_attribute) {
                    return top*original_height/widget.get_attribute('height');
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
                case 11:
                return "eleventh";
                case 12:
                return "twelfth";
                case 13:
                return "thirteenth";
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
            if (!element) {
                return;
            }
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
                          var tooltip = ui.tooltip.get(0);
                          var text = tooltip.textContent;
                          var default_capacity = 100;
                          var is_robot = $(element).is(".toontalk-robot");
                          var new_width, position, when_speaking_finished;
                          if (text === element.toontalk_previous_text) {
                              // already said and/or displayed this
                              ui.tooltip.remove();
                              if (TT.speak) {
                                  window.speechSynthesis.cancel();
                              }
                              return;
                          }
                          tooltip.innerHTML = process_encoded_HTML(text, decodeURIComponent); 
                          if (TT.speak) {
                              // first cancel any old speech
                              window.speechSynthesis.cancel();
                              if (!is_robot) {
                                  // prevent repeating the same text for the same element - except robots which have complex generated titles
                                  when_speaking_finished = function (event) {
                                      // this should be triggered only if the utterance was completed but it seems some browsers trigger it earlier
                                      // consequently partial utterances won't be repeated
                                      // should use charIndex to determine how much was said and maybe use onboundary (when it works) to highlight text
                                      if (tooltip === element_displaying_tooltip || element_displaying_tooltip === undefined) {
                                          // if switched to another widget don't consider this spoken
                                          element.toontalk_previous_text = text;
                                      }
                                  };
                              }    
                              utilities.speak(tooltip.innerText, {when_finished: when_speaking_finished});
                          }
                          if (element_displaying_tooltip) {
                              // remove old tool tip
                              $(element_displaying_tooltip).remove();
                          }
                          element_displaying_tooltip = tooltip;
                          if (!TT.balloons) {
                              // if no balloons remove tool tip
                              ui.tooltip.remove();
                              return;
                          }
                          // width is 340 by default but if more than fits then make wider
                          if (text.length > default_capacity) {
                              new_width = Math.min(800, maximum_width_if_moved || $(window).width()-100);
                              position = $(tooltip).position();
                              // //width: (340 + 340*(text.length-default_capacity)/default_capacity),
                              ui.tooltip.css({maxWidth: new_width});
                          }
                          // higher than a select menu which is one elss 9
                          ui.tooltip.css({"z-index": 99999999});
                          // if tooltip is referring to an iframe than remove its drag bar
                          ui.tooltip.find(".toontalk-iframe-container").removeClass("toontalk-iframe-container");
                          // need to add the arrow here since the replacing of the innerHTML above removed the arrow
                          // when it was added earlier
                          // TODO: position it better
                          // until it is positioned reliably better to not have it
//                           $("<div>").addClass("toontalk-arrow")
//                                     .addClass(feedback_vertical)
//                                     .addClass(feedback_horizontal)
//                                     .appendTo(ui.tooltip);
    //                       if (height_adjustment) {
    //                           $(ui.tooltip).css({maxHeight: $(ui.tooltip).height()+height_adjustment/2});
    //                       }
                          // auto hide after duration proportional to text.length
                          // TODO: if longer than fits on the screen then autoscroll after some time
                          setTimeout(function () {
                                         if (!is_robot) {
                                             element.toontalk_previous_text = text;
                                         }
                                         ui.tooltip.remove();
                                         // see http://bugs.jqueryui.com/ticket/10689
                                         if ($(tooltip).data('ui-tooltip')) {
                                             // destroy it if it has been intialized and not already destroyed elsewhere
                                             // see http://stackoverflow.com/questions/18833609/testing-if-jquery-tooltip-is-initialized
                                             $(tooltip).tooltip('destroy');
                                             // ui-helper-hidden-accessible elements were added by tooltip for accessibility but tooltip is being closed now
                                             $(".ui-helper-hidden-accessible").remove();
                                             utilities.use_custom_tooltip(element);
                                         }
                                         element_displaying_tooltip = undefined;
                                     }, 
                                     text.length*(TT.MAXIMUM_TOOLTIP_DURATION_PER_CHARACTER || 100));
                      },
               close: function () {
                          if ($(this).data('ui-tooltip')) {
                              $(this).tooltip('destroy');
                              // ui-helper-hidden-accessible elements were added by tooltip for accessibility but tooltip is being closed now
                              $("[role='log']").remove();
                              utilities.use_custom_tooltip(element);
                          }
                          element_displaying_tooltip = undefined;
               }});
        };

        utilities.speak = function (text, options) {
            // options include when_finished, volume, pitch, rate, voice_number, no_translation
            var speech_utterance = new SpeechSynthesisUtterance(text);
            var voices = window.speechSynthesis.getVoices();
            var maximum_length = 200; // not sure what a good value is
            var break_into_short_segments = function (text) {
                var segments = [];
                var break_text = function (text) {
                    var segment, index;
                    if (text.length < maximum_length) {
                        return text.length+1;
                    }
                    segment = text.substring(0, maximum_length);
                    index = segment.lastIndexOf(". ") || segment.lastIndexOf(".\n");
                    if (index > 0) {
                        return index+2;
                    }
                    index = segment.lastIndexOf(".");
                    if (index === segment.length-1) {
                        // final period need not have space after it
                        return index+1;
                    }
                    index = segment.lastIndexOf(", ");
                    if (index > 0) {
                        return index+2;
                    }
                    index = segment.lastIndexOf(" ");
                    if (index > 0) {
                        return index+1;
                    }
                    // give up - no periods, commas, or spaces
                    return Math.min(text.length+1, maximum_length);
                };
                var best_break;
                while (text.length > 0) {
                    best_break = break_text(text);
                    if (best_break > 1) {
                        segments.push(text.substring(0, best_break-1));
                    }
                    text = text.substring(best_break);
                }
                return segments;
            };
            var language_code, segments, speech_utterance_index;
            if (!toontalk_initialized) {
                return;
            }
            if (!options) {
                options = {};
            }
            if (voices.length === 0) {
                // not yet loaded -- see https://bugs.chromium.org/p/chromium/issues/detail?id=334847
                window.speechSynthesis.onvoiceschanged = function () {
                                                             utilities.speak(text, options);
                                                             window.speechSynthesis.onvoiceschanged = undefined;
                                                         };
                return;
            }
            if (utilities.translate && !options.no_translation) {
                // default is to translate if translation enabled
                utilities.translate(text, function (translated_text) {
                                              options.no_translation = true;
                                              utilities.speak(translated_text, options);
                });
                return;
            }
            // if the text is too long it needs to be broken into pieces
            // see http://stackoverflow.com/questions/21947730/chrome-speech-synthesis-with-longer-texts
            if (text.length > maximum_length) {
                segments = break_into_short_segments(text);
                segments.forEach(function (segment, index) {
                    if (index === 0) {
                        // add a dummy callback that will cause a warning if it takes too long
                        options.when_finished = function () {};
                    }
                    utilities.speak(segment, options);
                });
                return;
            }
            speech_utterance_index = speech_utterances.push(speech_utterance)-1;
            // TT.volume is used for speech and sound effects and speech is quieter so triple its volume
            speech_utterance.volume = options.volume === undefined ? Math.min(1, 3*TT.volume) : options.volume;
            speech_utterance.pitch  = options.pitch  === undefined ? 1.2 : options.pitch; // higher value to sound more like a child -- should really be parameter
            speech_utterance.rate   = options.rate   === undefined ? .75 : options.rate; // slow it down for kids
            language_code = utilities.translation_language_code();
            voices.some(function (voice) {
                if (voice.lang.indexOf(language_code) === 0) {
                    // might be 'es' while voice.lang will be 'es-ES'
                    // first one is good enough
                    speech_utterance.lang = voice.lang;
                    speech_utterance.voice = voice;
                    if (options.voice_number === 0 || options.voice_number === undefined) {
                        return true;
                    }
                    // note that if voice number is greater than the number of matching voices the last one found is used
                    options.voice_number--;
                }
            });
            // if language_code's format is name-country and nothing found could try again with just the language name
            if (options.when_finished) {
                speech_utterance.onend = function () {
                    speech_utterances.splice(speech_utterance_index, 1);
                    options.when_finished();
                    speech_utterance.onend = undefined;
                };
                setTimeout(function () {
                               if (speech_utterance.onend && !window.speechSynthesis.speaking) {
                                   // still hasn't run
                                   utilities.display_message("Browser did not begin speaking after waiting 20 seconds. Continuing as if speech occurred.");
                                   speech_utterance.onend();
                               }
                           },
                           20000);
            }
            window.speechSynthesis.speak(speech_utterance);
        };

        utilities.translation_language_code = function () {
            if (TT.TRANSLATION_ENABLED && google && google.translate && google.translate.TranslateElement) {
                // c seems to be the result of minification so new versions may have a different key - not clear how to avoid this problem
               return google.translate.TranslateElement().c;
            } else {
                return navigator.language;
            }
        };

        utilities.encode_HTML_for_title = function (html) {
            return encodeURIComponent("<span class='notranslate' translate='no'>decodeURIComponent" + html + "decodeURIComponent</span>"); 
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
            if (duration === 0 || speed === 0) {
                utilities.set_absolute_position(source_element, target_absolute_position);
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
            if (document.hidden) {
                duration = 0;
            }
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
                widget = utilities.widget_side_of_element(element);
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
            var container_height, percent;
            if (container_width === 0) {
                return;
            }
            container_height = $(container_element).height();
            if (typeof css.left === 'number') {
                // css is relative to element
                css.left = Math.min(Math.max(css.left, 0), container_width);
            } else {
                percent = utilities.extract_percentage_from_string(css.left);
                if (typeof percent === 'number') {
                    css.left = Math.min(100, Math.max(percent, 0)) + "%";
                }
            }
            if (typeof css.top === 'number') {
                css.top  = Math.min(Math.max(css.top,  0), container_height);
            } else {
                percent = utilities.extract_percentage_from_string(css.top);
                if (typeof percent === 'number') {
                    css.top = Math.min(100, Math.max(percent, 0)) + "%";
                }
            }
        };

        utilities.extract_percentage_from_string = function (s) {
            // returns the percent as a number from a string like 2.5% or undefined if not possible.
            try {
                if (typeof s === 'string' && s[s.length-1] === '%') {
                    return parseFloat(s.substring(0, s.length-1));
                }
            } catch (e) {
                return;
            }
        };
        
        utilities.next_z_index = function () {
            z_index++;
            return z_index;
        };

        utilities.create_button = function (label, class_name, title, click_handler) {
            var $button = $("<button>" + label + "</button>").button();
            $button.addClass(class_name + " toontalk-button");
            $button.get(0).addEventListener('click', click_handler);
            utilities.give_tooltip($button.get(0), title);
            return $button.get(0);
        };
                
        utilities.create_close_button = function (handler, title) {
            var close_button = document.createElement("div");
            var x = document.createElement("div");
            $(close_button).addClass("toontalk-close-button toontalk-button");
            close_button.addEventListener('click', handler);
            utilities.give_tooltip(close_button, title);
            x.innerHTML = "&times;";
            close_button.appendChild(x);
            return close_button;
        };
        
        utilities.check_radio_button = function (button_elements) {
            var $table = $(button_elements.button).closest(".ui-buttonset");
            if ($table.length > 0) {
                // un-highlight all before setting one
                $table.find(".ui-state-active").removeClass("ui-state-active")
                                               .prop("checked", false);
            };
            $(button_elements.button).prop("checked", true);
            $(button_elements.label).addClass('ui-state-active');
        };
        
//         utilities.create_button_set = function () { 
//             // takes any number of parameters, any of which can be an array of buttons
//             var container = document.createElement("div");
//             var i, j;
//             // arguments isn't an ordinary array so can't use forEach
//             for (i = 0; i < arguments.length; i++) {
//                 if (arguments[i].length >= 0) {
//                     for (j = 0; j < arguments[i].length; j++) {
//                         container.appendChild(arguments[i][j]);
//                     }
//                 } else { 
//                     container.appendChild(arguments[i]);
//                 }
//             }
//             $(container).buttonset();
//             return container;
//         };

        utilities.create_alert_element = function (text) {
            var alert_element = utilities.create_text_element(text);
            $(alert_element).addClass("toontalk-alert-element");
            return alert_element;
        };
        
        utilities.create_text_element = function (text, extra_classes) {
            var div = document.createElement("div");
            div.innerHTML = text;
            $(div).addClass('ui-widget');
            if (extra_classes) {
                $(div).addClass(extra_classes);
            }
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
                    $(documentation_anchor).addClass("toontalk-help-button toontalk-button notranslate");
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
        
        utilities.create_text_area = function (value, class_name, label, title, drop_handler, type, place_label_above) {
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
            if (place_label_above) {
                container = utilities.create_vertical_table(  label_element, text_area);
            } else {
                container = utilities.create_horizontal_table(label_element, text_area);
            }
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
            var dropped, new_text;
            event.preventDefault();
            dropped = get_dropped_widget(event);
            if (dropped) {
                if (dropped.is_backside()) {
                    return;
                }
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
        
        utilities.create_radio_button = function (name, value, class_name, label, title, part_of_buttonset) {
            var container = document.createElement("div");
            var input = document.createElement("input");
            var label_element = document.createElement("label");
            input.type = "radio";
            container.className = class_name + " toontalk-button";
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
            if (!part_of_buttonset) {
                // if part_of_buttonset then no need to call button();
                $(input).button();
            }
            utilities.use_custom_tooltip(input);
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
                }
                select.appendChild(option);
            });
            $(select).selectmenu({width: "50%",
                                  open: function () {
                                      // was ending up under the top-level and this backside without explicitly setting the z index
                                      $(".ui-selectmenu-open").css({"z-index": 9999999});
                                      setTimeout(function () {
                                         $(".ui-selectmenu-open").find(".ui-menu-item").each(
                                            function (index, element) {
                                                var menu_index;
                                                // tooltips were lost so this restores them
                                                if (item_titles) {
                                                    menu_index = items.indexOf(element.textContent);
                                                    if (menu_index >= 0 && item_titles[menu_index]) {
                                                        utilities.give_tooltip(element, item_titles[menu_index]);
                                                    }
                                                }
                                         }); 
                                      });                                                             
                                  }});
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
            input.className = class_name + " toontalk-button";
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
                if (arguments[i]) {
                    row.appendChild(arguments[i]);
                }
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
            var i;
            for (i = 0; i < arguments.length; i++) {
                if ($(arguments[i].label).is(".ui-state-focus")) {
                    return arguments[i];
                }
            }
            return;
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

        utilities.add_iframe_popup = function (url) {
            var frame = document.createElement("iframe");
            var close_button = document.createElement('div');
            $(close_button).addClass("toontalk-close-popup-frame-button")
                           .button();
            close_button.addEventListener('click',
                                          function (event) {
                                              $(frame).remove();
                                              $(close_button).remove();
                                              event.stopPropagation();
                                          });
            close_button.innerHTML = "Return to ToonTalk";   
            $(frame).addClass("toontalk-popup-frame");
            frame.src = url;
            document.body.appendChild(close_button);
            document.body.appendChild(frame);
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
                                                // is just an ordinary link now
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

        utilities.get_local_files_data = function (callback) {
            utilities.get_all_locally_stored_program_names(function (all_program_names) {
                var meta_data_of_each_program = [];
                var get_meta_data_of_program = function (index) {
                    var program_name = all_program_names[index];
                    utilities.get_local_storage_meta_data(program_name, 
                                                          function (meta_data) {
                                                              if (meta_data) {
                                                                  meta_data_of_each_program.push({title: program_name,
                                                                                                  modifiedDate: meta_data.last_modified,
                                                                                                  createdDate:  meta_data.created,
                                                                                                  fileSize:     meta_data.file_size});
                                                               }
                                                               if (index < all_program_names.length) {
                                                                   get_meta_data_of_program(index+1);
                                                               } else {
                                                                   callback(meta_data_of_each_program);
                                                               }});
                };
                get_meta_data_of_program(0);                                         
            });   
        };

        utilities.create_local_files_table = function (callback) {
            utilities.get_local_files_data(function (data) {
                var table = utilities.create_file_data_table();
                utilities.when_attached(table, 
                                        function () {
                                            utilities.become_file_data_table(table, data, false, "toontalk-file-load-button toontalk-file-load-button-without-click-handler");
                                        });
                callback(table);
            });
        };
        
        utilities.get_$dragee = function () {
            return $dragee;
        };

        utilities.get_dragee = function () {
            return $dragee && TT.UTILITIES.widget_side_of_jquery($dragee);
        };

        utilities.get_resource_copy = function () {
            return resource_copy;
        };

        utilities.get_dragee_copy = function () {
            if (dragee_copy) {
                return dragee_copy;
            }
            var dragee = utilities.get_dragee();
            if (dragee && !dragee.is_backside() && (dragee.get_infinite_stack() || $dragee.is(".toontalk-top-level-resource"))) {
                if (!dragee_copy) {
                    if ($dragee.is(".toontalk-top-level-resource")) {
                        dragee_copy = dragee;
                        resource_copy = dragee.copy({fresh_copy: true});
                    } else {
                        // by copying this when it is altered then the original (the 'infinite stack') isn't altered just its copy
                        // add it off screen so that can display it in speech feedback messages
                        dragee_copy = dragee.add_copy_to_container(undefined, -1000, -1000);
                    }
                }
                return dragee_copy;
            }
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

        utilities.each_top_level_widget = function (callback) {
            $(".toontalk-backside-of-top-level").each(function (index, element) {
                callback(utilities.widget_side_of_element(element).get_widget());
            });
        };

        utilities.backup_all_top_level_widgets = function (immediately) {
            utilities.each_top_level_widget(function (top_level_widget) {
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
                                              widget.robot_in_training().resized_widget(widget, previous_width, previous_height, ui.size.width, ui.size.height);
                                          }
                                },
                               // the corner handles looked bad on element widgets
                               // and generally got in the way
                               handles: "n,e,s,w"
                               });
        };
        
        utilities.match = function (pattern, widget) {
            var match_status;
            if (pattern === undefined) {
                return "matched";
            };
            widget = widget.dereference(); // e.g. widget on top of nest
            match_status = pattern.match(widget);
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

        utilities.scale_element = function (element, new_width, new_height, original_width, original_height, other_transforms, pending_css, original_parent, no_need_to_translate) {
            var update_css = function () {
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
                    no_need_to_translate = true;
                }
                if (typeof pending_css.top === 'number') {
                    pending_css.top -= (original_height-new_height)/2;
                    no_need_to_translate = true;
                }
                if (!no_need_to_translate && transform_origin_center) {
                    if (new_width) {
                        element.toontalk_translate_x = (new_width-original_width)/2;
                        translate += "translateX(" + element.toontalk_translate_x + "px) ";
                    }
                    if (new_height) {
                        element.toontalk_translate_y = (new_height-original_height)/2;
                        translate += "translateY(" + element.toontalk_translate_y + "px) ";
                    }
                } else {
                    // might have changed parent and old translation no longer in effect
                    element.toontalk_translate_x = undefined;
                    element.toontalk_translate_y = undefined;
                }
                utilities.add_transform_to_css((other_transforms || "") + " scale(" + x_scale + ", " + y_scale + ")",
                                               translate,
                                               pending_css,
                                               transform_origin_center);  
                pending_css.width  = original_width,
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
            var widget, x_scale, y_scale, $image;
            if ($(element).is(".toontalk-not-observable")) {
                // this happens on FireFox where this is called before the widget has been "rendered"
                widget = TT.UTILITIES.widget_side_of_element(element);
                if (widget) {
                    widget.render();
                }
            }
            if (!original_width) {
                $image = $(element).children("img");
                if ($image.is("*")) {
                    original_width = $image.width();
                } else {
                    original_width = $(element).width();
                }
            }
            if (!original_height) {
                if (!$image) {
                     $image = $(element).children("img");
                }
                if ($image.is("*")) {
                    original_height = $image.height();
                } else {
                    original_height = $(element).height();
                }
            }
            if (new_width && original_width !== 0) {
                x_scale = new_width/original_width;
            } else {
                x_scale =  element.toontalk_x_scale || 1;
            }
            if (new_height && original_height !== 0) {
                y_scale = new_height/original_height;
            } else {
                y_scale =  element.toontalk_y_scale || 1;
            }
            // e.g. new_width was 0
            if (x_scale === 0) {
                x_scale = 1;
            }
            if (y_scale === 0) {
                y_scale = 1;
            }
            element.toontalk_x_scale = x_scale;
            element.toontalk_y_scale = y_scale;
            update_css();
            return {x_scale: x_scale,
                    y_scale: y_scale};
        };

        utilities.translate_x = function (element) {
            return translate('toontalk_translate_x', 'toontalk_x_scale'); 
        };

        utilities.translate_y = function (element) {
            return translate('toontalk_translate_y', 'toontalk_y_scale'); 
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
                               if (width && height) {
                                   if (not_in_a_hole(element.parentElement)) {
                                       $(element).removeClass("toontalk-not-observable");
                                       callback(original_parent);
                                       if (original_parent) {
                                           original_parent.appendChild(element);
                                       } else if (element.parentElement === document.body) {
                                           $(element).remove();
                                       }    
                                   } else {
                                       // try again -- probably because in the meanwhile this has been
                                       // added to some container and its dimensions aren't original
                                       utilities.run_when_dimensions_known(element, callback, true);
                                   }
                               } else {
                                   setTimeout(function () {
                                                  // still not known so wait twice as long and try again
                                                  var widget = utilities.widget_side_of_element(element);
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
            // toontalk-not-observable still needs to be rendered since how else could its dimensions be comput4ed
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

// tried to use mutation observers but could only get it partially working
//         utilities.run_when_dimensions_known = function (element, callback, recompute) {
//             var original_parent = element.parentElement;
//             var not_in_a_hole = function (parent_element) {
//                 return parent_element && parent_element.className.indexOf("toontalk-box-hole") < 0;
//             };
//             var check_if_dimensions_known;
//             if (!recompute && $(element).width() && not_in_a_hole(original_parent)) {
//                 // already known -- delaying it fixes problems with elements in box holes not computing the right scaling
//                 // but size in a box hole should not count
//                 setTimeout(function () {
//                                callback(original_parent);
//                            });
//                 return;
//             }
//             var observer = new MutationObserver(function (mutations) {
//                                                     mutations.some(function(mutation) {
//                                                         var width  = $(element).width();
//                                                         var height = $(element).height();
//                                                         if (width && height && not_in_a_hole(element.parentElement)) {
//                                                             callback(original_parent);
//                                                             observer.disconnect();
//                                                             $(element).removeClass("toontalk-not-observable");
//                                                             if (original_parent) {
//                                                                 original_parent.appendChild(element);
//                                                             } else if (element.parentElement === document.body) {
//                                                                 $(element).remove();
//                                                             }
//                                                             return true;
//                                                         }
//                                                     })});
//             $(element).addClass("toontalk-not-observable");
//             // add to DOM temporarily so can get dimensions
//             document.body.appendChild(element); 
//             // observe changes to style (where width and height "live")
//             observer.observe(element, {attributes: true,
//                                        attributeFilter: ["style"]});               
//             if (recompute) {
//                 utilities.set_css(element,
//                                   {width:     '',
//                                    height:    '',
//                                    transform: ''});
//             }
//         };

        utilities.original_dimensions = function (widget, set_original_dimensions, recompute) {
            // this relies upon run_when_dimensions_known which keeps trying until it finds out the dimensions of this element
            // TODO: discover if there is a better way
            var frontside_element = widget.get_frontside_element();
            var update_original_dimensions =
                function () {
                    var $image = $(frontside_element).children("img");
                    if ($image.is("*")) {
                        set_original_dimensions($image.width(), $image.height());
                    } else {
                        set_original_dimensions($(frontside_element).width(), $(frontside_element).height());
                    }
                };
            if (frontside_element.parentElement === document.body) {
                return; // this was called twice -- probably by update_display
            }
            utilities.run_when_dimensions_known(frontside_element, update_original_dimensions, recompute);
        };
        
        utilities.relative_position = function (target_element, reference_element) {
             var target_offset, reference_offset;
             if (!utilities.is_attached(target_element)) {
                 // can happen if, for example, target_element is new and yet to be rendered (or one of its ancestors)
                 return {left: 0,
                         top:  0};
             }
             target_offset = $(target_element).offset();
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
        
        utilities.widget_side_of_jquery = function ($element) {
             if ($element.length > 0) {
                 return $element.get(0).toontalk_widget_side;
             }
        };

        utilities.widget_side_of_element = function (element) {
            return element.toontalk_widget_side;
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

        utilities.display_message = function (message, options) {
            // options include duration, element, second_choice_element, only_if_new, plain_text
            // if element is provided while try to display the message on its backside or a backside container
            // if a backside containing element isn't found then second_choice_element is used if provided
            var alert_element = utilities.create_alert_element(message);
            var remove_handler = function () {
                                     $(alert_element).remove();
                                 };
            var $backside;
            if (!options) {
                options = {};
            }
            if (options.only_if_new) {
                if (messages_displayed.indexOf(message) < 0) {
                    messages_displayed.push(message);
                } else {
                    return;
                }
            }
            $(".toontalk-alert-element").remove(); // remove any pre-existing alerts
            if (TT.debugging) {
                console.log(options.plain_text || message);
//                 console.trace();
            }
            if (options.element || options.second_choice_element) {
                $backside = $(options.element).closest(".toontalk-backside");
                if ($backside.length === 0) {
                    $backside = $(options.second_choice_element).closest(".toontalk-backside");
                }
                if ($backside.length > 0) {
                    $(alert_element).addClass("toontalk-local-alert");
                    $backside.append(alert_element);
                }
            } 
            if (!options.element || $backside.length === 0) {
                document.body.insertBefore(alert_element, document.body.firstChild);
            }
            if (TT.speak) {
                window.speechSynthesis.cancel(); // stop any ongoing speech
                // ignore any HTML in message
                utilities.speak(options.plain_text || alert_element.textContent);
            }
            alert_element.addEventListener('click', remove_handler);
            if (!options.duration) {
                if (message.indexOf('<') >= 0) {
                    // contains HTML not plain text
                    options.duration = 5000;
                } else {
                    options.duration = Math.max(2000, message.length * (TT.MAXIMUM_TOOLTIP_DURATION_PER_CHARACTER || 100));
                }
            }
            setTimeout(remove_handler, options.duration);
        };

        utilities.display_tooltip = function ($element) {
            utilities.use_custom_tooltip($element.get(0));
            $element.tooltip('open');
        };

        utilities.report_internal_error = function (message) {
            // these are ToonTalk errors not user errors
            console.error(message);
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
            return TT.TOONTALK_URL;
//             var toontalk_start, next_slash;
//             if (typeof path_to_toontalk_folder === 'string') {
//                 return path_to_toontalk_folder;
//             }
//             path_to_toontalk_folder = "";
//             toontalk_start = window.location.href.indexOf("/ToonTalk/");
//             if (toontalk_start < 0) {
//                 // give up
//                 return path_to_toontalk_folder;
//             } else {
//                 next_slash = toontalk_start+"/ToonTalk".length;
//             }
//             while (true) {
//                 next_slash = window.location.href.indexOf("/", next_slash+1);
//                 if (next_slash < 0) {
//                     return path_to_toontalk_folder;
//                 }
//                 path_to_toontalk_folder += "../";
//             };
        };

        utilities.is_browser_of_type = function (type) {
            // type can be "MSIE", "Firefox", "Safari", "Chrome", "Opera"
            return window.navigator.userAgent.indexOf(type) >= 0;
        };

        browser_is_internet_explorer = utilities.is_browser_of_type("MSIE") || // before version 11
                                       utilities.is_browser_of_type("Trident");

        utilities.is_internet_explorer = function () {
            return browser_is_internet_explorer;
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
            var running = false;
            var button_clicked =
                function (event) {
                    if (running) {
                        $(".toontalk-stop-sign").each(function () {
                            if ($(this).parent().is(".toontalk-backside-of-top-level")) {
                                $(this).click();
                            }
                        });
                        div.innerHTML = "Run all tests";
                        utilities.rerender_all();
                    } else {
                        $(".toontalk-green-flag").each(function () {
                            if ($(this).parent().is(".toontalk-backside-of-top-level")) {
                                $(this).click();
                            }
                        });
                        div.innerHTML = "Stop all tests";
                    }
                    running = !running;
                };
            var div;
            if ($div.length === 0) {
                return;
            }
            $div.button();
            div = $div.get(0);
            div.innerHTML = "Run all tests"; 
            $div.get(0).addEventListener('click', button_clicked);
        };

        utilities.set_timeout = function (delayed, delay) {
            // this prevents the 4ms delay due to specification of setTimeout
            // not sure how much it matters
            if (!delay && !utilities.is_internet_explorer()) {
                // see http://dbaron.org/log/20100309-faster-timeouts
                // seems to tickle some IE11 security setting so postMessage is sometimes blocked
                timeouts.push(delayed);
                window.postMessage(timeout_message_name, "*");
            } else {
                setTimeout(delayed, delay);
            }
        };

        utilities.get_first_property = function (object) {
            return Object.keys(object)[0];
        };

        utilities.get_all_locally_stored_program_names = function (callback) {
            utilities.retrieve_object('toontalk-all-program-names', function (all_program_names_json) {
                if (all_program_names_json) {
                    callback(all_program_names_json);
                } else {
                    return callback([]);
                }
            });   
        };

        utilities.set_all_locally_stored_program_names = function (new_value) {
            utilities.store_object('toontalk-all-program-names', new_value, function () {});  
        };

        utilities.get_local_storage_meta_data = function (program_name, callback) {
            var meta_data_key = utilities.local_storage_program_meta_data_key(program_name);
            try {
                utilities.retrieve_object(meta_data_key, callback);
            } catch (e) {
                callback();
            }
        };

        utilities.local_storage_program_key = function (program_name) {
            return "toontalk-json: " + program_name;
        };

        utilities.local_storage_program_meta_data_key = function (program_name) {
            return "toontalk-meta-data: " + program_name;
        };

        if (TT.CHROME_APP) {
            utilities.store_object = function(key, object, callback) {
                // need to stringify with special handling of circularity
                var store = {};
                if (TT.logging && TT.logging.indexOf('store') >= 0) {
                    console.log("Storing " + object + " with key " + key);
                }
                store[key] = JSON.stringify(object, utilities.clean_json);
                chrome.storage.local.set(store, callback);
                if (chrome.runtime.lastError) {
                    console.error(chrome.runtime.lastError + " caused by set " + key);
                }
            };
            utilities.store_string = function(key, string, callback) {
                var store = {};
                if (TT.logging && TT.logging.indexOf('store') >= 0) {
                    console.log("Storing string " + string.substring(0, 100) + "... with key " + key);
                }
                store[key] = string;
                chrome.storage.local.set(store, callback);
                if (TT.logging && TT.logging.indexOf('store') >= 0) {
                    console.log("Storing string " + string.substring(0, 100) + "... with key " + key);
                }
            };
            utilities.retrieve_object = function (key, callback) {
                chrome.storage.local.get(key,
                                         function (stored) {
                                              if (TT.logging && TT.logging.indexOf('retrieve') >= 0) {
                                                  console.log("Retrieved " + (stored[key] && stored[key].substring(0, 100)) + "... with key " + key);
                                              }
                                              if (chrome.runtime.lastError) {
                                                  console.error(chrome.runtime.lastError + " caused by get " + key);
                                              }
                                              callback(stored[key] && JSON.parse(stored[key]));
                                          });
            };
            utilities.retrieve_string = function (key, callback) {
                chrome.storage.local.get(key, 
                                         function (stored) {
                                             if (TT.logging && TT.logging.indexOf('retrieve') >= 0) {
                                                console.log("Retrieved string " + (stored[key] && stored[key].substring(0, 100)) + "... with key " + key);
                                             }
                                             if (chrome.runtime.lastError) {
                                                 console.error(chrome.runtime.lastError + " caused by get " + key);
                                             }                    
                                             callback(stored && stored[key]);
                                         });
            };
        } else {
            utilities.store_object = function(key, object, callback) {
                if (TT.logging && TT.logging.indexOf('store') >= 0) {
                    console.log("Storing " + object + " with key " + key);
                }
                window.localStorage.setItem(key, JSON.stringify(object, utilities.clean_json));
                if (callback) {
                    callback();
                }
            };
            utilities.store_string = function(key, string, callback) {
                window.localStorage.setItem(key, string);
                if (callback) {
                    callback();
                }
                if (chrome.runtime.lastError) {
                    console.error(chrome.runtime.lastError + " caused by setItem " + key);
                }
            };
            utilities.retrieve_object = function (key, callback) {
               var json_string = window.localStorage.getItem(key);
               if (TT.logging && TT.logging.indexOf('retrieve') >= 0) {
                   console.log("Retrieved " + (json_string && json_string.substring(0, 100)) + "... with key " + key);
               }
               callback(json_string && JSON.parse(json_string));
            };
            utilities.retrieve_string = function (key, callback) {
                if (TT.logging && TT.logging.indexOf('retrieve') >= 0) {
                    console.log("Retrieved string " + (window.localStorage.getItem(key) && window.localStorage.getItem(key).substring(0, 100)) + "... with key " + key);
                }
                callback(window.localStorage.getItem(key));
            };
        };

        utilities.touch_available = function () {
            // see for example http://stackoverflow.com/questions/3974827/detecting-touch-screen-devices-with-javascript
            return "ontouchstart" in window || navigator.msMaxTouchPoints;
        };

        utilities.enable_touch_events = function (element, maximum_click_duration) {
            var original_element = element;
            var touch_start_handler = function (event) {
                var touch = event.changedTouches[0];
                var sub_widget, bounding_rectangle, widget_copy, element_position;
                original_location = $(element).offset();
                if (TT.USABILITY_DRAG_OFFSET.y === 0) {
                    // since can't see through a finger
                    // placed here because device may have touch and mouse so this is set if touch events triggered
                    // TODO: figure out how to restore things if user switches to mouse after this
                    TT.USABILITY_DRAG_OFFSET.y = 25;
                }
                // rewrite using startsWith in ECMAScript version 6
                if (TT.logging && TT.logging.indexOf('touch') === 0) {
                    add_to_touch_log("touch start " + element.id);
                }
                element_being_dragged = element;
                event.preventDefault();
                // text area input and resize handles work differently
                if (event.srcElement.tagName === 'TEXTAREA' || 
                    event.srcElement.tagName === 'INPUT' ||
                    $(event.srcElement).is(".ui-resizable-handle")) {
                    // rewrite using startsWith in ECMAScript version 6
                    if (TT.logging && TT.logging.indexOf('touch') === 0) {
                        add_to_touch_log("touch start ignored due to tag name or class " + element.id);
                    }
                   return;
                }
                sub_widget = utilities.find_widget_side_on_page(event.changedTouches[0], undefined, 0, 0);
                if (sub_widget && sub_widget.is_of_type("empty hole")) {
                    sub_widget = sub_widget.get_parent_of_frontside();
                }
                if (sub_widget && sub_widget.get_frontside_element() !== element) {
                    // really touching a child of the element so let's the child's handler handle this
                    if (TT.logging && TT.logging.indexOf('touch') === 0) {
                        add_to_touch_log("touch start ignored since has child who is really touched: " + utilities.widget_side_of_element(element));
                    }
                    return;
                }
                drag_start_time = Date.now();
                if (TT.logging && TT.logging.indexOf('touch') === 0) {
                    add_to_touch_log("touch start of " + element.id + " at " + drag_start_time);
                }
                event.stopPropagation();
                widget = utilities.widget_side_of_element(element);
                if (widget) {
                    widget.being_dragged = true;
                }
                if (widget && widget.get_infinite_stack()) {
                    widget_copy = widget.copy();
                    widget.set_infinite_stack(false);
                    widget_copy.set_infinite_stack(true);
                } else if ($(element).is(".toontalk-top-level-resource")) {
                    widget_copy = widget.copy();
                    widget.add_copy_to_container(widget_copy, 0, 0);
                    // need to capture the position of the original
                    element_position = $(element).offset();
                    element = widget_copy.get_frontside_element(true);                              
                }
                if (widget_copy) {
                    widget.add_copy_to_container(widget_copy, 0, 0);
                    if (widget.robot_in_training()) {
                        widget.robot_in_training().copied(widget, widget_copy, false);
                    }
                }
                // TODO: figure out why the following doesn't always help -- e.g.  drag number from box to another box
                // maybe it is because the child still "thinks" its parent is the old container
                $(element).css({"z-index": 99999999});
                if (!element_position) {
                    element_position = $(element).offset();
                }
                drag_start_handler(event, element);
                drag_x_offset = touch.pageX - element_position.left;
                drag_y_offset = touch.pageY - element_position.top;
                if (TT.logging && TT.logging.indexOf('touch') === 0) {
                    add_to_touch_log("drag started " + element.id);
                }
            };
            var touch_end_handler = function (event) {
                var touch, simulatedEvent;
                event.preventDefault();
                if (!drag_start_time) {
                    return;
                }
                event.stopPropagation();
                touch = event.changedTouches[0];
                if (widget) {
                    widget.being_dragged = false;
                }
                $(element).removeClass("toontalk-being-dragged");
                if (drag_start_time+maximum_click_duration >= Date.now()) {
                    // should also test that not moved very much
                    simulatedEvent = document.createEvent("MouseEvent");
                    simulatedEvent.initMouseEvent('click', true, true, window, 1,
                                                  touch.screenX, touch.screenY,
                                                  touch.clientX, touch.clientY, false,
                                                  false, false, false, 0, null);
                    touch.target.dispatchEvent(simulatedEvent);
                    // if it was slightly moved put it back
                    if (widget && widget.location_constrained_by_container()) {
                        $(element).css({left: '',
                                        top:  ''});
                    } else {
                        utilities.set_absolute_position(element, {left: original_location.left,
                                                                  top:  original_location.top});
                    }
                    if (TT.logging && TT.logging.indexOf('touch') === 0) {
                        add_to_touch_log("touch end treated as click " + element.id, true);
                    } 
                } else {
                    drag_end_handler(event, element);
                    if (TT.logging && TT.logging.indexOf('touch') === 0) {
                        add_to_touch_log("drag ended " + element.id);
                    }
                    drop_handler(event, element); // widget.get_frontside_element());
                    if (TT.logging && TT.logging.indexOf('touch') === 0) {
                        add_to_touch_log("drop happened " + element.id);
                    }
                    if (TT.logging && TT.logging.indexOf('touch') === 0) {
                        add_to_touch_log("", true);
                    }
                    utilities.set_absolute_position(element, {left: touch.pageX-drag_x_offset-TT.USABILITY_DRAG_OFFSET.x,
                                                              top:  touch.pageY-drag_y_offset-TT.USABILITY_DRAG_OFFSET.y});
                }
                drag_start_time = undefined;
                // restore the original element
                element = original_element;
            };
            var touch_move_handler = function (event) {
                var widget_side_under_element, widget, widget_copy;
                var touch = event.changedTouches[0];
                if (!drag_start_time) {
                    return;
                }
                event.preventDefault();
                utilities.set_absolute_position(element, {left: touch.pageX-drag_x_offset-TT.USABILITY_DRAG_OFFSET.x,
                                                          top:  touch.pageY-drag_y_offset-TT.USABILITY_DRAG_OFFSET.y});
                widget_side_under_element = utilities.find_widget_side_on_page(touch, element, TT.USABILITY_DRAG_OFFSET.x, TT.USABILITY_DRAG_OFFSET.y);
                if (widget_drag_entered && widget_drag_entered !== widget_side_under_element) {
                    drag_leave_handler(touch, widget_drag_entered.get_frontside_element());
                    widget_drag_entered = undefined;
                }
                if (widget_side_under_element) {
                    drag_enter_handler(touch, widget_side_under_element.get_element());
                    widget_drag_entered = widget_side_under_element;
                }
                if (TT.logging && TT.logging.indexOf('touch') === 0) {
                    add_to_touch_log("dragged to " + (touch.pageX-drag_x_offset) + ", " + (touch.pageY-drag_y_offset) + " " + element.id);
                }
            };
            var drag_x_offset = 0;
            var drag_y_offset = 0;
            var element_being_dragged, original_location, drag_start_time, widget, widget_drag_entered, closest_top_level_backside;
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

        utilities.find_widget_side_on_page = function (event, element, x_offset, y_offset) {
            // return what is under the element
            var page_x = utilities.get_mouse_or_first_touch_event_attribute("pageX", event);
            var page_y = utilities.get_mouse_or_first_touch_event_attribute("pageY", event);
            var element_on_page, widget_side_on_page;
            // hide the tool so it is not under itself
            if (element) {
                $(element).hide();
            }
            element_on_page = document.elementFromPoint(page_x - (window.pageXOffset + x_offset), (page_y - (window.pageYOffset + y_offset)));
            if (element) {
                $(element).show();
            }
            while (element_on_page && !element_on_page.toontalk_widget_side && 
                   (!$(element_on_page).is(".toontalk-backside") && !$(element_on_page).is(".toontalk-button") && !$(element_on_page).is(".ui-button"))) {
                // element might be a 'sub-element' so go up parent links to find ToonTalk widget
                element_on_page = element_on_page.parentNode;
            }
            if (element_on_page) {
                widget_side_on_page = element_on_page.toontalk_widget_side;
            }
            if (!widget_side_on_page) {
                return;
            }
            if (widget_side_on_page && widget_side_on_page.get_contents && widget_side_on_page.get_contents()) {
                widget_side_on_page = widget_side_on_page.get_contents();
            }
//             if (widget_side_on_page.element_to_highlight && event) {
//                 element_on_page = widget_side_on_page.element_to_highlight(event);
//                 if (!element_on_page) {
//                     return;
//                 }
//                 widget_side_on_page = element_on_page.toontalk_widget_side;    
//             }
            return widget_side_on_page;
       };

       utilities.closest_top_level_backside = function (x, y) {
           var best_so_far, best_distance_so_far;
           $(".toontalk-backside-of-top-level").each(function () {
               var position = $(this).offset();
               var this_distance = (position.left + $(this).width() /2 - x)^2 + 
                                   (position.top  + $(this).height()/2 - x)^2;
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
           return utilities.widget_side_of_element(best_so_far);
       };

       utilities.set_css = function (element, css) {
           // this is mostly useful debugging computed CSS problems since can break here
           var widget_side, widget_side_dereferenced;
           if (!css) {
               return;
           }
           widget_side = utilities.widget_side_of_element(element);
           if (widget_side) {
               widget_side_dereferenced = widget_side.dereference();
               if (css.width) {
                   if (widget_side.is_hole()) {
                       css['font-size'] = widget_side.label_font_size();
                   } else if (widget_side_dereferenced.get_name && widget_side_dereferenced.get_name() && !css['font-size']) {
                       // change font size so text fits (unless explicitly set)
                       // margin to leave space on both sides of the label 
                       css['font-size'] = utilities.font_size(widget_side_dereferenced.get_name(), css.width, {margin: 2,
                                                                                                               height: css.height});
                   }
               }
               if ($(element).is(".toontalk-temporarily-set-down")) {
                   // leave the CSS alone
                   // TODO: make this more modular/cleaner
               } else if (widget_side.location_constrained_by_container()) {
                   // widget_side_dereferenced could be contents of a box or scale and widget_side is the hole itself
                   css.left   = '';
                   css.top    = '';
               } else if (widget_side_dereferenced.is_plain_text_element()) {
                   // see Robot dropping text to change element text: test case
                   css.width  = '';
                   css.height = '';
               }              
           }
           if (css.width === 0) {
               css.width  = '';
           }
           if (css.height === 0) {
               css.height  = '';
           }
           if (!css.transform && typeof css.width === 'number' && typeof css.height === 'number' &&
               widget_side_dereferenced && widget_side_dereferenced.use_scaling_transform) {
               // leave CSS width and height alone and recompute scaling transform
               // following will call set_css again with modified css
               widget_side_dereferenced.use_scaling_transform(css);
           } else {
               $(element).css(css);
           }
       };

       utilities.font_size = function (string, width, options) {
           // options can be margin (units in characters) and height which prevents fonts so big they fit horizontally but not vertically
           // width is required so is not an option 
           var words, maximum_word_length, font_size, line_count;
           if (!string || !width) {
               return 0;
           }
           if (!options) {
               options = {};
           }
           words = string.split(" ");
           maximum_word_length = words.map(function (word) { return word.length;}).reduce(function (x, y) { return Math.max(x, y);}, -Infinity);
           font_size = width / (TT.FONT_ASPECT_RATIO * (maximum_word_length+(options.margin || 0)));
           if (words.length === 1 || !options.height) {
               // single line or don't care how tall it is
               return font_size;
           }
           // make sure there is enough height for multiple lines
           line_count = Math.ceil(string.length/maximum_word_length);
           if (font_size*line_count > options.height) {
               // square root since as the font size is adjusted so is the line count
               font_size *= Math.sqrt(options.height/(font_size*line_count));
               // testing shows the font is just a bit too big
               font_size *= .9;
           }
           return font_size;
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

       utilities.insert_function_bird_documentation = function (type_name, id) {
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
           $(id).html(table);
           function_names.forEach(function (function_name, index) {
               var bird = window.TOONTALK.bird.create_function(type_name, undefined, function_name);
               var bird_frontside_element = bird.get_frontside_element();
               bird.update_display();
               $("#bird_id_" + index).replaceWith($(bird_frontside_element).addClass("toontalk-function-bird-documentation-bird"));
               // sanitise the id -- id enables links to specific function birds
               if (bird_frontside_element) {
                   bird_frontside_element.id = encodeURIComponent(function_name);
               }
           });  
       };

       utilities.rerender_all = function () {
           $(".toontalk-side").each(function (index, element) {
                                        var widget = utilities.widget_side_of_element(element);
                                        if (widget) {
                                            widget.update_display(true);
                                        }
                                    });
       };

       // JQuery's :visible didn't work reliably and is costly and is a JQuery hack https://api.jquery.com/visible-selector/
       utilities.visible_element = function (element) {
            return element && element.offsetParent !== null;
       };

       utilities.get_audio_volume = function (audio_object) {
           var volume = document.hidden ? 0 : TT.volume;
           if (volume === 0) {
               muted_audio_objects.push({audio_object: audio_object,
                                         volume: audio_object.volume});
           }
           return volume;
       };

       utilities.play_audio = function (audio_object) {
           audio_object.play();
           audio_objects_playing.push(audio_object);
           audio_object.addEventListener('ended', function () {
                                                      var index = audio_objects_playing.indexOf(audio_object);
                                                      if (index >= 0) {
                                                          audio_objects_playing.splice(index, 1);
                                                      }
           });
       };

       utilities.mute_audio_objects_playing = function () {
           audio_objects_playing.forEach(function (audio_object) {
               muted_audio_objects.push({audio_object: audio_object,
                                         volume: audio_object.volume});
               audio_object.volume = 0;
           });
           audio_objects_playing = [];
       };

       utilities.stop_audio_objects = function () {
            audio_objects_playing.forEach(function (audio_object) {
                audio_object.pause();
                audio_object.currentTime = 0;
            });
       };

       utilities.restore_audio_volumes = function () {
            muted_audio_objects.forEach(function (muted_audio_object) {
                muted_audio_object.audio_object.volume = muted_audio_object.volume;
                audio_objects_playing.push(muted_audio_object.audio_object)
            });
            muted_audio_objects = [];
       };

       utilities.is_attached = function (element) {
           return jQuery.contains(window.document, element);
       };

       utilities.when_attached = function (element, new_callback, even_if_not_observable) {
           var old_callback = element.toontalk_attached_callback;
           var callback;
           if (jQuery.contains(window.document, element) && !even_if_not_observable) {
               // already attached
               // no need to deal with old_callback here since there already is an observer that will deal with that soon if it hasn't already.
               new_callback();
               return;
           }
           callback = function () {
                          if (old_callback) {
                              old_callback();
                          }
                          new_callback();
                          $(element).removeClass("toontalk-has-attached-callback");
                          element.toontalk_attached_callback = undefined;
                          if (element.toontalk_widget_side) {
                              element.toontalk_widget_side.rerender();
                          }
                      };
           element.toontalk_attached_callback = callback;
           if (even_if_not_observable) {
               element.toontalk_run_even_if_not_observable = true;
           }
           // following shouldn't be necessary but the selector [toontalk_attached_callback] didn't work
           $(element).addClass("toontalk-has-attached-callback");
       };

       utilities.create_event = function (name, details) {
           var event;
           try {
               event = new CustomEvent(name, {detail: details});
           } catch (e) {
               // fall back on old way of doing this (needed for IE11)
               event = document.createEvent("CustomEvent");
               event.initCustomEvent(name, false, false, details);
           }
           return event;
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
                      var first_item = queue.length == 0;
                      queue.push(item);
                      if (TT.logging && TT.logging.indexOf('queue') >= 0) {           
                          console.log(item._debug_string + " enqueued");
                      }
                      return first_item;
                  },
                  // Dequeues an item and returns it. 
                  // If the queue is empty, the value'undefined' is returned.
                  dequeue: function () {
                      var item;
                      if (queue.length == 0) {
                          return undefined;
                      }
                      item = queue[offset];
                      if (TT.logging && TT.logging.indexOf('queue') >= 0) {           
                          console.log(item._debug_string + " dequeued");
                      }
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

//         utilities.element_selected = function (event, $element) {
//             var $parent;
//             if (event.ctrlKey) {
//                 // Control key means drag the container (if appropriate)
//                 $parent = $element.parent();
//                 if ($parent.is(".toontalk-nest")) {
//                     return $parent;
//                 } else if ($parent.is(".toontalk-box-hole")) {
//                     return $parent.parent();
//                 }
//             }
//             return $element;
//         };

        utilities.number_to_words = function (input) {
            var slash_index = input.indexOf('/');
            var special_denominator = function (n) {
                var names = ["", "", "half", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth",
                             "eleventh", "twelfth", "thirteenth", "fourteenth", "fifteenth", "sixteenth", "seventeenth", "eighteenth", "nineteenth", "twentieth"];
                if (n <= 20) {
                    return names[n];
                }
                if (n%10 === 0 && n < 100) {
                    return ["thirtieth", "fortieth", "fiftieth", "sixtieth", "seventieth", "eightieth", "ninetieth"][n/10-3];
                }
                if (n === 100) {
                    return "hundredth";
                }
                if (n === 1000) {
                    return "thousandth";
                }
                if (n === 10000) {
                    return "ten thousandth";
                }
                if (n === 100000) {
                    return "hundred thousandth";
                }
                if (n === 1000000) {
                    return "millionth";
                }
                if (n === 10000000) {
                    return "ten millionth";
                }
                if (n === 100000000) {
                    return "hundred millionth";
                }
                if (n === 1000000000) {
                    return "billionth";
                }
            }
            var numerator, plural;
            if (slash_index < 0) {
                return utilities.integer_to_words(input);
            }
            numerator = input.substring(0, slash_index);
            plural = numerator !== "1" && numerator !== "-1";
            if (slash_index+3 >= input.length || (!plural && slash_index+11 >= input.length)) {
                // denominator is either 2 digits or 1 over at most 10 digits so speak it specially
                var denominator = special_denominator(parseInt(input.substring(slash_index+1)));
                if (denominator) {
                    return utilities.integer_to_words(numerator) + " " + denominator + (plural ? "s" : "");
                }
                return utilities.integer_to_words(numerator) + " over " + utilities.integer_to_words(input.substring(slash_index+1));
            }
            return utilities.integer_to_words(input.substring(0, slash_index)) + " over " + utilities.integer_to_words(input.substring(slash_index+1));
        };

        utilities.integer_to_words = function (input) {
        // largely based on information in http://home.earthlink.net/~mrob/pub/math/largenum.html
        // web page seems to be gone but see http://web.archive.org/web/20061006084112/http://home.earthlink.net/~mrob/pub/math/largenum.html

        // note that this is incorrect for long form languages -- see https://en.wikipedia.org/wiki/Long_and_short_scales#Long_scale_users
        // however Google translate translates billion, trillion, correctly to French (and presumably the like)

/*
 Rules for one system extending up to 103000 are given in The Book of Numbers by Conway and Guy.
 This system was developed by John Conway and Allan Wechsler after significant research into Latin5 but Olivier Miakinen4 has refined it, as described below. 
 The name is built out of pieces representing powers of 10^3, 10^30 and 10^300 as shown by this table: 
   
 1's				10's							100's  
0  -				-								-  
1  un			(n) deci					(nx) centi  
2  duo			(ms) viginti				(n) ducenti  
3  tre (*)		(ns) triginta				(ns) trecenti  
4  quattuor		(ns) quadraginta			(ns) quadringenti  
5  quin			(ns) quinquaginta			(ns) quingenti  
6  se (sx)		(n) sexaginta				(n) sescenti  
7  septe (mn)   (n) septuaginta			    (n) septingenti  
8  octo			(mx) octoginta  			(mx) octingenti  
9  nove (mn)	nonaginta					nongenti  
   The rules are: 
 
- Take the power of 10 you're naming and subtract 3. 
- Divide by 3. If the remainder is 0, 1 or 2, put one, ten or one hundred at the beginning of your name (respectively). 
- Break the quotient up into 1's, 10's and 100's. Find the appropriate name segments for each piece in the table. (NOTE: The original Conway-Wechsler system specifies quinqua for 5, not quin.) 
- String the segments together, inserting an extra letter if the letter shown in parentheses at the end of one segment match a letter in parentheses at the beginning of the next. For example: septe(mn) + (ms)viginti = septemviginti; se(sx) + (mx)octoginta = sexoctoginta. For the special case of tre, the letter s should be inserted if the following part is marked with either an s or an x. 
- If the result ends in a, change the a to i. 
- Add llion at the end. You're done. 
*/
        // note that the above web site does not have "prefix" "m" for nonaginta or nongenti but many sites seem to require it -- e.g. http://www.webster-dictionary.org/definition/Names%20of%20large%20numbers
        // based on desktop ToonTalk code in https://github.com/ToonTalk/desktop-toontalk/blob/781b9fa035304b93b015447f1c7773b07e912eb2/source/martian.cpp
        // note that this assumes the short scale which is appropriate for English -- seee https://en.wikipedia.org/wiki/Long_and_short_scales
        var output = "";
        var one_names = ["", "un", "duo", "tre", "quattuor", "quin", "se", "septe", "octo", "nove"];
        var one_suffixes = ["", "", "", "*", "", "", "sx", "mn", "", "mx"];
        var ten_names = ["", "deci", "viginti", "triginta", "quadraginta", "quinquaginta", "sexaginta", "septuaginta", "octoginta", "nonaginta"];
        var ten_prefixes = ["", "n", "ms", "ns", "ns", "ns", "n", "n", "mx", "m"];
        var hundred_names = ["", "centi", "ducenti", "trecenti", "quadringenti", "quingenti", "sescenti", "septingenti", "octingenti", "nongenti"];
        var hundred_prefixes = ["", "nx", "n", "ns", "ns", "ns", "n", "n", "mx", "m"];
        // following are my attempt to generalize for higher powers:
        var thousand_names = ["", "milli", "dumilli", "tremilli", "quadrinmilli", "quinmilli", "sesmilli", "septinmilli", "octinmilli", "nonmilli"];
        var ten_thousand_names = ["", "decimilli", "vigintimilli", "trigintamilli", "quadragintanmilli", "quinquagintamilli", "sexagintamilli", "septuagintamilli", "octogintamilli", "nonagintamilli"];
        var hundred_thousand_names = ["", "centimilli", "ducentimilli", "trecentimilli", "quadringentimilli", "quingentimilli", "sescentimilli", "septingentimilli", "octingentimilli", "nongentimilli"];
        var million_names = ["", "milli-milli", "milli-dumilli", "milli-tremilli", "milli-quadrinmilli", "milli-quinmilli", "milli-sesmilli", "milli-septinmilli", "milli-octinmilli", "milli-nonmilli"];
        var small_names = ["thousand", "million", "billion", "trillion", "quadrillion", "quintillion", "sextillion", "septillion", "octillion",  "nonillion"];
        var digits_remaining, power_minus_3, up_to_three_digits, digits_copied, to_name, previous_suffix, suffix, last_comma,
            ones, tens, hundreds, thousands, ten_thousands, hundred_thousands, millions,
            one_name, ten_name, hundred_name, thousand_name, ten_thousand_name, hundred_thousand_name, million_name;
        var copy_all_but_leading_zeros = function (digit_count) {
            var output_count = 0;
            var String_less_than_a_thousand = "";
            var i;
            for (i = 0; i < digit_count; i++) {
                if (input[i] !== '0' || output_count > 0) {
                    String_less_than_a_thousand += input[i];
                    output_count++;
                };
            };
            if (String_less_than_a_thousand) {
                output += less_than_a_thousand(parseInt(String_less_than_a_thousand));
            }
            return output_count;
        };
        var less_than_a_thousand = function (n) {
            var first_twenty = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];
            var tens = ["", "ten", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
            var output = "";
            if (n >= 100) {
                output += first_twenty[Math.floor(n/100)] + " hundred";
                n = n%100;
                if (n > 0 && n < 10) {
                    // e.g. 103 to one hundred and three
                    output += " and";
                }
            }
            if (n > 20) {
                if (output != "") {
                    output += " ";
                }
                output += tens[Math.floor(n/10)];
                n = n%10;
                if (n > 0) {
                    output += "-"; // see for example https://www.grammarly.com/handbook/punctuation/hyphen/11/hyphen-in-compound-numbers/
                }
            } else if (output != "" && n > 0) {
                output += " ";
            }
            if (n > 0) {
                output += first_twenty[n];
            }
            return output.toString();
        }
        var in_common = function (s1, s2) {
            var i, j;
            if (s1 === undefined || s2 === undefined) {
                return;
            }
            for (i = 0; i < s1.length; i++) {
                for (j = 0; j < s2.length; j++) {
                    // special rule of tre represented by * matching s or x
                    if (s1[i] == s2[j] || (s1[i] === '*' && (s2[j] === 's' || s2[j] === 'x'))) { 
                        return(s2[j]); //  s1[i] is wrong for *
                    };
                };
            };
        };
        if (input[0] === '-') {
            output += "negative ";
            input = input.substring(1);
        }
        while (input.length > 0 && input[0] === '0') {
            // ignore leading zeros
            input = input.substring(1);
        }
        if (input.length === 0) {
            return "zero";
        };
        digits_remaining = input.length;
        while (true) {
            if (output[output.length-1] !== " ") {
                output += " ";
            }
            if (digits_remaining < 4) {
//                 output = output.trim(); // removed any unneeded spaces
                if (copy_all_but_leading_zeros(digits_remaining) === 0 && output.substring(output.length-1) === ',') {
                    // remove trailing comma since exact multiple of 1000
    	            output = output.substring(0, output.length-1);
                }
                break;
            }
            power_minus_3 = digits_remaining-4; // e.g. 1234 (4 digits) is 10 to the power 3
            up_to_three_digits = 1+power_minus_3%3; 
            digits_copied = copy_all_but_leading_zeros(up_to_three_digits);
            input = input.substring(up_to_three_digits);
            digits_remaining -= up_to_three_digits;
            if (digits_copied > 0) { // may be 1000000...
                if (output[output.length-1] !== " ") {
                    output += " ";
                }
                to_name = Math.floor(power_minus_3/3);
                ones = to_name%10;
                if (to_name < 10) {
                    // use familar names thousands, millions, billions, and trillions
                    output += small_names[to_name];
                } else {
                    tens = Math.floor((to_name/10)%10);
                    hundreds = Math.floor((to_name/100)%10);
                    thousands = Math.floor((to_name/1000)%10);
                    ten_thousands = Math.floor((to_name/10000)%10);
                    hundred_thousands = Math.floor((to_name/100000)%10);
                    millions = Math.floor((to_name/1000000)%10);
                    one_name = one_names[ones];
                    ten_name = ten_names[tens];
                    hundred_name = hundred_names[hundreds];
                    thousand_name = thousand_names[thousands];
                    ten_thousand_name = ten_thousand_names[ten_thousands];
                    hundred_thousand_name = hundred_thousand_names[hundred_thousands];
                    million_name = million_names[millions];
                    previous_suffix = undefined;
                    if (one_name) {
                        output += one_name;
                        previous_suffix = one_suffixes[ones];
                    };
                    if (ten_name) {
                        suffix = in_common(previous_suffix,ten_prefixes[tens]);
                        if (suffix) {
                            output += suffix;
                        };
                        previous_suffix = undefined; // used it up
                        output += ten_name;
                    };
                    if (hundred_name) {
                        suffix = in_common(previous_suffix,hundred_prefixes[hundreds]);
                        if (suffix) {
                            output += suffix;
                        };
                        previous_suffix = undefined; // used it up
                        output += hundred_name;
                    };
                    // not clear what should be the suffix so skipping it for the following
                    output += thousand_name;
                    output += ten_thousand_name;
                    output += hundred_thousand_name;
                    output += million_name;
                    if (output[output.length-1] === 'a') {
                        output = output.substring(0, output.length-2) + 'i';
                    };
                    output += "llion";
                };
                output += ","; // reads better and segmented text-to-speech breaks at better places
            };
        };
        output =  output.trim();
        last_comma = output.lastIndexOf(", ");
        if (last_comma >= 0) {
            return output.substring(0, last_comma) + " and" + output.substring(last_comma+1);
        }
        if (output[output.length-1] === ",") {
            // remove final comma
            output = output.substring(0, output.length-1);
        }
        return output;
    };
    utilities.test_number_to_words = function (n) {
        var i, x;
        for (i = 0; i < n; i++) {
            x = Math.round(1000000000*Math.random());
            console.log(x + " = " + utilities.number_to_words(x.toString()));
        }
    };
    utilities.for_each_batch = function (array, callback, chunk_size, start_index) {
        // same as forEach except yields every chunk_size elements
        // if the list is long and much needs to be done to each element then everything can freeze for a while
        // this way we yield to other processes
        var i, stop_index;
        if (array.length === 0) {
            return;
        }
        if (start_index === undefined) {
            start_index = 0;
        }
        if (!chunk_size) {
            chunk_size = default_batch_size;
        }
        stop_index = Math.min(array.length, start_index+chunk_size);
        for (i = start_index; i < stop_index; i++) {
            callback(array[i], i);
        }
        if (stop_index < array.length) {
            utilities.set_timeout(function () {
                utilities.for_each_batch(array, callback, chunk_size, stop_index);
            });
        }
    };
    utilities.random_location_inside = function (element, margin) {
        // returns a random location within element leaving margin on the right and bottom
        var bounding_rectangle = element.getBoundingClientRect();
        return {left: Math.random()*(bounding_rectangle.width -margin),
                 top: Math.random()*(bounding_rectangle.height-margin)};
    };
    utilities.element_width = function (element) {
        var $element = $(element);
        if ($element.is(".toontalk-conditions-contents")) {
            // update if toontalk-conditions-contents CSS changes
            return 240;
        }
        if (!$element.is(".toontalk-not-observable")) {
            return element.getBoundingClientRect().width;
        }
    };
    utilities.element_height = function (element) {
        var $element = $(element);
        if ($element.is(".toontalk-conditions-contents")) {
            // update if toontalk-conditions-contents CSS changes
            return 60;
        }
        if (!$element.is(".toontalk-not-observable")) {
            return element.getBoundingClientRect().height;
        }
    };
    utilities.resizable_and_scalable = function (element, resize_callback) {
        var x_scale = 1;
        var y_scale = 1;
        var previous_bounding_box;
        $(element).resizable(
                {start: function (event, ui) {
                     previous_bounding_box = {width:  ui.size.width,
                                              height: ui.size.height};
                },
                resize: function (event, ui) {
                    var bounding_box = {width:  ui.size.width,
                                        height: ui.size.height};
                    if ($(element).is(".toontalk-backside-of-top-level")) {
                        // top-level backside is not scaled
                        return;
                    }
                    x_scale *= bounding_box.width  / previous_bounding_box.width;
                    y_scale *= bounding_box.height / previous_bounding_box.height;
                    resize_callback(x_scale, y_scale);
//                     console.log("bounding_box: " + bounding_box.width + "x" + bounding_box.height 
//                               + " previous_bounding_box: " + previous_bounding_box.width + "x" + previous_bounding_box.height
//                               + " x_scale: " + x_scale + " y_scale: " + y_scale);
                    previous_bounding_box = bounding_box;
                },
                handles: "n,e,s,w,se,ne,sw,nw"});
    };

    utilities.listen_for_speech = function (options) {
        // based upon http://mdn.github.io/web-speech-api/speech-color-changer/
        // tags would be a nice way to simplify this and make it language independent but at last Chrome doesn't currently support it
        // options are commands, minimum_confidence, numbers_acceptable, descriptions_acceptable, widget, success_callback, fail_callback
        var commands, minimum_confidence, SpeechGrammarList, SpeechRecognitionEvent, grammar, speechRecognitionList, turn_on_speech_recognition;
        var command, confidence, i;
        if (!TT.listen) {
            return;
        }
        commands = options.commands || "";
        minimum_confidence = options.minimum_confidence || 0;
        SpeechGrammarList = SpeechGrammarList || webkitSpeechGrammarList;
        SpeechRecognitionEvent = SpeechRecognitionEvent || webkitSpeechRecognitionEvent;
        if (window.speechSynthesis.speaking) {
            // busy wait until speech synthesis is over
            setTimeout(function () {
                           utilities.listen_for_speech(options);
                       },
                       1000);
            return;
        }
        // see https://www.w3.org/TR/jsgf/ for JSGF format
        if (options.descriptions_acceptable) {
            // accept anything that starts with I am or I'm
            commands += " | I am | I'm ";
        }
        if (options.names_acceptable) {
            // accept anything that starts with my name is or call me
            commands += " | My name is | call me ";
        }
        grammar = '#JSGF V1.0; grammar commands; public <commands> = ' + commands + ';';
        speechRecognitionList = new SpeechGrammarList();
        turn_on_speech_recognition = function () {
            try {
                speech_recognition.start();
//                 console.log("listening");
            } catch (ignore_error) {
                // assuming the error was that it had already started
//                 console.log("Ignoring " + ignore_error);
            }
        };
        waiting_for_speech = true;
        speech_recognition = (typeof SpeechRecognition === 'undefined') ? new webkitSpeechRecognition() : new SpeechRecognition();
        speechRecognitionList.addFromString(grammar, 1);
        speech_recognition.grammars = speechRecognitionList;
        speech_recognition.continuous = false;
        speech_recognition.lang = utilities.translation_language_code();
        speech_recognition.interimResults = false;
        speech_recognition.maxAlternatives = 5;
        speech_recognition.onresult = function (event) {
            // The SpeechRecognitionEvent results property returns a SpeechRecognitionResultList object
            // The SpeechRecognitionResultList object contains SpeechRecognitionResult objects.
            // It has a getter so it can be accessed like an array
            // The first [0] returns the SpeechRecognitionResult at position 0.
            // Each SpeechRecognitionResult object contains SpeechRecognitionAlternative objects that contain individual results.
            // These also have getters so they can be accessed like arrays.
            // The second [0] returns the SpeechRecognitionAlternative at position 0.
            // We then return the transcript property of the SpeechRecognitionAlternative object
            var result;
            for (i = 0; i < event.results[0].length; i++) {
                if (event.results[0][i].confidence >= minimum_confidence) {
                    result = event.results[0][i].transcript.toLowerCase(); 
                    if (!commands ||
                        (commands.indexOf(result + " |") >= 0 ||
                         commands.indexOf("| " + result) >= 0 ||
                         (options.numbers_acceptable && !isNaN(parseFloat(result))) ||
                         (options.descriptions_acceptable && (result.indexOf('i am') === 0 || result.indexOf("i'm") === 0)) ||
                         (options.names_acceptable && (result.indexOf('my name is') === 0 || result.indexOf("call me") === 0)))) {
                        // if command is one of the expected tokens -- must have a | before and/or after it
                        command = event.results[0][i].transcript.toLowerCase();
                        confidence = event.results[0][i].confidence;
                        // assumes that the most confident answers are first
                        break;
                    }
                }
            }
            if (window.speechSynthesis.speaking) {
                console.log("Ignoring speech since synthesising speech. " + (command || ""));
            } else if (command) {
                console.log(command + " confidence : " + confidence);
                if (options.descriptions_acceptable && options.widget && utilities.spoken_command_is_a_description(command, options.widget)) {
                    // description updated
                    options.widget.rerender();
                } else if (options.names_acceptable && options.widget && utilities.spoken_command_is_a_naming(command, options.widget)) {
                    // name updated
                    options.widget.rerender();
                } else if (options.success_callback) {
                    options.success_callback(command, event);
                }   
            } else {
                console.log("confidence too low"); // give better feedback
            }
            speech_recognition.stop(); // onend will restart listening
        };

        speech_recognition.onend = function () {
            if (waiting_for_speech) {
//                 console.log("speech ended but restarted");
                turn_on_speech_recognition();
            }
        };

        speech_recognition.onnomatch = function (event) {
            if (options.fail_callback) {
                options.fail_callback(event);
            }
        };

        speech_recognition.onerror = function (event) {
            if (event.error !== 'no-speech') {
//              console.log('no speech');
            } else if (options.fail_callback) {
                options.fail_callback(event);
            }
        }

        if (waiting_for_speech) {
            turn_on_speech_recognition();
        }
    };

    utilities.stop_listening_for_speech = function () {
        if (speech_recognition) {
            speech_recognition.stop();
            waiting_for_speech = false;
        }
//      console.log("stopped listening due to stop_listening_for_speech");
    };

    utilities.spoken_command_is_a_description = function (command, widget) {
        var description;
        if (command.indexOf("i am") === 0) {
            description = command.substring(5);
        } else if (command.indexOf("i'm") === 0) {
            description = command.substring(4);
        }
        if (description) {
            (utilities.get_dragee_copy() || widget).set_description(description, true, true);
            utilities.display_message('The description of the ' + widget.get_type_name() + ' is now "' + description + '"');
            return true;
        }
    };

    utilities.spoken_command_is_a_naming = function (command, widget) {
        var name;
        if (!widget.get_name) {
            return;
        }
        if (command.indexOf("my name is ") === 0) {
            name = command.substring(11);
        } else if (command.indexOf("call me ") === 0) {
            name = command.substring(8);
        }
        if (name) {
            (utilities.get_dragee_copy() || widget).set_name(name, true, true);
            utilities.display_message('The name of the ' + widget.get_type_name() + ' is now "' + name + '"');
            return true;
        }
    };

    utilities.download_file = function (url, callback, access_token) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url);
        if (access_token) {
           xhr.setRequestHeader('Authorization', 'Bearer ' + access_token);
        }
        xhr.onload = function() {
                         callback(xhr.responseText);
        };
        xhr.onerror = function() {
                          callback(null);
        };
        xhr.send();
    };


// for comparison with the above (which handles much bigger numbers than this)
// it does differ in whether it should be Duotrigintillion or Dotrigintillion -- see http://mathforum.org/library/drmath/view/57227.html
// utilities.to_words = function (n) {
//     // based upon http://stackoverflow.com/questions/14766951/convert-digits-into-words-with-javascript
//       if (n == 0) return 'zero';
//       var a = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
//       var b = ['', '', 'twenty', 'thirty', 'fourty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
//       var g = ['', 'thousand', 'million', 'billion', 'trillion', 'quadrillion', 'quintillion', 'sextillion', 'septillion', 'octillion', 'nonillion',
//                'decillion', 'undecillion', 'duodecillion', 'tredecillion', 'quattuordecillion', 'quindecillion', 'sexdecillion', 'septendecillion', 'octodecillion', 'novemdecillion', 'vigintillion',
//                'unvigintillion', 'dovigintillion', 'trevigintillion', 'quattuorvigintillion', 'quinvigintillion', 'sexvigintillion', 'septenvigintillion', 'octovigintillion', 'novemvigintillion',
//                'trigintillion', 'untrigintillion', 'dotrigintillion',
//                'tretrigintillion', 'quattuortrigintillion', 'quintrigintillion', 'sextrigintillion', 'septentrigintillion', 'octotrigintillion', 'novemtrigintillion'];
//       var grp = function grp(n) {
//           return ('000' + n).substr(-3);
//       };
//       var rem = function rem(n) {
//           return n.substr(0, n.length - 3);
//       };
//       var fmt = function fmt(_ref) {
//           var h = _ref[0];
//           var t = _ref[1];
//           var o = _ref[2];
//           return [Number(h) === 0 ? '' : a[h] + ' hundred ', Number(o) === 0 ? b[t] : b[t] && b[t] + '-' || '', a[t + o] || a[o]].join('');
//       };
//       var cons = function cons(xs) {
//         return function (x) {
//           return function (g) {
//             return x ? [x, g && ' ' + g || '', ' ', xs].join('') : xs;
//           };
//         };
//       };
//       var iter = function iter(str) {
//         return function (i) {
//           return function (x) {
//             return function (r) {
//               if (x === '000' && r.length === 0) return str;
//               return iter(cons(str)(fmt(x))(g[i]))(i + 1)(grp(r))(rem(r));
//             };
//           };
//         };
//       };
//       return iter('')(0)(grp(String(n)))(rem(String(n)));
//     };
    utilities.initialize = function (callback) {
        var translation_observer = new MutationObserver(function (mutations) {
                                                            mutations.forEach(function (mutation) {
                                                                var translation_element = $(mutation.target).closest(".toontalk-translation-element").get(0);
                                                                if (translation_element && translation_element.toontalk_callback) {
                                                                    translation_element.toontalk_callback(translation_element.innerText);
                                                                    translation_element.innerText = '';
                                                                    translation_element.toontalk_callback = undefined;
                                                                }
                                                            });
                                                        });
        var add_help_buttons = function () {
                var add_button_or_link = function (id, url, label, title, css) {
                        var element = document.getElementById(id);
                        var button_or_link, click_handler;
                        if (element) {
                            if (TT.CHROME_APP) {
                                click_handler = function (event) {
                                                    utilities.add_iframe_popup(url);
                                                };
                                button_or_link = utilities.create_button(label, "toontalk-manual-button", title, click_handler);
                            } else {
                                button_or_link = document.createElement('a');
                                button_or_link.innerHTML = label;
                                button_or_link.href      = url;
                                button_or_link.title     = title;
                                button_or_link.target    = '_blank';
                                $(button_or_link).addClass('ui-widget toontalk-help-link');
                                utilities.use_custom_tooltip(button_or_link);
                            }       
                            element.appendChild(button_or_link);
                            $(button_or_link).css(css);
                        }
                };
                add_button_or_link("toontalk-manual-button",
                                   "docs/manual/index.html?reset=1",
                                   "Learn about ToonTalk",
                                   "Click to visit the page that introduces everything.",
                                   {"background": "yellow"});
                add_button_or_link("toontalk-manual-tour",
                                   "docs/tours/tour1.html?reset=1",
                                   "Watch a tour of ToonTalk",
                                   "Click to visit a page that replays a tour.",
                                   {"background": "pink"});
                add_button_or_link("toontalk-manual-whats-new",
                                   "docs/manual/whats-new.html?reset=1",
                                   "What's new?",
                                   "Click to visit see what has changed recently.",
                                   {"background": "cyan"});
        };
        var unload_listener = function (event) {
                try {
                    window.speechSynthesis.cancel();
                } catch (e) {
                    // ignore error    
                }
                try {
                    utilities.backup_all_top_level_widgets(true);
                } catch (error) {
                    TT.UTILITIES.report_internal_error(error);
                }
        };
        var continue_initialization = function () {
            document_click =
                function (event) {
        //          event.stopPropagation();
                    $(".toontalk-top-level-resource-container").each(function (index, element) {
                        var widget = element.toontalk_widget_side;
                        if (widget && widget.set_running) {
                            widget.set_running(false);
                        }
                    });
                };
            TT.debugging                    = utilities.get_current_url_parameter('debugging');
            TT.logging                      = utilities.get_current_url_parameter('log');
            // a value between 0 and 1 specified as a percent with a default of 10%
            TT.volume = utilities.get_current_url_numeric_parameter('volume', 10)/100;
            if (TT.volume > 0) {
                initialize_sounds();
            }
            TT.puzzle                        = utilities.get_current_url_boolean_parameter('puzzle', false);
            // puzzle by default sets alt_key_to_open_backside and reset to its value
            TT.open_backside_only_if_alt_key = utilities.get_current_url_boolean_parameter('alt_key_to_open_backside', TT.puzzle);
            TT.reset                         = utilities.get_current_url_boolean_parameter('reset', TT.puzzle);
            TT.speak                         = utilities.get_current_url_boolean_parameter('speak', false);
            TT.listen                        = utilities.get_current_url_boolean_parameter('listen', false);
            if (TT.speak && !window.speechSynthesis) {
                TT.speak = false;
                utilities.display_message("This browser doesn't support speech output. speak=1 in URL ignored.");
            }
            TT.balloons                      = utilities.get_current_url_boolean_parameter('balloons', true);           
            // according to http://www.webspaceworks.com/resources/fonts-web-typography/43/
            // the aspect ratio of monospace fonts varies from .43 to .55
            // .55 'worst' aspect ratio -- adding a little extra here
            TT.FONT_ASPECT_RATIO = 0.64;
            utilities.process_json_elements();
            // for top-level resources since they are not on the backside 'work space' we need a way to turn them off
            // clicking on a running widget may not work since its HTML may be changing constantly
            window.document.addEventListener('click', document_click);
            // frontside's click handler will run the top-level resource widgets if clicked
            TT.DEFAULT_QUEUE = window.TOONTALK.queue.create();
            // might want two queues: so new entries end up in the 'next queue'
            TT.DEFAULT_QUEUE.start();
            if (TT.CHROME_APP) {
                chrome.runtime.onSuspend.addListener(unload_listener);
            } else {
                window.addEventListener('beforeunload', unload_listener);
            }
            TT.TRANSLATION_ENABLED           = utilities.get_current_url_boolean_parameter("translate", false);
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
                // need an element that triggers Google translate to speak arbitrary text
                translation_element = document.createElement('div');
                translation_element.className = 'toontalk-translation-element';
                document.body.appendChild(translation_element);
                translation_observer.observe(translation_element, {characterData: true,
                                                                   subtree: true});
                utilities.translate = function (text, callback) {
                                          var original;
                                          translation_element.innerHTML = text;
                                          original = translation_element.innerText;
                                          translation_element.toontalk_callback = callback;
                };
            } else {
                $("#google_translate_element").remove();
            }
            if (!TT.vacuum.the_vacuum) {
                TT.vacuum.create();
            }
            utilities.add_test_all_button();
            add_help_buttons();
            // compute the default dimensions of robots, birds, nests, and scales (not really needed for scales and causes a bug in test-programs.html)
            discover_default_dimensions('toontalk-robot',       TT.robot);
            discover_default_dimensions('toontalk-empty-nest',  TT.nest);
            discover_default_dimensions('toontalk-bird-static', TT.bird);
            // all titles should use custom tool tips (e.g. those in documentation pages)
            $("[title]").each(function (index, element) {
                                  utilities.use_custom_tooltip(element);
            });
            // making resource tables scalable was awkward to use and mysteriously caused spurious scroll bars on the entire page
//             $(".toontalk-resource-table").each(function (index, element) {
//                 utilities.resizable_and_scalable(element,
//                                                  function (x_scale, y_scale) {
//                                                      var css = {};
//                                                      utilities.set_css_transform(css, "scale(" + x_scale + ", " + y_scale + ")");
//                                                      $(element).css(css);
//                                                  });
//             });
            if (!TOONTALK.RUNNING_LOCALLY) {
                // for Google Analytics -- moved here since inline code not allowed by Chrome Apps
                // loading https://www.google-analytics.com/analytics.js causes an error in Chrome App so use local copy
                (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
                (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
                m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
                })(window,document,'script', (TT.CHROME_APP ? TOONTALK.TOONTALK_URL + 'libraries/analytics.js' : 'https://www.google-analytics.com/analytics.js'),'ga');
                ga('create', 'UA-57964541-1', 'auto');
                if (TT.CHROME_APP) {
                    // for running as Chrome App see - https://davidsimpson.me/2014/05/27/add-googles-universal-analytics-tracking-chrome-extension/
                    ga('set', 'checkProtocolTask', function(){}); // Removes failing protocol check. @see: http://stackoverflow.com/a/22152353/1958200
                    ga('require', 'displayfeatures');
                    ga('send', 'pageview', '/options.html');
                } else {
                    ga('send', 'pageview');
                }
            }
            document.addEventListener("visibilitychange", function() {
                if (document.hidden) {
                    utilities.mute_audio_objects_playing();
                } else {
//                     // make sure all widgets are redisplayed
//                     // first add to DOM element of any widgets that have been created but never rendered
//                     utilities.each_top_level_widget(function (top_level_widget) {
//                         top_level_widget.update_display();
//                     });
                    utilities.rerender_all();
                    utilities.restore_audio_volumes();
                }
            });
//             document.addEventListener('keyDown', function (event) {
//                 var $current_selection, $new_selection;
//                 if (event.ctrlKey) {
//                     $current_selection = $(".toontalk-wiggle");
//                     $new_selection = utilities.element_selected(event, $current_selection);
//                     if ($current_selection !== $new_selection) {
//                         $saved_selection = $current_selection;
//                         $current_selection.removeClass("toontalk-wiggle");
//                         $new_selection.addClass("toontalk-wiggle");
//                     }
//                 }
//             });
//             document.addEventListener('keyUp', function (event) {
//                 if (event.ctrlKey && $saved_selection) {
//                     $(".toontalk-wiggle").removeClass("toontalk-wiggle");
//                     $saved_selection.addClass("toontalk-wiggle");
//                     $saved_selection = undefined;
//                 }
//             });
            setTimeout(function () {
                           TT.DISPLAY_UPDATES.update_display();
                       },
                       100);
            toontalk_initialized = true;
            document.dispatchEvent(TT.UTILITIES.create_event('toontalk_initialized', {}));
        }
        var document_click, translation_div, translation_element, $saved_selection;
        if (toontalk_initialized) {
            return;
        }
        if (utilities.get_current_url_parameter('replace-with-url')) {
            replace_body(continue_initialization);
        } else {
            continue_initialization();
        }
    }; 

    utilities.do_after_initialization = function (callback) {
        if (toontalk_initialized) {
            callback();
        } else {
            document.addEventListener('toontalk_initialized', callback);
        }
    };

    return utilities;
    
}(window.TOONTALK));

// for access in toontalk.js even when compiled
window['initialize_toontalk'] = window.TOONTALK.UTILITIES.initialize;

