 /**
 * Implements ToonTalk's sensors (primitive sensors represented by nests)
 * Authors = Ken Kahn
 * License: New BSD
 */

 /*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */

 // Sensors listen for DOM events and are 'concretized' as nests and events as messages delivered by birds
 // the keyboard event attribute 'key' is supported in browsers without by using keyIdentifier instead

window.TOONTALK.sensor = (function (TT) {
    "use strict";

    var sensor = Object.create(TT.widget);

    var style_contents = function (widget, sensor) {
        // styles the contents (the widget) of the sensor
        if (widget.get_type_name() === 'element') {
            widget.set_additional_classes("toontalk-string-value-from-sensor");
            if (sensor.visible()) {
                widget.rerender();
            }
        }
    };

    sensor.create = function (event_name, attributes_string, description, previous_contents, active, widget, name) {
        // widget is undefined when the event_name is appropriate to associate with window
        var new_sensor = TT.nest.create(description, previous_contents, "sensor", undefined, undefined, name || "sensor");
        var nest_get_json = new_sensor.get_json;
        var nest_update_display = new_sensor.update_display;
        var nest_set_running = new_sensor.set_running;
        var nest_copy = new_sensor.copy;
        var attributes = attributes_string.split(" ");
        var attribute_values;
        var attribute_widget = function (value) {
            var value_widget;
            switch (typeof value) {
                case 'number':
                value_widget = TT.number.create(Math.round(value), 1); // integers for now
                break;
                case 'string':
                value_widget = TT.element.create(value           , undefined, undefined, undefined, undefined, undefined, "toontalk-string-value-from-sensor");
                style_contents(value_widget, new_sensor);
                break;
                case 'boolean':
                // for now
                value_widget = TT.element.create(value.toString(), undefined, undefined, undefined, undefined, undefined, "toontalk-string-value-from-sensor");
                style_contents(value_widget, new_sensor);
                break;
                default:
                return value;
            }
            return value_widget;
        };
        var event_listener = function (event) {
            var values, attributes, visible, $top_level_backside, value_widget, frontside_element, delivery_bird;
            if (!new_sensor.get_active()) {
                return;
            }
            values = attribute_values(event);
            attributes = new_sensor.get_attributes();
            visible = new_sensor.visible();
            $top_level_backside = $(new_sensor.get_frontside_element()).closest(".toontalk-backside-of-top-level");
            if (values.length === 1) {
                value_widget = attribute_widget(values[0]);
                if (typeof value_widget === "undefined") {
                    return;
                }
            } else {
                value_widget = TT.box.create(values.length,
                                             true,
                                             values.map(attribute_widget),
                                             "the values of the " + TT.UTILITIES.conjunction(attributes) + " attributes of " + TT.UTILITIES.add_a_or_an(event_name) + " event.",
                                             attributes.join(";"));
            }
            if (visible) {
                delivery_bird = TT.bird.create(new_sensor);
                new_sensor.add_to_top_level_backside(delivery_bird);
                value_widget.render();
                // comes from the bottom center
                delivery_bird.animate_delivery_to(value_widget,
                                                  new_sensor,
                                                  {nest_recieving_message: new_sensor,
                                                   temporary_bird: true,
                                                   starting_left: $top_level_backside.width()/2, 
                                                   starting_top:  $top_level_backside.height()});
            } else {
                new_sensor.add_to_contents(value_widget);
            }
        }.bind(this);
        var widget_can_run;
        new_sensor.is_sensor = function () {
            return true;
        };
        new_sensor.copy = function (parameters) {
            var copy;
            if (parameters && parameters.just_value && this.has_contents()) {
                return nest_copy.call(this, parameters);
            }
            // note that widget is not copied since there can be multiple sensors of the same widget
            // there is an issue about sensor having access to nest's contents
            // so TT.UTILITIES.copy_widget_sides(contents) not appropriate
            // so perhaps this should be in the same expression as nest to share privately...
            if (parameters) {
                copy = TT.sensor.create(event_name, this.get_attributes_string(), description, undefined, (parameters.copying_resource || active), widget, this.get_name());
            } else {
                copy = TT.sensor.create(event_name, this.get_attributes_string(), description, undefined, active, widget, this.get_name());
            }
            copy = new_sensor.add_to_copy(copy, parameters);
            // even though copy is created with the same active value as this
            // add_to_copy calls set_running to sets it to false
            copy.set_active(this.get_active());
            return copy;
        };
        new_sensor.get_json = function (json_history, callback, start_time) {
            var new_callback = function (json, start_time) {
                var widget_callback;
                json.type = 'sensor';
                json.event_name = event_name;
                json.attribute = this.get_attributes_string();
                json.active = active;
                if (widget) {
                    widget_callback = function (widget_json) {
                        json.sensor_of = widget_json;
                        callback(json, start_time);
                    };
                    TT.UTILITIES.get_json(widget, json_history, widget_callback, start_time);
                } else {
                    callback(json, start_time);
                }
            }.bind(this);
            nest_get_json.call(this, json_history, new_callback, start_time);
        };
        new_sensor.update_display = function () {
            var $frontside_element = $(this.get_frontside_element());
            nest_update_display.call(this);
            if (active || $frontside_element.is(".toontalk-top-level-resource")) {
                // top-level resources aren't active but look normal
                $frontside_element.addClass("toontalk-sensor-nest");
                $frontside_element.removeClass("toontalk-sensor-inactive-nest");
            } else {
                $frontside_element.addClass("toontalk-sensor-inactive-nest");
                $frontside_element.removeClass("toontalk-sensor-nest");
            }
            $frontside_element.removeClass("toontalk-empty-nest");
        }
        new_sensor.get_type_name = function (plural) {
            if (plural) {
                return "sensors";
            }
            return 'sensor';
        };
        new_sensor.get_help_URL = function () {
            return "docs/manual/sensors.html";
        };
        new_sensor.toString = function () {
            return "a sensor that receives the '" + this.get_attributes_string() + "' attribute of " + event_name + " events";
        };
        new_sensor.get_class_name_with_color = function (base_class_name) {
            return base_class_name;
        };
        new_sensor.get_active = function () {
            // can also be 'temporarily false'
            return active === true;
        };
        new_sensor.restore_active = function () {
            if (active === 'temporarily false') {
                this.set_active(true);
            }
        };
        new_sensor.set_active = function (new_value, initialising) {
            if (active === new_value && !initialising) {
                return;
            }
            if (new_value === true) { // not 'temporarily false'
               if (widget) {
                    widget.get_frontside_element(true).addEventListener(event_name, event_listener);
                } else {
                    window.addEventListener(event_name, event_listener);
                }
            } else {
                if (widget) {
                    widget.get_frontside_element(true).removeEventListener(event_name, event_listener);
                } else {
                    window.removeEventListener(event_name, event_listener);
                }
            }
            active = new_value;
        };
        new_sensor.set_running = function (new_value) {
            this.set_active(new_value);
            nest_set_running.call(this, new_value);
        };
        new_sensor.set_active(active, true);
        new_sensor.create_backside = function () {
            return TT.sensor_backside.create(this);
        };
        new_sensor.get_event_name = function () {
            return event_name;
        };
        new_sensor.set_event_name = function (new_value) {
            var was_active = active;
            if (event_name) {
                if (active) {
                    // this will remove the listeners to the old event_name
                    this.set_active(false);
                }
            }
            event_name = new_value;
            if (was_active) {
                this.set_active(true);
            }
        };
        new_sensor.get_attributes = function () {
            return attributes;
        };
        new_sensor.set_attributes = function (new_value) {
            attributes = new_value.split(" ");
        };
        new_sensor.get_attributes_string = function () {
            return attributes.join(" ");
        };
        new_sensor.match = function (other) {
            // TODO: decide how this should work
            this.last_match = other;
            return this;
        };
        new_sensor.set_sensor_of = function (new_value) {
            widget = new_value;
        };
        new_sensor.get_custom_title_prefix = function () {
            var who_to = widget ? " to " + widget : "";
            var title = "When a '" + event_name + "' event" + who_to + " occurs my bird will bring me the '" + this.get_attributes_string() + "' attribute of the event.";
            if (active) {
                if (!this.get_backside()) {
                    title += " On my back you can change which kind of events and attributes I receive.";
                }
            } else {
                title += " But I'm deactivated and can't receive anything until the green flag <span class='toontalk-green-flag-icon'></span> is clicked or the 'Listening to events' check box on my back is ticked.";
            }
            return title;
        };
        new_sensor.get_default_description = function () {
            if (widget) {
                return "a sensor for " + widget.get_default_description();
            } else {
                return "a sensor for this document.";
            }
        };
        widget_can_run = new_sensor.can_run;
        new_sensor.can_run = function (options) {
            // can run in the sense of becoming active
            return !(options && options.robots_only) || widget_can_run.call(this, options);
        };
        attribute_values = function (event) {
            return new_sensor.get_attributes().map(
                function (attribute) {
                    var value = event[attribute];
                    var backside_of_widget_value;
                    if (attribute === 'key' && value === undefined) {
                        // keyIdentifier has been deprecated in favour of key but Chrome (version 47) doesn't support it
                        // keyIdentifier has reasonable string values for function keys, shift, etc
                        // but orindary letters end up as strings such as U+0058
                        // Note that this workaround fails for some punctuation -- e.g. '-' becomes 'insert'
                       value = event.keyIdentifier;
                       if (value && value.indexOf("U+") === 0) {
                           return String.fromCharCode(event.keyCode);
                       }
                       return value;
                    } else {
                         if (typeof value === 'undefined') {
                             if (event.detail && event.detail.element_widget && (attribute === 'widget' || attribute === 'back')) {
                                 // 'widget' is for backwards compatibility -- good idea?
                                 // return a fresh backside of the widget
                                 backside_of_widget_value = TT.UTILITIES.widget_side_of_element(event.detail.element_widget).create_backside();
                                 backside_of_widget_value.save_dimensions();
                                 return backside_of_widget_value;
                             } else if (event.detail && event.detail.element_widget && attribute === 'front') {
                                 return TT.UTILITIES.widget_side_of_element(event.detail.element_widget);
                             } else if (event.detail && event.detail[attribute] !== undefined) {
                                 if (event.type === 'value changed') {
                                     return TT.number.create_from_bigrat(event.detail[attribute]);
                                 }
                                 return event.detail[attribute];
                             }
                             value = "No such attribute for " + new_sensor;
                             new_sensor.display_message(value, {display_on_backside_if_possible: true});
                         }
                    }
                    return value;
                });
        };
        return new_sensor;
    };

    TT.creators_from_json["sensor"] = function (json, additional_info) {
        if (!json) {
            // no possibility of cyclic references so don't split its creation into two phases
            return;
        }
        var sensor = TT.sensor.create(json.event_name,
                                      json.attribute,
                                      json.description,
                                      [],         // contents defined below
                                      false,
                                      undefined,  // sensor_of defined below
                                      json.name); // will be (re)set below
        var previous_contents;
        // following postponed because of circularity of sensors and their widgets
        if (json.sensor_of) {
            // delay this due to the circularity of sensors and their widgets
            TT.UTILITIES.set_timeout(function () {
                    sensor.set_sensor_of(TT.UTILITIES.create_from_json(json.sensor_of, additional_info));
                    // make sure listeners are updated
                    sensor.set_active(json.active);
                });
        } else {
            sensor.set_active(json.active);
        }
        if (json.contents.length > 0) {
            setTimeout(function () {
                // delay to deal with possible circularity (e.g. widget added events)
                previous_contents = TT.UTILITIES.create_array_from_json(json.contents, additional_info);
                sensor.set_contents(previous_contents);
                // delay also gives it a chance to be added to the DOM
                previous_contents.forEach(function (side) {
                    style_contents(side.get_widget(), sensor);
                });
                sensor.rerender();
            },
            500);
        }
        return sensor;
    };

    return sensor;

}(window.TOONTALK));

