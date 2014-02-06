 /**
 * Implements ToonTalk's queue for running the actions of robots
 * Authors: Ken Kahn
 * License: New BSD
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
        
        enqueue: function (robot_context_queue) {
            return this.to_run.push(robot_context_queue);
        },
        
        dequeue: function () {
            return this.to_run.shift();
        },
        
        maximum_run: 1, // milliseconds
        
        paused: false,
        
        run: function (steps_limit, run_after_steps_limit) {
            var next_robot_run, context;
            var end_time = new Date().getTime() + this.maximum_run;
            var that = this;
            var now, element;
            while (this.to_run.length > 0) {
                if (this.paused) {
                    return;
                }
                now = new Date().getTime();
                if (now >= end_time) {
                    break; 
                }
                // TODO: use an efficient implementation of queues (linked lists?)
                next_robot_run = this.dequeue();
                next_robot_run.robot.run_actions(next_robot_run.context, next_robot_run.queue);
                if (steps_limit) {
                    // only used for testing
                    steps_limit -= 1;
                    if (steps_limit === 0) {
                        // clear the queue to be ready for the next test
                        this.to_run = [];
                        window.TOONTALK.DISPLAY_UPDATES.update_display();
                        if (run_after_steps_limit) {
                            run_after_steps_limit();
                        }
                        return;
                    }
                }
            }
            window.TOONTALK.DISPLAY_UPDATES.update_display();
            setTimeout(function () {
                          that.run(steps_limit, run_after_steps_limit);
                       },
                       0); // give browser a chance to run
        }
        
    };
}());

window.TOONTALK.QUEUE = window.TOONTALK.queue.create();
// might want two queues: so new entries end up in the 'next queue'