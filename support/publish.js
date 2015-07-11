 /**
 * Implements the creation of editable published pages with widgets inside
 * Authors: Ken Kahn
 * License: New BSD
 */

/*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */

window.TOONTALK.publish = (function (TT) {

// somehow libraries/froala-wysiwyg-editor/css/froala_style.min.css is missing

// Using DropBox rather than GitHub for Froala since otherwise web fonts won't load due to lack of cross site permissions

var static_contents_header_1 =
'<!DOCTYPE html>\n' +
'<html>\n' +
'<head>\n' +
'<link rel="stylesheet" media="all" href="https://toontalk.github.io/ToonTalk/toontalk.css">\n' +
'<link href="https://dl.dropboxusercontent.com/u/51973316/ToonTalk/libraries/froala-wysiwyg-editor/css/font-awesome.min.css" rel="stylesheet" type="text/css" />\n' +
'<link href="https://dl.dropboxusercontent.com/u/51973316/ToonTalk/libraries/froala-wysiwyg-editor/css/froala_editor.min.css" rel="stylesheet" type="text/css" />\n' +
'<script src="https://ajax.googleapis.com/ajax/libs/jquery/2.1.1/jquery.min.js"></script>' +
'<script src="https://toontalk.github.io/ToonTalk/compile/toontalk.js"></script>\n' +
'<script src="https://toontalk.github.io/ToonTalk/libraries/jquery-ui-1.11.2.custom/jquery-ui.min.js"></script>\n' +
'<script src="https://dl.dropboxusercontent.com/u/51973316/ToonTalk/libraries/froala-wysiwyg-editor/js/froala_editor.min.js"></script>\n' +
'<script src="https://dl.dropboxusercontent.com/u/51973316/ToonTalk/libraries/froala-wysiwyg-editor/js/plugins/block_styles.min.js"></script>\n' +
'<script src="https://dl.dropboxusercontent.com/u/51973316/ToonTalk/libraries/froala-wysiwyg-editor/js/plugins/colors.min.js"></script>\n' +
'<script src="https://dl.dropboxusercontent.com/u/51973316/ToonTalk/libraries/froala-wysiwyg-editor/js/plugins/font_family.min.js"></script>\n' +
'<script src="https://dl.dropboxusercontent.com/u/51973316/ToonTalk/libraries/froala-wysiwyg-editor/js/plugins/font_size.min.js"></script>\n' +
'<script src="https://dl.dropboxusercontent.com/u/51973316/ToonTalk/libraries/froala-wysiwyg-editor/js/plugins/lists.min.js"></script>\n' +
'<script src="https://dl.dropboxusercontent.com/u/51973316/ToonTalk/libraries/froala-wysiwyg-editor/js/plugins/tables.min.js"></script>\n' +
'<script src="https://dl.dropboxusercontent.com/u/51973316/ToonTalk/libraries/froala-wysiwyg-editor/js/plugins/video.min.js"></script>\n' +
'<title>\n';
// title will be inserted here
var static_contents_header_2 =
'</title>\n' +
'<link rel="shortcut icon" href="favicon.ico" />\n' +
'</head>\n' +
'<body>\n';
var static_contents_end =
'<script src="https://toontalk.github.io/ToonTalk/support/published_support.js"></script>\n' +
'</body>\n' +
'</html>\n';
    
    var assemble_contents = function (title, editable_contents, widgets_json) {
        var page_contents = static_contents_header_1 + title + static_contents_header_2;
        editable_contents.forEach(function (editable_content, index) {
                                      page_contents += '<div class="toontalk-edit" name="content">\n' + editable_content + "\n</div>\n";
                                      if (widgets_json[index]) {
                                          page_contents += widgets_json[index]; 
                                      }
                                  });
        page_contents += static_contents_end;
        return page_contents;
    };
    return {
        publish_widget: function (page_title, widget, as_workspace, callback) {
            // TODO: generalize this to other cloud services
            var google_drive_status = TT.google_drive.get_status();
            var editable_contents = ["Edit this. Select text for formatting.", "And edit this."];
            var insert_or_update = function (response) {
                var file = response && response.items && response.items.length > 0 && response.items[0];
                var contents;
                if (file) {
                    // re-use existing file but update with new widget JSON
                    callback(file, widgets_json);
                } else {
                    contents = assemble_contents(page_title, editable_contents, widgets_json);
                    // upload or insert??
                    TT.google_drive.upload_file(program_name, "html", contents, callback);
                }
            };
            var program_name, json, widgets_json, widgets;
            if (google_drive_status === "Ready") {
                program_name = widget.get_setting('program_name');
                if (as_workspace) {
                    json = TT.UTILITIES.get_json_top_level(widget);
                    widget.set_setting('program_name', program_name + " (published version)");
                    widgets_json = [TT.UTILITIES.toontalk_json_div(json, widget)];
                    widget.set_setting('program_name', program_name);
                } else {
                    widgets = widget.get_backside_widgets();
                    widgets_json = [];
                    widgets.forEach(function (widget, index) {
                        if (!widget.visible()) {
                            return;
                        }
                        json = TT.UTILITIES.get_json_top_level(widget);
                        // following ignores which side of the widget we have
                        widgets_json.push(TT.UTILITIES.toontalk_json_div(json, widget.get_widget()));
                        if (index > 1) {
                            editable_contents[index] = editable_contents[1]; // repeat it as many times as needed
                        }
                    });
                    editable_contents.push(editable_contents[1]); // final editable text
                }
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
