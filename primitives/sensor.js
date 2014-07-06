 /**
 * Implements ToonTalk's sensors (primitive sensors represented by nests)
 * box.Authors = Ken Kahn
 * License: New BSD
 */
 
 /*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */

window.TOONTALK.sensor = (function (TT) {
    "use strict";
    
    var sensor = Object.create(TT.widget);
    
    var style_contents = function (widget, sensor) {
        var frontside_element;
        if (widget.get_type_name() === 'element') {
            frontside_element = widget.get_frontside_element(true);
            if (sensor.visible()) {
                 $(frontside_element).css({"font-size": $(sensor.get_frontside_element(true)).height()*0.5});
                 widget.set_additional_classes("toontalk-string-value-from-sensor");
                 widget.rerender();
            }
        }
    };
    
    sensor.create = function (event_name, attribute, description, previous_contents, active) {
        var new_sensor = TT.nest.create(description, previous_contents, undefined, "sensor sensor");
        var nest_get_json = new_sensor.get_json;
        var nest_update_display = new_sensor.update_display;
        var nest_copy = new_sensor.copy;
        var event_listener = function (event) {
            var value = event[attribute];
            var visible = new_sensor.visible();
            var $top_level_backside = $(".toontalk-top-level-backside");
            var value_widget, frontside_element, delivery_bird;
            if (attribute === 'keyCode') {
                if (value === 16) {
                    return;
                }
                value = String.fromCharCode(value);
                if (!event.shiftKey) {
                    value = value.toLowerCase();
                }
            }
            switch (typeof value) {
                case 'number':
                value_widget = TT.number.create(Math.round(value), 1); // integers for now
                break;
                case 'string':
                value_widget = TT.element.create(value, undefined, undefined, "toontalk-string-value-from-sensor");
                style_contents(value_widget, new_sensor);
                break;
                case 'boolean':
                // for now
                value_widget = TT.element.create(value.toString(), undefined, undefined, "toontalk-string-value-from-sensor");
                style_contents(value_widget, new_sensor);
                break;
                case 'undefined':
                console.log("No " + attribute + " in sensor " + sensor);
                return;
            }
            if (visible) {
                delivery_bird = TT.bird.create();
                // comes from the bottom center
                delivery_bird.animate_delivery_to({widget: value_widget}, {widget: new_sensor}, new_sensor, $top_level_backside.width()/2, $top_level_backside.height());
            } else {
                new_sensor.add_to_contents({widget: value_widget});
            }
        };
        window.addEventListener(event_name, event_listener);
        new_sensor.copy = function (just_value) {
            var copy;
            if (just_value && this.has_contents()) {
                return nest_copy.call(this, true);
            }
            copy = TT.sensor.create(event_name, attribute, description, undefined, active);
            return new_sensor.add_to_copy(copy, just_value);
        };
        new_sensor.get_json = function (json_history) {
            var nest_json = nest_get_json.call(this, json_history);
            nest_json.type = 'sensor';
            nest_json.event_name = event_name;
            nest_json.attribute = attribute;
            nest_json.active = active;
            return nest_json;
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
        new_sensor.get_type_name = function () {
            return 'sensor';
        };
        new_sensor.toString = function () {
            return "a sensor of " + attribute + " for " + event_name + " sensors";
        };
        new_sensor.get_active = function () {
            return active;
        };
        new_sensor.set_active = function (new_value) {
            if (new_value) {
                window.addEventListener(event_name, event_listener);
            } else {
                window.removeEventListener(event_name, event_listener);
            }
            active = new_value;
        };
        new_sensor.create_backside = function () {
            return TT.sensor_backside.create(this);
        };
        new_sensor.get_event_name = function () {
            return event_name;
        };
        new_sensor.set_event_name = function (new_value) {
            if (event_name) {
                window.removeEventListener(event_name, event_listener);
            }
            event_name = new_value;
            if (event_name) {
                window.addEventListener(event_name, event_listener);
            }
        };
        new_sensor.get_attribute = function () {
            return attribute;
        };
        new_sensor.set_attribute = function (new_value) {
            attribute = new_value;
        };
        new_sensor.match = function (other) {
            // to do
            return "not matched";
        };
        return new_sensor;
    };
    
    sensor.create_from_json = function (json, additional_info) {
        var previous_contents = TT.UTILITIES.create_array_from_json(json.contents, additional_info);
        var sensor = TT.sensor.create(json.event_name,
                                      json.attribute,
                                      json.description, 
                                      previous_contents,
                                      json.active);
        if (previous_contents.length > 0) {
            setTimeout(function () {
                // delay to give it a chance to be added to the DOM
                previous_contents.forEach(function (widget) {
                    style_contents(widget.widget, sensor);
                })
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
            var event_name_input =      TT.UTILITIES.create_text_input(sensor.get_event_name(), 'toontalk-sensor-event-name-input',      "Event name&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;",      "Type here the event name.",           "https://developer.mozilla.org/en-US/docs/Web/Events/" + sensor.get_event_name());
            var event_attribute_input = TT.UTILITIES.create_text_input(sensor.get_attribute(),  'toontalk-sensor-event-attribute-input', "Event attribute", "Type here the event attribute name.", "https://developer.mozilla.org/en/docs/Web/API/Event");
            var activate_switch =       TT.UTILITIES.create_check_box(sensor.get_active(),
                                                                      "toontalk-sensor-active-check-box",
                                                                      "Listening to events",
                                                                      "Check the box if you want to make this sensor active.");

            var extra_settings = function (settings) {
                settings.appendChild(event_name_input.container);
                settings.appendChild(event_attribute_input.container);
                settings.appendChild(activate_switch.container);
            }
            var backside = TT.nest_backside.create(sensor, extra_settings);
            var update_event_name = function () {
                sensor.set_event_name(event_name_input.button.value.trim());
            };
            var update_attribute = function () {
                sensor.set_attribute(event_attribute_input.button.value.trim());
            };
            event_name_input.button.addEventListener(     'change', update_event_name);
            event_attribute_input.button.addEventListener('change', update_attribute);
            $(activate_switch.button).click(function (event) {
                var active = activate_switch.button.checked;
                sensor.set_active(active);
                if (TT.robot.in_training) {
                    TT.robot.in_training.edited(robot, {setter_name: "set_active",
                                                        argument_1: active,
                                                        toString: "change to " + (active ? "active" : "inactive") + " of the " + sensor,
                                                        button_selector: ".toontalk-sensor-active-check-box"});
                }
                sensor.render();
                event.stopPropagation();
            });
            return backside;
    }};
}(window.TOONTALK));

