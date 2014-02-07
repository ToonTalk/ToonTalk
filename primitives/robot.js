 /**
 * Implements ToonTalk's robots
 * box.Authors = Ken Kahn
 * License: New BSD
 */

window.TOONTALK.robot = (function () {
    "use strict";
    var TT = window.TOONTALK; // for convenience and more legible code
    var robot = Object.create(TT.widget);
    
    robot.create = function (bubble, body) {
        // bubble holds the conditions that need to be matched to run
        // body holds the actions the robot does when it runs
        var result = Object.create(this);
        result.get_bubble = function () {
            return bubble;
        };
        result.get_body = function () {
            return body;
        };
        body.set_robot(result);
        return result;
    };
    
    robot.copy = function () {
        return this.create(this.get_bubble().copy(), this.get_body());
    };
    
    robot.run = function (context, queue) {
        var match_status, i;
        if (this.stopped) {
            return 'not_matched';
        }
        match_status = this.get_bubble().match(context);
        switch (match_status) {
        case 'matched':
            if (!queue) {
                queue = window.TOONTALK.QUEUE;
            }
            queue.enqueue({robot: this, context: context, queue: queue});
            return match_status;
        case 'not_matched':
            // replace next_robot with get_next_robot()
            if (this.next_robot) {
                return this.next_robot.run(context, queue);
            }
            return match_status;
        default:
            for (i = 0; i < match_status.length; i += 1) {
                match_status[i].run_when_non_empty(this);
            }
            return match_status;                    
        }
    };
    
    robot.stop = function () {
        this.stopped = true;
    };
    
    robot.run_actions = function(context, queue) {
        return this.get_body().run(context, queue);
    };
    
    return robot;
}());