window.TOONTALK.sensor_backside =
(function (TT) {
    "use strict";

    return {
        create: function (sensor) {
            var event_name_input      = TT.UTILITIES.create_text_input(sensor.get_event_name(),
                                                                       'toontalk-sensor-event-name-input',
                                                                       // spaces are so this lines up with the next area "Event attribute"
                                                                       // TODO: figure out how to make this work with translation on
                                                                       "Event name&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;",
                                                                       "Type here the event name.",
                                                                       "https://developer.mozilla.org/en-US/docs/Web/Events/" + sensor.get_event_name());
            var event_attribute_input = TT.UTILITIES.create_text_input(sensor.get_attributes_string(),
                                                                       'toontalk-sensor-event-attribute-input',
                                                                       "Event attribute",
                                                                       "Type here the event attribute name or names separated by spaces.",
                                                                       "https://developer.mozilla.org/en/docs/Web/API/Event");
            var activate_switch       = TT.UTILITIES.create_check_box(sensor.get_active(),
                                                                      "toontalk-sensor-active-check-box",
                                                                      "Listening to events",
                                                                      "Check the box if you want to make this sensor active.");
            var backside = TT.nest_backside.create(sensor);
            var backside_element = backside.get_element();
            var update_event_name = function () {
                sensor.set_event_name(event_name_input.button.value.trim());
            };
            var update_attributes = function () {
                sensor.set_attributes(event_attribute_input.button.value.trim());
            };
            var advanced_settings_button = TT.backside.create_advanced_settings_button(backside, sensor);
            var activate_switch_clicked =
                function (event) {
                    var active = activate_switch.button.checked;
                    sensor.set_active(active);
                    if (sensor.robot_in_training()) {
                        sensor.robot_in_training().edited(robot, {setter_name: "set_active",
                                                                  argument_1: active,
                                                                  toString: "change to " + (active ? "active" : "inactive") + " of the " + sensor,
                                                                  button_selector: ".toontalk-sensor-active-check-box"});
                    }
                    sensor.render();
                    event.stopPropagation();
                };
            var generic_add_advanced_settings = backside.add_advanced_settings;
            backside_element.appendChild(advanced_settings_button);
            backside.add_advanced_settings = function () {
                var $advanced_settings_table;
                event_name_input.button     .addEventListener('change', update_event_name);
                event_attribute_input.button.addEventListener('change', update_attributes);
                activate_switch.button      .addEventListener('click', activate_switch_clicked);
                generic_add_advanced_settings.call(backside, event_name_input.container, event_attribute_input.container);
                // advanced table added above
                $advanced_settings_table = $(backside_element).children(".toontalk-advanced-settings-table");
                if ($advanced_settings_table.length > 0) {
                    $advanced_settings_table.get(0).appendChild(activate_switch.container);
                }
            };
            return backside;
    }};
}(window.TOONTALK));
