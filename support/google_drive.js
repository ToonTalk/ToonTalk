 /**
 * Implements ToonTalk's JavaScript functions for saving and publishing to Google Drive
 * Authors: Ken Kahn
 * License: New BSD
 */
 
/*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */

// loosely based upon https://developers.google.com/drive/web/quickstart/quickstart-js

    // Called when the client library is loaded to start the authorization flow.
    // Is a global function since called by Google API 
function handle_client_load() {
    var origin = "https://dl.dropboxusercontent.com";
    if (window.location.href.indexOf(origin) !== 0) {
        status = "Only able to connect to " + origin;
        return;
    }
    setTimeout(window.TOONTALK.google_drive.check_authorization, 1);
};

window.TOONTALK.google_drive = 
(function (TT) {
    "use strict";
    var CLIENT_ID = TT.GOOGLE_DRIVE_CLIENT_ID || '1014278465319-fcagdv7f8232nvqevdkh87r4pmu6mvh8.apps.googleusercontent.com'; // dropbox
    // edit origin above if CLIENT_ID changed
//  var CLIENT_ID = '829199594800-54bk3k92fdepke86ik366cds9kmo4u0c.apps.googleusercontent.com'; // github.io
    var SCOPES = 'https://www.googleapis.com/auth/drive';
    var toontalk_folder_title = "ToonTalk Programs";
    var status = "Need to authorize";
    var folder_id;
    return {

       /**
       * Check if the current user has authorized the application.
       */
      check_authorization: function () {
          status = "Awaiting authorization";
          gapi.auth.authorize({'client_id': CLIENT_ID, 'scope': SCOPES, 'immediate': true},
                              TT.google_drive.handle_authorization_result);
      },

      /**
       * Called when authorization server replies.
       *
       * @param {Object} authorization_result Authorization result.
       */
      handle_authorization_result: function (authorization_result, callback) {
        if (authorization_result && !authorization_result.error) {
           // Access token has been successfully retrieved, requests can be sent to the API.
           status = "Authorized";
           if (callback) {
               callback();
           }
           var folder_id_callback = function (response) {
               var folder_creation_callback = function (response) {
                   if (response && response.id) {
                       folder_id = response.id;
                       status = "Ready";
                   } else {
                       console.error("Failure to create folder '" + toontalk_folder_title + "'");
                   }
               }
               folder_id = response && response.items && response.items.length > 0 && response.items[0].id;
               if (folder_id) {
                   status = "Ready";
               } else {
                   // create the folder
                   gapi.client.load('drive', 'v2', function() {
                       TT.google_drive.insert_or_update_file(toontalk_folder_title, undefined, undefined, folder_creation_callback, true);
                   });
               }
           }
           if (folder_id) {
               status = "Ready";
           } else {
               TT.google_drive.get_toontalk_folder_id(folder_id_callback);
           }
        } else {
           // No access token could be retrieved, show the button to start the authorization flow.
           status = "Need to authorize";
        }
      },

      authorize: function (callback) {
          gapi.auth.authorize({'client_id': CLIENT_ID, 'scope': SCOPES, 'immediate': false},
                              function (authorization_result) {
                                  TT.google_drive.handle_authorization_result(authorization_result, callback);
                              });
      },

      get_status: function () {
          return status;
      },

      list_files: function (query, callback) {
          var request = gapi.client.request({'path': '/drive/v2/files',
                                             'method': 'GET',
                                             'params': query});
          request.execute(callback);
      },

      get_toontalk_folder_id: function (callback) {
          var query = "mimeType = 'application/vnd.google-apps.folder' and title ='" + toontalk_folder_title + "' and trashed = false";
          TT.google_drive.list_files({q: query}, callback);
      },

      get_toontalk_files: function (title, callback) {
          // gets all in toontalk_folder_title if title undefined
          var query = "'" + folder_id + "' in parents and trashed = false";
          if (title) {
              query += " and title='" + title + "'";
          }
          TT.google_drive.list_files({q: query}, callback);
      },

      /**
       * Start the file upload.
       *
       * @param {String} contents String contents of the saved file.
       */
      upload_file: function (file_name, contents, callback) {
           var insert_or_update = function (response) {
               gapi.client.load('drive', 'v2', function() {
                   var file_id = response && response.items && response.items.length > 0 && response.items[0].id;
                   if (!callback) {
                       callback = function (file) {
                                      console.log("File " + file.title + " (" + file.id + ") " + (file_id ? "updated" : "created"));
                       };
                   };
                   if (file_id) { 
                       TT.google_drive.insert_or_update_file(undefined, file_id,   contents, callback);
                       TT.google_drive.download_file(response.items[0], function (response) {
                           console.log(response);
                       });
                   } else {
                       TT.google_drive.insert_or_update_file(file_name, undefined, contents, callback);   
                   }
               });
           };
           TT.google_drive.get_toontalk_files(file_name, insert_or_update);
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
