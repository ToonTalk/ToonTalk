 /**
 * Implements ToonTalk's birds and nests
 * box.Authors = Ken Kahn
 * License: New BSD
 */
 
 /*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */

window.TOONTALK.bird = (function (TT) {
    "use strict";
    var bird = Object.create(TT.widget);
    
    bird.create = function (nest, image_url, description) {
        var new_bird = Object.create(bird);
        if (!image_url) {
            image_url = "images/GIMME3.PNG";
        }
        new_bird.get_nest = function () {
            return nest;
        };
        new_bird.get_image_url = function () {
            return image_url;
        };
        new_bird.set_image_url = function (new_value, update_display) {
            if (image_url === new_value) {
                return false;
            }
            image_url = new_value;
            if (update_display) {
                this.rerender();
            }
            return true;
        };
        new_bird.get_description = function () {
            return description;
        };
        new_bird.set_description = function (new_value, update_display) {
            if (description === new_value) {
                return false;
            }
            description = new_value;
            if (update_display) {
                this.rerender();
            }
            return true;
        };
        new_bird.widget_dropped_on_me = function (other, other_is_backside, event) {
            if (nest) {
                nest.add_to_contents(other);
            }
        };
        new_bird = new_bird.add_standard_widget_functionality(new_bird);
        if (TT.debugging) {
            new_bird.debug_id = TT.UTILITIES.generate_unique_id();
        }
        return new_bird;
    };
    
    bird.create_backside = function () {
        return TT.bird_backside.create(this);
    };
    
    bird.copy = function (just_value) {
        // this may become more complex if the original ToonTalk behaviour
        // that if a bird and its nest are copied or saved as a unit they become a new pair
        // notice that bird/nest semantics is that the nest is shared not copied
        var copy = this.create(this.get_nest(), this.get_image_url());
        return this.add_to_copy(copy, just_value);
    };
    
    bird.match = function (other) {
        // doesn't matter if erased
        // shouldn't be able to match to see if two birds are identical, right?
        if (other.match_with_any_bird) {
            return other.match_with_any_bird(this);
        }
        return "not matched";
    };
    
    bird.match_with_any_bird = function () {
        return "matched";
    };
    
    bird.update_display = function() {
        var frontside = this.get_frontside();
        var backside = this.get_backside(); 
        var bird_image, frontside_element;
        if (!frontside) {
            return;
        }
        frontside_element = frontside.get_element();
        bird_image = this.image();
        // if animating should also display thing_in_hand
        // remove what's there currently before adding new elements
        while (frontside_element.firstChild) {
            frontside_element.removeChild(frontside_element.firstChild);
        }
        frontside_element.title = this.get_title();
        $(frontside_element).addClass("toontalk-bird");
        frontside_element.appendChild(bird_image);
        if (backside) {
            backside.rerender();
        }
    };
    
    bird.image = function () {
        return TT.UTILITIES.create_image(this.get_image_url(), "toontalk-bird-image");   
    };
    
    bird.toString = function () {
        return "a bird"; // good enough for now
    };
    
    bird.get_type_name = function () {
        return "bird";
    };
    
    bird.get_json = function () {
        return this.add_to_json(
            {semantic:
                 {type: "bird",
                  nest: this.get_nest().get_json()
                  },
             view:
                 {image_url: this.get_image_url(),
                  description: this.get_description()}});
    };
    
    bird.create_from_json = function (json_semantic, json_view) {
        return TT.bird.create(TT.UTILITIES.create_from_json(json_semantic.nest), json_view.image_url);
    };
    
    return bird;
}(window.TOONTALK));

