 /**
 * Implements ToonTalk's creation of index page
 * Authors: Ken Kahn
 * License: New BSD
 */
 
 /*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */

window.TOONTALK.initialise = 
function () {
    "use strict";
$(document).ready(function () {
    var TT = window.TOONTALK;
    var backside = TT.backside.create({});
    var backside_element = backside.get_element();
    var $backside_element = $(backside_element);
    var number = TT.number.create(1);
    var number_element = number.get_frontside_element();
    var box = TT.box.create(1);
    var box_element = box.get_frontside_element();
    var robot = TT.robot.create();
    var robot_element = robot.get_frontside_element();
    var all_elements = [number_element, box_element, robot_element];
    var i;
    $("#top-level-backside").append(backside_element);
    $backside_element.css({width: "1000px",
                           height: "300px", // not sure why 50% didn't work
                           "background-color": "yellow",
                           position: "relative"});
    backside_element.draggable = false;
    TT.debugging = true; // remove this for production releases
    // use get_frontside_element in the following
    $("#a-number").append(number_element);
    number.update_display();
    $("#a-box").append(box_element);
    box.update_display(); 
    $("#a-robot").append(robot_element);
    robot.update_display(); 
    for (i = 0; i < all_elements.length; i += 1) {
        $(all_elements[i]).addClass("toontalk-top-level-resource");
        $(all_elements[i]).css({position: "relative"});
    }
    TT.QUEUE.run();
});
};