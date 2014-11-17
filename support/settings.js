 /**
 * Implements ToonTalk's JavaScript functions shared between files
 * Authors: Ken Kahn
 * License: New BSD
 */
 
/*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */

window.TOONTALK.SETTINGS = 
(function (TT) {
    "use strict";
    var add_files_table = function (toontalk_type, parent_element) {
        // TODO: switch between Google Drive, local storage, etc.
        var callback = function (response) {
            var table; 
            if (response.error) {
                console.log(response.error.message);
                console.log("Google drive status: " + TT.google_drive.get_status());
                return;
            }
            table = document.createElement('table');
            $(table).DataTable({
               data: response.items,
               columns: [{data: 'title', 
                          title: "Name",
                          render: function (data, type, full, meta) {
                                        var name = data.substring(0, data.length-5);
                                        return "<a href='javascript:window.alert(name)' title='Click to switch to this program.'>" + name + "</a>";
//                                         var click_handler = function () {
//                                             // TODO:
//                                         };
//                                         var button = TT.UTILITIES.create_button(name, "toontalk-file-load-button", "Click to switch to this program.", click_handler);
//                                         return button.innerHTML;
                          }}, 
                         {data: 'modifiedDate', 
                          title: "Modified",
                          render: function (data, type, full, meta) {
                                      return new Date(data).toUTCString();
                          }},
                         {data: 'createdDate', 
                          title: "Created",
                          render: function (data, type, full, meta) {
                                      return new Date(data).toUTCString();
                          }},
                         {data: 'fileSize', title: "Size"}]});
            parent_element.appendChild(table);
        };
        TT.google_drive.get_toontalk_files(false, toontalk_type, callback);
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
                                                              widget.publish(display_published);
                                                          });
          var display_published = function (google_file) {
              var link_to_publication = document.createElement('span');
              var url = "https://googledrive.com/host/" + google_file.id + "/";
              // note can replace the link with code that calls window.open in order to get a reference to that window for postMessage
              // and can check the current contents using something like $($('.toontalk-edit')[1]).editable('getHTML', false, true) 
              link_to_publication.innerHTML = "Published: <a href='" + url + "' target='_blank'>" + widget.get_setting('program_name') + "</a>";
              $(program_name.container).find("tr").append(TT.UTILITIES.create_table_entry(link_to_publication));
          };
          // create a div whose positioning isn't absolute
          // settings_panel needs to be absolute for at least z-index to work properly
          var contents_div = document.createElement('div');
          var google_status = TT.google_drive ? TT.google_drive.get_status() : "Google Drive code not loaded";
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
                                                    widget.set_setting('auto_save_to_google_drive', google_drive.button.checked);
                                                    if (google_drive.button.checked) {
                                                        $(save_now_google).hide();
                                                    } else {
                                                        $(save_now_google).show();
                                                    }
                                                });
          local_storage.button.addEventListener('click', 
                                                function (event) {
                                                    widget.set_setting('auto_save_to_local_storage', local_storage.button.checked);
                                                    if (local_storage.button.checked) {
                                                        $(save_now_local).hide();
                                                    } else {
                                                        $(save_now_local).show();
                                                    }
                                                });
//           auto_save.button    .addEventListener('click', 
//                                                 function (event) {
//                                                     widget.set_setting('auto_save',         auto_save.button.checked);
//                                                     if (auto_save.button.checked) {
//                                                         $(save_now).hide();
//                                                     } else {
//                                                         $(save_now).show();
//                                                     }
//                                                 });
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
          } else if (google_status !== 'Authorized' && google_status !== 'Ready') {
              // delayed because JQuery otherwise complains that the buttons haven't been initialsed
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
          $(program_name.container).find("tr").append(TT.UTILITIES.create_table_entry(publish));
          add_files_table('program', settings_panel);
          widget_element.appendChild(settings_panel);                  
      }
    };

}(window.TOONTALK));

window.TOONTALK.DEFAULT_SETTINGS = {
    program_name:               "My first program",
    auto_save_to_google_drive:  true,
    auto_save_to_local_storage: true
};