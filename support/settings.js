 /**
 * Implements ToonTalk's JavaScript functions shared between files
 * Authors: Ken Kahn
 * License: New BSD
 */
 
/*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */

window.TOONTALK.SETTINGS = 
(function (TT) {
    "use strict";
    var add_files_tabs = function (widget, cloud_available, settings_panel) {
        var labels = [];
        var tables = [];
        var local_files_tab_index = cloud_available ? 1: 0; // so cloud version is first if available
        var cloud_files_index = 0;
        var cloud_pages_index = 2;
        var local_files_table = TT.UTILITIES.create_local_files_table(widget);
        labels[local_files_tab_index] = "Programs stored in browser";
        add_click_listeners(widget, local_files_table, false, settings_panel);
        tables[local_files_tab_index] = local_files_table;
        if (cloud_available) {
            create_cloud_files_table('program', widget, settings_panel, function (table) {
                labels[cloud_files_index] = "Programs in cloud";
                tables[cloud_files_index] = table || TT.UTILITIES.create_text_element("Error connecting");
                if (tables[cloud_pages_index]) {
                    settings_panel.appendChild(TT.UTILITIES.create_tabs(labels, tables));
                }
            });
            create_cloud_files_table('page', widget, settings_panel, function (table) {
                labels[cloud_pages_index] = "Published pages";
                tables[cloud_pages_index] = table || TT.UTILITIES.create_text_element("Error connecting");
                if (tables[cloud_files_index]) {
                    settings_panel.appendChild(TT.UTILITIES.create_tabs(labels, tables));
                }
            });
        } else {
            // no network responses to wait for
            settings_panel.appendChild(TT.UTILITIES.create_tabs(labels, tables));
        }
    };
    var create_cloud_files_table = function (toontalk_type, widget, settings_panel, callback) {
        var full_callback = function (response) {
            var error, table, class_name;
            if (typeof response === 'string') {
                error = response;
            } else if (response.error) {
                error = response.error.message;
            }
            if (error) {
                if (error === 'Need to authorize' || error === "Login Required") {
                    TT.google_drive.authorize(callback);
                    return;
                }
                console.log(error);
                console.log("Google drive status: " + TT.google_drive.get_status());
                callback(null);
                return;
            }
            // published pages don't have a button class -- they are now ordinary links
            class_name = (toontalk_type === 'program') && "toontalk-file-load-button"; 
            table = TT.UTILITIES.create_file_data_table(response.items, true, class_name);
            add_click_listeners(widget, table, true, settings_panel);
            callback(table);
        };
        TT.google_drive.get_toontalk_files(false, toontalk_type, full_callback);
    };
    
    var add_click_listeners = function (widget, table, in_the_cloud, settings_panel) {
        var program_click_handler = function (event) {
            var callback = function () {
                $(settings_panel).remove();
            };
            var saved_callback = function () {
                widget.set_setting('program_name', event.target.innerText);
                // TODO: when in the cloud use this.title or the like to directly load the Google file
                widget.load(in_the_cloud, callback);
            }.bind(this);
            // save in case current program has changed
            widget.save(true, undefined, saved_callback);
        };
//         var page_click_handler = function (event) {
//             // title of this element is the URL
//             TT.UTILITIES.open_url_and_enable_editor(this.title, this.id);            
//         };
        $(table).find(".toontalk-file-load-button").click(program_click_handler);
//         $(table).find(".toontalk-published-page-button").click(page_click_handler);
    };

    return {
      open: function (widget) {
          var settings_panel = document.createElement('div');
          var close_handler = function () {
              $(settings_panel).remove();
          };
          var widget_element = widget.get_backside_element();
          var current_program_name = widget.get_setting('program_name');
          var program_name   = TT.UTILITIES.create_text_input(current_program_name, 
                                                             "toontalk-program-name-input", 
                                                             "Current program name:", 
                                                             "Edit this to change the name of your program", 
                                                             "docs/manual/settings.html");
          var close_button   = TT.UTILITIES.create_close_button(close_handler, "Click to close the settings panel.");
          var heading        = TT.UTILITIES.create_text_element("How should your program be saved?");
          var google_drive   = TT.UTILITIES.create_check_box(widget.get_setting('auto_save_to_google_drive'), 
                                                             "toontalk-save-setting",
                                                             "Save automatically to my Google Drive",
                                                             "Check this if you want your programs automatically saved to a 'ToonTalk Programs' folder in your Google Drive.");
          var local_storage  = TT.UTILITIES.create_check_box(widget.get_setting('auto_save_to_local_storage'), 
                                                             "toontalk-save-setting",
                                                             "Save automatically to this browser's local storage",
                                                             "Check this if you want your programs automatically saved in this browser's local storage.");
          var save_now_google = TT.UTILITIES.create_button("Save to Google Drive now",
                                                           "toontalk-save-button", 
                                                           "Click to save your program now to your Google Drive account.", 
                                                           function () {
                                                               widget.save(true, {google_drive: true});
                                                           });
          var save_now_local = TT.UTILITIES.create_button("Save to browser's storage now",
                                                          "toontalk-save-button", 
                                                          "Click to save your program now to this browser's local storage.", 
                                                          function () {
                                                              widget.save(true, {local_storage: true});
                                                          });                                                          
          var authorize      = TT.UTILITIES.create_button("Login to Google",
                                                          "toontalk-google-login-button", 
                                                          "Click to log in to Google to authorize use of your Google Drive.", 
                                                          function () {
                                                              TT.google_drive.authorize(function () {
                                                                  $(authorize).remove();
                                                              });
                                                          });
          var publish        = TT.UTILITIES.create_button("Publish",
                                                          "toontalk-publish-button", 
                                                          "Click to publish your program by generating a Google Drive URL.", 
                                                          function () {
                                                              widget.publish(display_published, as_workspace.button.checked);
                                                          });
          var as_workspace   = TT.UTILITIES.create_check_box(widget.get_setting('publish_as_workspace'), 
                                                             "toontalk-publish-setting",
                                                             "As a workspace",
                                                             "Check this if you want to publish the workspace and its widgets. Uncheck it you wish to publish just the widgets.");
          var display_published = function (google_file, extra_info) {
              // currently extra_info is the JSON of the current widgets if previously published
              var link_to_publication = create_connection_to_google_file(google_file, "Published: ", extra_info);
              $(program_name.container).children("tr").append(TT.UTILITIES.create_table_entry(link_to_publication));
          };
          var create_connection_to_google_file = function (google_file, prefix, extra_info) {
              var link_to_publication = document.createElement('span');
              var url = TT.google_drive.google_drive_url(google_file.id);
              link_to_publication.innerHTML = prefix + "<a href='" + url + "' target='_blank'>" + widget.get_setting('program_name') + "</a>";
//               link_to_publication.addEventListener('click', function (event) {
//                   TT.UTILITIES.open_url_and_enable_editor(url, google_file.id, extra_info);
//               });
              return link_to_publication;
          };
          // create a div whose positioning isn't absolute
          // settings_panel needs to be absolute for at least z-index to work properly
          var contents_div = document.createElement('div');
          var google_status = TT.google_drive && typeof gapi !== 'undefined' ? TT.google_drive.get_status() : "Google Drive API not loaded";
          var cloud_available = true; // unless discovered otherwise below
          var publish_and_as_workspace = TT.UTILITIES.create_vertical_table(publish, as_workspace.container);
          $(settings_panel).addClass("toontalk-settings-panel")
                           .css({width:  $(widget_element).width() +29,
                                 height: $(widget_element).height()+50,
                                 left:  -2,
                                 top:  -25,
                                "z-index": TT.UTILITIES.next_z_index()});
          settings_panel.appendChild(close_button);
          program_name.button .addEventListener('change', 
                                                function () {
                                                    var new_program_name = program_name.button.value.trim();
                                                    var saved_callback;
                                                    if (current_program_name !== new_program_name) {
                                                        saved_callback = 
                                                            function () {
                                                                var callback =
                                                                    function () {
                                                                        // delay this since newly added widgets have yet to update their display (and z-index)
                                                                        setTimeout(function () {
                                                                                       $(settings_panel).css({"z-index": TT.UTILITIES.next_z_index()});
                                                                                   },
                                                                                   500);  
                                                                    }
                                                                current_program_name = new_program_name;
                                                                widget.set_setting('program_name', new_program_name);
                                                                widget.load(true, callback); // use Google Drive first
                                                         };
                                                         // save in case current program has changed
                                                         widget.save(true, undefined, saved_callback);
                                                    }
                                               });
          google_drive.button .addEventListener('click', 
                                                function (event) {
                                                    // if turnning off auto-saving save one last time
                                                    // which also saves the new setting of save to local_storage
                                                    // if turnning on OK to begin autosaving immediately
                                                    widget.save(true, {auto_save_to_google_drive: local_storage.button.checked,
                                                                       gooogle_drive: true});
                                                    widget.set_setting('auto_save_to_google_drive', google_drive.button.checked);
                                                    if (google_drive.button.checked) {
                                                        $(save_now_google).hide();
                                                    } else {
                                                        $(save_now_google).show();
                                                    }
                                                });
          local_storage.button.addEventListener('click', 
                                                function (event) {
                                                    // if turnning off auto-saving save one last time
                                                    // which also saves the new setting of save to local_storage
                                                    // if turnning on OK to begin autosaving immediately
                                                    widget.save(true, {auto_save_to_local_storage: local_storage.button.checked,
                                                                       local_storage: true});
                                                    widget.set_setting('auto_save_to_local_storage', local_storage.button.checked);
                                                    if (local_storage.button.checked) {
                                                        $(save_now_local).hide();
                                                    } else {
                                                        $(save_now_local).show();
                                                    }
                                                });
          as_workspace.button.addEventListener('click', 
                                                function (event) {
                                                    widget.set_setting('publish_as_workspace', as_workspace.button.checked);
                                                });
          settings_panel.appendChild(contents_div);
          $(heading).css({"font-weight": 'bold',
                          "font-size": 24,
                          "color": "navy"});
          contents_div.appendChild(heading);
          contents_div.appendChild(program_name.container);
          contents_div.appendChild(google_drive.container);
          contents_div.appendChild(local_storage.container);
          google_drive.container.appendChild(TT.UTILITIES.create_space());
          google_drive.container.appendChild(save_now_google);
          if (widget.get_setting('auto_save_to_google_drive')) {
              $(save_now_google).hide();
          }
          local_storage.container.appendChild(TT.UTILITIES.create_space());
          local_storage.container.appendChild(save_now_local);
          if (widget.get_setting('auto_save_to_local_storage')) {
              $(save_now_local).hide();
          }
          if (google_status === 'Need to authorize') {
              google_drive.container.appendChild(TT.UTILITIES.create_space());
              google_drive.container.appendChild(authorize);
          } else if (google_status !== 'Authorized' && google_status !== 'Ready' && google_status !== 'Authorized but not yet ready') {
              cloud_available = false;
              // delayed because JQuery otherwise complains that the buttons haven't been initialised
              setTimeout(function () {
                             google_drive.button.disabled = true; // is a checkbox
                             $(publish)            .button("option", "disabled", true);
                             $(save_now_google)    .button("option", "disabled", true);
                             google_drive.container.title = "Inactived because attempt to connect to Google Drive returned: " + google_status;
                             publish.title                = google_drive.container.title;
                             save_now_google.title        = google_drive.container.title;          
                         },
                         1);
          }
          $(program_name.container).children("tr").append(TT.UTILITIES.create_table_entry(publish_and_as_workspace));
          add_files_tabs(widget, cloud_available, settings_panel);
          widget_element.appendChild(settings_panel);                  
      }
    };

}(window.TOONTALK));

window.TOONTALK.DEFAULT_SETTINGS = {
    program_name:               "My first program",
    auto_save_to_google_drive:  true,
    auto_save_to_local_storage: true
};