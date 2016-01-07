 /**
 * Implements a loader for ToonTalk's JavaScript files 
 * the production version is used unless the URL parameter debugging is set to non-zero
 * for production use toontalk.min.js
 * Authors: Ken Kahn
 * License: New BSD
 */
 
/*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */

(function () {
"use strict";

var url = document.querySelector('script[src*="toontalk.js"]').src;
// following assumes that no URL parameters contain forward slashes
var path_prefix = url.substring(0, url.lastIndexOf('/')+1);

var get_url_parameter = function (name, url, default_value) {
    var parts = url.split('&');
    var value = default_value;
    parts.some(function (part) {
                   var name_and_value = part.split('=');
                   if (name_and_value[0] === name) {
                       value = name_and_value[1];
                       return true;
                   }
    });
    return value;
};

// following is needed to access the user's Google Drive 
// default assumes web page is hosted on toontalk.github.io
window.TOONTALK = {GOOGLE_DRIVE_CLIENT_ID:  get_url_parameter('GOOGLE_DRIVE_CLIENT_ID',  url, '148386604750-704q35l4gcffpj2nn3p4ivcopl81nm27.apps.googleusercontent.com'),
                   ORIGIN_FOR_GOOGLE_DRIVE: get_url_parameter('ORIGIN_FOR_GOOGLE_DRIVE', url, 'toontalk.github.io')};

var debugging = get_url_parameter('debugging', window.location.href, '0') !== '0';

// <link rel="stylesheet" media="all" href="../../toontalk.css">
var css = document.createElement('link');
css.rel   = 'stylesheet';
css.media = 'all';
css.href  = path_prefix + 'toontalk.css';
document.head.appendChild(css);

// <link rel="shortcut icon" href="../../images/favicon.ico" />
var icon = document.createElement('link');
icon.rel  = 'shortcut icon';
icon.href = path_prefix + 'images/favicon.ico';
document.head.appendChild(icon);

var file_names;
if (debugging) {
    file_names = ["https://ajax.googleapis.com/ajax/libs/jquery/2.1.4/jquery.min.js",
                  "libraries/jquery-ui.min.js",
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
                  "https://apis.google.com/js/client.js?onload=handle_client_load",
                  // following enables JQuery UI resize handles to respond to touch
                  "libraries/jquery.ui.touch-punch.min.js"];
} else {
    file_names = ["https://ajax.googleapis.com/ajax/libs/jquery/2.1.4/jquery.min.js",
                  "libraries/jquery-ui.min.js",
                  "compile/toontalk.js",
                  "https://apis.google.com/js/client.js?onload=handle_client_load",
                  // following enables JQuery UI resize handles to respond to touch
                  // Note that including this in the closure compiler resulted in errors
                  "libraries/jquery.ui.touch-punch.min.js"];                 
}

var loadFile = function (index) {
                   var script = document.createElement("script");
                   var file_name = file_names[index];
                   if (file_name.indexOf("https:") >= 0) {
                       script.src = file_name;
                   } else {
                      script.src = path_prefix + file_name;
                   }
                   document.head.appendChild(script);
                   script.addEventListener('load',
                                           function (event) {
                                                 index++;
                                                 if (index < file_names.length) {
                                                     loadFile(index);               
                                                 } else {
                                                     initialize();  
                                                 }         
                                            });
               };

loadFile(0);

}());