window.TOONTALK.bird_backside = 
(function (TT) {
    "use strict";
    return {
        create: function (bird) {
            var backside = TT.backside.create(bird);
            var backside_element = backside.get_element();
            var image_url_input = TT.UTILITIES.create_text_input(bird.get_image_url(), "toontalk-image-url-input", "Image URL&nbsp;", "Type here to provide a URL for the appearance of this bird.");
            var description_text_area = TT.UTILITIES.create_text_area(bird.get_description(), 
                                                                      "toontalk-bird-description-input", 
                                                                      "This&nbsp;bird&nbsp;",
                                                                      "Type here to provide additional information about this bird.");
            var standard_buttons = TT.backside.create_standard_buttons(backside, bird);
            var infinite_stack_check_box = TT.backside.create_infinite_stack_check_box(backside, bird);
            var image_url_change = function () {
                var image_url = image_url_input.button.value.trim();
                if (bird.set_image_url(image_url, true) && TT.robot.in_training) {
                    // if changed and by a robot then record it
                    TT.robot.in_training.edited(bird, {setter_name: "set_image_url",
                                                       argument_1: image_url,
                                                       toString: "change the image URL to " + image_url + " of the bird",
                                                       button_selector: ".toontalk-run-once-check-box"});
                }
            };
            var description_change = function () {
                var description = description_text_area.button.value.trim();
                if (bird.set_description(description, true) && TT.robot.in_training) {
                    TT.robot.in_training.edited(bird, {setter_name: "set_description",
                                                       argument_1: description,
                                                       toString: "change the description to '" + description + "'' of the bird",
                                                       button_selector: ",toontalk-bird-description-input"});
                }
            };
            var input_table;
            image_url_input.button.addEventListener('change', image_url_change);
            image_url_input.button.addEventListener('mouseout', image_url_change);
            description_text_area.button.addEventListener('change', description_change);
            description_text_area.button.addEventListener('mouseout', description_change);
            input_table = TT.UTILITIES.create_vertical_table(description_text_area.container, image_url_input.container);
            $(input_table).css({width: "90%"});
            backside_element.appendChild(input_table);
            backside_element.appendChild(standard_buttons);
            backside_element.appendChild(infinite_stack_check_box.container);
            backside.update_display = function () {
                var frontside_element = bird.get_frontside_element();
                var $containing_backside_element;
                $(description_text_area.button).val(bird.get_description());
                $(image_url_input.button).val(bird.get_image_url());
                if (frontside_element) {
                    frontside_element.title = bird.get_title();
                    $containing_backside_element = $(frontside_element).closest(".toontalk-backside");
                    if ($containing_backside_element.length > 0) {
                        $containing_backside_element.data("owner").get_backside().update_run_button_disabled_attribute();
                    }                    
                }
                backside.update_run_button_disabled_attribute();
            };
            return backside;
        }
        
    };
}(window.TOONTALK));

window.TOONTALK.nest = (function (TT) {
    "use strict";
    var nest = Object.create(TT.widget);
    
    nest.create = function (image_url, description, contents, waiting_robots) {
        var new_nest = Object.create(nest);
        var guid;
        if (!contents) {
            contents = [];
        }
        if (!waiting_robots) {
            waiting_robots = [];
        }
        if (!image_url) {
            image_url = "images/HATCH01.PNG";
        }
        new_nest.get_image_url = function () {
            return image_url;
        };
        new_nest.set_image_url = function (new_value, update_display) {
            if (image_url === new_value) {
                return false;
            }
            image_url = new_value;
            if (update_display) {
                this.rerender();
            }
            return true;
        };
        new_nest.get_description = function () {
            return description;
        };
        new_nest.set_description = function (new_value, update_display) {
            if (description === new_value) {
                return false;
            }
            description = new_value;
            if (update_display) {
                this.rerender();
            }
            return true;
        };
        new_nest.matched_by = function (other) {
            if (contents.length > 0) {
                return TT.UTILITIES.match(other, contents[0]);
            } else {
                // suspend on this nest
                return [this];
            }
        };
        new_nest.run_when_non_empty = function (robot_run) {
            waiting_robots.push(robot_run);
        };
        new_nest.add_to_contents = function (widget) {
            var current_waiting_robots;
            if (contents.push(widget) === 1 && waiting_robots.length > 0) {
                // is the first content and some robots are waiting for this nest to be filled
                // running these robots may cause new waiting robots so set waiting_robots to [] first
                current_waiting_robots = waiting_robots;
                waiting_robots = [];
                current_waiting_robots.forEach(function (robot_run) {
                    robot_run();
                });
                this.rerender();
            }
        };
        // defined here so that contents can be 'hidden'
        new_nest.get_json = function () {
            return this.add_to_json(
                {semantic:
                     {type: "nest",
                      contents: TT.UTILITIES.get_json_of_array(contents)
                      // do waiting_robots after changing from function to object
                      },
                 view:
                     {image_url: image_url,
                      description: description}});
        };
        new_nest.copy = function (just_value) {
            // this may become more complex if the original ToonTalk behaviour
            // that if a bird and its nest are copied or saved as a unit they become a new pair
            // notice that bird/nest semantics is that the nest is shared not copied
            var copy;
            if (guid) {
                // has already hatched so need to create a nest_copy that points to this nest
                console.log("not yet implemented");
                copy = this;
            } else {
                copy = TT.nest.create(image_url, description, contents, waiting_robots);
            }
            return this.add_to_copy(copy, just_value);
        };
        new_nest.dropped_on_other = function (other, other_is_backside, event) {
            var bird;
            if (!guid) {
                guid = TT.UTILITIES.generate_unique_id();
                image_url = "images/MKNEST25.PNG";
                if (TT.debugging) {
                    new_nest.debug_string = "A nest with id " + guid;
                }
                this.rerender();
                bird = TT.bird.create(this);
                if (other_is_backside) {
                    other.get_backside().widget_dropped_on_me(bird, false, event);
                } else {
                    console.log("not yet implemented -- add to nearest ancestor backside");
                }
            }
        };
        new_nest.update_display = function() {
            var frontside = this.get_frontside();
            var backside = this.get_backside(); 
            var nest_image, frontside_element, contents_frontside_element;
            if (!frontside) {
                return;
            }
            frontside_element = frontside.get_element();
            // if animating should also display thing_in_hand
            // remove what's there currently before adding new elements
            while (frontside_element.firstChild) {
                frontside_element.removeChild(frontside_element.firstChild);
            }
            if (contents.length > 0) {
                contents[0].update_display();
                // what is backside had been given to bird???
                contents_frontside_element = contents[0].get_frontside_element();
                $(contents_frontside_element).addClass("toontalk-widget-on-nest");
                contents_frontside_element.style.position = "static";
                frontside_element.appendChild(contents_frontside_element);
            } else {
                nest_image = this.image();
                frontside_element.title = this.get_title();
                frontside_element.appendChild(nest_image);
            }
            $(frontside_element).addClass("toontalk-nest");
            if (backside) {
                backside.rerender();
            }
        };
        new_nest = new_nest.add_standard_widget_functionality(new_nest);
        if (TT.debugging) {
            new_nest.debug_id = TT.UTILITIES.generate_unique_id();
            new_nest.debug_string = "A nest with an egg";
        }
        return new_nest;
    };
    
    nest.create_backside = function () {
        return TT.nest_backside.create(this);
    };
    
    nest.match = function (other) {
        // not allowed since is not stable -- could be covered asynchronously
        return "not matched";
    };
    
    nest.image = function () {
        return TT.UTILITIES.create_image(this.get_image_url(), "toontalk-nest-image");    
    };
    
    nest.toString = function () {
        return "a nest"; // good enough for now
    };
    
    nest.get_type_name = function () {
        return "nest";
    };
    
    nest.create_from_json = function (json_semantic, json_view) {
        return TT.nest.create(json_view.image_url, TT.UTILITIES.create_array_from_json(json_semantic.contents));
    };
    
    return nest;
}(window.TOONTALK));

