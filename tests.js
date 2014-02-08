 /**
 * Implements test programs for Web window.TOONTALK
 */
 
 window.TOONTALK.tests = {
     assert_equals: function (a, b, message) {
         "use strict";
         console.assert(a.equals(b), message + " Expected to be equal " + a.toString() + "=" + b.toString());
//         if (!(a.equals(b))) {
//             alert(message + " Expected to be equal " + a.toString() + "=" + b.toString());
//         }
     },
     
     random_integer_between: function (min, max) {
         "use strict";
         return Math.round(Math.random()*(max-min))+min;
     },
     
     // number tests:
     drop_numbers: function (operator, a_n, a_d, b_n, b_d, result_n, result_d) {
         "use strict";
         var a = window.TOONTALK.number.create(a_n, a_d).set_operator(operator);
         var b = window.TOONTALK.number.create(b_n, b_d);
         var expected_result = window.TOONTALK.number.create(result_n, result_d);
         var result = a.drop_on(b);
         this.assert_equals(result, expected_result, 'Dropping ' + a + ' on ' + b + ' should result in ' + expected_result);
         this.assert_equals(b, expected_result, 'Dropping ' + a + ' on ' + b + ' should update ' + b + ' to ' + expected_result);
         this.assert_equals(a, window.TOONTALK.number.create(a_n, a_d), 'Dropping ' + a + ' on ' + b + ' should not update ' + a);
     },
     
     create_sides: function (context, backside_element) {
         var backside = context.get_backside(true);
         var frontside = context.get_frontside(true);
         backside_element.appendChild(backside.get_element());
         backside_element.appendChild(frontside.get_element());
         // wait 1/10 second before updating the display
         setTimeout(function () {context.update_display();}, 100);
     },
     
     // robot tests:
     add_or_duplicate_robot: function (erase_bubble, double, backside_element, runs) {
         "use strict";
         var bubble = window.TOONTALK.number.create(2);
         var expected_result;
         var context = window.TOONTALK.number.create(2);
         if (backside_element) {
             this.create_sides(context, backside_element);
         }
         if (!runs) {
             runs = 100;
         }
         var robot = double ? this.double_robot() : this.add_one_robot();
         if (erase_bubble) {
             if (double) {
                 expected_result = window.TOONTALK.number.create(2).power(window.TOONTALK.number.create(runs + 1)).toString();
             } else {
                 expected_result = runs+2;
             }
         } else {
             robot.get_bubble().erased = false;
             expected_result = 3;
         }
         this.test_robot(robot, context, runs, window.TOONTALK.number.create(expected_result));
         return this;
     },
     
     test_robot: function (robot, context, runs, expected_result) {
          // reset the queue for these kinds of tests
         window.TOONTALK.QUEUE.paused = true;
         var queue = window.TOONTALK.queue.create();
         robot.run(context, queue);
         var that = this;
         queue.run(runs, function () {
                             var message = robot.toString() + " when given " + context.toString() + " expected " + expected_result.toString() + " when run " + runs + " times. ";
                             that.assert_equals(context, expected_result, message);
                    });                             
     },
     
     accept_number_robot: function() {
         var body = window.TOONTALK.actions.create();
         var bubble = window.TOONTALK.number.create(1);
         bubble.erased = true;
         return window.TOONTALK.robot.create(bubble, body);         
     },
     
     accept_box_robot: function(n) {
         var body = window.TOONTALK.actions.create();
         var bubble = window.TOONTALK.box.create(n);
         bubble.erased = true;
         return window.TOONTALK.robot.create(bubble, body);         
     },
     
     add_one_robot: function () {
         var robot = this.accept_number_robot();
         var body = robot.get_body();
         body.add(window.TOONTALK.pick_up_constant.create(robot, window.TOONTALK.number.ONE()));
         body.add(window.TOONTALK.drop_on.create(robot)); // entire context
         return robot;
     },
     
     double_robot: function () {
         var robot = this.accept_number_robot();
         var body = robot.get_body();
         body.add(window.TOONTALK.copy.create(robot));
         body.add(window.TOONTALK.drop_on.create(robot)); // entire context
         return robot;
     },
     
     copy_first_hole_to_second_hole_robot: function () {
         var robot = this.accept_box_robot(2);
         var body = robot.get_body();
         body.add(window.TOONTALK.copy.create(robot, window.TOONTALK.box.create_path(0)));
         body.add(window.TOONTALK.drop_on.create(robot, window.TOONTALK.box.create_path(1)));
         return robot;
     },
     
     test_copy_first_hole_to_second_hole_robot: function () {
         var robot = this.copy_first_hole_to_second_hole_robot();
         var box = window.TOONTALK.box.create(2);
         var hole0 = window.TOONTALK.number.create(1, 49);
         hole0.set_operator("*");
         var hole1 = window.TOONTALK.number.create(19);
         box.set_hole(0, hole0);
         box.set_hole(1, hole1);
         var expected_result = box.copy();
         expected_result.set_hole(1,  hole1.power(window.TOONTALK.number.create(10)));
         this.test_robot(robot, box, 10, expected_result);
     },
     
     robot_tests: function () {
         this.add_or_duplicate_robot();
         this.add_or_duplicate_robot(true);
         this.add_or_duplicate_robot(true, true);
         // not using 'this' here so can easily copy and run in console individually
         window.TOONTALK.tests.add_or_duplicate_robot(true, true,  document.getElementById("test1_top_level_backside"), 10000);
         window.TOONTALK.tests.add_or_duplicate_robot(true, false, document.getElementById("test1_top_level_backside"), 10000);
         window.TOONTALK.tests.test_copy_first_hole_to_second_hole_robot();
     },
     
     number_tests: function () {
         this.drop_numbers('+', 1, 1, 2, 1, 3, 1);
         this.drop_numbers('-', 1, 1, 3, 1, 2, 1);
         this.drop_numbers('*', 2, 1, 3, 1, 6, 1);
         this.drop_numbers('/', 6, 1, 10, 1, 5, 3);
         this.drop_numbers('^', 2, 1, 3, 1, 9, 1);                   
     },
     
     box_tests: function () {
         var a_2 = window.TOONTALK.box.create(2);
         var b_1 = window.TOONTALK.box.create(1);
         var b_1_erased = window.TOONTALK.box.create(1);
         b_1_erased.erased = true;
         var b_2 = window.TOONTALK.box.create(2);
         console.assert(b_2.match(a_2) === 'matched', "Empty box of size 2 should match empty box of size 2");
         console.assert(b_2.equals(a_2), "Empty box of size 2 should equal an empty box of size 2");
         console.assert(b_1.match(a_2) === 'not matched', "Empty box of size 1 should not match empty box of size 2");
         console.assert(!b_1.equals(a_2), "Empty box of size 1 should not equal an empty box of size 2");
         console.assert(b_1_erased.match(a_2) === 'matched', "Empty ERASED box of size 1 should match empty box of size 2");
         console.assert(!b_1_erased.equals(a_2), "Empty ERASED box of size 1 should not equal an empty box of size 2");
         var a_hole_0 = window.TOONTALK.number.create(3);
         a_2.set_hole(0, a_hole_0);
         console.assert(b_2.match(a_2) === 'matched', "Empty box of size 2 should match box of size 2 with number in first hole");
         var b_hole_0 = window.TOONTALK.number.create(3);
         b_2.set_hole(0, b_hole_0);
//          console.log("b_2 is " + b_2.toString() + " and a_2 is " + a_2.toString());
         console.assert(b_2.match(a_2) === 'matched', "box of size 2 with 3 in first hole should match box of size 2 with 3 in first hole");
         console.assert(b_2.equals(a_2), "box of size 2 with 3 in first hole should equal a box of size 2 with 3 in first hole");
         var b_hole_1 = window.TOONTALK.number.create(4);
         b_2.set_hole(1, b_hole_1);
         console.assert(b_2.match(a_2) === 'not matched', "box of size 2 with 3 and 4 should not match box of size 2 with just 3 in first hole");
         b_hole_1.erased = true;
//          console.log("b_2 is " + b_2.toString() + " and a_2 is " + a_2.toString());
         console.assert(b_2.match(a_2) === 'not matched', "box of size 2 with 3 and erased 4 should not match box of size 2 with 3 in first hole");
         console.assert(!b_2.equals(a_2), "box of size 2 with 3 and erased 4 should not equal a box of size 2 with 3 in first hole");
         var a_hole_1 = window.TOONTALK.number.create(5);
         a_2.set_hole(1, a_hole_1);
//          console.log("b_2 is " + b_2.toString() + " and a_2 is " + a_2.toString());
         console.assert(b_2.match(a_2) === 'matched', "box of size 2 with 3 and erased 4 should match box of size 2 with 3 and 5");
         b_hole_1.erased = false;
         b_2.set_hole(1, b_hole_1.copy());
//          console.log("b_2 is " + b_2.toString() + " and a_2 is " + a_2.toString());
         console.assert(b_2.match(a_2) === 'not matched', "box of size 2 with 3 and 4 should not match box of size 2 with 3 and 5");
         console.assert(!b_2.equals(a_2), "box of size 2 with 3 and 4 should not equal a box of size 2 with 3 and 5");
         a_2.set_hole(1, window.TOONTALK.number.create(5));
         b_2.set_hole(1, window.TOONTALK.number.create(5));
//          console.log("b_2 is " + b_2.toString() + " and a_2 is " + a_2.toString());
         console.assert(b_2.match(a_2) === 'matched', "box of size 2 with 3 and 5 should match box of size 2 with 3 and 5");
         console.assert(b_2.equals(a_2), "box of size 2 with 3 and 5 should equal a box of size 2 with 3 and 5");
     },
     
     run: function () {
         "use strict";
         this.number_tests();
         this.box_tests();
         this.robot_tests();
         return "All tests run.";
     }

 };