 /**
 * Implements ToonTalk's JavaScript functions shared between files
 * Authors: Ken Kahn
 * License: New BSD
 */
 
/*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */

window.TOONTALK.SETTINGS = 
(function (TT) {
    "use strict";
    var tables = [];
    // following changed since the local storage doesn't require a network response - the others are computed on demand
    var local_files_index = 0; // cloud_available ? 1: 0; // so cloud version is first if available
    var cloud_files_index = 1;
    var cloud_pages_index = 2;
    var dropbox_file_chooser = function (extensions, callback) {
        // see https://www.dropbox.com/developers/chooser
        var options = {
            success: callback,
            // Optional. "preview" (default) is a preview link to the document for sharing,
            // "direct" is an expiring link to download the contents of the file. For more
            // information about link types, see Link types below.
            linkType: "direct",
            // Optional. This is a list of file extensions. If specified, the user will
            // only be able to select files with these extensions. You may also specify
            // file types, such as "video" or "images" in the list. By default, all extensions are allowed.
            extensions: extensions
        };
        Dropbox.choose(options);
    };
    var add_files_tabs = function (widget, cloud_available, settings_panel) {
        var labels = [];
        TT.UTILITIES.create_local_files_table(function (local_files_table) {
            var tab_activated_handler = function(event, ui) {
                var become_cloud_files_table_callback = function (table) {
                    if (!table) {
                        ui.newPanel.append(TT.UTILITIES.create_text_element("Error connecting to cloud. Have you logged in?"));
                    }
                };
                var initialised = ui.newPanel.is(".dataTable");
                // DataTables seems to have a bug with pagination elements and tabs
                // so info from other tabs is displayed
                // first hide them all and then show only the correct ones
                $(".dataTables_info").hide();
                $(".dataTables_wrapper").hide();
                if (ui.newTab.find(".toontalk-programs-in-cloud-tab-label").length > 0) {
                    if (widget.get_setting('save_to_dropbox')) {
                        dropbox_file_chooser([".tt.json"],
                                               function (files) {
                                                   TT.UTILITIES.download_file(files[0].link,
                                                                              widget.download_callback(function () {
                                                                                                            $(settings_panel).remove();
                                                                                                        }));
                                               });
                    } else if (initialised) {
                        $("#tab-" + cloud_files_index + "_info").show();
                        $("#tab-" + cloud_files_index + "_wrapper").show();
                    } else {
                        // is not yet a data table but is just an empty table so make it into a data table    
                        become_cloud_files_table(ui.newPanel, 'program', widget, settings_panel, become_cloud_files_table_callback);
                    }
                } else if (ui.newTab.find(".toontalk-pages-in-cloud-tab-label").length > 0) {
                    if (widget.get_setting('save_to_dropbox')) {
                        dropbox_file_chooser([".tt.html"], 
                                               function (files) {
                                                   ui.newPanel.before($("<p><a href='" + files[0].link + "' target='_blank'>Click to open " + files[0].name + "</a></p>"));
                                               });
                    } else if (initialised) {
                        $("#tab-" + cloud_pages_index + "_info").show();
                        $("#tab-" + cloud_pages_index + "_wrapper").show();
                    } else {
                        become_cloud_files_table(ui.newPanel, 'page', widget, settings_panel, become_cloud_files_table_callback);
                    }
                } else {
                    $("#tab-" + local_files_index + "_info").show();
                    $("#tab-" + local_files_index + "_wrapper").show();
                }
            };
            var tabs;
            labels[local_files_index] = "Programs stored in browser";
            tables[local_files_index] = local_files_table;
            if (cloud_available) {
                labels[cloud_files_index] = TT.UTILITIES.create_text_element("Programs in cloud", "toontalk-programs-in-cloud-tab-label");
                labels[cloud_pages_index] = TT.UTILITIES.create_text_element("Published pages",   "toontalk-pages-in-cloud-tab-label");
                if (widget.get_setting('save_to_google_drive')) {
                    tables[cloud_files_index] = TT.UTILITIES.create_file_data_table("toontalk-programs-in-cloud-table");
                    tables[cloud_pages_index] = TT.UTILITIES.create_file_data_table("toontalk-pages-in-cloud-table");
                } else {
                    tables[cloud_files_index] = TT.UTILITIES.create_text_element("Choose a file to load.");
                    tables[cloud_pages_index] = TT.UTILITIES.create_text_element("Choose a page to display.");
                }
                tabs = TT.UTILITIES.create_tabs(labels, tables);
                settings_panel.appendChild(tabs);
                $(tabs).on("tabsactivate", tab_activated_handler);
            } else {
                // no network responses to wait for
                settings_panel.appendChild(TT.UTILITIES.create_tabs(labels, tables));
            }
            add_click_listeners(widget, local_files_table, true, settings_panel);
            // and add them if the table is redrawn since it may be showing other files 
            $(local_files_table).on('draw.dt', function () {
                add_click_listeners(widget, local_files_table, false, settings_panel);
            });
        });
    };
    var become_cloud_files_table = function ($table, toontalk_type, widget, settings_panel, callback) {
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
            class_name = (toontalk_type === 'program') && "toontalk-file-load-button toontalk-file-load-button-without-click-handler"; 
            TT.UTILITIES.become_file_data_table($table, response.items, true, class_name);
            add_click_listeners(widget, $table.get(0), true, settings_panel);
            $table.on('draw.dt', function () {
                add_click_listeners(widget, $table.get(0), true, settings_panel);
            });
            callback($table.get(0));
        };
        TT.google_drive.get_toontalk_files(false, toontalk_type, full_callback);
    };
    var close_settings = function (widget) {
        $(".toontalk-settings-panel").remove();
        widget.display_message("Your program was copied and the new copy's name is '" + widget.get_setting('program_name') + "'.");
    };
    var add_click_listeners = function (widget, table, in_the_cloud, settings_panel) {
        var program_click_handler = function (event) {
            var callback = function () {
                $(settings_panel).remove();
            };
            var saved_callback = function () {
                widget.set_setting('program_name', event.target.textContent);
                // TODO: when in the cloud use this.title or the like to directly load the Google file
                widget.load(in_the_cloud, callback);
            }.bind(this);
            // save before loading new program in case current program has changed
            widget.save(true, undefined, saved_callback);
        };
        var $elements_needing_click_handlers = $(table).find(".toontalk-file-load-button-without-click-handler");
        $elements_needing_click_handlers.each(function (index, element) {
            element.addEventListener('click', program_click_handler);
        });
        $elements_needing_click_handlers.removeClass("toontalk-file-load-button-without-click-handler");
    };

    return {
      open: function (widget) {
          var settings_panel = document.createElement('div');
          var close_handler = function () {
              $(settings_panel).remove();
          };
          var widget_element = widget.get_backside_element();
          var current_program_name = widget.get_setting('program_name');
          var program_name         = TT.UTILITIES.create_text_input(current_program_name, 
                                                             "toontalk-program-name-input", 
                                                             "Current program name:", 
                                                             "Edit this to change the name of your program", 
                                                             "docs/manual/settings.html");
          var close_button         = TT.UTILITIES.create_close_button(close_handler, "Click to close the settings panel.");
          var heading              = TT.UTILITIES.create_text_element("How should your program be saved?");
          var save_to_dropbox      = TT.UTILITIES.create_check_box(widget.get_setting('save_to_dropbox'), 
                                                             "toontalk-save-setting",
                                                             "When saving to the cloud use my Dropbox account",
                                                             'Check this if you want your programs saved to a "ToonTalk Reborn" folder in the "Apps" folder in your Dropbox.');
          var save_to_google_drive = TT.UTILITIES.create_check_box(widget.get_setting('save_to_google_drive'), 
                                                             "toontalk-save-setting",
                                                             "When saving to the cloud use my Google Drive account",
                                                             'Check this if you want your programs saved to a "ToonTalk Programs" folder in your Google Drive.');
          // ideally "ToonTalk Programs" should be <i translate='no'>ToonTalk Programs</i>
          // but see http://stackoverflow.com/questions/15734105/jquery-ui-tooltip-does-not-support-html-content
          var auto_save_to_cloud    = TT.UTILITIES.create_check_box(widget.get_setting('auto_save_to_cloud'), 
                                                             "toontalk-save-setting",
                                                             "Save automatically to cloud storage",
                                                             'Check this if you want your programs to Dropbox or Google Drive when your program changes.');
          var local_storage         = TT.UTILITIES.create_check_box(widget.get_setting('auto_save_to_local_storage'), 
                                                             "toontalk-save-setting",
                                                             "Save automatically to this browser's local storage",
                                                             "Check this if you want your programs automatically saved in this browser's local storage.");
          var save_now_cloud        = TT.UTILITIES.create_button("Save to cloud storage now",
                                                              "toontalk-save-button", 
                                                              "Click to save your program now to your Dropbox or your Google Drive account.", 
                                                              function () {
                                                                  widget.save(true, {google_drive: widget.get_setting('save_to_google_drive'),
                                                                                     dropbox:      widget.get_setting('save_to_dropbox')});
                                                              });
          var save_now_local       = TT.UTILITIES.create_button("Save to browser's storage now",
                                                          "toontalk-save-button", 
                                                          "Click to save your program now to this browser's local storage.", 
                                                          function () {
                                                              widget.save(true, {local_storage: true});
                                                          });                                                          
          var authorize            = TT.UTILITIES.create_button("Login to Google",
                                                          "toontalk-google-login-button", 
                                                          "Click to log in to Google to authorize use of your Google Drive.", 
                                                          function () {
                                                              TT.google_drive.authorize(function () {
                                                                  $(authorize).remove();
                                                              });
                                                          });
          var publish             = TT.UTILITIES.create_button("Publish",
                                                          "toontalk-publish-button", 
                                                          "Click to publish your program by generating a Google Drive URL.", 
                                                          function () {
                                                              widget.display_message("Creating your web page...");
                                                              widget.publish(display_published, as_workspace.button.checked);
                                                          });
          var as_workspace        = TT.UTILITIES.create_check_box(widget.get_setting('publish_as_workspace'), 
                                                            "toontalk-publish-setting",
                                                            "As a workspace",
                                                            "Check this if you want to publish the workspace and its widgets. Uncheck it you wish to publish just the widgets.");
          var display_published = function (google_file, extra_info) {
              // currently extra_info is the JSON of the current widgets if previously published
              var link_to_publication = create_connection_to_google_file(google_file, "Published '" + widget.get_setting('program_name') + "': ", extra_info);
              var $row = $(program_name.container).children("tr");
              widget.display_message("Your web page is ready for you to edit. Just click on the link.");
              if ($row.length > 0) {
                  $row.get(0).appendChild(TT.UTILITIES.create_table_entry(link_to_publication));
              }
          };
          var create_connection_to_google_file = function (google_file, prefix, extra_info) {
              var link_to_download = document.createElement('span');
              var link_to_edit     = document.createElement('span');
              var url          = TT.google_drive.google_drive_url(google_file.id);
              var editable_url = window.location.protocol + "//" + window.location.host + 
                                 "/ToonTalk/published.html" + window.location.search + 
                                 "&replace-with-url=" + encodeURIComponent(TT.google_drive.google_drive_url(google_file.id, true));
              var both = window.document.createElement('span');
              if (TT.TRANSLATION_ENABLED) {
                  url = TT.UTILITIES.add_URL_parameter(url, "translate", "1");
              }
              link_to_download.innerHTML = prefix + "<a href='" + url + "' target='_blank'>Download</a>";
              link_to_edit.innerHTML = "&nbsp;or&nbsp;" + "<a href='" + editable_url + "' target='_blank'>Edit</a>";
              both.appendChild(link_to_download);
              both.appendChild(link_to_edit);
              return both;
          };
          // create a div whose positioning isn't absolute
          // settings_panel needs to be absolute for at least z-index to work properly
          var contents_div = document.createElement('div');
          var google_status = TT.google_drive && typeof gapi !== 'undefined' ? TT.google_drive.get_status() : "Google Drive API not loaded";
          var cloud_available = true; // unless discovered otherwise below
          var program_name_changed = 
              function () {
                  var new_program_name = program_name.button.value.trim();
                  var saved_callback;
                  if (current_program_name !== new_program_name) {
                      saved_callback = 
                          function () {
                              var loaded_callback =
                                  function () {
                                      // delay this since newly added widgets have yet to update their display (and z-index)
                                      setTimeout(function () {
                                                     $(settings_panel).css({"z-index": TT.UTILITIES.next_z_index()});
                                                 },
                                                 500);  
                                  };
                              var nothing_to_load_callback = function () {
                                  // save with the new name and then close settings
                                  widget.save(true, undefined, function () {
                                                                   close_settings(widget);
                                                               });
                              };
                              current_program_name = new_program_name;
                              widget.set_setting('program_name', new_program_name);
                              widget.load(true, loaded_callback, nothing_to_load_callback); // use Google Drive first
                       };
                       // save in case current program has changed
                       widget.save(true, undefined, saved_callback);
                  }
          };
          var reopen_settings = function () {
              $(settings_panel).remove();
              setTimeout(function () {
                            window.TOONTALK.SETTINGS.open(widget);  
                        });
          };
          var publish_and_as_workspace = TT.UTILITIES.create_vertical_table(publish, as_workspace.container);
          var $row = $(program_name.container).children("tr");
          $(settings_panel).addClass("toontalk-settings-panel")
                           .css({width:  $(widget_element).width() +29,
                                 height: $(widget_element).height()+50,
                                 left:  -2,
                                 top:  -25,
                                 // settings panel should be on top of everything
                                "z-index": 9999999});
          settings_panel.appendChild(close_button);
          program_name.button.addEventListener('change', program_name_changed);
          save_to_google_drive.button.addEventListener('click', 
                                               function (event) {
                                                   // if turning off auto-saving save one last time
                                                   // which also saves the new setting of save to local_storage
                                                   // if turnning on OK to begin autosaving immediately       
                                                   widget.save(true, {save_to_google_drive: save_to_google_drive.button.checked,
                                                                      // is the following obsolete?
                                                                      gooogle_drive: true});
                                                   widget.set_setting('save_to_google_drive', save_to_google_drive.button.checked);
                                                   if (save_to_google_drive.button.checked) {
                                                       $(save_now_cloud).hide();
                                                       save_to_dropbox.button.checked = false;
                                                       widget.set_setting('save_to_dropbox', false);
                                                       reopen_settings();
                                                   } else if (save_to_dropbox.button.checked) {
                                                       $(save_now_cloud).show();
                                                   } else {
                                                       $(save_now_cloud).hide();
                                                       auto_save_to_cloud.button.checked = false;
                                                   }
                                               });
          save_to_dropbox.button.addEventListener('click', 
                                               function (event) {                            
                                                   widget.save(true, {save_to_dropbox: save_to_dropbox.button.checked,
                                                                      dropbox: true});
                                                   widget.set_setting('save_to_dropbox', save_to_dropbox.button.checked);
                                                   if (save_to_dropbox.button.checked) {
                                                       $(save_now_cloud).hide();
                                                       save_to_google_drive.button.checked = false;
                                                       widget.set_setting('save_to_google_drive', false);
                                                       reopen_settings();
                                                   } else if (save_to_google_drive.button.checked) {
                                                       $(save_now_cloud).show();
                                                   } else {
                                                       $(save_now_cloud).hide();
                                                       auto_save_to_cloud.button.checked = false;
                                                   }
                                                });
          auto_save_to_cloud.button.addEventListener('click', 
                                                function (event) {
                                                    // if turnning off auto-saving save one last time
                                                    // which also saves the new setting of save to local_storage
                                                    // if turnning on OK to begin autosaving immediately
                                                    widget.save(true, {auto_save_to_cloud: auto_save_to_cloud.button.checked,
                                                                       google_drive:  widget.set_setting('save_to_google_drive'),
                                                                       dropbox:        widget.set_setting('save_to_dropbox')});
                                                    widget.set_setting('auto_save_to_cloud', auto_save_to_cloud.button.checked);
                                                    if (auto_save_to_cloud.button.checked) {
                                                        $(save_now_cloud).hide();
                                                    } else if (save_to_dropbox.button.checked || save_to_google_drive.button.checked) {
                                                        $(save_now_cloud).show();
                                                    } else {
                                                        $(save_now_cloud).hide();
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
          if (!TT.CHROME_APP) {
              contents_div.appendChild(save_to_google_drive.container);
          // commented out until https://www.dropbox.com/developers/documentation/javascript is ready since saving
          // is only possible using the deprecated version 1 SDK
//           contents_div.appendChild(save_to_dropbox.container);
              contents_div.appendChild(auto_save_to_cloud.container);
              contents_div.appendChild(local_storage.container);
          }
          save_to_google_drive.container.appendChild(TT.UTILITIES.create_space());
          save_to_google_drive.container.appendChild(save_now_cloud);
          save_to_dropbox.container.appendChild(TT.UTILITIES.create_space());
          save_to_dropbox.container.appendChild(save_now_cloud);
          if (widget.get_setting('auto_save_to_cloud')) {
              $(save_now_cloud).hide();
          }
          local_storage.container.appendChild(TT.UTILITIES.create_space());
          local_storage.container.appendChild(save_now_local);
          if (widget.get_setting('auto_save_to_local_storage')) {
              $(save_now_local).hide();
          }
          if (widget.get_setting('save_to_google_drive')) {
              if (google_status === 'Need to authorize') {
                  save_to_google_drive.container.appendChild(TT.UTILITIES.create_space());
                  save_to_google_drive.container.appendChild(authorize);
              } else if (google_status !== 'Authorized' && google_status !== 'Ready' && google_status !== 'Authorized but not yet ready') {
                  cloud_available = false;
                  widget.set_setting('google_drive_unavailable', true);
                  // delayed because JQuery otherwise complains that the buttons haven't been initialised
                  setTimeout(function () {
                                 save_to_google_drive.button.disabled = true; // is a checkbox
                                 $(publish)       .button("option", "disabled", true);
                                 $(save_now_cloud).button("option", "disabled", true);
                                 TT.UTILITIES.give_tooltip(save_to_google_drive.container, "Inactivated because attempt to connect to Google Drive returned: " + google_status);
                                 publish.title               = save_to_google_drive.container.title;
                                 save_now_cloud.title        = save_to_google_drive.container.title;          
                             },
                             1);
              } else {
                  widget.set_setting('google_drive_unavailable', false);
              }
          } else if (widget.get_setting('save_to_dropbox')) {
              cloud_available = true;
          }
          if ($row.length > 0) {
              $row.get(0).appendChild(TT.UTILITIES.create_table_entry(publish_and_as_workspace));
          }
          add_files_tabs(widget, cloud_available, settings_panel);
          widget_element.appendChild(settings_panel);                  
      }
    };

}(window.TOONTALK));

window.TOONTALK.DEFAULT_SETTINGS = {
    program_name:               "My first program",
    save_to_google_drive:       true,
    auto_save_to_cloud:         true,
    auto_save_to_local_storage: true
};