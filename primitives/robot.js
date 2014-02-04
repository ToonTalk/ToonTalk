 /**
 * Implements ToonTalk's robots
 * Authors: Ken Kahn
 * License: New BSD
 */

window.TOONTALK.robot = 
(function () {
    "use strict";
    return {
        create: function (bubble, body) {
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
        },
        
        copy: function () {
            return this.create(this.get_bubble().copy(), this.get_body());
        },
        
        run: function (context) {
            if (this.stopped) {
                return 'not_matched';
            }
            var match_status = this.get_bubble().match(context);
            switch (match_status) {
                case 'matched':
                    window.TOONTALK.QUEUE.enqueue(this);
                    window.TOONTALK.QUEUE.enqueue(context);
                    return match_status;
                case 'not_matched':
                // replace next_robot with get_next_robot()
                    if (this.next_robot) {
                        return this.next_robot.run(context);
                    }
                    return match_status;
                default:
                    if (match_status[0] === 'waiting_on') {
                        match_status[1].run_when_non_empty(this);
                    }
                    return match_status;                    
            }
        },
        
        stop: function () {
            this.stopped = true;
        },
        
        run_actions: function(context) {
            return this.get_body().run(context);
        }
        
    };
}());