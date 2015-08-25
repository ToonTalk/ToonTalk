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
var editor_enabled = false;
var inline_mode = !TT.UTILITIES.get_current_url_boolean_parameter('edit', false);

var message_handler =
    function (event) {
        if (event.data.save_edits_to) {
            TT.published_support.enable_editor(event.source, event.data.save_edits_to, event.data.file_id, event.data.widgets_json);
        } else if (event.data.authorization_problem) {
            respond_to_authorization_need(event.data.authorization_problem, event.source, event.data.respond_to);
        }
    };
window.addEventListener("message", message_handler, false);

var add_save_edits_iframe = function () {
    var file_id_end   = window.location.href.lastIndexOf("/");
    var file_id_start = window.location.href.lastIndexOf("/", file_id_end-1);
    var file_id       = window.location.href.substring(file_id_start+1, file_id_end);
    var iframe        = document.createElement("iframe");
    iframe.className  = "toontalk-saver-iframe";
    iframe.src        = "https://toontalk.github.io/ToonTalk/support/save_page.html?id=" + file_id;
    // using GitHub caused problems with editor fonts not loading so used DropBox
    // but that broke saving edits on IE11 so fixed the web fonts problem elsewhere
//     iframe.src        = "https://dl.dropboxusercontent.com/u/51973316/ToonTalk/support/save_page_dropbox.html?id=" + file_id; 
    document.body.appendChild(iframe);
};
if (window.location.href.indexOf("googledrive.com/host") >= 0) {
    // don't add iframe if file has been moved from Google Drive (e.g. as a test file)
    add_save_edits_iframe();
}

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

return {
    enable_editor: function (saving_window, saving_window_URL, file_id, widgets_json) {
        var drop_handler = function (event) {
            console.log(event.dataTransfer);
        };
        var prevent_default = function (event) {
            event.preventDefault();
        };
        var accept_drops = function (index, element) {
            element.addEventListener('drop', drop_handler);
            element.addEventListener('dragover',  prevent_default);
            element.addEventListener('dragenter', prevent_default);
        };
        var $elements, current_widget_count, new_widget_count;
        if (editor_enabled) {
            return;
        }
        editor_enabled = true;
        $(".toontalk-edit").editable({inlineMode: inline_mode,
                                      imageUpload: false, 
                                      crossDomain: true});
        $elements = $(".toontalk-backside-of-top-level, .toontalk-top-level-resource-container");
        if (widgets_json) {
            current_widget_count = $elements.length;
            new_widget_count = widgets_json.length;
            $elements.each(function (index, element) {
                if (index < new_widget_count) {
                    $(element).replaceWith(widgets_json[index]);
                } else {
                    $(element).remove();
                }
            });
            while (new_widget_count > current_widget_count) {
                document.body.appendChild($(widgets_json[current_widget_count]).get(0));
                current_widget_count++;
                document.body.appendChild(TT.published_support_create_editable_text());
            }
            TT.UTILITIES.process_json_elements();
        } else {
            widgets_json = [];
            $elements.each(function (index, element) {
                var widget = element.toontalk_widget_side.get_widget();
                var json   = TT.UTILITIES.get_json_top_level(widget);
                var json_div = TT.UTILITIES.toontalk_json_div(json, widget);
                widgets_json[index] = json_div;
            });
        }
        $(".froala-element").each(function () {
            TT.UTILITIES.can_receive_drops(this);
        });
        saving_window.postMessage({editor_enabled_for: file_id}, saving_window_URL); // not needed in iframe version
        TT.published_support.send_edit_updates(saving_window, saving_window_URL, file_id);
    },
    create_editable_text: function () {
        var editable_text = $("<div class='toontalk-edit'>Edit this</div>").editable({inlineMode: inline_mode, imageUpload: false}).get(0);
         TT.UTILITIES.can_receive_drops($(editable_text).children(".froala-element").get(0));
         return editable_text;
    },
    send_edit_updates: function (saving_window, saving_window_URL, file_id) {
        var any_edits = false;
        $(".toontalk-edit").each(function (index, element) {
                                     var content = $(element).editable("getHTML", false, true);
                                     if (editable_contents[index] && editable_contents[index] !== content) {
                                         any_edits = true;
                                     }
                                     editable_contents[index] = content;
        });
        $(".toontalk-backside-of-top-level, .toontalk-top-level-resource-container").each(function (index, element) {
            var widget = TT.UTILITIES.widget_side_of_element(element);
            var json = TT.UTILITIES.get_json_top_level(widget);
            var json_div = TT.UTILITIES.toontalk_json_div(json, widget);
            if (widgets_json[index] && widgets_json[index] !== json_div) {
                any_edits = true;
            }
            widgets_json[index] = json_div;
        });
        if (any_edits) {
            saving_window.postMessage({title: document.title, editable_contents: editable_contents, widgets_json: widgets_json, file_id: file_id}, saving_window_URL);
        }
        setTimeout(function () {
                       TT.published_support.send_edit_updates(saving_window, saving_window_URL, file_id);
                   },
                   10000);
    }};

}(window.TOONTALK));