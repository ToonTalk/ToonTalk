 /**
 * Implements ToonTalk's queue for running the actions of robots
 * Authors: Ken Kahn
 * License: New BSD
 */

window.TOONTALK.queue = 
(function (TT) {
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
            var now, element;
//          if (this.to_run.length > 0) console.log("start time: " + (end_time-this.maximum_run));
            while (this.to_run.length > 0) {
                if (this.paused) {
                    return;
                }
                now = new Date().getTime();
                if (now >= end_time) {
//                  console.log("end time:   " + now);
                    break; 
                }
                // TODO: use an efficient implementation of queues (linked lists?)
                next_robot_run = this.dequeue();
                next_robot_run.robot.run_actions(next_robot_run.context, next_robot_run.top_level_context, next_robot_run.queue);
                if (steps_limit) {
                    // steps_limit only used for testing
                    steps_limit -= 1;
                    if (steps_limit === 0) {
                        // clear the queue to be ready for the next test
                        this.to_run = [];
                        if (run_after_steps_limit) {
                            run_after_steps_limit();
                        }
                        return;
                    }
                }
            }
            TT.DISPLAY_UPDATES.run_cycle_is_over();
            setTimeout(function () {
                          this.run(steps_limit, run_after_steps_limit);
                       }.bind(this),
                       0); // give browser a chance to run
        }
        
    };
}(window.TOONTALK));

window.TOONTALK.QUEUE = window.TOONTALK.queue.create();
// might want two queues: so new entries end up in the 'next queue'