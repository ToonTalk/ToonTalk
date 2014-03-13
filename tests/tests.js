 /**
 * Implements test programs for Web window.TOONTALK
 */
 
window.TOONTALK.tests =
 (function (TT) {
     "use strict";
     return {
     assert_equals: function (a, b, message) {
         "use strict";
         console.assert(a.equals(b), message + " Expected to be equal " + a.toString() + "=" + b.toString());
     },
     
     random_integer_between: function (min, max) {
         "use strict";
         return Math.round(Math.random()*(max-min))+min;
     },
     
     // number tests:
     drop_numbers: function (operator, a_n, a_d, b_n, b_d, result_n, result_d) {
         "use strict";
         var a = TT.number.create(a_n, a_d).set_operator(operator);
         var b = TT.number.create(b_n, b_d);
         var expected_result = TT.number.create(result_n, result_d);
         var result = a.drop_on(b);
         this.assert_equals(result, expected_result, 'Dropping ' + a + ' on ' + b + ' should result in ' + expected_result);
         this.assert_equals(b, expected_result, 'Dropping ' + a + ' on ' + b + ' should update ' + b + ' to ' + expected_result);
         this.assert_equals(a, TT.number.create(a_n, a_d), 'Dropping ' + a + ' on ' + b + ' should not update ' + a);
     },
     
     create_sides: function (context, parent_backside_element, offset) {
         var backside = context.get_backside(true);
         var frontside = context.get_frontside(true);
         var frontside_element = frontside.get_element();
         var backside_element = backside.get_element();
         frontside_element.style.top = offset + "px";
         backside_element.style.top = offset + "px";
         frontside_element.className += " toontalk-top-level-frontside";
         parent_backside_element.appendChild(backside_element);
         parent_backside_element.appendChild(frontside_element);
         context.update_display();
     },
     
     // robot tests:
     add_or_duplicate_robot: function (erase_bubble, double, backside_element, runs) {
         "use strict";
         var bubble = TT.number.create(2);
         var expected_result;
         var context = TT.number.create(2);
         if (backside_element) {
             this.create_sides(context, backside_element);
         }
         if (!runs) {
             runs = 100;
         }
         var robot = double ? this.double_robot() : this.add_one_robot();
         if (erase_bubble) {
             if (double) {
                 expected_result = TT.number.create(2).power(TT.number.create(runs + 1)).toString();
             } else {
                 expected_result = runs+2;
             }
         } else {
             robot.get_bubble().set_erased(false);
             expected_result = 3;
         }
         this.test_robot(robot, context, runs, TT.number.create(expected_result));
         return this;
     },
     
     test_robot: function (robot, context, runs, expected_result, run_when_completed) {
          // reset the queue for these kinds of tests
         TT.QUEUE.paused = true;
         var queue = TT.queue.create();
         var context_copy = context.copy();
         robot.run(context, queue);
         var that = this;
         queue.run(runs, function () {
                             var message = robot.toString() + " when given " + context_copy.toString() + " expected " + expected_result.toString() + " not " + context.toString() + " when run " + runs + " times. ";
                             that.assert_equals(context, expected_result, message);
                             if (run_when_completed) {
                                 run_when_completed();
                             }
                    });                             
     },
     
     accept_number_robot: function() {
         var body = TT.actions.create();
         var bubble = TT.number.create(1);
         bubble.set_erased(true);
         return TT.robot.create(bubble, body);         
     },
     
     accept_box_robot: function(n) {
         var body = TT.actions.create();
         var bubble = TT.box.create(n);
         bubble.set_erased(true);
         return TT.robot.create(bubble, body);         
     },
     
     add_one_robot: function () {
         var robot = this.accept_number_robot();
         var body = robot.get_body();
         body.add(TT.pick_up_constant.create(TT.number.ONE()));
         body.add(TT.drop_on.create(TT.path_to_entire_context));
         robot.set_description("adds one to what it is given");
         return robot;
     },
     
     double_robot: function () {
         var robot = this.accept_number_robot();
         var body = robot.get_body();
         body.add(TT.copy.create(TT.path_to_entire_context));
         body.add(TT.drop_on.create(TT.path_to_entire_context));
         robot.set_image_url("images/RB19.PNG");
         return robot;
     },
     
     copy_first_hole_to_second_hole_robot: function () {
         // following should ensure that something is in the first hole...
         var robot = this.accept_box_robot(2);
         var body = robot.get_body();
         body.add(TT.copy.create(TT.box.path.create(0)));
         body.add(TT.drop_on.create(TT.box.path.create(1)));
         robot.set_image_url("images/RB45.PNG");
         return robot;
     },
     
     create_test_box: function () {
         var box = TT.box.create(2);
         box.set_horizontal(true);
         var hole0 = TT.number.create(1, 49);
         hole0.set_operator("*");
         var hole1 = TT.number.create(19);
         box.set_hole(0, hole0);
         box.set_hole(1, hole1);
         box.update_display();
         return box;
     },
     
     test_copy_first_hole_to_second_hole_robot: function () {
         var robot = this.copy_first_hole_to_second_hole_robot();
         var box = this.create_test_box();
         var div1_container = document.createElement("div");
         div1_container.className = "toontalk-frontside";
         div1_container.style.top = "10px";
         var div2_container = document.createElement("div");
         div2_container.className = "toontalk-frontside";
         div1_container.style.top = "200px";
         var div1 = document.createElement("div");
         div1_container.appendChild(div1);
         var div2 = document.createElement("div");
         div2_container.appendChild(div2);
         div1.innerHTML = box.to_HTML();
         document.body.appendChild(div1_container);
         var expected_result = box.copy();
         var fraction = TT.number.create(19, "79792266297612001");
         expected_result.set_hole(1, fraction);
         var add_result = function () {
             div2.innerHTML = box.to_HTML();
             document.body.appendChild(div2_container);
         };
         this.test_robot(robot, box, 10, expected_result, add_result);
     },
     
     robot_tests: function () {
         this.add_or_duplicate_robot();
         this.add_or_duplicate_robot(true);
         this.add_or_duplicate_robot(true, true);
         // not using 'this' here so can easily copy and run in console individually
         TT.tests.add_or_duplicate_robot(true, true,  document.getElementById("test1_top_level_backside"), 10000);
         TT.tests.add_or_duplicate_robot(true, false, document.getElementById("test1_top_level_backside"), 10000);
         TT.tests.test_copy_first_hole_to_second_hole_robot();
     },
     
     number_tests: function () {
         this.drop_numbers('+', 1, 1, 2, 1, 3, 1);
         this.drop_numbers('-', 1, 1, 3, 1, 2, 1);
         this.drop_numbers('*', 2, 1, 3, 1, 6, 1);
         this.drop_numbers('/', 6, 1, 10, 1, 5, 3);
         this.drop_numbers('^', 2, 1, 3, 1, 9, 1);                   
     },
     
     box_tests: function () {
         var a_2 = TT.box.create(2);
         var b_1 = TT.box.create(1);
         var b_1_erased = TT.box.create(1);
         b_1_erased.set_erased(true);
         var b_2 = TT.box.create(2);
         console.assert(b_2.match(a_2) === 'matched', "Empty box of size 2 should match empty box of size 2");
         console.assert(b_2.equals(a_2), "Empty box of size 2 should equal an empty box of size 2");
         console.assert(b_1.match(a_2) === 'not matched', "Empty box of size 1 should not match empty box of size 2");
         console.assert(!b_1.equals(a_2), "Empty box of size 1 should not equal an empty box of size 2");
         console.assert(b_1_erased.match(a_2) === 'matched', "Empty ERASED box of size 1 should match empty box of size 2");
         console.assert(!b_1_erased.equals(a_2), "Empty ERASED box of size 1 should not equal an empty box of size 2");
         var a_hole_0 = TT.number.create(3);
         a_2.set_hole(0, a_hole_0);
         console.assert(b_2.match(a_2) === 'matched', "Empty box of size 2 should match box of size 2 with number in first hole");
         var b_hole_0 = TT.number.create(3);
         b_2.set_hole(0, b_hole_0);
//          console.log("b_2 is " + b_2.toString() + " and a_2 is " + a_2.toString());
         console.assert(b_2.match(a_2) === 'matched', "box of size 2 with 3 in first hole should match box of size 2 with 3 in first hole");
         console.assert(b_2.equals(a_2), "box of size 2 with 3 in first hole should equal a box of size 2 with 3 in first hole");
         var b_hole_1 = TT.number.create(4);
         b_2.set_hole(1, b_hole_1);
         console.assert(b_2.match(a_2) === 'not matched', "box of size 2 with 3 and 4 should not match box of size 2 with just 3 in first hole");
         b_hole_1.set_erased(true);
//          console.log("b_2 is " + b_2.toString() + " and a_2 is " + a_2.toString());
         console.assert(b_2.match(a_2) === 'not matched', "box of size 2 with 3 and erased 4 should not match box of size 2 with 3 in first hole");
         console.assert(!b_2.equals(a_2), "box of size 2 with 3 and erased 4 should not equal a box of size 2 with 3 in first hole");
         var a_hole_1 = TT.number.create(5);
         a_2.set_hole(1, a_hole_1);
//          console.log("b_2 is " + b_2.toString() + " and a_2 is " + a_2.toString());
         console.assert(b_2.match(a_2) === 'matched', "box of size 2 with 3 and erased 4 should match box of size 2 with 3 and 5");
         b_hole_1.set_erased(false);
         b_2.set_hole(1, b_hole_1.copy());
//          console.log("b_2 is " + b_2.toString() + " and a_2 is " + a_2.toString());
         console.assert(b_2.match(a_2) === 'not matched', "box of size 2 with 3 and 4 should not match box of size 2 with 3 and 5");
         console.assert(!b_2.equals(a_2), "box of size 2 with 3 and 4 should not equal a box of size 2 with 3 and 5");
         a_2.set_hole(1, TT.number.create(5));
         b_2.set_hole(1, TT.number.create(5));
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
 
 } (window.TOONTALK));