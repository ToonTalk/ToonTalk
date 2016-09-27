 /**
 * Implements a loader for ToonTalk's JavaScript files 
 * the production version is used unless the URL parameter debugging is set to non-zero
 * Authors: Ken Kahn
 * License: New BSD
 */
 
/*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */

(function () {
"use strict";

var loading_please_wait = document.createElement('div');

// need to try ToonTalk/toontalk.js first in case old page with reference to compile/toontalk.js is loading
// but sometimes src is just 'toontalk.js' so need fall back
var this_url = (document.querySelector('script[src*="ToonTalk/toontalk.js"]') ||
                document.querySelector('script[src*="toontalk.js"]')).src;
// following assumes that no URL parameters contain forward slashes
var path_prefix = this_url.substring(0, this_url.lastIndexOf('/')+1);
var this_url_parameters = this_url.substring(this_url.indexOf('?')+1);
var web_page_parameters = window.location.search.substr(1);

var get_parameter = function (name, default_value) {
    return get_url_parameter(name, web_page_parameters) ||
           get_url_parameter(name, this_url_parameters, default_value);
};

var get_url_parameter = function (name, parameters, default_value) {
    var parts = parameters.split('&');
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
window.TOONTALK = {GOOGLE_DRIVE_CLIENT_ID:  get_parameter('GOOGLE_DRIVE_CLIENT_ID',  '148386604750-704q35l4gcffpj2nn3p4ivcopl81nm27.apps.googleusercontent.com'),
                   ORIGIN_FOR_GOOGLE_DRIVE: get_parameter('ORIGIN_FOR_GOOGLE_DRIVE', 'toontalk.github.io'),
                   // TOONTALK_URL is where the scripts, sounds, css, images, etc live
                   TOONTALK_URL: path_prefix,
                   // can't see through your finger so offset dragee
                   // here so people can easily customise this (diffrent devices, fingers, etc.)
                   USABILITY_DRAG_OFFSET: {x: 0,
                                           y: 0},
                   // following needed since window.navigator.onLine was true even after disconnecting from the net
                   RUNNING_LOCALLY: this_url.indexOf("file://") === 0 || this_url.indexOf("http://localhost") === 0,
                   CHROME_APP: path_prefix.indexOf("chrome-extension") === 0
                  };

if (this_url.indexOf("http://localhost") === 0) {
    window.TOONTALK.GOOGLE_DRIVE_CLIENT_ID = "148386604750-advtvsmt840u2ulf52g38gja71als4f2.apps.googleusercontent.com";
    window.TOONTALK.ORIGIN_FOR_GOOGLE_DRIVE = window.location.origin;
}

var debugging = get_parameter('debugging', '0') !== '0';

var add_css = function (URL) {
    var css;
    if (no_need_to_load_css) {
        return;
    }
    css = document.createElement('link');
    css.rel   = 'stylesheet';
    css.media = 'all';
    if (URL.indexOf("https:") >= 0) {
        css.href = URL;
    } else {
        css.href = path_prefix + URL; 
    }
    document.head.appendChild(css);
}

setTimeout(function () {
    // delay this so that typically document.body is defined but test just in case
    if (document.body) {
        loading_please_wait.innerHTML = "<b>Loading. Please wait...</b>";
        document.body.appendChild(loading_please_wait);
    }
});

// <link rel="stylesheet" media="all" href="../../toontalk.css">
add_css('toontalk.css');

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
// "libraries/nimbus.min.js",
// "support/remote_storage.js",
                  // following enables JQuery UI resize handles to respond to touch
                  "libraries/jquery.ui.touch-punch.min.js"];
} else {
    file_names = ["https://ajax.googleapis.com/ajax/libs/jquery/2.1.4/jquery.min.js",
                  "libraries/jquery-ui.min.js",
                  "compile/compiled_toontalk.js",
                  "https://apis.google.com/js/client.js?onload=handle_client_load",
                  // following enables JQuery UI resize handles to respond to touch
                  // Note that including this in the closure compiler resulted in errors
                  "libraries/jquery.ui.touch-punch.min.js"];                 
}

var local_replacements =
    // used to run off-line
    // no need for an entry for https://apis.google.com/js/client.js?onload=handle_client_load
    // since requires an Internet connection
    {"https://ajax.googleapis.com/ajax/libs/jquery/2.1.4/jquery.min.js": "libraries/jquery.min.js"};

var loadFile = function (index, offline) {
                   var script = document.createElement("script");
                   var file_name = file_names[index];
                   var load_next_file = function () {
                                            index++;
                                            if (index < file_names.length) {
                                                loadFile(index, offline);               
                                            } else {
                                                initialize_toontalk();
                                                // delay the following since its addition was delayed as well
                                                setTimeout(function () {
                                                    $(loading_please_wait).remove();
                                                });                                                
                                            }
                                        };
                   if (file_name.indexOf("http") >= 0) {
                       if ((!offline && !TOONTALK.CHROME_APP) ||
                           (get_parameter('remote_storage', false) && file_name.indexOf("https://apis.google.com/js/client.js") === 0)) {
                           // Chrome App complains:
                           // Refused to load the script 'https://ajax.googleapis.com/ajax/libs/jquery/2.1.4/jquery.min.js' because it violates the following Content Security Policy directive: ...
                           // if remote_storage is set then want to connect to remote storage even though running localhost 
                           script.src = file_name;
                       } else if (local_replacements[file_name]) {
                           script.src = path_prefix + local_replacements[file_name];
                       } else {
                           // ignore it
                           load_next_file();
                       }
                   } else {
                       script.src = path_prefix + file_name;
                   }
                   script.addEventListener('load', load_next_file);
                   script.addEventListener('error', function (event) {
                       if (script.src.indexOf("https:") >= 0) {
                           if (local_replacements[file_name]) {
                               // try again with local file
                               loadFile(index, true);
                           }
                       } else {
                           console.error(event);
                       }
                   });
                   document.head.appendChild(script);
               };

var no_need_to_load_css = get_parameter('no_need_to_load_css', '0') !== '0';

var table_of_contents = get_parameter('TOC', '0') !== '0';

if (table_of_contents) {
    // Following based upon http://solidgone.org/Jqtoc
    file_names.push("libraries/jquery.jqTOC.js");
    add_css("libraries/jquery.jqTOC.css");
    document.addEventListener('toontalk_initialized',
                              function () {
                                  $("div#table_of_contents").jqTOC({tocWidth:   200,
                                                                    tocTitle:   'Click to navigate',
                                                                    tocTopLink: 'Top of page'});
                              });
}

var published_page = get_parameter('published', '0') !== '0';

if (published_page) {
    file_names.push("support/published_support.js");
    file_names.push("https://dl.dropboxusercontent.com/u/51973316/ToonTalk/libraries/froala-wysiwyg-editor/js/froala_editor.min.js");
    file_names.push("https://dl.dropboxusercontent.com/u/51973316/ToonTalk/libraries/froala-wysiwyg-editor/js/plugins/block_styles.min.js");
    file_names.push("https://dl.dropboxusercontent.com/u/51973316/ToonTalk/libraries/froala-wysiwyg-editor/js/plugins/colors.min.js");
    file_names.push("https://dl.dropboxusercontent.com/u/51973316/ToonTalk/libraries/froala-wysiwyg-editor/js/plugins/font_family.min.js");
    file_names.push("https://dl.dropboxusercontent.com/u/51973316/ToonTalk/libraries/froala-wysiwyg-editor/js/plugins/font_size.min.js");
    file_names.push("https://dl.dropboxusercontent.com/u/51973316/ToonTalk/libraries/froala-wysiwyg-editor/js/plugins/lists.min.js");
    file_names.push("https://dl.dropboxusercontent.com/u/51973316/ToonTalk/libraries/froala-wysiwyg-editor/js/plugins/tables.min.js");
    file_names.push("https://dl.dropboxusercontent.com/u/51973316/ToonTalk/libraries/froala-wysiwyg-editor/js/plugins/video.min.js");
    add_css("https://dl.dropboxusercontent.com/u/51973316/ToonTalk/libraries/froala-wysiwyg-editor/css/font-awesome.min.css");
    add_css("https://dl.dropboxusercontent.com/u/51973316/ToonTalk/libraries/froala-wysiwyg-editor/css/froala_editor.min.css");
}

loadFile(0, TOONTALK.RUNNING_LOCALLY);

}());