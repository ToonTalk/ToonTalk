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
function handleClientLoad() {
    setTimeout(window.TOONTALK.GOOGLE_DRIVE.check_authorization, 1);
};

window.TOONTALK.GOOGLE_DRIVE = 
(function (TT) {
    "use strict";
    var CLIENT_ID = '1014278465319-fcagdv7f8232nvqevdkh87r4pmu6mvh8.apps.googleusercontent.com'; // dropbox
//  var CLIENT_ID = '829199594800-54bk3k92fdepke86ik366cds9kmo4u0c.apps.googleusercontent.com'; // github.io
    var SCOPES = 'https://www.googleapis.com/auth/drive';
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
        authorization_button.style.display = 'none';
        save_button.style.display = 'none';
        if (authorization_result && !authorization_result.error) {
          // Access token has been successfully retrieved, requests can be sent to the API.
          save_button.style.display = 'block';
          save_button.onclick = TT.GOOGLE_DRIVE.save_button_click_handler;
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
                TT.GOOGLE_DRIVE.upload_file(JSON.stringify(json));
          });    
      },

      /**
       * Start the file upload.
       *
       * @param {String} contents String contents of the saved file.
       */
      upload_file: function (contents) {
        gapi.client.load('drive', 'v2', function() {
            TT.GOOGLE_DRIVE.insert_file("test.json", contents);
        });
      },

      /**
       * Insert new file.
       *
       * @param {String} file_name String name of the saved file.
       * @param {String} contents String contents of the saved file.
       * @param {Function} callback Function to call when the request is complete.
       */
      insert_file: function (file_name, contents, callback) {
          var boundary = '-------314159265358979323846'; // could declare as const - ECMAScript 6
          var delimiter = "\r\n--" + boundary + "\r\n";
          var close_delim = "\r\n--" + boundary + "--";
          var content_type = 'text/html'; // or should it be application/json?
          var metadata = {
            'title': file_name,
            'mimeType': content_type
          };
          var multipartRequestBody =
              delimiter +
              'Content-Type: application/json\r\n\r\n' +
              JSON.stringify(metadata) +
              delimiter +
              'Content-Type: ' + content_type + '\r\n' +
              '\r\n' +
              contents +
              close_delim;
          var request = gapi.client.request({
              'path': '/upload/drive/v2/files',
              'method': 'POST',
              'params': {'uploadType': 'multipart'},
              'headers': {
                'Content-Type': 'multipart/mixed; boundary="' + boundary + '"'
              },
              'body': multipartRequestBody});
          if (!callback) {
              callback = function(file) {
                  console.log("File save callback:");
                  console.log(file);
              };
          }
          request.execute(callback);
      }
   };

}(window.TOONTALK));
