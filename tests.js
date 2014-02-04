 /**
 * Implements test programs for Web ToonTalk
 */
 
 TOONTALK.tests = {
     assert_equals: function (a, b, message) {
         "use strict";
         if (!(a.equals(b))) {
             alert(message + " Expected to be equal " + a.toString() + "=" + b.toString());
         }
     },
     random_integer_between: function (min, max) {
         "use strict";
         return Math.round(Math.random()*(max-min))+min;
     },
     
     // number tests:
     drop_numbers: function (operator, a_n, a_d, b_n, b_d, result_n, result_d) {
         "use strict";
         var a = TOONTALK.number.create(a_n, a_d).set_operator(operator);
         var b = TOONTALK.number.create(b_n, b_d);
         var expected_result = TOONTALK.number.create(result_n, result_d);
         var result = a.drop_on(b);
         this.assert_equals(result, expected_result, 'Dropping ' + a + ' on ' + b + ' should result in ' + expected_result);
         this.assert_equals(b, expected_result, 'Dropping ' + a + ' on ' + b + ' should update ' + b + ' to ' + expected_result);
         this.assert_equals(a, TOONTALK.number.create(a_n, a_d), 'Dropping ' + a + ' on ' + b + ' should not update ' + a);
     },
     
     // robot tests:
     add_or_duplicate_robot: function (erase_bubble, double, backside_element, runs) {
         "use strict";
         var bubble = TOONTALK.number.create(2);
         var expected_result;
         var context = runs < 0 ? TOONTALK.number.create(2, 7) : TOONTALK.number.create(2);
         var backside = context.get_backside(true);
         var frontside = context.get_frontside(true);
         backside_element.appendChild(backside.get_element());
         backside_element.appendChild(frontside.get_element());
         if (!runs) {
             runs = 100;
         }
         if (runs < 0) {
             setTimeout(function () {context.update_display();}, 100);
             return;
         }
         if (erase_bubble) {
             bubble.erased = true;
             if (double) {
                 expected_result = window.TOONTALK.number.create(2).power(window.TOONTALK.number.create(runs + 1)).toString();
             } else {
                 expected_result = runs+2;
             }
         } else {
             expected_result = 3;
         }
         var body = TOONTALK.actions.create();
         var robot = TOONTALK.robot.create(bubble, body);
         if (double) {
              body.add(TOONTALK.copy.create(robot, TOONTALK.path.create()));
         } else {
              body.add(TOONTALK.pick_up.create(robot, TOONTALK.number.ONE()));
         }
         body.add(TOONTALK.drop_on.create(robot, TOONTALK.path.create())); // entire context
         robot.run(context);
         TOONTALK.QUEUE.run(runs);
         var that = this;
         setTimeout(function () {
                        var message = double ? "A robot dropping a copy of the number on the number should result in " : "A robot dropping 1 on 2 should make the 2 into ";
                        that.assert_equals(context, TOONTALK.number.create(expected_result), message + expected_result + " when run " + runs + " times. ");
                    }, runs);
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
         body.add(TOONTALK.pick_up.create(robot, TOONTALK.number.ONE()));
         body.add(TOONTALK.drop_on.create(robot, TOONTALK.path.create())); // entire context
         return robot;
     },
     
     double_robot: function () {
         var robot = this.test_robot();
         var body = robot.get_body();
         body.add(TOONTALK.copy.create(robot, TOONTALK.path.create()));
         body.add(TOONTALK.drop_on.create(robot, TOONTALK.path.create())); // entire context
         return robot;
     },
     
     run: function () {
         "use strict";
         // robot tests
         this.add_or_duplicate_robot();
         this.add_or_duplicate_robot(true);
         this.add_or_duplicate_robot(true, true);
         window.TOONTALK.tests.add_or_duplicate_robot(true, true,  document.getElementById("test1_top_level_backside"), 10000);
         window.TOONTALK.tests.add_or_duplicate_robot(true, false, document.getElementById("test1_top_level_backside"), 10000);
                  
         // number tests
         this.drop_numbers('+', 1, 1, 2, 1, 3, 1);
         this.drop_numbers('-', 1, 1, 3, 1, 2, 1);
         this.drop_numbers('*', 2, 1, 3, 1, 6, 1);
         this.drop_numbers('/', 6, 1, 10, 1, 5, 3);
         this.drop_numbers('^', 2, 1, 3, 1, 9, 1);
         
         return "All tests run.";
     }

 };