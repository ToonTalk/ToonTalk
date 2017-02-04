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

var reason_unable_to_run = function () {
    // tests on browserstack.com seem to indicate Chrome 31+, FireFox 14+, IE11, Safari 6.2+, Opera 15+
    var is_browser_of_type = function (type) {
        // type can be "MSIE", "Firefox", "Safari", "Chrome", "Opera"
        return window.navigator.userAgent.indexOf(type) >= 0;
    };
    var version_number = function (browser_name) {
        var version_start = window.navigator.userAgent.indexOf(browser_name + "/");
        var version_end, version;
        if (version_start >= 0) {
            version_start += browser_name.length+1;
            version_end = window.navigator.userAgent.indexOf(".", version_start);
            if (version_end >= 0) {
                return +window.navigator.userAgent.substring(version_start, version_end);
            }
        }
    };
    if (is_browser_of_type("MSIE")) {
        // see https://msdn.microsoft.com/en-us/library/ms537503(v=vs.85).aspx
        return "The only version of Internet Explorer that can run ToonTalk is 11.";
    }
    if (is_browser_of_type("Chrome")) {
        // see https://developer.chrome.com/multidevice/user-agent
        var version = version_number("Chrome");
        if (version && version < 31) {
            return "The oldest version of Chrome that can run ToonTalk is 31. Your version is " + version;
        }
    }
    if (is_browser_of_type("FireFox")) {
        // see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/User-Agent/Firefox
        var version = version_number("FireFox");
        if (version && version < 14) {
            return "The oldest version of FireFox that can run ToonTalk is 14. Your version is " + version;
        }
    }
    if (is_browser_of_type("Safari")) {
        var version = version_number("Version");
        if (version && version < 6.2) {
            return "The oldest version of Safari that can run ToonTalk is 6.2. Your version is " + version;
        }
    }
    if (is_browser_of_type("Opera")) {
        return "Opera version 12 cannot run ToonTalk. Version 15 and above work fine.";
    }
};

if (reason_unable_to_run()) {
    if (window.confirm(reason_unable_to_run() + " Do you want to exit?")) {
        window.location.assign("docs/browser-requirements.html");
    }
}

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

add_css('libraries/jquery-ui-1.12.1.custom/jquery-ui.min.css');
add_css('libraries/DataTables-1.10.13/media/css/jquery.dataTables.min.css');
add_css('toontalk.css');

// <link rel="shortcut icon" href="../../images/favicon.ico" />
var icon = document.createElement('link');
icon.rel  = 'shortcut icon';
icon.href = path_prefix + 'images/favicon.ico';
document.head.appendChild(icon);

var file_names;
if (debugging) {
    file_names = ["https://ajax.googleapis.com/ajax/libs/jquery/3.1.1/jquery.min.js",
                  "libraries/jquery-ui-1.12.1.custom/jquery-ui.min.js",
                  "libraries/DataTables-1.10.13/media/js/jquery.dataTables.min.js",
                  "libraries/rationaljs.js",
                  !TOONTALK.RUNNING_LOCALLY && "https://cdn.ravenjs.com/3.9.1/raven.min.js", // only include this if not running locally 
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
//                   "https://www.dropbox.com/static/api/2/dropins.js", // handled below -- partial support for saving to DropBox
                  // following enables JQuery UI resize handles to respond to touch
//                   "libraries/jquery.ui.touch-punch.min.js"
                  ];
} else {
    file_names = ["https://ajax.googleapis.com/ajax/libs/jquery/3.1.1/jquery.min.js",
                  !TOONTALK.RUNNING_LOCALLY && "https://cdn.ravenjs.com/3.9.1/raven.min.js",
//                   "libraries/jquery-ui-1.12.1.custom/jquery-ui.min.js",
                  "compile/compiled_toontalk.js",
                  "https://apis.google.com/js/client.js?onload=handle_client_load",
//                   "https://www.dropbox.com/static/api/2/dropins.js",  // handled below -- partial support for saving to DropBox
                  // following enables JQuery UI resize handles to respond to touch
                  // Note that including this in the closure compiler resulted in errors
                  "libraries/jquery.ui.touch-punch.min.js"];
}

var local_replacements =
    // needed for running off-line
    // no need for an entry for https://apis.google.com/js/client.js?onload=handle_client_load
    // since requires an Internet connection to be useful
    {"https://ajax.googleapis.com/ajax/libs/jquery/3.1.1/jquery.min.js": "libraries/jquery-3.1.1.min.js"};

var load_file = function (index, offline) {
                   var script = document.createElement("script");
                   var file_name = file_names[index];
                   var load_next_file = function () {
                                            index++;
                                            if (index < file_names.length) {
                                                load_file(index, offline);
                                            } else {
                                                if (!TOONTALK.RUNNING_LOCALLY) {
                                                    Raven.config('https://b58cd20d39f14d9dad94aaa904a94adc@sentry.io/131294').install();
                                                    if (typeof initialize_toontalk !== "function") {
                                                        Raven.captureException("initialize_toontalk not defined. Probably error loading scripts.");
                                                        alert("ToonTalk was not loaded properly. Some script files missing. See console for details.");
                                                        return;
                                                    }
                                                }
                                                initialize_toontalk();
                                                if (!TOONTALK.RUNNING_LOCALLY && reason_unable_to_run()) {
                                                    Raven.captureException("User proceeded despite this warning: " + reason_unable_to_run());
                                                }
                                                // delay the following since its addition was delayed as well
                                                setTimeout(function () {
                                                    $(loading_please_wait).remove();
                                                });
                                            }
                                        };
                   if (!file_name) {
                       load_next_file();
                       return;
                   }
                   if (file_name.indexOf("http") >= 0) {
                       if ((!offline && !TOONTALK.CHROME_APP) ||
                           get_parameter('remote_storage') === "1") {
                           // Chrome App complains:
                           // Refused to load the script 'https://ajax.googleapis.com/ajax/libs/jquery/3.1.1/jquery.min.js' because it violates the following Content Security Policy directive: ...
                           // if remote_storage is set then want to connect to remote storage even though running localhost 
                           script.src = file_name;
                       } else if (local_replacements[file_name]) {
                           script.src = path_prefix + local_replacements[file_name];
                       } else {
                           // ignore it
                           load_next_file();
                           return;
                       }
                   } else {
                       script.src = path_prefix + file_name;
                   }
                   if (file_name === "https://www.dropbox.com/static/api/2/dropins.js") {
                       script.id ="dropboxjs";
                       script["data-app-key"] = "ikwgpe4tcbvaxh4";
                   }
                   script.addEventListener('load', load_next_file);
                   script.addEventListener('error', function (event) {
                       if (script.src.indexOf("https:") >= 0) {
                           if (local_replacements[file_name]) {
                               // try again with local file
                               load_file(index, true);
                           }
                       } else {
                           console.error(event);
                           if (!TOONTALK.RUNNING_LOCALLY) {
                               Raven.captureException(event.message);
                           }
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
    // not using CDN first for CKEditor since customised it to include color buttons
    file_names.push("libraries/ckeditor/ckeditor.js");
}

// if (TOONTALK.CHROME_APP) {
//     file_names.push("libraries/translate_a/element.js?cb=googleTranslateElementInit");
// }

load_file(0, TOONTALK.RUNNING_LOCALLY);

}());
