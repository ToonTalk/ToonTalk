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
    var add_one_robot = TT.tests.add_one_robot();
    var add_one_robot_element = add_one_robot.get_frontside_element();
    var double_robot = TT.tests.double_robot();
    var double_robot_element = double_robot.get_frontside_element();
    var copy_first_hole_to_second_hole_robot = TT.tests.copy_first_hole_to_second_hole_robot();
    var copy_first_hole_to_second_hole_robot_element = copy_first_hole_to_second_hole_robot.get_frontside_element();
    var all_elements = [number_element, box_element, add_one_robot_element, double_robot_element, copy_first_hole_to_second_hole_robot_element];
    var i;
    $("#top-level-backside").append(backside_element);
    $backside_element.css({width: "600px",
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
    $("#add_one_robot").append(add_one_robot.get_frontside(true).get_element());
    // should the following be done by get_element if never done?
    add_one_robot.update_display(); 
    $("#double_robot").append(double_robot.get_frontside(true).get_element());
    double_robot.update_display();
    $("#copy_first_hole_to_second_hole_robot").append(copy_first_hole_to_second_hole_robot.get_frontside(true).get_element());
    copy_first_hole_to_second_hole_robot.update_display();
    for (i = 0; i < all_elements.length; i += 1) {
        $(all_elements[i]).addClass("toontalk-top-level-resource");
        $(all_elements[i]).css({position: "relative"});
    }
    TT.QUEUE.run();
});
};