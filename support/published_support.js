 /**
 * Implements ToonTalk's JavaScript that connects published ToonTalk pages with ToonTalk
 * thereby enabling the saving of edits
 * Authors: Ken Kahn
 * License: New BSD
 */

/*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */

window.TOONTALK.published_support = (function (TT) {

var editable_contents = [];
var widgets_json = [];
var widget_count_in_last_save = 0;
var editor_enabled = false;
var inline_mode = !TT.UTILITIES.get_current_url_boolean_parameter('edit', false);

var respond_to_authorization_need = function (error, saving_window, saving_window_URL) {
    var alert_element = document.createElement('div');
    var authorize;
    alert_element.className = "toontalk-alert";
    if (error === 'Need to authorize') {
        alert_element.innerHTML = "Editing will be enabled if you can log into your Google Drive account. ";
        authorize = TT.UTILITIES.create_button("Login to Google",
                                               "toontalk-google-login-button",
                                               "Click to log in to Google to authorize use of your Google Drive.",
                                               function () {
                                                   $(alert_element).remove();
                                                   saving_window.postMessage("user wants to authorize", saving_window_URL);
                                               });
        alert_element.appendChild(authorize);
    } else {
        alert_element.innerHTML = "Editing disabled because unable to get authorization to access your Google Drive files. Problem is '" + error + "'";
    }
    document.body.insertBefore(alert_element, document.body.firstChild);
    setTimeout(function () {
                   $(alert_element).remove();
               },
               10000); // alert goes away after 10 seconds
};

var ensure_toontalk_is_initialized = function () {
    // any web pages generated before the 8 January 2016 release need this to explicitly call initialize_toontalk
    if (window.TOONTALK.TOONTALK_URL) {
        // toontalk.js will call initialise when it is ready
        return;
    }
    // must be an older published page
    if (window.initialize_toontalk) {
        window.initialize_toontalk();
    } else {
        // check again in a second
        setTimeout(function () {
                       ensure_toontalk_is_initialized();
                   },
                   1000);
    }
};

ensure_toontalk_is_initialized();

return {
    create_editable_text: function () {
         var editable_text = $('<textarea contenteditable="true">Edit this</textarea>');
         return editable_text;
    },
    send_edit_updates: function (file_id) {
        var $elements = $(".toontalk-backside-of-top-level, .toontalk-top-level-resource-container");
        var assemble_contents = function (title, editable_contents, widgets_json) {
            var static_contents_header_1 =
'<!DOCTYPE html>\n' +
'<html>\n' +
'<head>\n' +
'<script src="https://toontalk.github.io/ToonTalk/toontalk.js?published=1"></script>\n' +
'<title>\n';
// title will be inserted here
var static_contents_header_2 =
'</title>\n' +
'</head>\n' +
'<body>\n';
var static_contents_end =
'</body>\n' +
'</html>\n';
            var page_contents = static_contents_header_1 + title + static_contents_header_2;
            editable_contents.forEach(function (editable_content, index) {
                                          page_contents += '<div class="toontalk-edit" contenteditable="true">\n' + editable_content + "\n</div>\n";
                                          if (widgets_json[index]) {
                                              page_contents += widgets_json[index];
                                          }
                                      });
            page_contents += static_contents_end;
            return page_contents;
        };
        var any_edits;
        any_edits = widget_count_in_last_save !== $elements.length;
        widget_count_in_last_save = $elements.length;
        $(".toontalk-edit").each(function (index, element) {
                                     var content = element.innerHTML;
                                     if (editable_contents[index] && editable_contents[index] !== content) {
                                         any_edits = true;
                                     }
                                     editable_contents[index] = content;
        });
        $elements.each(function (index, element) {
            var widget = TT.UTILITIES.widget_side_of_element(element);
            TT.UTILITIES.get_json_top_level(widget,
                                            function (json) {
                                                var json_div = TT.UTILITIES.toontalk_json_div(json, widget);
                                                if (widgets_json[index] && widgets_json[index] !== json_div) {
                                                    any_edits = true;
                                                }
                                                widgets_json[index] = json_div;
                                            });
        });
        if (any_edits && widgets_json.length > 0) {
            // don't save if there is no JSON
            var callback = function () {
                // do something more?
                if (TT.debugging) {
                    console.log("Published page '" + document.title + "' updated.");
                }
            };
            TT.google_drive.insert_or_update_file(undefined,
                                                  file_id,
                                                  'page',
                                                  assemble_contents(document.title, editable_contents, widgets_json),
                                                  callback);
        }
        // check every 10 seconds for edits
        setTimeout(function () {
                       TT.published_support.send_edit_updates(file_id);
                   },
                   10000);
    }};

}(window.TOONTALK));
