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
//             console.log("enqueued robot#" + robot_context_queue.robot.debug_id);
            if (TT.debugging) {
                this.to_run.forEach(function (old) {
                    if (old.robot === robot_context_queue.robot) {
                        // until bugs are fixed TT.UTILITIES.report_internal_error is too annoying
                        console.log("The same robot is being queued twice.");
                        console.log("Robot is " + old.robot);
                        return;
                    }
                })
            }
            return this.to_run.push(robot_context_queue);
        },
        
//         dequeue: function () {
//             return this.to_run.shift();
//         },
        
        maximum_run: 1, // milliseconds
        
        paused: false,
        
        run: function (steps_limit, run_after_steps_limit) {
            var next_robot_run, context;
            var end_time = new Date().getTime() + this.maximum_run;
            var now, element;
//          if (this.to_run.length > 0) console.log("start time: " + (end_time-this.maximum_run));
//             if (this.to_run.length > 0) {
//                 console.log("run queue contains " + this.to_run.map(function (x) {return x.robot.debug_id;}));
//             }
            while (this.to_run.length > 0) {
                if (this.paused) {
                    break;
                }
                now = new Date().getTime();
                if (now >= end_time) {
//                  console.log("end time:   " + now);
                    break; 
                }
                // TODO: use an efficient implementation of queues (linked lists?)
                next_robot_run = this.to_run.shift();
                next_robot_run.robot.run_actions(next_robot_run.context, next_robot_run.top_level_context, next_robot_run.queue);
                if (steps_limit) {
                    // steps_limit only used for testing
                    steps_limit -= 1;
                    if (steps_limit === 0) {
                        if (run_after_steps_limit) {
                            run_after_steps_limit();
                        }
                        break;
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