window.TOONTALK.nest_backside = 
(function (TT) {
    "use strict";
    return {
        create: function (nest) {
            var backside = TT.backside.create(nest);
            var backside_element = backside.get_element();
            var image_url_input = TT.UTILITIES.create_text_input(nest.get_image_url(), "toontalk-image-url-input", "Image URL&nbsp;", "Type here to provide a URL for the appearance of this nest.");
            var description_text_area = TT.UTILITIES.create_text_area(nest.get_description(), 
                                                                      "toontalk-nest-description-input", 
                                                                      "This&nbsp;nest&nbsp;",
                                                                      "Type here to provide additional information about this nest.");
            var standard_buttons = TT.backside.create_standard_buttons(backside, nest);
            var infinite_stack_check_box = TT.backside.create_infinite_stack_check_box(backside, nest);
            var image_url_change = function () {
                var image_url = image_url_input.button.value.trim();
                if (nest.set_image_url(image_url, true) && TT.robot.in_training) {
                    // if changed and by a robot then record it
                    TT.robot.in_training.edited(nest, {setter_name: "set_image_url",
                                                       argument_1: image_url,
                                                       toString: "change the image URL to " + image_url + " of the nest",
                                                       button_selector: ".toontalk-run-once-check-box"});
                }
            };
            var description_change = function () {
                var description = description_text_area.button.value.trim();
                if (nest.set_description(description, true) && TT.robot.in_training) {
                    TT.robot.in_training.edited(nest, {setter_name: "set_description",
                                                       argument_1: description,
                                                       toString: "change the description to '" + description + "'' of the nest",
                                                       button_selector: ",toontalk-nest-description-input"});
                }
            };
            var input_table;
            image_url_input.button.addEventListener('change', image_url_change);
            image_url_input.button.addEventListener('mouseout', image_url_change);
            description_text_area.button.addEventListener('change', description_change);
            description_text_area.button.addEventListener('mouseout', description_change);
            input_table = TT.UTILITIES.create_vertical_table(description_text_area.container, image_url_input.container);
            $(input_table).css({width: "90%"});
            backside_element.appendChild(input_table);
            backside_element.appendChild(standard_buttons);
            backside_element.appendChild(infinite_stack_check_box.container);
            backside.update_display = function () {
                var frontside_element = nest.get_frontside_element();
                var $containing_backside_element;
                $(description_text_area.button).val(nest.get_description());
                $(image_url_input.button).val(nest.get_image_url());
                if (frontside_element) {
                    frontside_element.title = nest.get_title();
                    $containing_backside_element = $(frontside_element).closest(".toontalk-backside");
                    if ($containing_backside_element.length > 0) {
                        $containing_backside_element.data("owner").get_backside().update_run_button_disabled_attribute();
                    }                    
                }
                backside.update_run_button_disabled_attribute();
            };
            return backside;
        }
        
    };
}(window.TOONTALK));
