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

var message_handler =
    function (event) {
        if (event.data.save_edits_to) {
            TT.published_support.enable_editor(event.source, event.data.save_edits_to, event.data.file_id, event.data.widgets_json);
        }
    };

window.addEventListener("message", message_handler, false);

return {
    enable_editor: function (saving_window, saving_window_URL, file_id, widgets_json) {
        var $elements, current_widget_count, new_widget_count;
        if (editor_enabled) {
            return;
        }
        editor_enabled = true;
        $(".toontalk-edit").editable({inlineMode: true, imageUpload: false});
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
                document.body.appendChild($("<div class='toontalk-edit'>Edit this</div>").editable({inlineMode: true, imageUpload: false}).get(0));
            }
            TT.UTILITIES.process_json_elements();
        } else {
            widgets_json = [];
            $elements.each(function (index, element) {
                var widget = element.toontalk_widget;
                var json   = TT.UTILITIES.get_json_top_level(widget);
                var json_div = TT.UTILITIES.toontalk_json_div(json, widget);
                widgets_json[index] = json_div;
            });
        }
        saving_window.postMessage({editor_enabled_for: file_id}, saving_window_URL); // not needed in iframe version
        TT.published_support.send_edit_updates(saving_window, saving_window_URL, file_id);
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
            var widget = TT.UTILITIES.widget_from_jquery($(element));
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