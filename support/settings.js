 /**
 * Implements ToonTalk's JavaScript functions shared between files
 * Authors: Ken Kahn
 * License: New BSD
 */
 
/*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */

window.TOONTALK.SETTINGS = 
(function (TT) {
    "use strict";
    return {
      open: function (widget) {
          var settings_panel = document.createElement('div');
          var widget_element = widget.get_backside_element();
          var program_name = TT.UTILITIES.create_text_input(widget.get_setting('program_name'), 
                                                            "toontalk-program-name-input", 
                                                            "Current program name:", 
                                                            "Edit this to change the name of your program", 
                                                            "docs/manual/settings.html");
          var close_button  = TT.UTILITIES.create_close_button(close_handler, "Click to close the settings panel.");
          var heading       = TT.UTILITIES.create_text_element("Change how your programs are saved:");
          var google_drive  = TT.UTILITIES.create_check_box(widget.get_setting('use_google_drive'), 
                                                            "toontalk-save-setting",
                                                            "Save to my Google Drive",
                                                            "Check this if you want your programs saved to a 'ToonTalk Programs' folder in your Google Drive.");
          var local_storage = TT.UTILITIES.create_check_box(widget.get_setting('use_local_storage'), 
                                                            "toontalk-save-setting",
                                                            "Save to this browser's local storage",
                                                            "Check this if you want your programs saved in this browser's local storage.");
          var auto_save     = TT.UTILITIES.create_check_box(widget.get_setting('auto_save'), 
                                                            "toontalk-save-setting",
                                                            "Save automatically",
                                                            "Check this if you want your programs saved whenever you make changes to your program.");
          // create a div whose positioning isn't absolute
          // settings_panel needs to be absolute for at least z-index to work properly
          var contents_div = document.createElement('div');
          var close_handler = function () {
              $(settings_panel).remove();
          };
          $(settings_panel).addClass("toontalk-settings-panel")
                           .css({width:  $(widget_element).width() +29,
                                 height: $(widget_element).height()+50,
                                 left:  -2,
                                 top:  -25,
                                "z-index": TT.UTILITIES.next_z_index()});
          settings_panel.appendChild(close_button);
          program_name.button .addEventListener('change', 
                                                function () {
                                                     settings.program_name = program_name.button.value.trim();
                                                });
          google_drive.button .addEventListener('click', 
                                                function (event) {
                                                    widget.set_setting('use_google_drive',   google_drive.button.checked);
                                                });
          local_storage.button.addEventListener('click', 
                                                function (event) {
                                                    widget.set_setting('use_local_storage', local_storage.button.checked);
                                                });
          auto_save.button    .addEventListener('click', 
                                                function (event) {
                                                    widget.set_setting('auto_save',         auto_save.button.checked);
                                                });
          settings_panel.appendChild(contents_div);
          $(heading).css({"font-weight": 'bold',
                          "font-size": 24,
                          "color": "navy"});
          contents_div.appendChild(heading);
          contents_div.appendChild(program_name.container);
          contents_div.appendChild(google_drive.container);
          contents_div.appendChild(local_storage.container);
          contents_div.appendChild(auto_save.container);
          widget_element.appendChild(settings_panel);                  
      }  
    };

}(window.TOONTALK));

window.TOONTALK.DEFAULT_SETTINGS = {
    program_name:      "My first program",
    use_google_drive:  true,
    use_local_storage: true,
    auto_save:         true
};