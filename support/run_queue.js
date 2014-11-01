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
            result.to_run = TT.UTILITIES.create_queue();
            return result;
        },
        
        enqueue: function (robot_context_queue) {
//             console.log("enqueued robot#" + robot_context_queue.robot.debug_id);
//             if (TT.debugging) {
//                 this.to_run.forEach(function (old) {
//                     if (old.robot === robot_context_queue.robot) {
//                         // until these kinds of bugs are fixed TT.UTILITIES.report_internal_error is too annoying
//                         console.log("The same robot is being queued twice.");
//                         console.log("Robot is " + old.robot);
//                         return;
//                     }
//                 })
//             }
            return this.to_run.enqueue(robot_context_queue);
        },
        
        maximum_run: 100, // milliseconds
        
        paused: false,
        
        run: function () {
            var next_robot_run, context;
            var end_time = Date.now() + this.maximum_run;
            var now, element;
            while (!this.to_run.isEmpty()) {
                if (this.paused) {
                    break;
                }
                // tried checking the time every nth time but then add 1 unwatched looked funny (appeared to skip some additions)
                if (Date.now() >= end_time) {
                    break; 
                }
                // TODO: use an efficient implementation of queues (linked lists?)
                next_robot_run = this.to_run.dequeue();
                next_robot_run.robot.run_actions(next_robot_run.context, next_robot_run.top_level_context, next_robot_run.queue);
//                 if (steps_limit) {
//                     // steps_limit only used for testing
//                     steps_limit -= 1;
//                     if (steps_limit === 0) {
//                         if (run_after_steps_limit) {
//                             run_after_steps_limit();
//                         }
//                         break;
//                     }
//                 }
            }
            TT.DISPLAY_UPDATES.run_cycle_is_over();
            // give browser a chance to run
            TT.UTILITIES.set_timeout(function () {
                                         this.run();
                                     }.bind(this),
                                     // if more to run don't wait -- otherwise wait 4 milliseconds
                                     this.to_run.isEmpty() ? 4 : 0); 
        }
        
    };
}(window.TOONTALK));