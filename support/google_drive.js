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
    "use strict";
    window.TOONTALK.google_drive.handle_client_load();
};

window.TOONTALK.google_drive = 
(function (TT) {
    "use strict";
    var CLIENT_ID = TT.GOOGLE_DRIVE_CLIENT_ID  || '148386604750-704q35l4gcffpj2nn3p4ivcopl81nm27.apps.googleusercontent.com';
    var origin    = TT.ORIGIN_FOR_GOOGLE_DRIVE || "toontalk.github.io";
    // edit origin above if CLIENT_ID changed
    var SCOPES = 'https://www.googleapis.com/auth/drive';
    var toontalk_programs_folder_title = "ToonTalk Programs";
    var toontalk_pages_folder_title    = "ToonTalk Pages";
    var status = "Need to authorize";
    var wrong_origin_message = "Connections to Google Drive are configured for the following domain only: ";
    var programs_folder_id, pages_folder_id;
    return {
        handle_client_load: function (callback_when_authorized) {
            if (window.location.href.indexOf(origin) !== 0) {
                status = wrong_origin_message + origin + ".\nIf you are hosting ToonTalk elsewhere you need to set TOONTALK.GOOGLE_DRIVE_CLIENT_ID and TOONTALK.ORIGIN_FOR_GOOGLE_DRIVE";
                if (callback_when_authorized) {
                    callback_when_authorized(status);
                }
                return;
            }
            setTimeout(function () {
                           TT.google_drive.check_authorization(callback_when_authorized);
                       });
        },

       /**
       * Check if the current user has authorized the application.
       */
      check_authorization: function (callback) {
          status = "Awaiting authorization";
          gapi.auth.authorize({'client_id': CLIENT_ID, 'scope': SCOPES, 'immediate': true},
                              function (authorization_result) {
                                  TT.google_drive.handle_authorization_result(authorization_result, callback);
                              });
      },

      /**
       * Called when authorization server replies.
       *
       * @param {Object} authorization_result Authorization result.
       */
      handle_authorization_result: function (authorization_result, callback) {
        if (authorization_result && !authorization_result.error) {
           // Access token has been successfully retrieved, requests can be sent to the API.
           status = "Authorized but not yet ready";
           gapi.client.load('drive', 'v2', function() {
               TT.google_drive.get_folder_ids(function () {
                   status = "Ready";
               });
           });
           if (callback) {
               callback();
           }
        } else {
           // No access token could be retrieved, show the button to start the authorization flow.
           status = "Need to authorize";
           if (callback) {
               callback(status);
           }
        }
      },

      authorize: function (callback) {
          gapi.auth.authorize({'client_id': CLIENT_ID, 'scope': SCOPES, 'immediate': false},
                              function (authorization_result) {
                                  TT.google_drive.handle_authorization_result(authorization_result, callback);
                              });
      },

      get_folder_ids: function(callback) {
          TT.google_drive.get_folder_id(true, function (id) {
              programs_folder_id = id;
              TT.google_drive.get_folder_id(false, function (id) {
                  pages_folder_id = id;
                  callback();
              });
          });
      },

      get_folder_id: function(program_files, callback) {
          var title = program_files ? toontalk_programs_folder_title : toontalk_pages_folder_title;
          var folder_id_callback = function (response) {              
               var folder_creation_callback = function (response) {
                   if (response && response.id) {
                       callback(response.id);
                   } else {
                       console.error("Failure to create folder '" + title + "'. Response follows.");
                       console.error(response);
                   }
               }
               var folder_id = response && response.items && response.items.length > 0 && response.items[0].id;
               if (folder_id) {
                   callback(folder_id);
               } else {
                   if (program_files) {
                       // create the programs folder
                       TT.google_drive.create_folder(toontalk_programs_folder_title, false, folder_creation_callback);
                   } else {
                       // create public pages folder
                       TT.google_drive.create_folder(toontalk_pages_folder_title,    true,  folder_creation_callback);
                   } 
               }
           }
           if (program_files && programs_folder_id) {
               callback(programs_folder_id);
           } else if (!program_files && pages_folder_id) {
               callback(pages_folder_id);
           } else {
               TT.google_drive.fetch_folder_id(title, folder_id_callback);
           }
      },

      get_status: function () {
          return status;
      },

      connection_to_google_drive_possible: function () {
          // Chrome apps can use Google Drive but via a different API
          return status.indexOf(wrong_origin_message) !== 0 && !TT.CHROME_APP;
      },

      list_files: function (query, callback) {
          var request = gapi.client.request({'path': '/drive/v2/files',
                                             'method': 'GET',
                                             'params': query});
          request.execute(callback);
      },

      fetch_folder_id: function (folder_name, callback) {
          var query = "mimeType = 'application/vnd.google-apps.folder' and title ='" + folder_name + "' and trashed = false";
          TT.google_drive.list_files({q: query}, callback);
      },

      get_toontalk_files: function (title, toontalk_type, callback) {
          // gets all files of toontalk_type if title undefined 
          // used to get all in folder_id but user may get files via sharing or re-organise their files
          var query;
          if (typeof gapi === 'undefined') {
              callback("Google Drive API not available.");
              return;
          }
          query = "properties has {key='ToonTalkType' and value='" + toontalk_type + "' and visibility='PUBLIC'} and trashed = false";
          if (title) {
              query += " and title='" + title + "'";
          }
          TT.google_drive.list_files({q: query}, callback);
      },

      get_toontalk_program_file: function (file_name, callback) {
          var query = "'" + programs_folder_id + "' in parents and trashed = false and title='" + file_name + "'";
          TT.google_drive.list_files({q: query}, function (response) {
              if (response && response.items && response.items.length > 0) {
                  callback(response.items[0]);
              } else {
                  callback(null); // should this be an error object?
              }
          });
      },

      upload_file: function (program_name, extension, contents, callback) {
          var toontalk_type = extension === 'json' ? 'program' : 'page';
          var full_file_name = program_name + "." + extension;
          var insert_or_update = function (response) {
              gapi.client.load('drive', 'v2', function() {
                  var file_id = response && response.items && response.items.length > 0 && response.items[0].id;
                  if (!callback) {
                      callback = function (file) {
                                     if (file.error) {
                                         console.log("Google drive status: " + TT.google_drive.get_status());
                                         if (file.error.message === "Login Required") {
                                            // TODO:
                                         } else {
                                            console.log(file.error.message);
                                         }
                                     }
                                     console.log("File " + file.title + " (" + file.id + ") " + (file_id ? "updated" : "created"));
                      };
                  };
                  if (file_id) { 
                      TT.google_drive.insert_or_update_file(undefined, file_id, toontalk_type, contents, callback);
//                        TT.google_drive.download_file(response.items[0], function (response) {
//                            console.log(response);
//                        });
                  } else {
                      TT.google_drive.insert_or_update_file(full_file_name, undefined, toontalk_type, contents, callback);   
                  }
              });
          };
          TT.google_drive.get_toontalk_files(full_file_name, toontalk_type, insert_or_update);
      },

      full_file_name: function (program_name, toontalk_type) {
          var extension = toontalk_type === 'program' ? 'json' : 'html';
          return program_name + "." + extension;
      },

      insert_or_update_file: function (file_name, file_id, toontalk_type, contents, callback) {
          // if already exists then file_id is defined otherwise file_name
          var boundary = '-------314159265358979323846'; // could declare as const - ECMAScript 6
          var delimiter = "\r\n--" + boundary + "\r\n";
          var close_delim = "\r\n--" + boundary + "--";
          var content_type = 'text/html'; // or should it be application/json?
          var metadata = {'title':    file_name,
                          'mimeType': content_type};
          var full_callback =
              function (file) {
                  if (!file_id) {
                      // is new so add custom property for retrieval 
                      TT.google_drive.insert_property(file.id, 'ToonTalkType', toontalk_type, 'PUBLIC');
                  }
                  if (callback) {
                      callback(file);
                  }
              };
          var folder_id = toontalk_type === 'program' ? programs_folder_id : pages_folder_id;        
          var request_body, path, method, request;
          metadata["parents"] = [{"kind": "drive#fileLink",
                                  "id":   folder_id}];
          request_body =
              delimiter +
              'Content-Type: application/json\r\n\r\n' +
              JSON.stringify(metadata) +
              delimiter +
              'Content-Type: ' + content_type + '\r\n' +
              '\r\n' +
              contents +
              close_delim;
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
          request.execute(full_callback);
      },

      create_folder: function (folder_name, public_access, callback) {
          // based on https://developers.google.com/drive/web/publish-site
          var request_body = {'title':    folder_name,
                              'mimeType': "application/vnd.google-apps.folder"};
//           var request = gapi.client.request({'path':   '/drive/v2/files',
//                                              'method': 'POST',
//                                              'body':   JSON.stringify(request_body)});
          var request = gapi.client.drive.files.insert({'resource': request_body});
          var request_callback;
          if (public_access) {
              request_callback = function (response) {
                  var permission_request = gapi.client.drive.permissions.insert({'fileId':  response.id,
                                                                                 'resource': {'value': '',
                                                                                              'type': 'anyone',
                                                                                              'role': 'reader'}});
//                   var permission_request = gapi.client.request(
//                                             {'path':   '/drive/v2/files/' + response.id + "/permissions",
//                                              'method': 'POST',
//                                              'parameters': {'fileId': response.id},
//                                              'body':   {'value': '',
//                                                         'type': 'anyone',
//                                                         'role': 'reader'}});
//                   https://www.googleapis.com/drive/v2/files/file_id/permissions
                  permission_request.execute(function (permission_response) {
//                       console.log(permission_response);
                      callback(response)
                  });
              };
          } else {
              request_callback = callback;
          }
          request.execute(request_callback);
      },

      download_file: function(file, callback) {
          if (file.downloadUrl) {
              var access_token = gapi.auth.getToken().access_token;
              TT.UTILITIES.download_file(file.downloadUrl, callback, access_token);
          } else {
              callback(null);
          }
       },

       google_drive_url: function (id) {
//            return "https://googledrive.com/host/" + id + "/";
           // Google no longer supports static web pages from Google Drive
           // download it for now since can be displayed locally (but not edited (yet?))
           return "https://drive.google.com/uc?export=download&id=" + id;
       },

       /**
 * Insert a new custom file property.
 *
 * @param {String} file_id ID of the file to insert property for.
 * @param {String} key ID of the property.
 * @param {String} value Property value.
 * @param {String} visibility 'PUBLIC' to make the property visible by all apps,
 *     or 'PRIVATE' to make it only available to the app that created it.
 */
     insert_property: function(file_id, key, value, visibility) {
         var body = {'key': key,
                     'value': value,
                     'visibility': visibility};
         var request = gapi.client.drive.properties.insert({'fileId': file_id,
                                                            'resource': body});
         request.execute(function (response) { 
//              console.log(response);
         });
    }
    
   };

}(window.TOONTALK));
