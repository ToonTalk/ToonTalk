 /**
 * Implements ToonTalk's queue for running the actions of robots
 * Authors: Ken Kahn
 */

window.TOONTALK.queue = 
(function () {
    "use strict";
    return {
        create: function () {
            var result = Object.create(this);
            // use a JavaScript array to hold the queue
            result.to_run = [];
            return result;
        },
        
        enqueue: function (robot_or_context) {
            return this.to_run.push(robot_or_context);
        },
        
        dequeue: function () {
            return this.to_run.shift();
        },
        
        maximum_run: 1, // milliseconds
        
        run: function (steps_limit) {
            var next_robot, context;
            var end_time = new Date().getTime() + this.maximum_run;
            var that = this;
            var now, element;
            while (this.to_run.length > 0) {
                now = new Date().getTime();
                if (now >= end_time) {
                    break; 
                }
                // TODO: use an efficient implementation of queues (linked lists?)
                next_robot = this.dequeue();
                context = this.dequeue();
                next_robot.run_actions(context);
                if (steps_limit) {
                    // only used for testing
                    steps_limit -= 1;
                    if (steps_limit === 0) {
                        // clear the queue to be ready for the next test
                        this.to_run = [];
                        window.TOONTALK.DISPLAY_UPDATES.update_display();
                        return;
                    }
                }
            }
            window.TOONTALK.DISPLAY_UPDATES.update_display();
            setTimeout(function () {
                          that.run(steps_limit);
                       },
                       0); // give browser a chance to run
        }
        
    };
}());

window.TOONTALK.QUEUE = window.TOONTALK.queue.create();
// might want two queues: so new entries end up in the 'next queue'