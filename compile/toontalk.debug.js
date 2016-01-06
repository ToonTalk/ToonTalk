 /**
 * Implements a loader for ToonTalk's JavaScript files -- to be used during debugging and development
 * for production use toontalk.js
 * Authors: Ken Kahn
 * License: New BSD
 */
 
/*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */
(function () {
"use strict";

var fileNames = ["libraries/jquery-ui.min.js",
                 "libraries/jquery.dataTables.min.js",
                 "libraries/rationaljs.js",
                 "support/initial.js",
                 "support/functions.js",
                 "primitives/widget.js",
                 "primitives/number.js",
                 "primitives/robot.js",
                 "primitives/box.js",
                 "primitives/element.js",
                 "primitives/bird.js",
                 "primitives/scale.js",
                 "primitives/sensor.js",
                 "primitives/backside.js",
                 "primitives/frontside.js",
                 "tools/tool.js",
                 "tools/wand.js",
                 "tools/vacuum.js",
                 "support/robot_actions.js",
                 "support/robot_action.js",
                 "support/path.js",
                 "support/run_queue.js",
                 "support/display_updates.js",
                 "support/settings.js",
                 "support/publish.js",
                 "support/google_drive.js",
                 "support/utilities.js",
                 // following enables JQuery UI resize handles to respond to touch
                 "libraries/jquery.ui.touch-punch.min.js"];

var loadFile = function (index) {
                   var script = document.createElement("script");
                   script.src = ((window.TOONTALK && window.TOONTALK.DEBUG_PATH_PREFIX) || "") + fileNames[index];
                   document.head.appendChild(script);
                   script.addEventListener('load',
                                           function (event) {
                                                 index++;
                                                 if (index < fileNames.length) {
                                                     loadFile(index);               
                                                 } else {
                                                     window.TOONTALK.UTILITIES.initialize();  
                                                 }         
                                            });
               };

loadFile(0);

}());