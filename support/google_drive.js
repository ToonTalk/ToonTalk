 /**
 * Implements ToonTalk's JavaScript functions for saving and publishing to Google Drive
 * Authors: Ken Kahn
 * License: New BSD
 */
 
/*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */

// loosely based upon https://developers.google.com/drive/web/quickstart/quickstart-js

    /**
       * Called when the client library is loaded to start the auth flow.
    */
    // perhaps this should be delayed until user requests saving?
    // made a global function so called by Google API 
function handle_client_load() {
    setTimeout(window.TOONTALK.GOOGLE_DRIVE.check_authorization, 1);
};

window.TOONTALK.GOOGLE_DRIVE = 
(function (TT) {
    "use strict";
    var CLIENT_ID = '1014278465319-fcagdv7f8232nvqevdkh87r4pmu6mvh8.apps.googleusercontent.com'; // dropbox
//  var CLIENT_ID = '829199594800-54bk3k92fdepke86ik366cds9kmo4u0c.apps.googleusercontent.com'; // github.io
    var SCOPES = 'https://www.googleapis.com/auth/drive';
    var toontalk_folder_title = "ToonTalk Programs";
    var folder_id;
    return {

       /**
       * Check if the current user has authorized the application.
       */
      check_authorization: function () {
        gapi.auth.authorize(
            {'client_id': CLIENT_ID, 'scope': SCOPES, 'immediate': true},
            TT.GOOGLE_DRIVE.handle_authorization_result);
      },

      /**
       * Called when authorization server replies.
       *
       * @param {Object} authorization_result Authorization result.
       */
      handle_authorization_result: function (authorization_result) {
        var authorization_button = document.getElementById('toontalk-autorization-button');
        var save_button = document.getElementById('toontalk-save-button');
        var display_save_button = function () {
            save_button.style.display = 'block';
            save_button.onclick = TT.GOOGLE_DRIVE.save_button_click_handler;
        };
        authorization_button.style.display = 'none';
        save_button.style.display = 'none';
        if (authorization_result && !authorization_result.error) {
           // Access token has been successfully retrieved, requests can be sent to the API.
           var folder_id_callback = function (response) {
               var folder_creation_callback = function (response) {
                   if (response && response.id) {
                       folder_id = response.id;
                       display_save_button();
                   } else {
                       console.error("Failure to create folder '" + toontalk_folder_title + "'");
                   }
               }
               folder_id = response && response.items && response.items.length > 0 && response.items[0].id;
               if (folder_id) {
                   display_save_button();
               } else {
                   // create the folder
                   gapi.client.load('drive', 'v2', function() {
                       TT.GOOGLE_DRIVE.insert_or_update_file(toontalk_folder_title, undefined, undefined, folder_creation_callback, true);
                   });
               }
           }
           if (folder_id) {
               display_save_button();
           } else {
               TT.GOOGLE_DRIVE.get_toontalk_folder_id(folder_id_callback);
           }
        } else {
          // No access token could be retrieved, show the button to start the authorization flow.
          authorization_button.style.display = 'block';
          authorization_button.onclick = function() {
              gapi.auth.authorize(
                  {'client_id': CLIENT_ID, 'scope': SCOPES, 'immediate': false},
                  TT.GOOGLE_DRIVE.handle_authorization_result);
          };
        }
      },

      save_button_click_handler: function () {
          // TODO: display interface -- get name if save new or publish
          // assume one top-level widget for now
          $(".toontalk-top-level-backside").each(function (index, element) {
                var top_level_widget = TT.UTILITIES.widget_from_jquery($(element));
                var json = TT.UTILITIES.get_json_top_level(top_level_widget);
                TT.GOOGLE_DRIVE.upload_file("test.json", JSON.stringify(json));
          });    
      },

      list_files: function (query, callback) {
          var request = gapi.client.request({'path': '/drive/v2/files',
                                             'method': 'GET',
                                             'params': query});
          request.execute(callback);
      },

      get_toontalk_folder_id: function (callback) {
          var query = "mimeType = 'application/vnd.google-apps.folder' and title ='" + toontalk_folder_title + "' and trashed = false";
          TT.GOOGLE_DRIVE.list_files({q: query}, callback);
      },

      get_toontalk_files: function (title, callback) {
          // gets all in toontalk_folder_title if title undefined
          var query = "'" + folder_id + "' in parents and trashed = false";
          if (title) {
              query += " and title='" + title + "'";
          }
          TT.GOOGLE_DRIVE.list_files({q: query}, callback);
      },

      /**
       * Start the file upload.
       *
       * @param {String} contents String contents of the saved file.
       */
      upload_file: function (file_name, contents) {
           var insert_or_update = function (response) {
               gapi.client.load('drive', 'v2', function() {
                   var file_id = response && response.items && response.items.length > 0 && response.items[0].id;
                   var callback = function (file) {
                                      console.log("File " + file.title + " (" + file.id + ") " + (file_id ? "updated" : "created"));
                   };
                   if (file_id) { 
                       TT.GOOGLE_DRIVE.insert_or_update_file(undefined, file_id,   contents, callback);
                       TT.GOOGLE_DRIVE.download_file(response.items[0], function (response) {
                           console.log(response);
                       });
                   } else {
                       TT.GOOGLE_DRIVE.insert_or_update_file(file_name, undefined, contents, callback);   
                   }
               });
           };
           TT.GOOGLE_DRIVE.get_toontalk_files(file_name, insert_or_update);
      },

      /**
       * Insert new file.
       *
       * @param {String} file_name String name of the saved file.
       * @param {String} contents String contents of the saved file.
       * @param {Function} callback Function to call when the request is complete.
       */
      insert_or_update_file: function (file_name, file_id, contents, callback, create_folder) {
          // if already exists then file_id is defined otherwise file_name
          var boundary = '-------314159265358979323846'; // could declare as const - ECMAScript 6
          var delimiter = "\r\n--" + boundary + "\r\n";
          var close_delim = "\r\n--" + boundary + "--";
          var content_type = 'text/html'; // or should it be application/json?
          var metadata = {
            'title': file_name,
            'mimeType': create_folder ? 'application/vnd.google-apps.folder' : content_type
          };
          var request_body, path, method;
          if (create_folder) {
              request_body = JSON.stringify(metadata);
          } else {
              metadata["parents"] = [{"kind": "drive#fileLink",
                                      "id": folder_id}];
              request_body =
                  delimiter +
                  'Content-Type: application/json\r\n\r\n' +
                  JSON.stringify(metadata) +
                  delimiter +
                  'Content-Type: ' + content_type + '\r\n' +
                  '\r\n' +
                  contents +
                  close_delim;
          }
          var request;
          if (create_folder) {
              request = gapi.client.request({
                  'path': '/drive/v2/files',
                  'method': 'POST',
                  'body': request_body});
          } else {
              if (file_name) {
                  path = '/upload/drive/v2/files';
                  method = 'POST';
              } else {
                  path = '/upload/drive/v2/files/' + file_id;
                  method = 'PUT';
              }
              request = gapi.client.request({
                  'path': path,
                  'method': method,
                  'params': {'uploadType': 'multipart'},
                  'headers': {
                    'Content-Type': 'multipart/mixed; boundary="' + boundary + '"'
                  },
                  'body': request_body});
          }
          if (!callback) {
              callback = function () {
                  // ignore
              }
          }
          request.execute(callback);
      },

      download_file: function(file, callback) {
          if (file.downloadUrl) {
            var access_token = gapi.auth.getToken().access_token;
            var xhr = new XMLHttpRequest();
            xhr.open('GET', file.downloadUrl);
            xhr.setRequestHeader('Authorization', 'Bearer ' + access_token);
            xhr.onload = function() {
              callback(xhr.responseText);
            };
            xhr.onerror = function() {
              callback(null);
            };
            xhr.send();
          } else {
            callback(null);
          }
       }
   };

}(window.TOONTALK));
