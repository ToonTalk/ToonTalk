 /**
 * Implements test programs for Web ToonTalk
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
         var expected_result = TOONTALK.number.create(result_n, result_d);
         var result = a.drop_on(b);
         this.assert_equals(result, expected_result, 'Dropping ' + a + ' on ' + b + ' should result in ' + expected_result);
         this.assert_equals(b, expected_result, 'Dropping ' + a + ' on ' + b + ' should update ' + b + ' to ' + expected_result);
         this.assert_equals(a, TOONTALK.number.create(a_n, a_d), 'Dropping ' + a + ' on ' + b + ' should not update ' + a);
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
         var bubble = TOONTALK.number.create(2);
         var expected_result;
         var context = TOONTALK.number.create(2);
         if (backside_element) {
             this.create_sides(context, backside_element);
         }
         if (!runs) {
             runs = 100;
         }
         // reset the queue for these kinds of tests
         window.TOONTALK.QUEUE.paused = true;
         var queue = window.TOONTALK.queue.create();
         var robot = double ? this.double_robot() : this.add_one_robot();
         if (erase_bubble) {
             bubble.erased = true;
             if (double) {
                 expected_result = window.TOONTALK.number.create(2).power(window.TOONTALK.number.create(runs + 1)).toString();
             } else {
                 expected_result = runs+2;
             }
         } else {
             robot.get_bubble().erased = false;
             expected_result = 3;
         }
         robot.run(context, queue);
         var that = this;
         queue.run(runs, function () {
                             var message = double ? "A robot dropping a copy of the number on the number should result in " : "A robot dropping 1 on 2 should make the 2 into ";
                             that.assert_equals(context, TOONTALK.number.create(expected_result), message + expected_result + " when run " + runs + " times. ");
                    });
         return this;
     },
     
     test_robot: function() {
         var body = TOONTALK.actions.create();
         var bubble = TOONTALK.number.create(1);
         bubble.erased = true;
         return TOONTALK.robot.create(bubble, body);         
     },
     
     add_one_robot: function () {
         var robot = this.test_robot();
         var body = robot.get_body();
         body.add(window.TOONTALK.pick_up_constant.create(robot, TOONTALK.number.ONE()));
         body.add(window.TOONTALK.drop_on.create(robot)); // entire context
         return robot;
     },
     
     double_robot: function () {
         var robot = this.test_robot();
         var body = robot.get_body();
         body.add(window.TOONTALK.copy.create(robot));
         body.add(window.TOONTALK.drop_on.create(robot)); // entire context
         return robot;
     },
     
     copy_first_hole_to_second_hole_robot: function () {
         var robot = this.test_robot();
         var body = robot.get_body();
         body.add(window.TOONTALK.copy.create(robot, TOONTALK.box.create_path(1)));
         body.add(window.TOONTALK.drop_on.create(robot)); // entire context
         return robot;
     },
     
     robot_tests: function () {
         this.add_or_duplicate_robot();
         this.add_or_duplicate_robot(true);
         this.add_or_duplicate_robot(true, true);
         window.TOONTALK.tests.add_or_duplicate_robot(true, true,  document.getElementById("test1_top_level_backside"), 10000);
         window.TOONTALK.tests.add_or_duplicate_robot(true, false, document.getElementById("test1_top_level_backside"), 10000);                   
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