 /**
 * Implements ToonTalk's queue for running the actions of robots
 * Authors: Ken Kahn
 * License: New BSD
 */

window.TOONTALK.queue = 
(function (TT) {
    "use strict";
    var queue = {
        create: function () {
            var result = Object.create(this);
            // use a JavaScript array to hold the queue
            result.to_run = TT.UTILITIES.create_queue();
            // compute this a create time to fix a minor memory leak
            result.run_function = result.run.bind(result);
            return result;
        },
        
        enqueue: function (robot_context_queue) {
//          console.log("enqueued robot#" + robot_context_queue.robot.debug_id);
//             if (TT.debugging && this.to_run.does_any_item_satisfy(function (item) {
//                                                                       return item.robot === robot_context_queue.robot;
//                                                                   })) {
//                 // until these kinds of bugs are fixed log this
//                 // but TT.UTILITIES.report_internal_error is too annoying
//                 console.error("The same robot is being queued twice.\nRobot is: " + robot_context_queue.robot.debug_id);
//                 return;
//             }
            if (robot_context_queue.robot.running_or_in_run_queue()) {
                // already queued 
                return;
            }
            robot_context_queue.robot.set_running_or_in_run_queue(true);
            if (this.to_run.enqueue(robot_context_queue) && !this.running) {
                // if this is the first in the queue run (unless already running)
                this.run();
            }
        },
        
        maximum_run: 50, // milliseconds
        
        paused: false,

        running: false,

        start: function () {
            if (this.running) {
                // already running so ignore this
                return;
            }
            if (!this.to_run.isEmpty()) {
                this.run();
            }
        },
        
        run: function () {
            var end_time, next_robot_run, context, now, element;
            this.running = true;
            end_time = Date.now()+queue.maximum_run;
            while (!this.to_run.isEmpty() && !this.paused && Date.now() < end_time) {
                // tried checking the time every nth time but then add 1 unwatched looked funny (appeared to skip some additions)
                next_robot_run = this.to_run.dequeue();
                next_robot_run.robot.run_actions(next_robot_run.context, next_robot_run.top_level_context, next_robot_run.queue);
            }
            if (this.to_run.isEmpty()) {
                this.running = false;
                return;
            }
            // give browser a chance to run
            TT.UTILITIES.set_timeout(this.run_function); 
        }
        
    };
    return queue;
}(window.TOONTALK));