 /**
 * Implements creating an editable published page with a widget inside
 * Authors: Ken Kahn
 * License: New BSD
 */

/*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */

window.TOONTALK.publish = (function (TT) {

    var dynamic_contents = ["replaced by page title", "Edit this.", "replace with widget div", "And edit this.", ""];
    var widget_div_index = 2;
    var static_contents = [];
    var program_name;

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
<textarea class="toontalk-edit" name="content">';
// first editor contents inserted here
static_contents[2] = 
'</textarea>\n\
</form>\n';
// widget div inserted here
static_contents[3] = 
'\n<form>\n\
<textarea class="toontalk-edit" name="content">';
// second editor contents inserted here
static_contents[4] =
'</textarea>\n\
</form>\n\
<script>\n\
var current_contents = [];\n\
var editor_enabled = false;\n\
var send_edit_updates = function (other_window, other_target, file_id) {\n\
    var edits = [];\n\
    $(".toontalk-edit").each(function (index, element) {\n\
                                 var content = $(element).editable("getHTML", false, true);\n\
                                 if (current_contents[index] && current_contents[index] !== content) {\n\
                                     edits[index] = content;\n\
                                 }\n\
                                 current_contents[index] = content;\n\
    });\n\
    if (edits.length > 0) {\n\
        other_window.postMessage({edits: edits, file_id: file_id}, other_target);\n\
    }\n\
    setTimeout(function () {\n\
                   send_edit_updates(other_window, other_target, file_id);\n\
               },\n\
               10000);\n\
};\n\
var message_handler =\n\
    function (event) {\n\
        if (event.data.save_edits_to) {\n\
            if (editor_enabled) {\n\
                return;\n\
            }\n\
            editor_enabled = true;\n\
            $(".toontalk-edit").editable({inlineMode: true, imageUpload: false});\n\
            event.source.postMessage({editor_enabled_for: event.data.file_id}, event.data.save_edits_to);\n\
            send_edit_updates(event.source, event.data.save_edits_to, event.data.file_id);\n\
        };\n\
    };\n\
window.addEventListener("message", message_handler, false);\n\
</script>\n\
</body>\n\
</html>';
    
    var assemble_contents = function () {
        var contents = "";
        static_contents.forEach(function (static_content, index) {
                   contents += static_content;
                   contents += dynamic_contents[index];
               });
        return contents;
    };
    return {
        publish_widget: function (page_title, widget, callback) {
           // TODO: generalize this to other cloud services
           var google_drive_status = TT.google_drive.get_status();
           
           var json;
           dynamic_contents[0] = page_title;
           if (google_drive_status === "Ready") {
               if (widget) {
                   json = TT.UTILITIES.get_json_top_level(widget);
                   dynamic_contents[widget_div_index] = TT.UTILITIES.toontalk_json_div(json, widget);
                   program_name = widget.get_setting('program_name')
               }
               contents = assemble_contents();
               TT.google_drive.upload_file(program_name, "html", contents, callback);
           } else {
               console.log("Unable to publish to Google Drive because: " + google_drive_status);
               callback(null);
           }
        },

        republish: function (message_data) {
            var callback = function () {
                // do something?
            };
            message_data.edits.forEach(function (edit, index) {
                var dynamic_index = index == 0 ? 1 : 3;
                if (edit) {
                    dynamic_contents[index+1] = edit; //  dynamic_contents[0] is page title
                }
            });
            TT.google_drive.insert_or_update_file(undefined, message_data.file_id, 'page', assemble_contents(), callback);
        }
    };

}(window.TOONTALK));
