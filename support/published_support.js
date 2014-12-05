 /**
 * Implements ToonTalk's JavaScript that connects published ToonTalk pages with ToonTalk
 * thereby enabling the saving of edits
 * Authors: Ken Kahn
 * License: New BSD
 */
 
/*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */

window.TOONTALK.publish = (function (TT) {

var editable_contents = [];
var widgets_json = [];
var editor_enabled = false;
var send_edit_updates = function (other_window, other_target, file_id) {
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
        other_window.postMessage({title: document.title, editable_contents: editable_contents, widgets_json: widgets_json, file_id: file_id}, other_target);
    }
    setTimeout(function () {
                   send_edit_updates(other_window, other_target, file_id);
               },
               10000);
};

var message_handler =
    function (event) {
        var $elements, current_widget_count, new_widget_count;
        if (event.data.save_edits_to) {
            if (editor_enabled) {
                return;
            }
            editor_enabled = true;
            $(".toontalk-edit").editable({inlineMode: true, imageUpload: false});
            if (event.data.widgets_json) {
                $elements = $(".toontalk-backside-of-top-level, .toontalk-top-level-resource-container");
                current_widget_count = $elements.length;
                new_widget_count = event.data.widgets_json.length;
                $elements.each(function (index, element) {
                    if (index < new_widget_count) {
                        $(element).replaceWith(event.data.widgets_json[index]);
                    } else {
                        $(element).remove();
                    }
                });
                while (new_widget_count > current_widget_count) {
                    document.body.appendChild($(event.data.widgets_json[current_widget_count]).get(0));
                    current_widget_count++;
                    document.body.appendChild($("<div class='toontalk-edit'>Edit this</div>").editable({inlineMode: true, imageUpload: false}).get(0));
                }
                TT.UTILITIES.process_json_elements();
            }
            event.source.postMessage({editor_enabled_for: event.data.file_id}, event.data.save_edits_to);
            send_edit_updates(event.source, event.data.save_edits_to, event.data.file_id);
        };
    };

window.addEventListener("message", message_handler, false);

}(window.TOONTALK));