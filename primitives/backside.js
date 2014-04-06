 /**
 * Implements ToonTalk's backside of a widget
 * Authors: Ken Kahn
 * License: New BSD
 */
 
/*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */

window.TOONTALK.backside = 
(function (TT) {
    "use strict";
    return {
		create: function (widget) {
			var backside = Object.create(this);
			var backside_element = document.createElement("div");
			var $backside_element = $(backside_element);
			var original_width, original_height;
			var backside_widgets;
			$backside_element.addClass("toontalk-backside toontalk-side");
			backside.get_element = function () {
                return backside_element;
            };
			backside.get_widget = function () {
				return widget;
			};
			if (!widget.get_backside) {
				// e.g. top-level backside
				widget.get_backside = function () {
					return backside;
				};
		    }
			if (!widget.drop_on) {
				// TO DO: determine if this is needed -- top-level backside can't be added to something - can it?
			    widget.drop_on = function (other, $side_element_of_other, event) {
					$backside_element.append($side_element_of_other);
// 					$backside_element.addClass("toontalk-on-backside");
				    TT.UTILITIES.set_position_absolute($side_element_of_other.get(0), true, event); // when on the backside
					if ($side_element_of_other.is(".toontalk-frontside")) {
						// better to have a preferrred size that it goes to when on backside
						// recorded when dropped into something that changes its size -- e.g. a box
                        $side_element_of_other.addClass("toontalk-frontside-on-backside");
// 						$side_element_of_other.resizable("enable");
                        other.update_display();
			        }
					return true;
			    };
			}
			if (!widget.removed) {
			    widget.removed = function (other, $side_element_of_other, event) {
					$side_element_of_other.removeClass("toontalk-frontside-on-backside");
// 					$side_element_of_other.resizable("disable");
					// need to disable resizable -- probably should add it it and disable elsewhere
// 					$element.removeClass("toontalk-on-backside");
				    // no need to do anything since can find all children and their 'owners' easily enough
			    };
            }
			backside.widget_dropped_on_me = 
			    function (other, event) {
			        var other_front_side_element = other.get_frontside(true).get_element();
			        var $other_front_side_element = $(other_front_side_element);
			        $backside_element.append($other_front_side_element);
			        TT.UTILITIES.set_position_absolute(other_front_side_element, true, event); // when on the backside
					$other_front_side_element.data("owner").update_display();
					if (TT.robot.in_training) {
						if ($backside_element.is(".toontalk-top-level-backside")) {
							TT.robot.in_training.dropped_on("top-level-backside");
						} else {
							TT.robot.in_training.dropped_on(this);
						}
					}
			        return true;
		        };
		    backside.add_backside_widgets = function (backside_widgets, json_array)  {
				if (backside_widgets.length === 0) {
					return;
				}
				// too soon to add these widgets so delay slightly
				setTimeout(
					function () {
						var i, widget_frontside_element, json_view;
						for (i = 0; i < backside_widgets.length; i++) {
							widget_frontside_element = backside_widgets[i].get_frontside_element(true);
							$(widget_frontside_element).data("owner", backside_widgets[i]);
							if (json_array) {
								json_view = json_array[i];
								if (json_view && json_view.frontside_width) {
									// what if it is backside that needs to be added?
									$(widget_frontside_element).css({width: json_view.frontside_width,
									                                 height: json_view.frontside_height});
								}
								if (json_view.frontside_left) {
									$(widget_frontside_element).css({left: json_view.frontside_left,
															         top: json_view.frontside_top});
								}
							}
							$(backside_element).append(widget_frontside_element);
						}
					},
					1);
			};
			TT.backside.associate_widget_with_backside_element(widget, backside, backside_element);
			TT.UTILITIES.drag_and_drop($backside_element, widget);
			// the following function should apply recursively...
			$backside_element.resizable(
				{start: function () {
					if (!original_width) {
						original_width = $backside_element.width();
					}
					if (!original_height) {
						original_height = $backside_element.height();
					}
				},
				resize: function (event, ui) {
					var percentage = 100 * Math.min(1, $backside_element.width() / original_width, $backside_element.height() / original_height);
					$backside_element.css({"font-size": percentage + "%"});
				},
				handles: "n,e,s,w,se,ne,sw,nw"});
            // following should be done by something like GWT's onLoad...
            // but DOMNodeInserted is deprecated and MutationObserver is only in IE11.
			$(backside_element).on('DOMNodeInserted', function (event) {
				var $source = $(event.originalEvent.srcElement);
				var owner_widget;
				if ($source.is(".toontalk-frontside") && $source.parent().is(".toontalk-backside")) {
					$source.addClass("toontalk-frontside-on-backside");
					if ($source.is(".ui-resizable")) {
						$source.resizable("enable");
					}
					owner_widget = $source.data("owner");
					if (owner_widget) {
						owner_widget.update_display();
					}
				} 
// 				else if ($source.is(".toontalk-backside")) {
// 					owner_widget = $source.data("owner");
// 					if (owner_widget) {
// 						// let it respond to being attached
// 						owner_widget.get_backside().attached();
// 					}
// 				}
				event.stopPropagation();
			});
			$(backside_element).on('DOMNodeRemoved', function (event) {
				var $source = $(event.originalEvent.srcElement);
				if ($source.is(".toontalk-frontside")) {
					$source.removeClass("toontalk-frontside-on-backside");
// 					$source.resizable("disable");
// 					owner_widget = $source.data("owner");
// 					if (owner_widget) {
// 						owner_widget.update_display();
// 					}
				}
				event.stopPropagation();
			});
			if (widget.get_backside_widgets) {
				backside_widgets = widget.get_backside_widgets();
			 	backside.add_backside_widgets(backside_widgets, widget.get_backside_widgets_json_views());
			}
			return backside;
		},
		
        associate_widget_with_backside_element: function (widget, backside, backside_element) {
			var $backside_element = $(backside_element);
			$backside_element.data("owner", widget);
            return widget;
        },
				
		remove: function() {
			$(this.get_element()).remove();
		},
		
		visible: function () {
			var backside_element = this.get_element();
			return (backside_element && $(backside_element).is(":visible"));
		},
		
		create_standard_buttons: function (backside, widget) { // extra arguments are extra buttons
		    var run_or_erase_button;
			var frontside_element = widget.get_frontside_element();
			if (!widget.get_erased() && !$(frontside_element).is(".toontalk-thought-bubble-contents") && $(frontside_element).parents(".toontalk-thought-bubble-contents").length === 0) {
				run_or_erase_button = TT.backside.create_run_button(backside, widget);
			} else {
				run_or_erase_button = TT.backside.create_erase_button(backside, widget);
			}
			var copy_button = TT.backside.create_copy_button(backside, widget);
			var hide_button = TT.backside.create_hide_button(backside, widget);
			var remove_button = TT.backside.create_remove_button(backside, widget);
			// consider moving this to UTILITIES...
			// or eliminating it entirely since can appendChild after set is created
			var extra_arguments = [];
			var i;
			for (i = 2; i < arguments.length; i++) {
				extra_arguments[i-2] = arguments[i];
			}
			return TT.UTILITIES.create_button_set(run_or_erase_button, copy_button, remove_button, hide_button, extra_arguments);
		},			
		
		create_hide_button: function (backside, widget) {
			var backside_element = backside.get_element();
			var $backside_element = $(backside_element);
			var $hide_button = $("<button>Hide</button>").button();
			var record_backside_widget_positions = function () {
				var backside_widgets = widget.get_backside_widgets();
				var i, backside_widget_frontside_element;
				for (i = 0; i < backside_widgets.length; i++) {
					backside_widget_frontside_element = backside_widgets[i].get_frontside_element();
					if (backside_widget_frontside_element) {
						backside_widgets[i].position_when_hidden = $(backside_widget_frontside_element).position();
					}
				}
			};
			$hide_button.addClass("toontalk-hide-backside-button");
			$hide_button.click(function (event) {
				if (widget && widget.forget_backside) {
					widget.forget_backside();
				}
				if (widget) {
					record_backside_widget_positions();
				}
			    $backside_element.remove(); // could animate away
				event.stopPropagation();
			});
			$hide_button.attr("title", "Click to hide this.");
			return $hide_button.get(0);
		},
		
		create_erase_button: function (backside, widget) {
			var backside_element = backside.get_element();
			var $backside_element = $(backside_element);
			var $erase_button = $("<button>Erase</button>").button();
			$erase_button.addClass("toontalk-erase-backside-button");
			var update_title = function () {
				if (widget.get_erased()) {
					$erase_button.button("option", "label", "Un-erase");
					$erase_button.attr("title", "Click to restore this to how it was before it was erased.");
				} else {
					$erase_button.button("option", "label", "Erase");
					$erase_button.attr("title", "Click to erase this so the robot won't be so fussy.");
				}
			};
			update_title();
			$erase_button.click(function (event) {
				var frontside_element = widget.get_frontside_element();
				var $robot_element = $(frontside_element).parents(".toontalk-robot");
				var robot = $robot_element.data("owner");
				var robot_backside;
				var erased = !widget.get_erased();
				widget.set_erased(erased, true);
				update_title();
				if (robot) {
					robot_backside = robot.get_backside();
					if (robot_backside) {
						robot_backside.update_display();
					}
				}
				if (TT.robot.in_training) {
					TT.robot.in_training.set_erased(widget, erased);
				}
				event.stopPropagation();
			});
			$erase_button.attr("title", "Click to hide this.");
			return $erase_button.get(0);
		},
		
		create_copy_button: function (backside, widget) {
			var backside_element = backside.get_element();
			var $backside_element = $(backside_element);
			var $copy_button = $("<button>Copy</button>").button();
			$copy_button.addClass("toontalk-copy-backside-button");
			$copy_button.click(function (event) {
				var widget_copy = widget.copy();
				var frontside_element = widget.get_frontside_element();
				var frontside_element_copy = widget_copy.get_frontside_element();
				var position = $(frontside_element).position();
				$(frontside_element_copy).css({width: $(frontside_element).width(),
				                               height: $(frontside_element).height(),
											   left: position.left+10,
											   top: position.top+10});
				$(frontside_element).parent().append(frontside_element_copy);
				if (TT.robot.in_training) {
					TT.robot.in_training.copied(widget, widget_copy, false);
				}
				event.stopPropagation();
			});
			$copy_button.attr("title", "Click to make a copy of this " + widget.get_type_name());
			return $copy_button.get(0);
		},
		
		create_run_button: function (backside, widget) {
			var backside_element = backside.get_element();
			var $backside_element = $(backside_element);
			var $run_button = $("<button>Run</button>").button();
			$run_button.addClass("toontalk-run-backside-button");
			$run_button.click(function (event) {
				var will_run = !widget.get_running();
				TT.backside.update_run_button($run_button, !will_run, widget);
				widget.set_running(will_run);
				event.stopPropagation();
			});
			$run_button.attr("title", "Click to run the robots on this " + widget.get_type_name());
			return $run_button.get(0);
		},
		
		update_run_button: function ($run_button, run, widget) {
			if (run) {
				$run_button.button("option", "label", "Run");
				$run_button.attr("title", "Click to run the robots on this " + widget.get_type_name());
			} else {
				$run_button.button("option", "label", "Stop");
				$run_button.attr("title", "Click to stop running the robots on this " + widget.get_type_name());
			}
		},
		
		create_remove_button: function (backside, widget) {
			var $remove_button = $("<button>Remove</button>").button();
			$remove_button.addClass("toontalk-remove-backside-button");
			$remove_button.click(function (event) {
				if (widget && widget.remove) {
					widget.remove();
					if (TT.robot.in_training) {
						TT.robot.in_training.removed(widget);
					}
				}
				event.stopPropagation();
			});
			$remove_button.attr("title", "Click to remove this " + widget.get_type_name());
			return $remove_button.get(0);
		},
		
		get_widgets: function () {
			var widgets = [];
			$(this.get_element()).children().each(function (index, element) {
				var owner = $(element).data("owner");
				if (owner && widgets.indexOf(owner) < 0) {
					widgets[widgets.length] = owner;
				}
			});
			return widgets;
		}

    };
}(window.TOONTALK));