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
    
    sensor.create = function (sensor_name, attribute, description, previous_contents) {
        var new_sensor = TT.nest.create(description, previous_contents, undefined, "sensor sensor");
        var nest_get_json = new_sensor.get_json;
        var nest_update_display = new_sensor.update_display;
        var nest_copy = new_sensor.copy;
        var event_listener = function (event) {
            var value = event[attribute];
            if (attribute === 'keyCode') {
                if (value === 16) {
                    return;
                }
                value = String.fromCharCode(value);
                if (!event.shiftKey) {
                    value = value.toLowerCase();
                }
            }
            var value_widget, frontside_element;
            var visible = new_sensor.visible();
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
                value_widget = TT.element.create(value.toString());
                break;
                case 'undefined':
                console.log("No " + attribute + " in sensor " + sensor);
                return;
            }
            new_sensor.add_to_contents({widget: value_widget});
        };
        window.addEventListener(sensor_name, event_listener);
        new_sensor.copy = function (just_value) {
            var copy;
            if (just_value && this.has_contents()) {
                return nest_copy.call(this, true);
            }
            copy = TT.sensor.create(sensor_name, attribute, description);
            return new_sensor.add_to_copy(copy, just_value);
        };
        new_sensor.get_json = function (json_history) {
            var nest_json = nest_get_json.call(this, json_history);
            nest_json.type = 'sensor';
            nest_json.sensor_name = sensor_name;
            nest_json.attribute = attribute;
            return nest_json;
        };
        new_sensor.update_display = function () {
            nest_update_display.call(this);
            $(this.get_frontside_element()).addClass("toontalk-sensor-nest");
            $(this.get_frontside_element()).removeClass("toontalk-empty-nest");
        }
        new_sensor.get_type_name = function () {
            return 'sensor';
        };
        new_sensor.toString = function () {
            return "a sensor of " + attribute + " for " + sensor_name + " sensors";
        };
        new_sensor.set_active = function (new_value) {
            if (new_value) {
                window.addEventListener(sensor_name, event_listener);
            } else {
                window.removeEventListener(sensor_name, event_listener);
            }
        };
        return new_sensor;
    };
    
    sensor.create_from_json = function (json, additional_info) {
        var previous_contents = TT.UTILITIES.create_array_from_json(json.contents, additional_info);
        var sensor = TT.sensor.create(json.sensor_name,
                                      json.attribute,
                                      json.description, 
                                      previous_contents);
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