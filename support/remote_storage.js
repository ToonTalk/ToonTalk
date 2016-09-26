 /**
 * Implements ToonTalk's JavaScript functions shared between files
 * Authors: Ken Kahn
 * License: New BSD
 */
 
/*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */

// Uses the NimbusBase library to support multiple cloud services - http://nimbusbase.com

window.TOONTALK.remote_storage = 
(function (TT) {
var sync_object = {
  "GDrive": {
    "key": "148386604750-advtvsmt840u2ulf52g38gja71als4f2.apps.googleusercontent.com", // localhost version
    "app_id": "ToonTalk Programs",
    "scope": "https://www.googleapis.com/auth/drive"
  },
  "app_name": "ToonTalk Reborn",
  "synchronous" : false,
  "Dropbox": {
    "key": "ikwgpe4tcbvaxh4",
    "secret": "k7hbi6czibdxy9i",
    "app_name": "ToonTalk Reborn"
  }
};

Nimbus.Auth.setup(sync_object);

var program_file_model = Nimbus.Model.setup("ToonTalk File", ["name", "contents"]);

return {
    save_program: function () { 
        var save_function = function (json) {
            if (!Nimbus.Auth.authorized()) {
                // offer choice
                Nimbus.Auth.authorize('Dropbox');
            }
            var contents = JSON.stringify(json, TT.UTILITIES.clean_JSON);
            var instance = program_file_model.create({name: program_name,
                                                      contents: contents});
            instance.save();
        };
        var top_level_widget = TT.UTILITIES.widget_side_of_jquery($(".toontalk-backside-of-top-level")).get_widget();
        var program_name = top_level_widget.get_setting('program_name', TT.reset);
        TT.UTILITIES.get_json_top_level(top_level_widget, save_function);
    }
}

// if (!Nimbus.Auth.authorized()) Nimbus.Auth.authorize('Dropbox');

}(window.TOONTALK));