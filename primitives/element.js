 /**
 * Implements ToonTalk's interface to HTML elements
 * Authors: Ken Kahn
 * License: New BSD
 */

/*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */
/*global $, BigInteger, bigrat */

(function () {
    
// this internal function is need by both element and element_backside
var is_transformation_option = function (attribute) {
    return (attribute === 'rotate' || attribute === 'skewX' || attribute === 'skewY' || attribute === 'transform-origin-x' || attribute === 'transform-origin-y');
};

var attribute_type = function (attribute) {
    if (['background-color', 'color'].indexOf(attribute) >= 0) {
        return 'string';
    }
    // more to come
    return 'number';
};

var documentation_source = function (attribute) {
    if (attribute === 'transform-origin-x' || attribute === 'transform-origin-y') {
        // # added so rest is ignored
        return "https://developer.mozilla.org/en-US/docs/Web/CSS/transform-origin#" + attribute;
    } else if (is_transformation_option(attribute)) {
        return "https://developer.mozilla.org/en-US/docs/Web/CSS/transform#" + attribute;
    } else {
        return "http://www.w3.org/community/webed/wiki/CSS/Properties/" + attribute;
    }
}; 

window.TOONTALK.element = (function (TT) { // TT is for convenience and more legible code
    "use strict";

    var attributes_needing_updating = ["left", "top", "width", "height"];
    
    var element = Object.create(TT.widget);
    
    var value_in_pixels = function (value, attribute) {
        var last_character, number;
        if (!value) {
            return 0;
        }
        if (typeof value === 'number') {
            number = value;
        }
        if (value.length === 0) {
            number = 0;
        }
        if (typeof number === 'undefined') {
            last_character = value.substring(value.length-1);
            if ("0123456789x".indexOf(last_character) >= 0) {
                // assumes that the only CSS units ending in 'x' is 'px'
                number = parseFloat(value);
                if (isNaN(number)) {
                    return; // undefined
                }
            }
        }
        return canonicalise_value(number, attribute);
    };
    
    var canonicalise_value = function (value, attribute) {
        var new_value;
        if (["rotate", "skewX", "skewY"].indexOf(attribute) >= 0) {
            // ensure the value is between 0 and 360
            new_value = value % 360;
            if (new_value < 0) {
                new_value += 360;
            }
            return new_value;
        }
        return value;
    };

    var wrap_location = function (widget, css) {
        var parent_of_frontside, left, top, changed, container_width, container_height;
        if (css.left || css.top) {
            // elements (like turtles) by default wrap -- TODO: make this configurable
            if (widget.being_dragged) {
                return;
            }
            parent_of_frontside = widget.get_parent_of_frontside();
            if (parent_of_frontside) {
                if (css.left) {   
                    // if negative after mod add width -- do another mod in case was positive
                    // keep it within the bounds of its container
                    // note that if the container has scaling transforms those are ignored here
                    container_width = parent_of_frontside.is_element() ? 
                                      parent_of_frontside.get_original_width() :
                                      parent_of_frontside.get_width();
                    if (container_width > 0) {
                        left = ((css.left%container_width)+container_width)%container_width;
                    } else {
                        left = css.left;
                    }
                    if (css.left !== left) {
                        css.left = left;
                        changed = true;
                    }
                }
                if (css.top) {
                    container_height = parent_of_frontside.is_element() ? 
                                       parent_of_frontside.get_original_height() :
                                       parent_of_frontside.get_height();
                    if (container_height > 0) {
                        top = ((css.top%container_height)+container_height)%container_height;
                    } else {
                        top = css.top;
                    }
                    if (css.top !== top) {
                        css.top = top;
                        changed = true;
                    }
                }
                return changed;
            }
        }
    };
    
    element.create = function (original_html, style_attributes, description, children, sound_effect_or_sound_effect_file_name, video_object_or_video_file_name, ignore_pointer_events, additional_classes) {
        var new_element = Object.create(element);
        var guid = TT.UTILITIES.generate_unique_id(); // needed for copying tables
        var widget_drag_started = new_element.drag_started;
        var attribute_widgets_in_backside_table = {}; // table relating attribute_name and widget in backside table
        var original_copies                     = {}; // table relating attribute_name and all the widget copies for that attribute
        var sound_effect, video_object;
        var source_URL;
        var html, text, initialized, original_width, original_height, current_width, current_height,
            pending_css, transform_css, on_update_display_handlers, $image_element, widget_set_running, widget_can_run;
        if (!style_attributes) {
            style_attributes = ['left', 'top', 'width', 'height'];
        }
        new_element.is_element = function () {
            return true;
        };
        new_element.get_HTML = function () {
            return html;
        };
        new_element.get_guid = function () {
            return guid;
        };
        new_element.get_text = function () {
            var frontside_element, html;
            if (text === undefined) {
                frontside_element = this.get_frontside_element();
                if (frontside_element) {
                    text = frontside_element.textContent;
                } else {
                    // create temporary element with HTML to obtain its text
                    html = this.get_HTML();
                    frontside_element = html && html[0] == '<' && $(html).get(0);
                    if (frontside_element) {
                        document.body.appendChild(frontside_element);
                        text = frontside_element.textContent;
                        $(frontside_element).remove();
                    } else {
                        // plain text element
                        text = html;
                    }
                }
                if (text === "" && frontside_element && frontside_element.nodeName !== "IMG") {
                    // TODO: IMG test should be generalised
                    // might have just been created by dragging from elsewhere
                    this.update_display();
                    text = frontside_element.textContent;
                }
                if (text === "") {
                    // e.g. is an image
                    return this.get_HTML();
                }
            }
            return text;
        };
        new_element.set_HTML = function (new_value) {
            var frontside_element = this.get_frontside_element();
            var transform_HTML = function (html) {
                // maybe more to come but now adds target='_blank' to anchors
                // TOOD: determine if there are situations where this isn't wanted and the current page should be replaced
                var anchor_start = 0;
                var target_blank = "target='_blank'"; // TODO: make constant after ECMA version 5
                var anchor_end, target_blank_start;
                while (true) {
                    anchor_start = html.indexOf("<a ", anchor_start);
                    if (anchor_start < 0) {
                        break;
                    }
                    anchor_end = html.indexOf('>', anchor_start);
                    if (anchor_end < 0) {
                        break;
                    }
                    anchor_start += 3;
                    target_blank_start = html.indexOf(target_blank, anchor_start);
                    if (target_blank_start < 0 || target_blank_start > anchor_end) {
                        html = html.substring(0, anchor_start) + target_blank + html.substring(anchor_start);
                    }
                }
                if (html.indexOf("data:image") === 0) {
                    html = "<image src='" + html + "'>";
                } else if (html.indexOf("data:audio") === 0) {
                    html = "<audio src='" + html + "'>";
                } else if (html.indexOf("data:video") === 0) {
                    html = "<video src='" + html + "'>";
                }
                // TODO: support data: text, uuencoded text, and HTML
                return html;
            }.bind(this);
            if (html === new_value) {
                return false;
            }
            html = transform_HTML(new_value);
            if (!frontside_element) {
                return false;
            }
            // remove children so will be updated
            $(frontside_element).children(":not(.ui-resizable-handle)").remove();
            if (this.is_plain_text_element()) {
                // the following is necessary so that when placed in boxes
                // and is scaled to fit it doesn't change its line breaks
                // note that don't want to set the html instance variable
                frontside_element.innerHTML = html.replace(/ /g, "&nbsp;");
            } else {
                frontside_element.innerHTML = html; // until re-rendered
            }
            if (initialized) {
                // need to know new dimensions to scale appropriately
                this.compute_original_dimensions(true);
            }
            return true;
        };
        // sub classes can call set_HTML_from_sub_classes from within their set_HTML without recurring 
        // since this closes over value calling super by storing and invoking this.set_HTML doesn't work 
        // if as in attribute_object.set_HTML it needs to set_HTML of its copies (without each of them doing the same)
        new_element.set_HTML_from_sub_classes = new_element.set_HTML;
        new_element.set_text = function (new_value) {
            var frontside_element = this.get_frontside_element();
            var set_first_text_node = function (element) {
                $(element).contents().each(function () {
                    if (this.nodeType == Node.TEXT_NODE) {
                        this.textContent = new_value;
                        new_value = ""; // empty the other ones
                    } else {
                        set_first_text_node(this, new_value);
                    }
                });
            }
            if (!frontside_element) {
                return false;
            }
            if (new_value === frontside_element.textContent) {
                return false;
            }
            if ($(frontside_element).is(".toontalk-plain-text-element")) {
                return this.set_HTML(new_value);
            }
            set_first_text_node(frontside_element);
            return this.set_HTML(frontside_element.innerHTML);
        };
        new_element.get_style_attributes = function () {
            return style_attributes;
        };
        new_element.set_style_attributes = function (new_value) {
            style_attributes = new_value;
        };
        new_element.get_attribute_widgets_in_backside_table = function () {
            return attribute_widgets_in_backside_table;
        };
        new_element.set_attribute_widgets_in_backside_table = function (new_value) {
            attribute_widgets_in_backside_table = new_value;
        };
        new_element.get_original_copies = function () {
            return original_copies;
        };
        new_element.get_pending_css = function () {
            return pending_css;
        };
        new_element.get_transform_css = function () {
            return transform_css;
        };
        new_element.add_to_css = function (attribute, value) {
            if (is_transformation_option(attribute)) {
                // could remove attribute if value is 0
                if (!transform_css) {
                    transform_css = {};
                }
                transform_css[attribute] = value;
                return;
            }
            if (!pending_css) {
                pending_css = {};
            }
            pending_css[attribute] = value;
        };
        new_element.apply_css = function () {
            var transform = "";
            var frontside_element, current_pending_css;
            if (!pending_css && !transform_css) {
                return;
            }
            frontside_element = this.get_frontside_element();
            if (!frontside_element) {
                return;
            }
            if ($(frontside_element).is(".toontalk-not-observable")) {
                // trying to figure out its original dimensions
                return;
            }
            if (!jQuery.contains(window.document, frontside_element)) {
                // not yet visible so postpone
                TT.UTILITIES.when_attached(frontside_element, this.apply_css.bind(this));
//                 if (!count) {
//                     count = 1;
//                 } else {
//                     count++;
//                 }
//                 if (count < 100) {
//                     // give up after 100 tries (10 seconds)
//                     TT.UTILITIES.set_timeout(function () {
//                         this.apply_css(count);
//                     }.bind(this),
//                     100);
//                 }
                return;
            }
            if (pending_css) {
                if (pending_css.width) {
                    current_width  = pending_css.width;
                }
                if (pending_css.height) {
                    current_height = pending_css.height;
                }
            } else {
                pending_css = {};
            }
            if (transform_css) {
                if (typeof transform_css['rotate'] === 'number') {
                    transform += 'rotate(' + transform_css['rotate'] + 'deg)';
                }
                if (typeof transform_css['skewX'] === 'number') {
                    transform += 'skewX(' + transform_css['skewX'] + 'deg)';
                }
                if (typeof transform_css['skewY'] === 'number') {
                    transform += 'skewY(' + transform_css['skewY'] + 'deg)';
                }
                if (typeof transform_css['transform-origin-x']  === 'number'|| typeof transform_css['transform-origin-y'] === 'number') {
                    pending_css['transform-origin'] = (transform_css['transform-origin-x'] || 0) + ' ' + (transform_css['transform-origin-y'] || 0);
                }
            };
            if (current_width || current_height) {
                // if it contains an image then change it too (needed only for width and height)
                // TODO: is the following still needed?
                if ($image_element) {
                    $image_element.css({width:  original_width,
                                        height: original_height});
                }
                if (this.is_plain_text_element()) {
                    this.plain_text_dimensions();
                }
                $(frontside_element).css({width: '', height: ''});
                current_pending_css = pending_css;
                TT.UTILITIES.run_when_dimensions_known(frontside_element,
                                                       function (original_parent) {
                                                           var parent = this.get_parent_of_frontside();
                                                           wrap_location(this, current_pending_css);
                                                           TT.UTILITIES.scale_element(frontside_element,
                                                                                      current_width,
                                                                                      current_height,
                                                                                      original_width,
                                                                                      original_height,
                                                                                      transform,
                                                                                      current_pending_css,
                                                                                      original_parent,
                                                                                      // no need to translate if no parent
                                                                                      !parent);
                                                           pending_css = undefined;
                                                       }.bind(this));
                return;
            } else {
                // use center center for transform-origin unless in a box hole
                wrap_location(this, pending_css);
                TT.UTILITIES.add_transform_to_css(transform, "", pending_css, frontside_element.parentElement.className.indexOf("toontalk-box-hole") < 0);
                $(frontside_element).css(pending_css);
            }
            pending_css = undefined;
        };
        new_element.on_update_display = function (handler) {
            if (!on_update_display_handlers) {
                on_update_display_handlers = [handler];
            } else {
                on_update_display_handlers.push(handler);
            }
        };
        new_element.fire_on_update_display_handlers = function () {
            if (on_update_display_handlers) {
                TT.UTILITIES.set_timeout(function () {
                        on_update_display_handlers.forEach(function (handler, index) {
                            if (!handler()) {
                                // transient handler
                                on_update_display_handlers.splice(index, 1);
                            };
                        });
                    });   
            }
        };
        new_element.get_image_element = function () {
            return $image_element;
        };
        new_element.set_image_element = function (element, frontside_element) {
            $image_element = $(element).find("img");
            if ($image_element.length === 0) {
                $image_element = undefined;
            } else {
                // make sure that the front side has the same dimensions as its image
                $(frontside_element).width( $image_element.width());
                $(frontside_element).height($image_element.height());
            }
        };
        new_element.get_additional_classes = function () {
            return additional_classes;
        };
        new_element.set_additional_classes = function (new_value) {
            additional_classes = new_value;
        };
        new_element.get_children = function () {
            return children;
        };
        new_element.set_sound_effect = function (new_value) {
            sound_effect = new_value;
            sound_effect.volume = TT.UTILITIES.get_audio_volume(sound_effect);
        };
        new_element.get_sound_effect = function () {
            return sound_effect;
        };
        new_element.get_video_object = function () {
            var frontside_element;
            if (!video_object) {
                frontside_element = this.get_frontside_element();
                if (frontside_element) {
                    video_object = frontside_element.getElementsByTagName('video')[0];
                }
            }
            return video_object;
        };
        new_element.set_video_object = function (new_value) {
            video_object = new_value;
        };
        new_element.get_ignore_pointer_events = function () {
            return ignore_pointer_events;
        };
        new_element.set_ignore_pointer_events = function (new_value) {
            ignore_pointer_events = new_value;
             $(this.get_frontside_element()).find(":not(ui-resizable-handle)")
                                            .css({"pointer-events": new_value ? "none" : "auto"});
        };
        new_element.get_source_URL = function () {
            return source_URL;
        };
        new_element.set_source_URL = function (new_value) {
            var old_value = source_URL;
            if (old_value === new_value) {
                return;
            }
            source_URL = new_value;
            this.refresh();
            return true;
        };
        new_element.use_scaling_transform = function (css) {
            if (css.width === '') {
                css.width = undefined;
            }
            if (css.height === '') {
                css.height = undefined;
            }
            // instead of updating the CSS width and height this uses the scaling transform instead
            if (original_width === undefined) {
                TT.UTILITIES.run_when_dimensions_known(this.get_frontside_element(),
                                                       function () {
                                                           TT.UTILITIES.scale_element(this.get_frontside_element(), css.width, css.height, original_width, original_height, undefined, css);
                                                       }.bind(this));
            } else {
                TT.UTILITIES.scale_element(this.get_frontside_element(), css.width, css.height, original_width, original_height, undefined, css);
            }
        };
        new_element.add_standard_widget_functionality(new_element);
        widget_set_running = new_element.set_running.bind(new_element);
        new_element.set_running = function (new_value, top_level_context) {
            widget_set_running(new_value, top_level_context);
            // and also any attribute value widgets
            Object.keys(attribute_widgets_in_backside_table).forEach(function (attribute_name) {
                attribute_widgets_in_backside_table[attribute_name].set_running(new_value, top_level_context);
            });
            if (!new_value && this.visible()) {
                // if stopped ensure that the latest attribute values are used to render this
                style_attributes.forEach(function (attribute_name) {
                                             this.add_to_css(attribute_name, this.get_attribute(attribute_name));
                                         }.bind(this));
                this.rerender();
            }
            children.forEach(function (child) {
                child.set_running(new_value, top_level_context);
            });
        };
        widget_can_run = new_element.can_run.bind(new_element);
        new_element.can_run = function () {
            var result;
            if (widget_can_run()) {
                return true;
            }
            Object.keys(attribute_widgets_in_backside_table).some(function (attribute_name) {
                if (attribute_widgets_in_backside_table[attribute_name].can_run()) {
                    result = true;
                    return true;
                }
            });
            if (result) {
                return result;
            }
            children.some(function (child) {
                if (child.can_run()) {
                    result = true;
                    return true;
                }
            });
            return result;
        }
        new_element.drag_started = function (json, is_resource) {
            this.drag_x_offset = json.view.drag_x_offset;
            this.drag_y_offset = json.view.drag_y_offset;
            widget_drag_started.call(this, json, is_resource);
        };
        new_element.update_display = function () {
            var frontside_element = this.get_frontside_element(true);
            var backside = this.get_backside();
            var element_description = function (element) {
                if (this.get_image_element()) {
                    return "image";
                }
                if ($(element).is(".toontalk-plain-text-element")) {
                    return "text";
                }
                return "element";
            }.bind(this);
            if (this.being_dragged) {
                return;
            }
            if (this.get_erased()) {
                var width, height;
                if ($(frontside_element).parent(".toontalk-backside").is("*")) {
                    width  = "";
                    height = "";
                } else {
                    width  = "100%";
                    height = "100%";
                }
                this.save_dimensions();
                $(frontside_element).removeClass() // remove them all
                                    .empty()
                                    .addClass("toontalk-erased-element toontalk-side")
                                    .css({width:  width,
                                          height: height,
                                          transform: ''}); // remove any transformations
                if ($(frontside_element).parent(".toontalk-conditions-contents-container").is("*")) {
                    TT.UTILITIES.give_tooltip(frontside_element, "This is an element that has been erased. It will match any element.");
                } else {
                    TT.UTILITIES.give_tooltip(frontside_element, "This is an erased element. It will replace its HTML with the HTML of the element you drop on it.");            
                }
                return;
            }
            if ($(frontside_element).is(".toontalk-erased-element")) {
                // was erased but no longer
                $(frontside_element).removeClass("toontalk-erased-element");
                this.restore_dimensions();
            }
            this.initialize_element();
            if (TT.UTILITIES.on_a_nest_in_a_box(frontside_element)) {
                // need to work around a CSS problem where nested percentage widths don't behave as expected
                this.set_attribute('width',  $(frontside_element).closest(".toontalk-box-hole").width(),  false);
                this.set_attribute('height', $(frontside_element).closest(".toontalk-box-hole").height(), false);
            }
            if (typeof original_width === 'undefined' && frontside_element.parentElement) {
                // if it doesn't have a parentElement it is too early
                this.compute_original_dimensions();
            }
            this.apply_css();
            if (children) {
                children.forEach(function (child) {
                    frontside_element.appendChild(child.get_frontside_element(true));
                    child.set_visible(true);
                    child.update_display();
                });
            } else {
                children = [];
            }
            this.fire_on_update_display_handlers();
            TT.UTILITIES.give_tooltip(frontside_element,
                                      "Click to see the backside where you can place robots or change the style of this " + 
                                      element_description(frontside_element) + ".");
            // will enable/disable as appropriate
            this.set_ignore_pointer_events(this.get_ignore_pointer_events());
        };
        new_element.initialize_element = function () {
            var frontside_element, resize_handles, additional_classes, is_plain_text, htmnl;
            if (initialized) {
                return;
            }
            frontside_element = this.get_frontside_element();
            if (frontside_element) {
                resize_handles = $(frontside_element).children(".ui-resizable-handle");
                html =  this.get_HTML();
                is_plain_text = this.is_plain_text_element();
                // the introduction of non-breaking spaces is necessary for plain text elements
                // so that when placed in boxes they don't change shape
                frontside_element.innerHTML = is_plain_text ? html.replace(/ /g, "&nbsp;") : html;
                $(frontside_element).addClass("toontalk-element-frontside");
                if (is_plain_text) {
                    //  give it a class that will give it a better font and size
                    additional_classes = this.get_additional_classes();
                    if (additional_classes) {
                        $(frontside_element).addClass(additional_classes);
                    }
                    $(frontside_element).addClass("ui-widget toontalk-plain-text-element");
                    if (!this.location_constrained_by_container()) {
                        this.plain_text_dimensions();
                    }
                } else {
                    $(frontside_element).addClass("toontalk-non-plain-text-element");
                }
                initialized = true;
            }
        };
        new_element.is_plain_text_element = function () {
            var html = this.get_HTML();
            var element_start;
            // is not plain text if it contains <x ... where x is a character
            if (!html) {
                return;
            }
            return !html.match(/<\w/);
        };
        new_element.plain_text_dimensions = function () {
            // this is to scale the element (and its font) properly
            // TODO: fix this in a principled manner
            original_width  = 9*this.get_HTML().length;
            original_height = 24;
        };
        new_element.compute_original_dimensions = function (recompute) {
            TT.UTILITIES.original_dimensions(this, 
                                             function (width, height) {
                                                 var parent = this.get_parent_of_frontside();
                                                 original_width  = width;
                                                 original_height = height;
                                                 if (parent) {
                                                     if (parent.get_box) {
                                                         parent.get_box().rerender();
                                                         return;
                                                     } // else if there is another container that constrains the dimensions of this rerender it too
                                                 }
                                                 // reapply CSS attribute values
                                                 style_attributes.forEach(function (attribute_name) {
                                                                              // should this be conditional on attribute name not being 'left' or 'top'?
                                                                              this.add_to_css(attribute_name, this.get_attribute(attribute_name));
                                                                          }.bind(this));
                                                 this.rerender();
                                             }.bind(this),
                                             recompute);
        };
        new_element.get_attribute_from_current_css = function (attribute) {
            var frontside_element, value;
            if (attribute === 'width' && (current_width || original_width)) {
                return current_width || original_width;
            }
            if (attribute === 'height' && (current_height || original_height)) {
                return current_height || original_height;
            }
            frontside_element = this.get_frontside_element(true);
            value = TT.UTILITIES.get_style_numeric_property(frontside_element, attribute);
//             value = frontside_element.style[attribute];
            if (value === "") {
                // this caused integer rounding (at least of font-size)
                // but if the above doesn't find a value seems sometimes this does
                value = $(frontside_element).css(attribute);
            }
            if (!value) {
                // zero is the default value -- e.g. for transformations such as rotate
                return 0;
            }
            if (typeof value === 'number') {
                if (original_width && current_height) {
                    // adjust position if scaled since origin is not top left
                    if (attribute === 'left') {
                        return value+(original_width-current_width)/2;
                    }
                    if (attribute === 'top') {
                        return value+(original_height-current_height)/2;
                    }
                }
                return value;
            }
            if (value.charAt(value.length-1) === "%") {
                if (attribute === 'left' || attribute === 'top') {
                    return $(frontside_element).offset()[attribute];
                }
                // any need for something like the following?
                // return parseFloat(value.substring(0, value.length-2))*attribute-of-parent;
            }
            return value;
        };
        new_element.get_original_width = function () {
            return original_width;
        };
        new_element.get_original_height = function () {
            return original_height;
        };
        new_element.increment_width = function (delta) {
//          console.log("delta: " + delta + " new width: " + ((current_width  || original_width) + delta));
            this.set_attribute('width',  (current_width  || original_width)  + delta);
        };
        new_element.increment_height = function (delta) {
            this.set_attribute('height', (current_height || original_height) + delta);
        };
        new_element.get_width = function () {
            return current_width;
        };
        new_element.get_height  = function () {
            return current_height;
        };
        new_element.add_child = function (widget) {
            var $widget_element = $(widget.get_frontside_element(true));
            var $this_element   = $(this.get_frontside_element(true));
            var new_relative_position;
            children.push(widget);
            widget.set_parent_of_frontside(this);
            new_relative_position = TT.UTILITIES.set_position_relative_to_element($widget_element, $this_element, $widget_element.offset(), true);
            if (widget.is_element()) {
                widget.set_location_attributes(new_relative_position.left, new_relative_position.top);
            }
            // signal event in case a sensor is listening
            $this_element.get(0).dispatchEvent(TT.UTILITIES.create_event('widget added', {element_widget: $widget_element.get(0),
                                                                                          where: 'front'}));
            if (this.robot_in_training()) {
                this.robot_in_training().dropped_on(widget, this);
            }
        };
        new_element.removed_from_container = function (child_side, event) {
            var index = children.indexOf(child_side);
            if (index >= 0) {
                children.splice(index, 1);
            }
        };
        new_element.set_HTML(original_html.toString());
        new_element.set_description(description);
        if (sound_effect_or_sound_effect_file_name) {
            // by supporting both the sound effect and the file name we can get sharing of audio objects between copies of the same element
            if (typeof sound_effect_or_sound_effect_file_name === 'string') { 
                new_element.set_sound_effect(new Audio(sound_effect_or_sound_effect_file_name));
            } else {
                new_element.set_sound_effect(sound_effect_or_sound_effect_file_name);
            }
        }
        if (video_object_or_video_file_name) {
            // by supporting both the video object and the file name we can get sharing of video objects between copies of the same element
            if (typeof video_object_or_video_file_name === 'string') {
                original_html = "<video src='" + video_object_or_video_file_name + "' alt='" + video_object_or_video_file_name + "'/>"
            } else {
                video_object = video_object_or_video_file_name;
            }
        }
        if (TT.debugging) {
            new_element._debug_id = TT.UTILITIES.generate_unique_id();
            new_element._debug_string = new_element.to_debug_string();
        }
        if (children) {
            children.forEach(function (child) {
                child.set_parent_of_frontside(new_element);
            });
        } else {
            children = [];
        }
        return new_element;
    };
    
    element.copy = function (parameters) {
        // copy has a copy of the attributes array as well
        var style_attributes = this.get_style_attributes();
        var copy = element.create(this.get_HTML(), 
                                  style_attributes.slice(),
                                  this.get_description(),
                                  TT.UTILITIES.copy_widgets(this.get_children()),
                                  this.get_sound_effect(),
                                  this.get_video_object(),
                                  this.get_ignore_pointer_events());
        var attribute_widgets_in_backside_table = this.get_attribute_widgets_in_backside_table();
        var attribute_widgets_in_backside_table_copy = {};
        var backside = copy.get_backside(this.visible());
        copy.set_source_URL(this.get_source_URL());
        if (parameters) {
            if (!parameters.elements_copied) {
                parameters.elements_copied = {};
            }
            parameters.elements_copied[this.get_guid()] = copy;
        }
        Object.keys(attribute_widgets_in_backside_table).forEach(function (attribute_name) {
                                        attribute_widgets_in_backside_table_copy[attribute_name] = attribute_widgets_in_backside_table[attribute_name].copy(parameters);
                                        attribute_widgets_in_backside_table_copy[attribute_name].set_parent_of_frontside(backside, false, true); // a white lie
                                        copy.set_attribute(attribute_name, this.get_attribute(attribute_name));
                                 }.bind(this));
        copy.set_attribute_widgets_in_backside_table(attribute_widgets_in_backside_table_copy);        
        return this.add_to_copy(copy, parameters);
    };
    
    element.match = function (other) {
        if (this.get_erased && this.get_erased()) {
            if (other.match_with_any_element) {
                return other.match_with_any_element();
            }
            this.last_match = other;
            return this;
        }
        if (!other.match_with_another_element_widget) {
            this.last_match = other;
            return this;
        }
        return other.match_with_another_element_widget(this);
    };
    
    element.match_with_any_element = function () {
        return 'matched';
    };
    
    element.match_with_another_element_widget = function (element_pattern) {
        // TODO: match children elements as well
        var text_pattern;
        if (this.get_HTML() === element_pattern.get_HTML()) {
            return 'matched';
        }
        text_pattern = element_pattern.get_text();
        if (text_pattern !== "" && text_pattern === this.get_text()) {
            return 'matched';
        }
        element_pattern.last_match = this;
        return element_pattern;
    };

    element.compare_with = function (other) {
        if (other.compare_with_other_element) {
            return other.compare_with_other_element(this);
        }
    };

    element.compare_with_other_element = function (other_element) {
        var comparison = other_element.get_HTML().localeCompare(this.get_HTML());
        if (comparison < 0) {
            return -1;
        }
        if (comparison > 0) {
            return 1;
        }
        return comparison;
    };

    element.get_path_to = function (widget, robot) {
        var children = this.get_children();
        var index = children.indexOf(widget);
        var path, sub_path;
        if (index >= 0) {
            return element.path.create(index);
        }
        children.forEach(function (child, child_index) {    
            if (child.get_path_to) {
                sub_path = child.get_path_to(widget, robot);
                if (sub_path) {
                    path = element.path.create(child_index);
                    path.next = sub_path;
                }
            }
        });
        return path;
    };

    TT.creators_from_json["element_path"] = function (json, additional_info) {
        var path = element.path.create(json.index);
        if (json.next) {
            path.next = TT.UTILITIES.create_from_json(json.next, additional_info);
        }
        return path;
    };

    element.dereference_path = function (path, top_level_context, robot) {
        var index, child, children;
        if (path) {
            index = path.get_index && path.get_index();
            if (!TT.debugging || typeof index === 'number') {
                children = this.get_children();
                child = children[index]
                if (child) {
                    if (child.dereference_contents && !path.not_to_be_dereferenced) {
                        // this will dereference the top of a nest instead of the nest itself
                        return child.dereference_contents(path.next || path, top_level_context, robot);
                    }
                    if (path.next) {
                        if (child.dereference_path) {
                            return child.dereference_path(path.next, top_level_context, robot);
                        } else {
                            TT.UTILITIES.report_internal_error("Expected to refer to a child of " + child + " but it lacks a method to obtain " + TT.path.toString(path.next));
                        }
                    }
                    if (path.removing_widget) {
                        if (!child.get_infinite_stack()) {
                            robot.remove_from_container(child, this);
                        }
                    }
                    return child;
                }
            }
            TT.UTILITIES.report_internal_error(this + " unable to dereference the path: " + TT.path.toString(path));
        } else {
            return this;
        }
    };

    element.path = {
        create: function (index) {
            return {
                get_index: function () {
                    return index;
                },
                toString: function () {
                    return "the " + TT.UTILITIES.ordinal(index) + " widget ";
                },
                get_json: function (json_history) {
                    return {type: "element_path",
                            index: index,
                            next: this.next && this.next.get_json(json_history)};
                }
            };
        }
    };

    element.widget_side_dropped_on_me = function (side_of_other, event, robot) {
        // TODO: involve Bammer the Mouse if being watched
        // TODO: use erased widgets for type coercion
        if (side_of_other.is_backside()) {
            return false;
        }
        if (!side_of_other.is_element() && !side_of_other.is_number()) {
            // numbers can become more "element" like when on another element -- e.g. the score
            // TODO: render numbers on top of elements differently
            return false;
        }
        if (this.get_erased() && side_of_other.get_HTML) {
            this.set_HTML(side_of_other.get_HTML());
            this.set_erased(false);
            side_of_other.remove();
        } else {
            this.add_child(side_of_other);
            this.rerender();
        }
        return true;
    };
    
    element.create_backside = function () {
        return TT.element_backside.create(this);
    };

    element.get_attribute_from_pending_css = function (attribute) {
        var pending_css = this.get_pending_css();
        var transform_css;
        if (pending_css && pending_css[attribute]) {
            return pending_css[attribute];
        }
        transform_css = this.get_transform_css();
        if (transform_css && transform_css[attribute]) {
            return transform_css[attribute];
        }
    };
    
    element.get_attribute = function (attribute) {
        var value = this.get_attribute_from_pending_css(attribute);
        var adjustment, frontside_element;
        if (attribute === 'left') {
            frontside_element = this.get_frontside_element();
            adjustment = TT.UTILITIES.translate_x(frontside_element);
        } else if (attribute === 'top') {
            frontside_element = this.get_frontside_element();
            adjustment = TT.UTILITIES.translate_y(frontside_element);
        } else {
            adjustment = 0;
        }
        if (typeof value !== 'undefined' && value != 'auto') {
            return value+adjustment;
        };
        return this.get_attribute_from_current_css(attribute)+adjustment;
    };
    
    element.set_attribute = function (attribute, new_value, handle_training, add_to_style_attributes) {
        var frontside = this.get_frontside(true);
        var frontside_element = frontside.get_element();
        var css = {};
        var current_value, new_value_number;
        var adjustment, style_attributes;
        if (!frontside_element) {
            return false;
        }
        if (attribute === 'left') {
            adjustment = TT.UTILITIES.translate_x(frontside_element);
        } else if (attribute === 'top') {
            adjustment = TT.UTILITIES.translate_y(frontside_element);
        } else {
            adjustment = 0;
        }
        current_value = this.get_attribute_from_pending_css(attribute);
        new_value -= adjustment;
        if (current_value === new_value) {
            return false;
        }
        if (typeof current_value === 'undefined') {
            current_value = this.get_attribute_from_current_css(attribute);
            if (current_value === new_value) {
                return false;
            }
        }      
        // need to use a number for JQuery's css otherwise treats "100" as "auto"
        new_value_number = value_in_pixels(new_value, attribute);
        if (typeof new_value_number === 'number') {
            if (current_value == new_value_number) {
                // using == instead of === since want type coercion. current_value might be a string
                return false;
            }
            // seems we have to live with integer values for width and height
//             if ((attribute === 'width' || attribute === 'height') &&
//                 current_value == Math.round(new_value_number)) { // note double equal here
//                 // width and height as CSS style attributes become integers so don't set if equal when rounded
//                 return;
//             }
            new_value = new_value_number;
        }
        if (handle_training && this.robot_in_training()) {
            this.robot_in_training().edited(this, {setter_name: "set_attribute",
                                                   argument_1: attribute,
                                                   argument_2: new_value,
                                                   toString: "change the '" + attribute + "' style to " + new_value + " of",
                                                   button_selector: ".toontalk-element-" + attribute + "-attribute-input"});
        }
        this.add_to_css(attribute, new_value);
        if (add_to_style_attributes) {
            style_attributes = this.get_style_attributes();
            if (style_attributes.indexOf(attribute) < 0) {
                style_attributes.push(attribute);
            }
        }
        this.rerender();
        return true;
    };
    
    element.dropped_on_style_attribute = function (dropped, attribute_name, event, robot) {
        var widget_string, widget_number, attribute_name, attribute_value, attribute_numerical_value, new_value;
        if (!dropped) {
            return;
        }
        widget_string = dropped.toString();
        if (dropped.is_number()) {
            attribute_value = this.get_attribute(attribute_name);
            if (typeof attribute_value === 'number') {
                attribute_numerical_value = attribute_value;
            } else if (attribute_value === 'auto') {
                switch (attribute_name) {
                    case "left":
                    attribute_numerical_value = $(this.get_frontside_element()).offset().left;
                    break;
                    case "top":
                    attribute_numerical_value = $(this.get_frontside_element()).offset().top;
                    break;
                    default:
                    attribute_numerical_value = 0;
                }
            } else {
                attribute_numerical_value = parseFloat(attribute_value);
                // what if NaN?
            }
            widget_number = dropped.to_float();
            switch (widget_string.substring(0, 1)) {
                case '-':
                new_value = attribute_numerical_value - widget_number;
                break;
                case '*':
                new_value = attribute_numerical_value * widget_number;
                break;
                case '/':
                new_value = attribute_numerical_value / widget_number;
                break;
                case '^':
                new_value = Math.pow(attribute_numerical_value, widget_number);
                break;
                default:
                new_value = attribute_numerical_value + widget_number;
            }
            // following doesn't handle training since is handled below
            this.set_attribute(attribute_name, new_value, false);
            if (event || (robot && robot.visible())) {
                this.get_backside().render();
            }
        }
        if (!dropped.get_infinite_stack()) {
            dropped.remove();
        }
        if (event && this.robot_in_training()) {
            this.robot_in_training().dropped_on(dropped, this.create_attribute_widget(attribute_name));
        }
    };

    element.get_attribute_widget_in_backside_table = function (attribute_name, dont_create, additional_info) {
        var attribute_widget = this.get_attribute_widgets_in_backside_table()[attribute_name];
        if (!attribute_widget && !dont_create) {
            attribute_widget = this.create_attribute_widget(attribute_name, additional_info);
            this.get_attribute_widgets_in_backside_table()[attribute_name] = attribute_widget;
        }
        return attribute_widget;
    };

    element.create_attribute_widget = function (attribute_name, additional_info) {
        var selector = ".toontalk-element-" + attribute_name + "-attribute-input";
        var backside_element = this.get_backside_element();
        var attribute_value = this.get_attribute(attribute_name);
        var this_element_widget = this;
        var add_attribute_widget_functionality = function (attribute_name, attribute_widget) {
            var widget_to_string               = attribute_widget.toString;
            var widget_equals                  = attribute_widget.equals;
            var widget_get_custom_title_prefix = attribute_widget.get_custom_title_prefix;
            var remove_widget = attribute_widget.remove;
            // following needs to be in an outer scope for drag_listener
            widget_update_display = attribute_widget.update_display;
            attribute_widget.element_widget = this;
            attribute_widget.attribute = attribute_name; // TODO: rename? use accessors?
            attribute_widget.get_type_name = function (plural) {
                if (plural) {
                    return "element attributes";
                }
                return "element attribute";
            };
            attribute_widget.toString = function () {
                return widget_to_string.call(this) + " (" + this.attribute + " of " + this.get_attribute_owner() + ")";   
            };
            attribute_widget.get_default_description = function () {
                return "a number that is the " + this.attribute + " of " + this.get_attribute_owner().toString({plain_text: true}) + ".";
            };
            attribute_widget.get_custom_title_prefix = function () {
                return "I'm the '" + this.attribute + "' attribute of " + this.get_attribute_owner() + ".\n" +
                       "Drop a number on me or edit my back side to change my value. My back side has an info button to learn more.";
            };
            attribute_widget.equals = function (other) {
                if (attribute_name === other.attribute) {
                    return this.equals(other.element_widget);
                }
                return widget_equals.call(this, other);
            };
            attribute_widget.update_display = function () {
                var attribute_value, owner, decimal_value, css;
                if (!this.get_erased()) {
                    owner = this.get_attribute_owner();
                    if (owner.get_parent_of_frontside() && owner.get_parent_of_frontside().is_element() && !owner.being_dragged) {
                        // owner is part of an element so use its value to determine the CSS of this child
                        css = {};
                        decimal_value = bigrat.toDecimal(this.get_value());
                        css[this.attribute] = decimal_value;
                        if (wrap_location(owner, css)) {
                            this.set_value(css[this.attribute]);
                        }
                        $(owner.get_frontside_element()).css(css);
                    } else {
                        // if owner is "free" (not a child of another element widget) then it should be updated with the current value
                        attribute_value = owner.get_attribute(this.attribute);
                        value_setter(attribute_value);
                    }
                }
                widget_update_display.call(this);
            };
            widget_copier = attribute_widget.copy.bind(attribute_widget);
            attribute_widget.copy = function (parameters) {
                var copy_of_this_element_widget;
                if (parameters)  {
                    if (parameters.just_value) {
                        // just copy as a number
                        return widget_copier(parameters);
                    }
                    if (parameters.elements_copied) {
                        copy_of_this_element_widget = parameters.elements_copied[this_element_widget.get_guid()];
                    }
                }
                return this.add_to_copy((copy_of_this_element_widget || this_element_widget).create_attribute_widget(attribute_name), parameters);
            };
            attribute_widget.get_json = function (json_history) {
                return {type: 'attribute_widget',
                        attribute_name: attribute_name,
                        element: TT.UTILITIES.get_json(this_element_widget, json_history)};            
            };
            attribute_widget.get_original_attribute_widget = function () {
                var copies = this_element_widget.get_original_copies()[attribute_name];
                return copies && copies[0];
            };
            attribute_widget.get_attribute_owner = function () {
                // return this_element_widget or backside top ancestor of type element
                var get_backside_parent = function (widget) {
                    // follows front side parent until a backside parent is found
                    var parent = widget.get_parent_of_frontside();
                    if (parent) {
                        if (parent.is_backside()) {
                            return parent;
                        }
                        if (parent.is_nest()) {
                            // nests "insulates attribute widgets from changing "aligence" to what they are on the back of
                            return;
                        }
                        return get_backside_parent(parent.get_widget());
                    }
                    // if backside never opened then the attribute_widget may not have a parent
                    // which is OK since will treat this_element_widget as its owner
                };
                // if this is a copy use the original 
                var original, backside_ancestor_side, widget, widget_parent;
                backside_ancestor_side = get_backside_parent(this);
                if (!backside_ancestor_side) {
                    original = this.get_original_attribute_widget();
                    if (original && original !== this) {
                        return original.get_attribute_owner();
                     }
                     return this_element_widget;
                }
                if (!backside_ancestor_side.get_widget().is_element()) {
                    return this_element_widget;
                }
                widget = backside_ancestor_side.get_widget();
                widget_parent = widget.get_parent_of_backside();
                while ((widget_parent &&
                        widget_parent.get_widget().is_element())) {
                    widget = widget_parent.get_widget();
                    widget_parent = widget.get_parent_of_backside();
                }
                return widget;
            };
            attribute_widget.remove = function (event, do_not_remove_children) {
                // when removing an attribute widget also remove it from the table of original copies
                var original_copies = this_element_widget.get_original_copies()[attribute_name];
                var index = original_copies && original_copies.indexOf(this);
                if (index >= 0) {
                    original_copies.splice(index, 1);
                }
                remove_widget.call(this, event, do_not_remove_children);
            };
            attribute_widget.get_help_URL = function () {
                return documentation_source(attribute_name);
            };
        }.bind(this);
        var create_numeric_attribute_widget = function (attribute_name, attribute_value) {
            var attribute_widget = TT.number.create(0, 1);
            add_attribute_widget_functionality(attribute_name, attribute_widget);
            attribute_widget.set_value_from_decimal(attribute_value);
            attribute_widget.set_format('decimal');
            // another way to implement this would be for the recursive call to add an extra parameter: ignore_copies
            attribute_widget.set_value = function (new_value) {
                try {
                    // need to convert new_value into a decimal approximation
                    // since bigrat.toDecimal works by converting the numerator and denominator to JavaScript numbers
                    // so best to approximate -- also should be faster to do arithmetic
                    var copies = this_element_widget.get_original_copies()[attribute_name];
                    var decimal_value = typeof new_value === 'number' ? new_value : bigrat.toDecimal(new_value);
                    var value_approximation = bigrat.fromDecimal(decimal_value);
                    if (this.get_attribute_owner().set_attribute(this.attribute, decimal_value)) {
                        // if the new_value is different from the current value
                        copies.forEach(function (copy, index) {
                           copy.set_value_from_sub_classes(value_approximation, true); 
                        });
                    }
                    // TODO: determine if the following could be moved up into the conditional and replaced with return false;
                    return this.set_value_from_sub_classes(value_approximation, false);
                } catch (error) {
                    TT.UTILITIES.report_internal_error("Error while setting the value of an attribute widget: " + error);
                    return false;
                }
            };
            attribute_widget.is_attribute_widget = function () {
                return true;
            };
            attribute_widget.get_function_type = function () {
                // function birds are ordinary numeric ones
                return 'number';
            };
            return attribute_widget;
        }.bind(this);
        var create_string_attribute_widget = function (attribute_name, attribute_value) {
            var attribute_widget = TT.element.create(attribute_value);
            add_attribute_widget_functionality(attribute_name, attribute_widget);
            attribute_widget.set_HTML = function (new_value) {
                var copies = this_element_widget.get_original_copies()[attribute_name];
                var return_value;
                if (this.get_attribute_owner().set_attribute(this.attribute, new_value)) {
                    // if the new_value is different from the current value
                    copies.forEach(function (copy, index) {
                        return_value = copy.set_HTML_from_sub_classes(new_value); 
                  });
                }
                return return_value;
            };
            attribute_widget.get_function_type = function () {
                // function birds are like those for elements (not yet implemented)
                return 'element';
            };
            attribute_widget.set_additional_classes("toontalk-string-attribute-widget");
            return attribute_widget;
        }.bind(this);
        var type = attribute_type(attribute_name);
        var widget_copier;         // how the widget is copied without attribute widget enhancements
        var value_setter;          // how the widget's value is set
        var widget_update_display; // how widget updates display without attribute widget enhancements
        var $attribute_input, attribute_widget, original_copies, drag_listener;
        if (backside_element) {
            $attribute_input = $(backside_element).find(selector);
            if ($attribute_input.length > 0) {
                $attribute_input.get(0).toontalk_widget_side = this;
            }
        }
        if (type === 'number') {
            attribute_widget = create_numeric_attribute_widget(attribute_name, attribute_value);
            value_setter = attribute_widget.set_value_from_decimal.bind(attribute_widget);
            if (attributes_needing_updating.indexOf(attribute_name) >= 0) {
                this.on_update_display(function () {
                    attribute_widget.rerender();
                    return true; // don't remove
                });
                if (attribute_name === 'left' || attribute_name === 'top') {
                    var owner;
                    if (additional_info && additional_info.to_be_on_backside_of) {
                       owner = additional_info.to_be_on_backside_of[0]; // top of stack
                    }
                    if (!owner) {
                         owner = attribute_widget.get_attribute_owner();
                    }
                    drag_listener = 
                        function (event) {
                            // ensures numbers are updated as the element is dragged
                            var top_level_position, attribute_value, left, top;
                            if (event.currentTarget.toontalk_widget_side !== attribute_widget.get_attribute_owner()) {
                                return;
                            }
                            event.stopPropagation();
                            top_level_position = $(owner.get_frontside_element()).closest(".toontalk-top-level-backside").offset();
                            if (!top_level_position) {
                                console.log("Unable to find top-level backside of an element for its position. Perhaps is 'visible' but not attached.");
                                top_level_position = {left: 0, top: 0};
                            }
                            left = event.pageX-top_level_position.left-(owner.drag_x_offset || 0);
                            top  = event.pageY-top_level_position.top -(owner.drag_y_offset || 0);
                            if (attribute_name === 'left') {
                                attribute_value = left;
                                owner.set_attribute('top', top);
                            } else {
                                attribute_value = top;
                                owner.set_attribute('left', left);
                            }
                            attribute_widget.set_value_from_decimal(attribute_value);
                            widget_update_display.call(attribute_widget);
                    };
                    attribute_widget.add_parent_of_frontside_change_listener(function (old_parent, new_parent) {
                        if (old_parent && old_parent.get_widget().is_element()) {
                            old_parent.get_frontside_element().removeEventListener('drag', drag_listener);
                        }
                        if (new_parent && new_parent.get_widget().is_element() && new_parent.get_frontside_element()) {
                            // TODO: get this to happen later when new_parent has a frontside_element
                            new_parent.get_frontside_element().addEventListener('drag', drag_listener);
                        }
                    });
                }
            }
        } else if (type === 'string') {
            attribute_widget = create_string_attribute_widget(attribute_name, attribute_value);
            value_setter = attribute_widget.set_HTML.bind(attribute_widget);
        } else {
            TT.UTILITIES.report_internal_error("Unrecognized attribute type: " + type + " for " + attribute_name);
            return;
        }
        // a change to any of the copies is instantly reflected in all
        original_copies = this.get_original_copies()[attribute_name];
        if (original_copies) {
            original_copies.push(attribute_widget);
        } else {
            this.get_original_copies()[attribute_name] = [attribute_widget];
        }
        return attribute_widget;
    };

    TT.creators_from_json["attribute_widget"] = function (json, additional_info) {
        var element_widget = TT.UTILITIES.create_from_json(json.element, additional_info);
        return element_widget.create_attribute_widget(json.attribute_name, additional_info);
    };

    // for backwards compatibility:
    TT.creators_from_json["attribute_number"] = TT.creators_from_json["attribute_widget"];

    element.on_backside_hidden = function () {
        this.get_style_attributes().forEach(function (attribute) {
            var attribute_widget = this.get_attribute_widget_in_backside_table(attribute, true);
            if (attribute_widget) {
                attribute_widget.set_visible(false);
            }
        }.bind(this));
    };
   
    element.toString = function (to_string_info) {
       var scale_or_quote_html = function (html) {
           var style, first_space;
           if (html.length > 1 && html.charAt(0) === '<') {
                style = "style='width: 50px; height: 30px;'";
                first_space = html.indexOf(' ');
                return html.substring(0, first_space+1) + style + html.substring(first_space);
           }
           // else is a plain string so quote it
           return '"' + html + '"';
        };
        var image_description = function () {
            // if image returns alt if known otherwise default string
            var html = this.get_HTML();
            var alt_index = html.indexOf("alt=");
            var end_quote_index;
            if (alt_index >= 0) {
                end_quote_index = html.indexOf("'", alt_index+5);
                if (end_quote_index >= 0) {
                    return "(" + html.substring(alt_index+5, end_quote_index) + ")";
                }
            }
            return "";
        }.bind(this);
        var children = this.get_children();
        var text, description;
        if (to_string_info) {
            if (to_string_info.for_json_div) {
                // don't risk confusing things with a comment that might interfere with the HTML
               return "";
            } else {
                description = image_description();
                if (!description) {
                    text = this.get_text();
                    if (text) {
                        description = '"' + text + '"';
                    } else {
                        description = "";
                    }
                }
            }
        } else {
            description = scale_or_quote_html(this.get_HTML());
        }
        if (children && children.length > 0) {
            description += " with " + TT.UTILITIES.describe_widgets(children) + " on top";
        }          
        return "the element " + description;
    };
    
    element.get_type_name = function (plural) {
        if (plural) {
            return "elements";
        }
        return "element";
    };

    element.get_help_URL = function () {
        return "docs/manual/elements.html";
    };
    
    element.get_json = function (json_history) {
        var attributes = this.get_style_attributes();
        var json_attributes = [];
        var html = TT.UTILITIES.remove_z_index(this.get_HTML()); // z-index is transient
        var html_encoded = encodeURIComponent(html);
        // don't bother to share short HTMLs
        var html_worth_sharing = html.length >= 100;
        var html_encoded_or_shared, html_index;
        if (html_worth_sharing) {
            if (!json_history.shared_html) {
                json_history.shared_html = [];
            }
            html_index = json_history.shared_html.indexOf(html_encoded);
            if (html_index < 0) {
                html_index = json_history.shared_html.push(html_encoded)-1;
            }
            html_encoded_or_shared = {shared_html_index: html_index};
        } else {
            html_encoded_or_shared = html_encoded;
        }
        attributes.forEach(function (item) {
            // don't want them to appear where they were in the source page
            // need to revisit this since sometimes we want left and top
            // maybe when loading don't obey their values
//             if (item !== "left" && item !== "top") {
                json_attributes.push(item);
//             }
        });
        return {type: "element",
                // z-index info is temporary and should not be captured here
                html:                 html_encoded_or_shared, 
                attributes:           json_attributes,
                attribute_values:     json_attributes.map(this.get_attribute.bind(this)),
                attributes_backsides: json_attributes.map(function (attribute_name) {
                                                               var backside_widget = this.get_attribute_widget_in_backside_table(attribute_name, true);
                                                               if (backside_widget) {
                                                                   return TT.UTILITIES.get_json_of_array(backside_widget.get_backside_widgets(), json_history)
                                                               }
                                                          }.bind(this)),
                additional_classes:    this.get_additional_classes(),
                children:              this.get_children().length > 0 && TT.UTILITIES.get_json_of_array(this.get_children(), json_history),
                sound_effect:          this.get_sound_effect() && this.get_sound_effect().src,
                video:                 this.get_video_object() && this.get_video_object().src,
                ignore_pointer_events: this.get_ignore_pointer_events() ? true : undefined, // undefined means no attribute value pair saving space
                source_URL:            this.get_source_URL()
                };
    };
    
    TT.creators_from_json["element"] = function (json, additional_info) {
        var html = decodeURIComponent(typeof json.html === 'string' ? json.html : additional_info.shared_html && additional_info.shared_html[json.html.shared_html_index]);
        var children, is_child, ignore_attributes, reconstructed_element, error_message;
        if (json.children) {
            is_child = additional_info.is_child;
            additional_info.is_child = true;
            children = TT.UTILITIES.create_array_from_json(json.children, additional_info);
            // restore is_child flag
            additional_info.is_child = is_child;
        }
        if (!html) {
            if (typeof json.html === 'string') {
                error_message = "No json.html recreating an element widget.";
            } else {
                error_message = "additional_info.shared_html missing while recreating an element widget.";
            }
            if (TT.debugging) {
                html = error_message;
            } else {
                throw error_message;
            }
        }
        reconstructed_element = element.create(html, json.attributes, json.description, children, json.sound_effect, json.video, json.ignore_pointer_events);
        if (additional_info && additional_info.event) {
            // perhaps should check that event is a drop event
            // drop event location has priority over these settings
            ignore_attributes = ["left", "top"];
        } else {
            ignore_attributes = [];
        }
        json.attribute_values.forEach(function (value, index) {
            var attribute_name = json.attributes[index];
            var backside_widgets_of_attribute_json = json.attributes_backsides && json.attributes_backsides[index];
            var attribute_widget;
            if (additional_info.is_child || ignore_attributes.indexOf(attribute_name) < 0) {
                if (value === 0 && (attribute_name === 'width' || attribute_name === 'height')) {
                    // ignore 0 values for width or height
                } else {
                    reconstructed_element.add_to_css(attribute_name, value_in_pixels(value) || value);
                }
            }
            if (backside_widgets_of_attribute_json) {
                attribute_widget = reconstructed_element.get_attribute_widget_in_backside_table(attribute_name, false, additional_info);
                TT.UTILITIES.add_backside_widgets_from_json(attribute_widget, backside_widgets_of_attribute_json, additional_info);
            }
        }.bind(this));
        if (json.additional_classes) {
            reconstructed_element.set_additional_classes(json.additional_classes);
        }
        if (json.source_URL) {
            reconstructed_element.set_source_URL(json.source_URL);
            reconstructed_element.refresh();
        }
        if (children) {
            TT.UTILITIES.when_attached(function () {
                 children.forEach(function (child, index) {
                    var view = json.children[index].widget && json.children[index].widget.view;
                    if (view) {
                        TT.UTILITIES.set_css(child.get_frontside_element(true),
                                             {left: view.frontside_left,
                                              top:  view.frontside_top});
                    }
                });
            });
        }
        return reconstructed_element;
    };
    
    element.create_attribute_path = function (attribute_widget, robot) {
        var path_to_element_widget = TT.path.get_path_to(attribute_widget.element_widget, robot, true);
        return this.extend_attribute_path(path_to_element_widget, attribute_widget.attribute);
    };

    element.refresh = function () {
        if (this.get_source_URL()) {
            TT.UTILITIES.create_widget_from_URL(this.get_source_URL(),
                                                function (up_to_date_element) {
                                                    if (up_to_date_element) {
                                                        this.set_HTML(up_to_date_element.get_HTML());
                                                    }
                                                }.bind(this));
        }
    };
    
    element.extend_attribute_path = function (path_to_element_widget, attribute_name) {
       return {
            dereference_path: function (context, top_level_context, robot) {
                // if the robot is running on the backside of a widget that is on the backside of the top_level_context
                // then use the top_level_context
                var element_widget = path_to_element_widget.dereference_path((top_level_context || context), undefined, robot);
                return element_widget.get_widget().get_attribute_widget_in_backside_table(attribute_name);
            },
            toString: function () {
                return "the '" + attribute_name + "' property of " + path_to_element_widget;
            },
            get_json: function () {
                return {type: "path_to_style_attribute",
                        attribute: attribute_name,
                        element_widget_path: path_to_element_widget.get_json()};
            }};
    };
    
    TT.creators_from_json["path_to_style_attribute"] = function (json) {
        var element_widget_path = TT.UTILITIES.create_from_json(json.element_widget_path);
        return element.extend_attribute_path(element_widget_path, json.attribute);
    };

    element.set_size_attributes = function (width, height, update_regardless) {
        if (update_regardless) {
            this.add_to_css('width',  width);
            this.add_to_css('height', height);
        } else {
            this.set_attribute('width',  width);
            this.set_attribute('height', height);
        }
        TT.UTILITIES.set_timeout(function () {
            this.rerender();
        }.bind(this));        
    };

    element.set_location_attributes = function (left, top) {
        this.set_attribute('left', left);
        this.set_attribute('top',  top);
    };

    element.receive_HTML_from_dropped = function (dropped) {
        var new_text = dropped.get_text && dropped.get_text();
        dropped.remove();
        if (this.set_HTML(new_text)) {
            return this.get_text();
        }
    };

    element.receive_URL_from_dropped = function (dropped) {
        var new_text = dropped.get_text();
        if (this.set_source_URL(new_text)) {
            return this.get_source_URL();
        }
    };

    element.add_style_attribute = function (attribute) {
        var style_attributes = this.get_style_attributes();
        var frontside_element;
        if (style_attributes.indexOf(attribute) < 0) {
           style_attributes.push(attribute);
           // update the backside during drag if 'left' or 'top' are attributes
           if (attribute === 'left') {
               frontside_element = this.get_frontside_element();
               $(frontside_element).addEventListener('drag', function (event) {
                   var backside_element  = this.get_backside_element(true);
                   var frontside_element = this.get_frontside_element();
                   if (backside_element && frontside_element) {
                       $(backside_element).find(".toontalk-element-left-attribute-input").val(event.originalEvent.clientX);
                   }

               }.bind(this));
           } else if (attribute === 'top') {
               frontside_element = this.get_frontside_element();
               $(frontside_element).addEventListener('drag', function (event) {
                   var backside_element  = this.get_backside_element(true);
                   var frontside_element = this.get_frontside_element();
                   if (backside_element && frontside_element) {
                       $(backside_element).find(".toontalk-element-top-attribute-input").val(event.originalEvent.clientY);
                   }
               }.bind(this));
           }
        }
        return true; // so robot knows this succeeded
    };
    element.remove_style_attribute = function (attribute) {
        var style_attributes = this.get_style_attributes();
        var index = style_attributes.indexOf(attribute);
        if (index >= 0) {
            style_attributes.splice(index, 1);
            this.get_backside().update_style_attribute_chooser();
        }
        return true; // so robot knows this succeeded
    };
    
    return element;
}(window.TOONTALK));

window.TOONTALK.element_backside = 
(function (TT) {
    "use strict";
    
    var update_style_attributes_table = function (table, element_widget, backside) {
        var style_attributes, frontside_element;
        if (!backside.visible()) {
            return;
        }
        style_attributes = element_widget.get_style_attributes();
        frontside_element = element_widget.get_frontside_element();
        $(table).empty();
        style_attributes.forEach(function (attribute) {
            var value = element_widget.get_attribute(attribute);
            var update_value = function (event) {
                element_widget.set_attribute(attribute, this.value.trim(), true);
            };
            var classes = "toontalk-element-attribute-input toontalk-element-" + attribute + "-attribute-input";
            var row = document.createElement("tr");
            var td  = document.createElement("td");
            var attribute_widget = backside.is_primary_backside() ? 
                                   element_widget.get_attribute_widget_in_backside_table(attribute) :
                                   backside.get_widget().create_attribute_widget(attribute);
            var attribute_frontside_element = attribute_widget.get_frontside_element(true);
            attribute_widget.set_parent_of_frontside(backside, false, true); // a white lie
            attribute_widget.set_infinite_stack(true);
            table.appendChild(row);
            row.appendChild(td);
            td.appendChild(TT.UTILITIES.create_text_element(attribute));
            td = document.createElement("td");
            row.appendChild(td);
            attribute_widget.set_visible(true);
            $(attribute_frontside_element).addClass("toontalk-element-attribute");
            td.appendChild(attribute_frontside_element);        
        });
    };
    
    var create_show_attributes_chooser = function (attributes_chooser, element_widget) {
        var show_label = "Add or remove my style attributes";
        var show_title = "Click to add widgets for my style attributes.";
        var hide_label = "Hide my style attributes list";
        var hide_title = "Click to hide my list of attributes that can be added or removed.";
        var $show_chooser_button = $("<button>" + show_label + "</button>").button();
        var show_chooser_button_clicked =
            function (event) {
                if ($(attributes_chooser).is(":visible")) {
                    $(attributes_chooser).hide();
                    $show_chooser_button.button("option", "label", show_label);
                    TT.UTILITIES.give_tooltip($show_chooser_button.get(0), show_title);
                } else {
                    $(attributes_chooser).show();
                    $show_chooser_button.button("option", "label", hide_label);
                    TT.UTILITIES.give_tooltip($show_chooser_button.get(0), hide_title);
                }
                if (element_widget.robot_in_training()) {
                    element_widget.robot_in_training().button_clicked(".toontalk-show-attributes-chooser-button", element_widget);
                }
            };
        $show_chooser_button.addClass("toontalk-show-attributes-chooser-button");
        $show_chooser_button.get(0).addEventListener('click', show_chooser_button_clicked);
        TT.UTILITIES.give_tooltip($show_chooser_button.get(0), show_title);
        return $show_chooser_button.get(0);
    };
    
    return {
        create: function (element_widget) {
            // TODO: determine if this should implement walk_children to the attributes in the table
            var backside = TT.backside.create(element_widget);
            var backside_element = backside.get_element();
            var html = element_widget.get_HTML();
            var attribute_table = document.createElement("table");
            var attributes_chooser = document.createElement("div");
            var show_attributes_chooser = create_show_attributes_chooser(attributes_chooser, element_widget);
            var advanced_settings_button = TT.backside.create_advanced_settings_button(backside, element_widget);
            var react_to_pointer_checkbox = TT.UTILITIES.create_check_box(true,
                                                                          "toontalk-react-to-pointer-check-box",
                                                                          "Normal response to mouse",
                                                                          "Uncheck this if you don't want the usual browser action to occur when clicked.");
            // conditional on URL parameter whether HTML or plain text
            // default is plain text (displayed and edited) (if there is any -- could be an image or something else)
            // full HTML editing but that is both insecure (could cleanse the HTML) and confusing to non-experts
            // but removing HTML is also confusing -- e.g. drop a link and then open it -- so default changed to true
            var edit_HTML = TT.UTILITIES.get_current_url_boolean_parameter("elementHTML", true);
            var getter = edit_HTML ? "get_HTML" : "get_text";
            var generic_backside_update = backside.update_display.bind(backside);
            var generic_add_advanced_settings = backside.add_advanced_settings;
            var text, html_input, update_html, drop_handler, 
                URL_input, update_URL, URL_drop_handler,
                $play_sound_effect_button, $play_video_button,
                sound_effect, audio_label_and_title,
                video_object, video_label_and_title,
                play_sound_effect_button_clicked, play_video_button_clicked;
            // need to ensure that it 'knows' its textContent, etc.
            element_widget.initialize_element();
            text = element_widget[getter]().trim();
            if (text.length > 0 && !element_widget.get_image_element()) {
                drop_handler = function (event) {
                    var dropped = TT.UTILITIES.input_area_drop_handler(event, element_widget.receive_HTML_from_dropped.bind(element_widget), element_widget);
                    if (dropped && element_widget.robot_in_training()) {
                        element_widget.robot_in_training().dropped_on_text_area(dropped, element_widget, {area_selector: ".toontalk-html-input",
                                                                                                          setter: 'receive_HTML_from_dropped',
                                                                                                          toString: "for the element's text"});
                    }
                };
                html_input = TT.UTILITIES.create_text_area(text, "toontalk-html-input", "My HTML is", "Type here to edit the text.", drop_handler);
                update_html = function (event) {
                    // replace character code 160 with ordinary space (32)
                    var new_text = html_input.button.value.trim().replace(/\xA0/g," ");
                    var frontside_element = element_widget.get_frontside_element();
                    var setter = edit_HTML ? "set_HTML" : "set_text";
                    if (element_widget[setter](new_text) && element_widget.robot_in_training()) {
                        element_widget.robot_in_training().edited(element_widget, {setter_name: setter,
                                                                                   argument_1: new_text,
                                                                                   toString: 'change the text to "' + new_text + '"',
                                                                                   button_selector: ".toontalk-html-input"});
                    }
                };
                // commented out the following since the resize handles for backside end up only applying to the HTML input element
//              $(html_input.container).resizable();
                $(html_input.container).css({width: "100%"});
                $(html_input.button).css({width: "100%"});
                html_input.button.addEventListener('change',   update_html);
                html_input.button.addEventListener('mouseout', update_html);
                if (element_widget.is_plain_text_element()) {
                    backside_element.appendChild(html_input.container);
                }
                if (element_widget.get_source_URL()) {
                    URL_drop_handler = function (event) {
                        var dropped = TT.UTILITIES.input_area_drop_handler(event, element_widget.receive_URL_from_dropped.bind(element_widget), element_widget);
                        if (dropped && element_widget.robot_in_training()) {
                            element_widget.robot_in_training().dropped_on_text_area(dropped, element_widget, {area_selector: ".toontalk-URL-input",
                                                                                                              setter: 'receive_URL_from_dropped',
                                                                                                              toString: "for the URL source of the text"});
                        }
                        event.stopPropagation();
                    };
                    update_URL = function (event) {
                        var new_text = URL_input.button.value.trim().replace(/\xA0/g," ");
                        var frontside_element = element_widget.get_frontside_element();
                        if (element_widget.set_source_URL(new_text) && element_widget.robot_in_training()) {
                            element_widget.robot_in_training().edited(element_widget, {setter_name: "set_source_URL",
                                                                                       argument_1: new_text,
                                                                                       toString: 'change the source URL to "' + new_text + '"',
                                                                                       button_selector: ".toontalk-URL-input"});
                        }
                    };
                    URL_input = TT.UTILITIES.create_text_input(element_widget.get_source_URL(), 
                                                               "toontalk-URL-input",
                                                               "",
                                                               "Edit the URL where this text comes from.",
                                                               undefined,
                                                               undefined,
                                                               URL_drop_handler);
                    URL_input.button.addEventListener('change',   update_URL);
                    URL_input.button.addEventListener('mouseout', update_URL);
                    backside_element.appendChild(URL_input.container);
                }
            }
            backside.update_style_attribute_chooser = function () {
                // the following could be made the default
                // but if TT.attribute_options is set use it instead
                var options = [{label: "Geometry attributes",
                                sub_menus: ["left", "top", "width", "height", "z-index", "background-position"]},
                               {label: "Color attributes",
                                sub_menus: ["background-color", "color", "opacity"]},
                               {label: "Font attributes",
                                sub_menus: ["font-size", "font-weight"]},
                               {label: "Visibility",
                                sub_menus: ["display", "visibility"]},
                               {label: "Transformations",
                                sub_menus: ["rotate", "skewX", "skewY", "transform-origin-x", "transform-origin-y"]}];
                var process_menu_item = function (option, menu_list, element_widget) {
                    var style_attributes = element_widget.get_style_attributes();
                    var already_added = style_attributes.indexOf(option) >= 0;
                    var title = "Click to add or remove the '" + option + "' style attribute from my backside.";
                    var check_box = TT.UTILITIES.create_check_box(already_added, "toontalk-style-attribute-check-box", option+"&nbsp;", title);
                    var additional_class = "toontalk-style-attribute-check-box-for-" + option;
                    var documentation_link = TT.UTILITIES.create_anchor_element("i", documentation_source(option));
                    var list_item = document.createElement("li");
                    $(documentation_link).addClass("toontalk-help-button notranslate toontalk-attribute-help-button");
                    $(documentation_link).css({color: "white"}); // ui-widget-content interferes with this
                    documentation_link.translate = false; // should not be translated
                    documentation_link.lang      = "en";
                    check_box.container.appendChild(documentation_link);
                    $(check_box.button).addClass(additional_class);
                    check_box.button.addEventListener('click', function (event) {
                        if (check_box.button.checked) {
                            element_widget.add_style_attribute(option);
                        } else {
                            element_widget.remove_style_attribute(option);
                        }
                        update_style_attributes_table(attribute_table, element_widget, element_widget.get_backside());
                        if (element_widget.robot_in_training()) {
                            element_widget.robot_in_training().edited(element_widget, 
                                                                       {setter_name: (check_box.button.checked ? "add_style_attribute" : "remove_style_attribute"),
                                                                        argument_1: option,
                                                                        toString: (check_box.button.checked ? "add" : "remove") + " a widget for the " + option + " attribute of",
                                                                        button_selector: "." + additional_class});
                        }
                    });
                    list_item.appendChild(check_box.container);
                    menu_list.appendChild(list_item);
                 };
                var process_options = function (sub_tree, menu_list, element_widget) {
                    var category_header, sub_menu_list;
                    if (typeof sub_tree === 'string') {
                        process_menu_item(sub_tree, menu_list, element_widget);
                    } else if (sub_tree.label) {
                        category_header = document.createElement("h3");
                        category_header.textContent = sub_tree.label;
                        sub_menu_list = document.createElement("ul");
                        menu_list.appendChild(category_header);
                        menu_list.appendChild(sub_menu_list);   
                        process_options(sub_tree.sub_menus, sub_menu_list, element_widget);
                    } else {
                        // is an array
                        sub_tree.forEach(function (sub_sub_tree) {
                            process_options(sub_sub_tree, menu_list, element_widget);
                        });               
                    }
                };
                if ($(attributes_chooser).is(".ui-accordion")) {
                    $(attributes_chooser).accordion('destroy');
                }
                $(attributes_chooser).empty();
                process_options(options, attributes_chooser, element_widget);
                $(attributes_chooser).accordion({active: 0,
                                                 heightStyle: "content"});
                return attributes_chooser;
            };
            backside.get_attributes_chooser = function () {
                return attributes_chooser;
            };
            backside.add_advanced_settings = function () {
                var $advanced_settings_table;
                generic_add_advanced_settings.call(backside);
                // advanced table added above
                $advanced_settings_table = $(backside_element).children(".toontalk-advanced-settings-table");
                if ($advanced_settings_table.length > 0) {
                    $advanced_settings_table.get(0).appendChild(react_to_pointer_checkbox.container);
                    $advanced_settings_table.get(0).appendChild(attributes_chooser);
                    $advanced_settings_table.get(0).appendChild(show_attributes_chooser);
                    if (!element_widget.is_plain_text_element()) {
                        $advanced_settings_table.get(0).appendChild(html_input.container); 
                    }
                }
            };
            if (element_widget.get_sound_effect()) {
                sound_effect = element_widget.get_sound_effect();
                audio_label_and_title = function () {
                    if (!backside.visible()) {
                        return;
                    }
                    if (sound_effect.paused) {
                        TT.UTILITIES.give_tooltip($play_sound_effect_button.get(0), "Click to begin playing this sound.");
                        $play_sound_effect_button.button("option", "label", "Play sound");
                    } else {
                        TT.UTILITIES.give_tooltip($play_sound_effect_button.get(0), "Click to pause this sound.");
                        $play_sound_effect_button.button("option", "label", "Pause sound");
                    }
                };
                $play_sound_effect_button = $("<button>Play sound</button>").button();
                $play_sound_effect_button.addClass("toontalk-play-sound-effect-button");
                play_sound_effect_button_clicked = 
                    function (event) {
                        if (sound_effect.paused) {
                            TT.UTILITIES.play_audio(sound_effect);
                            sound_effect.addEventListener('ended', audio_label_and_title);
                        } else {
                            sound_effect.pause();
                        }
                        audio_label_and_title();
                        if (element_widget.robot_in_training()) {
                            element_widget.robot_in_training().button_clicked(".toontalk-play-sound-effect-button", element_widget);
                        }                                            
                    };
                $play_sound_effect_button.get(0).addEventListener('click', play_sound_effect_button_clicked);
                audio_label_and_title();
                backside_element.appendChild($play_sound_effect_button.get(0));
            } else if ($(element_widget.get_frontside_element()).find("video").is("*")) {
                video_object = element_widget.get_video_object();
                video_label_and_title = function () {
                    if (!backside.visible()) {
                        return;
                    }
                    if (video_object.paused) {
                        TT.UTILITIES.give_tooltip($play_video_button.get(0), "Click to begin playing this video.");
                        $play_video_button.button("option", "label", "Play video");
                    } else {
                        TT.UTILITIES.give_tooltip($play_video_button.get(0), "Click to pause this video.");
                        $play_video_button.button("option", "label", "Pause video");
                    }
                };
                $play_video_button = $("<button>Play video</button>").button();
                $play_video_button.addClass("toontalk-play-video-button");
                play_sound_effect_button_clicked =
                    function (event) {
                        if (video_object.paused) {
                            video_object.play();
                            video_object.addEventListener('ended', video_label_and_title);
                        } else {
                             video_object.pause();            
                        }
                        video_label_and_title();
                        if (element_widget.robot_in_training()) {
                            element_widget.robot_in_training().button_clicked(".toontalk-play-video-button", element_widget);
                        }                                            
                    };
                $play_video_button.get(0).addEventListener('click', play_video_button_clicked);
                video_label_and_title();
                backside_element.appendChild($play_video_button.get(0));
            }
            backside.update_style_attribute_chooser();
            update_style_attributes_table(attribute_table, element_widget, backside);
            backside_element.appendChild(attribute_table);
            backside_element.appendChild(advanced_settings_button);
            $(attributes_chooser).hide();
            $(attributes_chooser).addClass("toontalk-attributes-chooser");
            backside.update_display = function () {
                if (html_input) {
                    $(html_input.button).val(element_widget[getter]());
                }
                update_style_attributes_table(attribute_table, element_widget, backside);
                if ($(attributes_chooser).is(":visible")) {
                    backside.update_style_attribute_chooser();
                }
                element_widget.get_backside_widgets().forEach(function (widget) {
                    if (widget && widget.get_widget().is_attribute_widget()) {
                        widget.rerender();
                    }
                });
                generic_backside_update();
            };
            // if the backside is hidden then so should be the attributes chooser
            $(backside_element).find(".toontalk-hide-backside-button").each(function (index, element) {
                element.addEventListener('click',
                                         function () {
                                             $(attributes_chooser).hide();
                                         });
            });
            react_to_pointer_checkbox.button.checked = !element_widget.get_ignore_pointer_events();
            react_to_pointer_checkbox.button.addEventListener('click', function () {
                element_widget.set_ignore_pointer_events(!react_to_pointer_checkbox.button.checked);
            });
            return backside;
    }};
}(window.TOONTALK));

}());