 /**
 * Implements creating an editable published page with a widget inside
 * Authors: Ken Kahn
 * License: New BSD
 */

/*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */

window.TOONTALK.publish = (function (TT) {

    var widget_div_index = 2;
    var static_contents = [];

// somehow <link href="https://dl.dropboxusercontent.com/u/51973316/ToonTalk/libraries/froala-wysiwyg-editor/css/froala_style.min.css" rel="stylesheet" type="text/css" />\n\
// is missing

// releases should use the following:
// <script src="https://toontalk.github.io/ToonTalk/compile/toontalk.js"></script>\n\
// <link rel="stylesheet" media="all" href="https://toontalk.github.io/ToonTalk/toontalk.css">\n\
static_contents[0] =
    '<!DOCTYPE html>\n\
<html>\n\
<head>\n\
<link rel="stylesheet" media="all" href="https://dl.dropboxusercontent.com/u/51973316/ToonTalk/toontalk.css">\n\
<link href="https://dl.dropboxusercontent.com/u/51973316/ToonTalk/libraries/froala-wysiwyg-editor/css/font-awesome.min.css" rel="stylesheet" type="text/css" />\n\
<link href="https://dl.dropboxusercontent.com/u/51973316/ToonTalk/libraries/froala-wysiwyg-editor/css/froala_editor.min.css" rel="stylesheet" type="text/css" />\n\
<script src="https://dl.dropboxusercontent.com/u/51973316/ToonTalk/compile/toontalk.js"></script>\n\
<script src="https://dl.dropboxusercontent.com/u/51973316/ToonTalk/libraries/froala-wysiwyg-editor/js/froala_editor.min.js"></script>\n\
<script src="https://dl.dropboxusercontent.com/u/51973316/ToonTalk/libraries/froala-wysiwyg-editor/js/plugins/block_styles.min.js"></script>\n\
<script src="https://dl.dropboxusercontent.com/u/51973316/ToonTalk/libraries/froala-wysiwyg-editor/js/plugins/colors.min.js"></script>\n\
<script src="https://dl.dropboxusercontent.com/u/51973316/ToonTalk/libraries/froala-wysiwyg-editor/js/plugins/font_family.min.js"></script>\n\
<script src="https://dl.dropboxusercontent.com/u/51973316/ToonTalk/libraries/froala-wysiwyg-editor/js/plugins/font_size.min.js"></script>\n\
<script src="https://dl.dropboxusercontent.com/u/51973316/ToonTalk/libraries/froala-wysiwyg-editor/js/plugins/lists.min.js"></script>\n\
<script src="https://dl.dropboxusercontent.com/u/51973316/ToonTalk/libraries/froala-wysiwyg-editor/js/plugins/tables.min.js"></script>\n\
<script src="https://dl.dropboxusercontent.com/u/51973316/ToonTalk/libraries/froala-wysiwyg-editor/js/plugins/video.min.js"></script>\n\
<title>';
// title will be inserted here
static_contents[1] =
'</title>\n\
<link rel="shortcut icon" href="favicon.ico" />\n\
</head>\n\
<body>\n\
<form>\n\
<div class="toontalk-edit" name="content">';
// first editor contents inserted here
static_contents[2] = 
'</div>\n\
</form>\n';
// widget div inserted here
static_contents[3] = 
'\n<form>\n\
<div class="toontalk-edit" name="content">';
// second editor contents inserted here
static_contents[4] =
'</div>\n\
</form>\n\
<script src="https://dl.dropboxusercontent.com/u/51973316/ToonTalk/support/published_support.js"></script>\n\
</body>\n\
</html>';
    
    var assemble_contents = function (title, editable_contents, widgets_json) {
        var contents = "";
        static_contents.forEach(function (static_content, index) {
                                    var dynamic_content;
                                    contents += static_content;
                                    if (index === 0) {
                                        dynamic_content = title;
                                    } else if (index%2 === 1) {
                                        dynamic_content = editable_contents[(index-1)/2];
                                    } else {
                                        dynamic_content = widgets_json[(index-2)/2];
                                    } 
                                    if (dynamic_content) {
                                        contents += dynamic_content;
                                    }                                   
                                });
        return contents;
    };
    return {
        publish_widget: function (page_title, widget, callback) {
            // TODO: generalize this to other cloud services
            var google_drive_status = TT.google_drive.get_status();
            var editable_contents = ["Edit this. Select text for formatting.", "And edit this."];
            var insert_or_update = function (response) {
                var file = response && response.items && response.items.length > 0 && response.items[0];
                if (file) {
                    // re-use existing file but update with new widget JSON
                    callback(file, widgets_json);
                } else {
                    contents = assemble_contents(page_title, editable_contents, widgets_json);
                    // upload or insert??
                    TT.google_drive.upload_file(program_name, "html", contents, callback);
                }
            };
            var program_name, json, widgets_json;
            if (google_drive_status === "Ready") {
                json = TT.UTILITIES.get_json_top_level(widget);
                widgets_json = [TT.UTILITIES.toontalk_json_div(json, widget)];
                program_name = widget.get_setting('program_name');
                TT.google_drive.get_toontalk_files(TT.google_drive.full_file_name(program_name, 'page'), 
                                                  'page',
                                                  insert_or_update);
            } else {
                console.log("Unable to publish to Google Drive because: " + google_drive_status);
                callback(null);
            }
        },

        republish: function (message_data) {
            var callback = function () {
                // do something more?
                console.log("Published page '" + message_data.title + "' updated.");
            };
            TT.google_drive.insert_or_update_file(undefined, 
                                                  message_data.file_id,
                                                  'page',
                                                  assemble_contents(message_data.title, message_data.editable_contents, message_data.widgets_json),
                                                  callback);
        }
    };

}(window.TOONTALK));
