 /**
 * Implements JavaScript functions that extend Snap! to access AI cloud services
 * Authors: Ken Kahn
 * License: New BSD
 */

 "use strict";
window.ecraft2learn =
  (function () {
      var this_url = document.querySelector('script[src*="ecraft2learn.js"]').src; // the URL where this library lives
      var load_script = function (url, when_loaded) {
          var script = document.createElement("script");
          script.type = "text/javascript";
          if (url.indexOf("//") < 0) {
              // is relative to this_url
              var last_slash_index = this_url.lastIndexOf('/');
              url = this_url.substring(0, last_slash_index+1) + url;
          }
          script.src = url;
          if (when_loaded) {
              script.addEventListener('load', when_loaded);
          }
          document.head.appendChild(script);
      };
      var get_key = function (key_name) {
          // API keys are provided by Snap! reporters
          var key = run_snap_block(key_name);
          var get_hash_parameter = function (name, parameters, default_value) {
              var parts = decodeURI(parameters).split('&');
              var value = default_value;
              parts.some(function (part) {
                             var name_and_value = part.split('=');
                             if (name_and_value[0] === name) {
                                 value = name_and_value[1];
                                 return true;
                             }
              });
              return value;
          };
          if (key && key !== "Enter your key here") {
              return key;
          }
          try {
              if (top.window.location.hash) {
                  // top.window in case this is running in an iframe
                  key = get_hash_parameter(key_name, top.window.location.hash.substring(1));
                  if (key) {
                      return key;
                  }
              }
              var element = top.document.getElementById(key_name);
              if (element) {
                  return element.value;
              }
          } catch (ignore) {
              // top.window may signal an error if iframe and container are different domains
          }
          // key missing to explain how to obtain keys
          inform("Missing API key",
                 "No value reported by the '" + key_name +
                 "' reporter. After obtaining the key edit the reporter in the 'Variables' area.\n" +
                 "Do you want to visit https://github.com/ecraft2learn/ai/wiki to learn how to get a key?",
                 function () {
                       window.onbeforeunload = null; // don't warn about reload
                       document.location.assign("https://github.com/ecraft2learn/ai/wiki");                                 
                 });
      };
      var run_snap_block = function (labelSpec) { // add parameters later
          // runs a Snap! block that matches labelSpec
          // labelSpec if it takes areguments will look something like 'label %txt of size %n'
          var ide = get_snap_ide(ecraft2learn.snap_context);
          // based upon https://github.com/jmoenig/Snap--Build-Your-Own-Blocks/issues/1791#issuecomment-313529328
          var allBlocks = ide.sprites.asArray().concat([ide.stage])
                         .map(function (item) {return item.customBlocks})
                         .reduce(function (a, b) {return a.concat(b)})
                         .concat(ide.stage.globalBlocks);
          var blockSpecs = allBlocks.map(function (block) {return block.blockSpec()});
          var index = blockSpecs.indexOf(labelSpec);
          if (index < 0) {
              return;
          }
          var blockTemplate = allBlocks[index].templateInstance();
          return invoke_block_morph(blockTemplate);
      };
      var get_snap_ide = function (start) {
          // finds the Snap! IDE_Morph that is the element 'start' or one of its ancestors
          var ide = start;
          while (ide && !(ide instanceof IDE_Morph)) {
              ide = ide.parent;
          }
          if (!ide) {
              // not as general but works well (for now)
              return world.children[0];
          }
          return ide;
      };
      var get_global_variable_value = function (name, default_value) {
          // returns the value of the Snap! global variable named 'name'
          // if none exists returns default_value
          var ide = get_snap_ide(ecraft2learn.snap_context);
          var value;
          try {
              value = ide.globalVariables.getVar(name);
          } catch (e) {
              return default_value;
          }
          if (value === undefined) {
              return default_value;
          }
          if (typeof value ===  'string') {
              return value;
          }
          return value.contents;
    };
    var invoke_callback = function (callback) { // any number of additional arguments
        // callback could either be a Snap! object or a JavaScript function
        if (ecraft2learn.inside_snap() && callback instanceof Context) { // assume Snap! callback
            // invoke the callback with the argments (other than the callback itself)
            // if BlockMorph then needs a receiver -- apparently callback is good enough
//             return invoke(callback, new List(Array.prototype.slice.call(arguments, 1)), (callback instanceof BlockMorph && callback)); 
            var stage = world.children[0].stage; // this.parentThatIsA(StageMorph);
//             var process = stage.threads.startProcess(callback.expression,
//                                                      callback.receiver,
//                                                      stage.isThreadSafe,
//                                                      true,
//                                                      function (result) {
//                                                        console.log(result);
//                                                      },
//                                                      false,
//                                                      false);
            var process = new Process(null, callback.receiver, null, true);
            process.initializeFor(callback, new List(Array.prototype.slice.call(arguments, 1)));
            stage.threads.processes.push(process);
        } else if (typeof callback === 'function') { // assume JavaScript callback
            callback.apply(this, Array.prototype.slice.call(arguments, 1));
        }
        // otherwise no callback provided so ignore it
    };
    var invoke_block_morph = function (block_morph) {
        if (!(block_morph instanceof BlockMorph)) {
            console.error("Invoke_block_morph called on non-BlockMorph");
            return;
        }
        return invoke(block_morph, new List(Array.prototype.slice.call(arguments, 1)), block_morph);
    };
    var is_callback = function (x) {
        return (ecraft2learn.inside_snap() && x instanceof Context) || typeof x === 'function';
    };
    var javascript_to_snap = function (x) {
        if (!ecraft2learn.inside_snap()) {
            return x;
        }
        if (Array.isArray(x)) {
            return new List(x.map(javascript_to_snap));
        }
        if (typeof x === 'object') {
            if (x instanceof List) {
                return x;
            }
            return new List(Object.keys(x).map(function (key) {
                                                   return new List([key, javascript_to_snap(x[key])]);
                                               }));
        }
        return x;
    };
    var add_photo_to_canvas = function (canvas, video, width, height) {
        // Capture a photo by fetching the current contents of the video
        // and drawing it into a canvas, then converting that to a PNG
        // format data URL. By drawing it on an offscreen canvas and then
        // drawing that to the screen, we can change its size and/or apply
        // other changes before drawing it.
        canvas.setAttribute('width', width);
        canvas.setAttribute('height', height);
        var context = canvas.getContext('2d');
        context.drawImage(video, 0, 0, width, height);
    };
    var get_mary_tts_voice = function (voice_number) { // offical name
        return get_voice_from(voice_number, mary_tts_voices.map(function (voice) { return voice[0]; }));
    };
    var get_voice = function (voice_number) {
        return get_voice_from(voice_number, window.speechSynthesis.getVoices());
    };
    var get_voice_from = function (voice_number, voices) {
        if (voices.length === 0) {
            inform("No voices",
                   "This browser has no voices available.\n" + 
                   "Either try a different browser or try using the MARY TTS instead.");
            return;
        }
        voice_number = +voice_number; // convert to nunber if is a string
        if (typeof voice_number === 'number' && !isNaN(voice_number)) {
            voice_number--; // Snap (and Scratch) use 1-indexing so convert here
            if (voice_number === -1) {
                voice_number = 0;
                if (ecraft2learn.default_language) {
                    mary_tts_voices.some(function (voice, index) {
                        if (voice[2].indexOf("-") >= 0) {
                            // language and dialect specified
                            if (voice[2] === ecraft2learn.default_language) {
                                voice_number = index;
                                return true;
                            }
                        } else {
                            if (voice[2] === ecraft2learn.default_language.substring(0, 2)) {
                                voice_number = index;
                                return true;
                            }
                        }
                    });
                }
            }
            if (voice_number >= 0 && voice_number < voices.length) {
                return voices[Math.floor(voice_number)];
            } else {
                inform("No such voice",
                       "Only voice numbers between 1 and " + voices.length + " are available.\n" + 
                       "There is no voice number " + (voice_number+1) + ".");
            }
        }
    };
    var check_for_voices = function (no_voices_callback, voices_callback) {
        if (window.speechSynthesis.getVoices().length === 0) {
            // either there are no voices or they haven't loaded yet
            if (ecraft2learn.waited_for_voices) {
                no_voices_callback();
            } else {
                // voices not loaded so wait for them and try again
                var onvoiceschanged_ran = false; // so both onvoiceschanged_ran and timeout don't both run
                window.speechSynthesis.onvoiceschanged = function () {
                    onvoiceschanged_ran = true;
                    ecraft2learn.waited_for_voices = true;
                    check_for_voices(no_voices_callback, voices_callback);
                    window.speechSynthesis.onvoiceschanged = undefined;
                };
                // but don't wait forever because there might not be any
                setTimeout(function () {
                               if (!onvoiceschanged_ran) {
                                   // only if onvoiceschanged didn't run
                                   ecraft2learn.waited_for_voices = true;
                                   no_voices_callback();
                                   window.speechSynthesis.onvoiceschanged = undefined;
                               }
                           },
                           10000);
                return;         
            }
        } else {
            voices_callback();
        }
    };
    var get_matching_voice = function (builtin_voices, name_parts) { 
      var voices = builtin_voices ? 
                   window.speechSynthesis.getVoices().map(function (voice) { return voice.name.toLowerCase(); }) :
                   mary_tts_voices.map(function (voice) { return voice[1].toLowerCase(); });
      var voice_number;
      if (!Array.isArray(name_parts) && typeof name_parts !== 'string') {
          // convert from a Snap list to a JavaScript array
          name_parts = name_parts.contents;
      }
      name_parts = name_parts.map(function (part) {
                                      return part.toLowerCase();
                                  });
      var name_parts_double_white_space = name_parts.map(function (part) {
                                                            return " " + part + " ";
      });
      var name_parts_left_white_space   = name_parts.map(function (part) {
                                                            return " " + part;
      });
      var name_parts_right_white_space  = name_parts.map(function (part) {
                                                            return part + " ";
      });
      var name_matches = function (name, parts) {
          return parts.every(function (part) {
                                      return name.indexOf(part) >= 0;
                                  });
      };
      [name_parts_double_white_space, name_parts_left_white_space, name_parts_right_white_space, name_parts].some(
           // prefer matches with white space
           // so that "male" doesn't match "female" unless no other choice
            function (parts) {
                  voices.some(function (voice_name, index) {
                                  if (name_matches(voice_name, parts)) {
                                      voice_number = index+1; // using 1-indexing
                                      return true;
                                  }
                              });
                  return voice_number > 0;               
            });
       if (voice_number >= 0) {
           return voice_number;
       }
       // no match so try using just the first argument to find a matching language entry
       var matching_language_entry = language_entry(name_parts[0]);
       if (matching_language_entry) {
           voice_number = voice_number_of_language_code(matching_language_entry[1], builtin_voices);
       }
       if (voice_number >= 0) {
           return voice_number;
       }
       inform("Unable to find a matching voice",
              "This browser does not have a voice that matches " + name_parts.join("-"));
    };
    var voice_number_of_language_code = function (code, builtin_voices) {
        if (builtin_voices) {
            return builtin_voice_number_with_language_code(code);
        }
        return mary_tts_voice_number_with_language_code(code);
    };
    var speak = function (message, pitch, rate, voice_number, volume, language, finished_callback) {
        // speaks 'message' optionally with the specified pitch, rate, voice, volume, and language
        // finished_callback is called with the spoken text
        // see https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisUtterance
        var maximum_length = 200; // not sure what a good value is but long text isn't spoken in some browsers
        var break_into_short_segments = function (text) {
            var segments = [];
            var break_text = function (text) {
                var segment, index;
                if (text.length < maximum_length) {
                    return text.length+1;
                }
                segment = text.substring(0, maximum_length);
                index = segment.lastIndexOf(". ") || segment.lastIndexOf(".\n");
                if (index > 0) {
                    return index+2;
                }
                index = segment.lastIndexOf(".");
                if (index === segment.length-1) {
                    // final period need not have space after it
                    return index+1;
                }
                index = segment.lastIndexOf(", ");
                if (index > 0) {
                    return index+2;
                }
                index = segment.lastIndexOf(" ");
                if (index > 0) {
                    return index+1;
                }
                // give up - no periods, commas, or spaces
                return Math.min(text.length+1, maximum_length);
            };
            var best_break;
            while (text.length > 0) {
                best_break = break_text(text);
                if (best_break > 1) {
                    segments.push(text.substring(0, best_break-1));
                }
                text = text.substring(best_break);
            }
            return segments;
        };
        var segments, speech_utterance_index;
        if (message.length > maximum_length) {
            segments = break_into_short_segments(message);
            segments.forEach(function (segment, index) {
                // finished_callback is only for the last segment
                var callback = index === segments.length-1 && 
                               finished_callback &&
                               function () {
                                   invoke_callback(finished_callback, message); // entire message not just the segments
                               };
                ecraft2learn.speak(segment, pitch, rate, voice_number, volume, language, callback)
            });
            return;
        }
        // else is less than the maximum_length
        var utterance = new SpeechSynthesisUtterance(message);
        ecraft2learn.utterance = utterance; // without this utterance may be garbage collected before onend can run
        if (typeof language === 'string') {
            utterance.lang = language;
            if (voice_number === 0) {
                voice_number = get_matching_voice(true, [language]);
                if (voice_number === undefined) {
                    voice_number = 0;
                }
            }
        } else if (ecraft2learn.default_language) {
            utterance.lang = ecraft2learn.default_language;
        }
        pitch = +pitch; // if string try convering to a number
        if (typeof pitch === 'number' && pitch > 0) {
            utterance.pitch = pitch;
        }
        rate = +rate;
        if (typeof rate === 'number' && rate > 0) {
            if (rate < .1) {
               // A very slow rate breaks Chrome's speech synthesiser
               rate = .1;
            }
            if (rate > 2) {
               rate = 2; // high rate also breaks Chrome's speech synthesis
            }
            utterance.rate = rate;
        }
        if (voice_number === 0 && ecraft2learn.default_language) {
            var voices = window.speechSynthesis.getVoices();
            voices.some(function (voice, index) {
                if (voice.lang === ecraft2learn.default_language) {
                    voice_number = index+1; // 1-indexing
                    return true;
                }
            });
        }
        utterance.voice = get_voice(voice_number);
        volume = +volume;
        if (typeof volume && volume > 0) {
            utterance.volume = volume;
        }
        utterance.onend = function (event) {
            ecraft2learn.speaking_ongoing = false;
            invoke_callback(finished_callback, message);
        };
        ecraft2learn.speaking_ongoing = true;
        window.speechSynthesis.speak(utterance);
    };
    var no_voices_alert = function () {
        if (!ecraft2learn.no_voices_alert_given) {
            ecraft2learn.no_voices_alert_given = true;
            inform("No voices available",
                   "This browser has no voices available.\n" + 
                   "Either try a different browser or try using the MARY TTS instead.");
        }
    };
    var create_costume = function (canvas, name) {
        if (!name) {
            name =  "photo " + Date.now(); // needs to be unique
        }
        return new Costume(canvas, name);
    }
    var add_costume = function (costume, sprite) {
        var ide = get_snap_ide();
        if (!sprite) {
            sprite = ide.stage;
        }
        sprite.addCostume(costume);
        sprite.wearCostume(costume);
        ide.hasChangedMedia = true;
    };
    var train = function (source, buckets_as_snap_list, add_to_previous_training, page_introduction, callback) {
      // source can be 'camera' or 'microphone'
      var buckets = buckets_as_snap_list.contents;
      var buckets_equal = function (buckets1, buckets2) {
          if (!buckets1 || !buckets2) {
              return false;
          }
          return buckets1 === buckets2 ||
                 (buckets1.length === buckets2.length &&
                  buckets1.every(function (bucket_name, index) {
                      return bucket_name === buckets2[index];
                  }));
      };
      var open_machine_learning_window = function () {
          var URL, training_window;
          if (source === 'camera') {
              if (window.navigator.userAgent.indexOf("Chrome") < 0) {
                  inform("Possible browser compatibility problem",
                         "Machine learning has been tested in Chrome. If you encounter problems switch to Chrome.");
              } else if (window.navigator.userAgent.indexOf("arm") >= 0 && 
                         window.navigator.userAgent.indexOf("X11") >= 0) {
                  inform("Possible Raspberry Pi problem",
                         "You may find that the Raspberry Pi is too slow for machine learning to work well.");
              }
              URL = window.location.href.indexOf("localhost") >= 0 ? 
                    "/ai/camera-train/index-dev.html?translate=1" :
                    "https://ecraft2learn.github.io/ai/camera-train/index.html?translate=1";
              training_window = window.open(URL, "Training " + buckets);
              window.addEventListener('unload',
                                      function () {
                                          training_window.close();
                                      });
          } else {
              URL = "https://ecraft2learn.github.io/ai/microphone-train/index.html?translate=1";
              let iframe = document.createElement('iframe');
              document.body.appendChild(iframe);
              iframe.src = URL;
              iframe.style.width  = '100%';
              iframe.style.height = '100%';
              iframe.style.border = 0;
              iframe.style.position = 'absolute';
              iframe.style.backgroundColor = 'white';
              iframe.allow = "microphone"; // Chrome 65 requires it
              training_window = iframe.contentWindow;
              ecraft2learn.audio_training_iframe = iframe;
          }
          return training_window;
      };
      if (!ecraft2learn.machine_learning_window || ecraft2learn.machine_learning_window.closed) {
          ecraft2learn.learning_buckets = buckets;
          var machine_learning_window = open_machine_learning_window();
          ecraft2learn.machine_learning_window = machine_learning_window;
          var receive_messages_from_iframe = 
              function (event) {
                  if (event.data === "Loaded") {
                      machine_learning_window.postMessage({training_class_names: buckets}, "*");
                  } else if (event.data === "Ready") {
                      ecraft2learn.machine_learning_window_ready = true;
                      if (page_introduction) {
                          machine_learning_window.postMessage({new_introduction: page_introduction}, "*");
                      }
                      invoke_callback(callback, "Ready");
                  } else if (event.data === 'Hide audio training iframe') {
                      ecraft2learn.audio_training_iframe.style.width  = "1px";
                      ecraft2learn.audio_training_iframe.style.height = "1px";
                  }
          };
          window.addEventListener("message", receive_messages_from_iframe, false);               
          return;
      }     
      if (add_to_previous_training && buckets_equal(buckets, ecraft2learn.learning_buckets)) {
          if (ecraft2learn.audio_training_iframe) {
              ecraft2learn.audio_training_iframe.style.width  = "100%";
              ecraft2learn.audio_training_iframe.style.height = "100%";
          } else {
              // would like to go to that window:  ecraft2learn.machine_learning_window.focus();
              // but browsers don't allow it unless clear the user initiated it
              inform("Training tab ready",
                     "Go to the training window whenever you want to add to the training.");           
          }
          invoke_callback(callback, "Ready");
      } else {
          ecraft2learn.machine_learning_window.close();
          // start over
          train(source, buckets_as_snap_list, add_to_previous_training, page_introduction, callback);
      }
  };
  var training_window_request = function (alert_message, message_maker, response_listener, image) {
        var training_image_width  = 227;
        var training_image_height = 227;
        if (!ecraft2learn.machine_learning_window) {
            inform("Training request warning", alert_message);
            return;
        }
        var post_image = function (canvas, video) {
            ecraft2learn.canvas = canvas;
            ecraft2learn.video  = video;
            add_photo_to_canvas(canvas, image || video, training_image_width, training_image_height);
            var image_URL = canvas.toDataURL('image/png');
            ecraft2learn.machine_learning_window.postMessage(message_maker(image_URL), "*");
            window.addEventListener("message", response_listener);
        }
        if (ecraft2learn.canvas) {
            post_image(ecraft2learn.canvas, ecraft2learn.video);
        } else {
            // better to use 640x480 and then scale it down before sending it off to the training tab
            ecraft2learn.canvas = ecraft2learn.setup_camera(640, 480, undefined, post_image);
        }
    };
    var get_costumes = function (sprite) {
        if (!sprite) {
            alsert("get_costumes called without specifying which sprite");
            return;
        }
        return sprite.costumes.contents;  
    };
    var costume_of_sprite = function (costume_number, sprite) {
        var costumes = get_costumes(sprite);
        if (costume_number < 0 || costume_number > costumes.length) {
            inform("Invalid costume number",
                   "Cannot add costume number " + costume_number +
                   " to " + label + " training bucket.\n" + 
                   "Only numbers between 1 and " + 
                   costumes.length + " are permitted.");
            return;
        }
        return costumes[costume_number-1]; // 1-indexing to zero-indexing
    };
    var image_url_of_costume = function (costume) {
        var canvas = costume.contents;
        return canvas.toDataURL('image/png');        
    };
    var costume_to_image = function (costume, when_loaded) {
        var image_url = image_url_of_costume(costume);
        var image = document.createElement('img');
        image.src = image_url;
        image.onload = function () {
                           when_loaded(image);
                       };
    };
    var language_entry = function (language) {
        var matching_language_entry;
        if (language === "") {
            // use the browser's default language
            return language_entry(window.navigator.language);
        }
        language = language.toLowerCase(); // ignore case in matching 
        ecraft2learn.chrome_languages.some(function (language_entry) {
            // language_entry is [Language name, Language code, English language name, right-to-left]
            if (language === language_entry[1].toLowerCase()) {
                // code matches
                matching_language_entry = language_entry;
                return true;
            }
        });
        if (matching_language_entry) {
            return matching_language_entry;
        }
        ecraft2learn.chrome_languages.some(function (language_entry) {
            if (language === language_entry[0].toLowerCase() ||
                language === language_entry[2].toLowerCase()) {
                // language name (in itself or English) matches
                matching_language_entry = language_entry;
                return true;
            }
        });
        if (matching_language_entry) {
            return matching_language_entry;
        }
        if (ecraft2learn.language_defaults[language]) {
            // try again if just language name is given and it is ambiguous
            return language_entry(ecraft2learn.language_defaults[language]);
        }
        if (language.length === 2) {
           // code is is just 2 letters so try repeating it (e.g. id-ID)
           return language_entry(language + "-" + language);
        }
        ecraft2learn.chrome_languages.some(function (language_entry) {
            if (language_entry[0].toLowerCase().indexOf(language) >= 0 ||
                language_entry[2].toLowerCase().indexOf(language) >= 0) {
                // language (in itself or in English) is a substring of a language name
                matching_language_entry = language_entry;
                return true;
            }
        });
        return matching_language_entry; // could be undefined
    };
    var builtin_voice_number_with_language_code = function (language_code) {
        var voices = window.speechSynthesis.getVoices();
        var builtin_voice_number;
        voices.some(function (voice, index) {
            if (voice.lang.toLowerCase() === language_code.toLowerCase()) {
                builtin_voice_number = index;
                return true;
            }
        });
        return builtin_voice_number;
    };
    var mary_tts_voice_number_with_language_code = function (language_code) {
        var mary_tts_voice_number;
        mary_tts_voices.some(function (voice, index) {
            if (voice[2].indexOf("-") >= 0) {
                // language and dialect specified
                if (voice[2].toLowerCase() === language_code.toLowerCase()) {
                    mary_tts_voice_number = index+1; // 1-indexing
                    return true;
                }
            } else {
                if (voice[2].toLowerCase() === language_code.substring(0, 2).toLowerCase()) {
                    mary_tts_voice_number = index+1;
                    return true;
                }
            }
        });
        return mary_tts_voice_number;
    };
    var inform = function(title, message, callback) {
        // based upon Snap4Arduino index file  
        if (!ecraft2learn.inside_snap()) { // not inside of snap
            if (callback) {
                if (window.confirm(message)) {
                    callback();
                }
            } else {
                window.alert(message);
            }
            return;
        }
        var ide = get_snap_ide(ecraft2learn.snap_context);
        if (!ide.informing) {
            var box = new DialogBoxMorph();
            ide.informing = true;
            box.ok = function() { 
                ide.informing = false;
                if (callback) { 
                    invoke_callback(callback);
                }
                this.accept();
            };
            if (callback) {
                box.cancel = function () {
                   ide.informing = false;
                   this.accept();
                }
                box.askYesNo(title, message, world);
            } else {
                box.inform(title, message, world);
                if (window.frameElement && window.frameElement.className.indexOf("iframe-clipped") >= 0) {
                    // move it from center of Snap! window to iframe window
                    box.setPosition(new Point(230, 110));
                }
            }   
        }
    };
    // see http://mary.dfki.de:59125/documentation.html for documentation of Mary TTS
    var mary_tts_voices =
    [ // name, human readable name, and locale
["dfki-spike-hsmm", "Spike British English male", "en-GB"],
["dfki-prudence", "Prudence British English female", "en-GB"],
["dfki-poppy", "Poppy British English female", "en-GB"],
["dfki-obadiah-hsmm", "Obadiah British English male", "en-GB"],
["cmu-slt-hsmm", "SLT US English female", "en-US"],
["cmu-rms-hsmm", "RMS US English male", "en-US"],
["cmu-bdl-hsmm", "BDL US English male", "en-US"],
["upmc-pierre-hsmm", "Pierre French male", "fr"],
["upmc-jessica-hsmm", "Jessica Fremch female", "fr"],
["enst-dennys-hsmm", "Dennys French male", "fr"],
["enst-camille-hsmm", "Camille French female", "fr"],
["dfki-pavoque-styles", "Pavoque German male", "de"],
["bits4", "BITS4 German female", "de"],
["bits3-hsmm", "BITS3 German male", "de"],
["bits2", "BITS2 German male", "de"],
["bits1-hsmm", "BITS1 German demale", "de"],
["dfki-ot-hsmm", "Ot Turkish male", "tr"],
["istc-lucia-hsmm", "Lucia Italian female", "it"],
["marylux", "Mary Luxembourgian female", "lb"],
// ["cmu-nk-hsmm", "NK Teluga female", "te"], // Teluga doesn't work with roman letters or digits
];
   
    var image_recognitions = {}; // record of most recent results from calls to take_picture_and_analyse

    var debugging = false; // if true console will fill with information

    // the following are the ecraft2learn functions available via this library

    return {
      inside_snap: function () {
                       return typeof world === 'object' && world instanceof WorldMorph;
      },
      run: function (function_name, parameters) {
          // runs one of the functions in this library
          if (typeof ecraft2learn[function_name] === 'undefined') {
              if (function_name === "take_picture_and_analyse" ||
                  function_name === "add_photo_as_costume" ||
                  function_name === "update_costume_from_video") {
                  // define it now with default image dimensions
                  // when setup finishes then run take_picture_and_analyse
                  ecraft2learn.setup_camera(640, 
                                            480, 
                                            undefined, // no key
                                            function () {
                                                // delay a second so camera is on when first image is captured
                                                setTimeout(function () {
                                                               ecraft2learn[function_name].apply(null, parameters.contents);
                                                          },
                                                          1000);
                                            });
                  return;
              } else if (function_name === "stop_speech_recognition") {
                  return; // ignore if called before speech_recognition started
              }
              inform("No such function",
                     "Ecraft2learn library does not have a function named ''" + function_name + "'.");
              return;
          }
          return ecraft2learn[function_name].apply(null, parameters.contents);
      },

      read_url: function (url, callback, error_callback, access_token, json_format) {
          // calls callback with the contents of the 'url' unless an error occurs and then error_callback is called
          // ironically this is the rare function that may be useful when there is no Internet connection
          // since it can be used to communicate with localhost (e.g. to read/write Raspberry Pi or Arduino pins)
          var xhr = new XMLHttpRequest();
          xhr.open('GET', url);
          if (access_token) {
              xhr.setRequestHeader('Authorization', 'Bearer ' + access_token);
          }
          xhr.onload = function() {
              invoke_callback(callback, json_format ? javascript_to_snap(JSON.parse(xhr.responseText)) : xhr.responseText);
          };
          xhr.onerror = function(error) {
              invoke_callback(error_callback, url + " error is " + error.message);
          };
          xhr.onloadend = function() {
              if (xhr.status >= 400) {
                  invoke_callback(error_callback, url + " replied " + xhr.statusText);
              } else if (xhr.status === 0) {
                  invoke_callback(error_callback, url + " failed to load.");
              }
          };
          xhr.send();
      },

      start_speech_recognition: function (final_spoken_callback, 
                                          // following are optional
                                          error_callback, 
                                          interim_spoken_callback, 
                                          language, 
                                          max_alternatives,
                                          all_results_callback,
                                          all_confidence_values_callback,
                                          grammar) {
          // final_spoken_callback and interim_spoken_callback are called
          // with the text recognised by the browser's speech recognition capability
          // interim_spoken_callback 
          // or error_callback if an error occurs
          // language is of the form en-US and is optional
          // maxAlternatives
          // all_results_callback and all_confidence_values_callback receive the list of results and their confidences
          // grammar -- see https://www.w3.org/TR/jsgf/ for JSGF format
          // if the browser has no support for speech recognition then the Microsoft Speech API is used (API key required)
          if (typeof SpeechRecognition === 'undefined' && typeof webkitSpeechRecognition === 'undefined') {
              // no support from this browser so try using the Microsoft Speech API
              inform("This browser does not support speech recognition.\n" +
                     "You could use Chrome or you can use Microsoft's speech recognition service.\n" +
                     "Go ahead and use the Microsoft service? (It requires an API key.)",
                      function () {
                           ecraft2learn.start_microsoft_speech_recognition(interim_spoken_callback, final_spoken_callback, error_callback);
                      });                  
              return;
          }
          if (window.speechSynthesis.speaking || ecraft2learn.speaking_ongoing || ecraft2learn.speech_recognition) { 
              // don't listen while speaking or while listening is still in progress
              // added ecraft2learn.speaking_ongoing since window.speechSynthesis.speaking wasn't sufficient on some systems
              if (debugging) {
                  console.log("Delaying start due to " + (window.speechSynthesis.speaking ? "speaking" : "listen in progress"));
              }
              setTimeout(function () {
                             ecraft2learn.start_speech_recognition(final_spoken_callback, error_callback, interim_spoken_callback, language, 
                                                                   max_alternatives, all_results_callback, all_confidence_values_callback,
                                                                   grammar); 
                         },
                         100); // try again in a tenth of a second
              return;
          }
          if (debugging) {
              console.log("start_speech_recognition called.");
          }
          var restart = function () {
              if (speech_recognition_stopped) {
                  if (debugging) {
                      console.log("restart exited becuase speech_recognition_stopped");
                  }
                  return;
              }
              try {
                  if (debugging) {
                      console.log("Recognition started");
                  }
                  speech_recognition.start();
 //               console.log("Speech recognition started");
              } catch (error) {
                  if (error.name === 'InvalidStateError') {
                      if (debugging) {
                          console.log("restart delayed becuase InvalidStateError");
                      }
                      // delay needed, at least in Chrome 52
                      setTimeout(restart, 2000);
                  } else {
                      console.log(error);
                  }
              }
          };
          var handle_result = function (event) {
              var spoken = event.results[event.resultIndex][0].transcript; // first result
              var final = event.results[event.resultIndex].isFinal;         
              invoke_callback(final ? final_spoken_callback : interim_spoken_callback, spoken, event);
              if (debugging) {
                  console.log("Just invoked callback for " + spoken + ". isFinal is " + event.results[event.resultIndex].isFinal);
              }
              if (is_callback(all_results_callback)) {
                  handle_all_results(event);
              }
              if (is_callback(all_confidence_values_callback)) {
                  handle_all_confidence_values(event);
              } else {
                  // if callback for confidence values isn't used then log the top confidence value
                  console.log("Confidence is " + event.results[event.resultIndex][0].confidence + " for " + spoken);
              }
              if (final) {
                  ecraft2learn.stop_speech_recognition();
              }
          };
          var handle_all_results = function (event) {
              var results = [];
              var result = event.results[event.resultIndex];
              for (var i = 0; i < result.length; i++) {
                  results.push(result[i].transcript);
              }
              invoke_callback(all_results_callback, javascript_to_snap(results));
          };
          var handle_all_confidence_values = function (event) {
              var confidences = [];
              var result = event.results[event.resultIndex];
              for (var i = 0; i < result.length; i++) {
                  confidences.push(result[i].confidence);
              }
              invoke_callback(all_confidence_values_callback, javascript_to_snap(confidences));
          };
          var handle_error = function (event) {
              ecraft2learn.stop_speech_recognition();
              if (debugging) {
                  console.log("Recognition error: " + event.error);
              }
              invoke_callback(error_callback, event.error);
          };
          var speech_recognition_stopped = false; // used to suspend listening when tab is hidden
          var speech_recognition;
          var create_speech_recognition_object = function () {
              speech_recognition = (typeof SpeechRecognition === 'undefined') ?
                                   new webkitSpeechRecognition() :
                                   new SpeechRecognition();
              // following prevents speech_recognition from being garbage collected before its listeners run
              // it is also used to prevent multiple speech recognitions to occur simultaneously
              ecraft2learn.speech_recognition = speech_recognition;
              speech_recognition.interimResults = is_callback(interim_spoken_callback);
              if (typeof language === 'string') {
                  var matching_language_entry = language_entry(language);
                  if (matching_language_entry) {
                      speech_recognition.lang = matching_language_entry[1];
                  } else {
                      inform("No matching language",
                             "Could not a find a language that matches '" + language + "'.");
                  }
              } 
              if (ecraft2learn.default_language && !speech_recognition.lang) {
                  speech_recognition.lang = ecraft2learn.default_language;
              }
              if (max_alternatives > 1) {
                  speech_recognition.maxAlternatives = max_alternatives;
              }
              speech_recognition.profanityFilter = true; // so more appropriate use in schools, e.g. f*** will result
              if (grammar) {
                  let SpeechGrammarList = SpeechGrammarList || webkitSpeechGrammarList;
                  grammar = '#JSGF V1.0; grammar commands; public <commands> = ' + grammar + ';';
                  speechRecognitionList = new SpeechGrammarList();
                  speechRecognitionList.addFromString(grammar, 1);
                  speech_recognition.grammars = speechRecognitionList;
              }
              speech_recognition.onresult = handle_result;
              speech_recognition.onerror = handle_error;
              speech_recognition.onend = function (event) {
                  if (debugging) {
                      console.log("On end triggered.");
                  }
                  if (ecraft2learn.speech_recognition) {
                      if (debugging) {
                          console.log("On end but no result or error so stopping then restarting.");
                      }
                      ecraft2learn.stop_speech_recognition();
                      create_speech_recognition_object();
                      restart();
                  }                
              };
          };
          create_speech_recognition_object();
          ecraft2learn.stop_speech_recognition = function () {
              if (debugging) {
                  console.log("Stopped.");
              }
              ecraft2learn.speech_recognition = null;
              if (speech_recognition) {
                  speech_recognition.onend    = null;
                  speech_recognition.onresult = null;
                  speech_recognition.onerror  = null;
                  speech_recognition.stop();
              }
          };
          restart();
          // if the tab or window is minimised or hidden then speech recognition is paused until the window or tab is shown again
          window.addEventListener("message",
                                  function(message) {
                                      if (message.data === 'hidden') {
                                          speech_recognition_stopped = true;
                                          if (debugging) {
                                              console.log("Stopped because tab/window hidden.");
                                          }     
                                      } else if (message.data === 'shown') {
                                          speech_recognition_stopped = false;
                                          restart();
                                          if (debugging) {
                                              console.log("Restarted because tab/window shown.");
                                          }
                                      }
                                  });
    },

    set_default_language: function (language) {
        var matching_language_entry = language_entry(language);
        if (!matching_language_entry) {
            inform("Unrecognised language",
                   "Unable to recognise which language is described by '" + language + "'.\n" +
                   "Default language unchanged.");
        } else if (ecraft2learn.default_language !== matching_language_entry[1]) {
            // default has been changed so notify user
            ecraft2learn.default_language = matching_language_entry[1];
            var matching_language_name = matching_language_entry[2];
            var mary_tts_voice_number = mary_tts_voice_number_with_language_code(matching_language_entry[1]);
            var message = "Speech recognition will expect " + matching_language_name + " to be spoken.\n";
            var no_voices_callback = function () {
                if (mary_tts_voice_number >= 0) {
                    message += "No matching browser speech synthesis voice found but Mary TTS voice " +
                               mary_tts_voices[mary_tts_voice_number][1] + " can be used.\n" +
                               "Use the Speak (using Mary TTS engine) command.";
                } else {
                    message += "No speech synthesis support for " + matching_language_name + " found so English will be used.";
                }
                inform("Default language set", message);
            };
            var voices_callback = function () {
                var builtin_voice_number = builtin_voice_number_with_language_code(matching_language_entry[1]);
                if (builtin_voice_number >= 0) {
                    message += "Speech synthesis will use the browser's voice named ''" + 
                               window.speechSynthesis.getVoices()[builtin_voice_number].name + "''.";
                    inform("Default language set", message);
                } else {
                    no_voices_callback();
                }
            };
            // the following will wait for voices to be loaded (or time out) before responding
            check_for_voices(no_voices_callback, voices_callback);  
        }
    },

    start_microsoft_speech_recognition: function (as_recognized_callback, final_spoken_callback, error_callback, provided_key) {
        // As spoken words are recognised as_recognized_callback is called with the result so far
        // When the recogniser determines that the speaking is finished then the final_spoken_callback is called with the final text
        // error_callback is called if an error occurs
        // provided_key is either the API key to use the Microsoft Speech API or
        // if not specified then the key is obtained from the Snap! 'Microsoft speech key' reporter
        var start_listening = function (SDK) {
            var setup = function(SDK, recognitionMode, language, format, subscriptionKey) {
                var recognizerConfig = new SDK.RecognizerConfig(
                    new SDK.SpeechConfig(
                        new SDK.Context(
                            new SDK.OS(navigator.userAgent, "Browser", null),
                            new SDK.Device("SpeechSample", "SpeechSample", "1.0.00000"))),
                    recognitionMode, // SDK.RecognitionMode.Interactive  (Options - Interactive/Conversation/Dictation>)
                    language,        // Supported laguages are specific to each recognition mode. Refer to docs.
                    format);         // SDK.SpeechResultFormat.Simple (Options - Simple/Detailed)
                // Alternatively use SDK.CognitiveTokenAuthentication(fetchCallback, fetchOnExpiryCallback) for token auth
                var authentication = new SDK.CognitiveSubscriptionKeyAuthentication(subscriptionKey);
                return SDK.CreateRecognizer(recognizerConfig, authentication);
            };
            var key = provided_key || get_key('Microsoft speech key');
            if (!key) {
                return;
            }
            var recognizer = setup(SDK,
                                   SDK.RecognitionMode.Interactive,
                                   get_global_variable_value('language', "en-us"),
                                   "Simple", // as opposed to "Detailed"
                                   key);
            ecraft2learn.stop_microsoft_speech_recognition = function () {
                recognizer.AudioSource.TurnOff();
            };
            ecraft2learn.last_speech_recognized = undefined;
            recognizer.Recognize(function (event) {
                switch (event.Name) {
                    case "RecognitionTriggeredEvent":
                        break;
                    case "ListeningStartedEvent":
                        break;
                    case "RecognitionStartedEvent":
                        break;
                    case "SpeechStartDetectedEvent":
                        break;
                    case "SpeechHypothesisEvent":
                        ecraft2learn.last_speech_recognized = event.Result.Text;
                        invoke_callback(as_recognized_callback, ecraft2learn.last_speech_recognized);
                        break;
                    case "SpeechEndDetectedEvent":
                        if (ecraft2learn.last_speech_recognized) {
                            invoke_callback(final_spoken_callback, ecraft2learn.last_speech_recognized);
                        } else {
                            invoke_callback(error_callback);
                        }
                        break;
                    case "SpeechSimplePhraseEvent":
                        break;
                    case "SpeechDetailedPhraseEvent":
                        break;
                    case "RecognitionEndedEvent":
                        break;
                }
            })
            .On(function () {
                // The request succeeded. Nothing to do here.
            },
            function (error) {
                console.error(error);
                invoke_callback(error_callback);
            });
        };
        if (ecraft2learn.microsoft_speech_sdk) {
            start_listening(ecraft2learn.microsoft_speech_sdk);
        } else {
            load_script("//cdnjs.cloudflare.com/ajax/libs/require.js/2.3.3/require.min.js", 
                       function () {
                           load_script("lib/speech.browser.sdk-min.js",
                                       function () {
                                            require(["Speech.Browser.Sdk"], function(SDK) {
                                                ecraft2learn.microsoft_speech_sdk = SDK;
                                                start_listening(SDK);
                                            });
                                       });
                       });
        }
    },

  setup_camera: function (width, height, provided_key, after_setup_callback) {
      // sets up the camera for taking photos and sending them to an AI cloud service for recognition
      // causes take_picture_and_analyse to be defined
      // supported service providers are currently 'Google', 'Microsoft', and IBM 'Watson' (or 'IBM Watson')
      // after_setup_callback is optional and called once setup completes
      var video  = document.createElement('video');
      var canvas = document.createElement('canvas');
      var post_image = function post_image(image, cloud_provider, callback, error_callback) {
          // based upon https://developer.mozilla.org/en-US/docs/Web/Guide/HTML/Forms/Sending_forms_through_JavaScript
          if (cloud_provider === 'Watson') {
              cloud_provider = 'IBM Watson';
          }
          var key = provided_key || get_key(cloud_provider + " image key");
          var formData, XHR;
          if (!key) {
             callback("No key provided so unable to ask " + cloud_provider + " to analyse an image.");
             return;
          }
          XHR = new XMLHttpRequest();
          XHR.addEventListener('load', function(event) {
              callback(event);
          });
          if (!error_callback) {
              error_callback = function (event) {
                  console.error(event);
              }
          }
          XHR.addEventListener('error', error_callback);
          switch (cloud_provider) {
          case "IBM Watson":
              formData = new FormData();
              formData.append("images_file", image, "blob.png");
              // beginning early December 2017 Watson began signalling No 'Access-Control-Allow-Origin' header
              // Note that "Lite" plans are deleted after 30 days of inactivity...
              var proxy_url = "https://toontalk.appspot.com/p/" + 
              encodeURIComponent("https://gateway-a.watsonplatform.net/visual-recognition/api/v3/classify?version=2016-05-19&api_key=" + key);
              XHR.open('POST', proxy_url);
//               XHR.open('POST', "https://gateway-a.watsonplatform.net/visual-recognition/api/v3/classify?version=2016-05-19&api_key=" + key);
              XHR.send(formData);
              break;
          case "Google":
              XHR.open('POST', "https://vision.googleapis.com/v1/images:annotate?key=" + key);
              XHR.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
              XHR.send(JSON.stringify({"requests":[{"image":{"content": image.substring("data:image/png;base64,".length)},
                                                    "features":[{"type": "LABEL_DETECTION",  "maxResults":32},
                                                                {"type": "TEXT_DETECTION",   "maxResults":32},
                                                                {"type": "FACE_DETECTION",   "maxResults":32},
                                                                {"type": "IMAGE_PROPERTIES", "maxResults":32}
                                                               ]}]
                                      }));
              break;
          case "Microsoft":
              // see https://social.msdn.microsoft.com/Forums/en-US/807ee18d-45e5-410b-a339-c8dcb3bfa25b/testing-project-oxford-ocr-how-to-use-a-local-file-in-base64-for-example?forum=mlapi
              XHR.open('POST', "https://westeurope.api.cognitive.microsoft.com/vision/v1.0/analyze?visualFeatures=Description,Tags,Faces,Color,Categories&subscription-key=" + key);
              XHR.setRequestHeader('Content-Type', 'application/octet-stream');
              XHR.send(image);
              break;
          }
      };
      var startup = function startup() {
          var callback = function(stream) {
//               var vendorURL = window.URL || window.webkitURL;
//               video.src = vendorURL.createObjectURL(stream);
              video.srcObject = stream;
              video.width  = width;
              video.height = height;
              video.play();
              if (after_setup_callback) {
                  after_setup_callback(canvas, video);
              }
          };
          var error_callback = function(error) {
              console.log("An error in getting access to camera: " + error.message);
              console.log(error);
          };
          var constraints = {video: true,
                             audio: false};
          video.style.display  = 'none';
          canvas.style.display = 'none';
          canvas.setAttribute('width', width);
          canvas.setAttribute('height', height);
          document.body.appendChild(video);
          document.body.appendChild(canvas);
          if (navigator.mediaDevices) {
              navigator.mediaDevices.getUserMedia(constraints)
                  .then(callback)
                  .catch(error_callback);
          } else {
              console.log("test this");
              navigator.getMedia = (navigator.getUserMedia ||
                                    navigator.webkitGetUserMedia ||
                                    navigator.msGetUserMedia);
              navigator.getMedia(constraints, callback, error_callback);
      //      navigator.mediaDevices.getUserMedia(constraints, callback, error_callback);
          }
      };
      video.setAttribute('autoplay', '');
      video.setAttribute('playsinline', '');
      width  = +width; // convert to number
      height = +height;

  // define new functions in the scope of setup_camera

  ecraft2learn.add_photo_as_costume = function () {
      add_photo_to_canvas(canvas, video, width, height);
      add_costume(create_costume(canvas), get_snap_ide().currentSprite);
  };

  ecraft2learn.update_costume_from_video = function (costume_number, sprite) {
      var costume = costume_of_sprite(costume_number, sprite);
      var canvas = costume.contents;
//       canvas.setAttribute('width', width);
//       canvas.setAttribute('height', height);
      var context = canvas.getContext('2d');
      context.drawImage(video, 0, 0, width, height);
      sprite.drawNew();
  };

  ecraft2learn.take_picture_and_analyse = function (cloud_provider, show_photo, snap_callback) {
      // snap_callback is called with the result of the image recognition
      // show_photo displays the photo when it is taken
      if (cloud_provider === 'Watson') {
          cloud_provider = 'IBM Watson';
      }
      var callback = function (response) {
          var response_as_javascript_object;
          switch (cloud_provider) {
              case "IBM Watson":
                  response_as_javascript_object = JSON.parse(response).images[0].classifiers[0].classes;
                  break;
              case "Google":
                  response_as_javascript_object = JSON.parse(response).responses[0];
                  break;
              case "Microsoft":
                  response_as_javascript_object = JSON.parse(response);
                  break;
              default:
                  // already checked cloud_provider so shouldn't happen here
                  console.error("Unknown cloud provider: " + cloud_provider);
                  return;
          }
          image_recognitions[cloud_provider].response = response_as_javascript_object;
          if (typeof snap_callback !== 'object' && typeof snap_callback !== 'function') { // if not provided
              return;
          }
          invoke_callback(snap_callback, javascript_to_snap(response_as_javascript_object));
    };
    var costume;
    add_photo_to_canvas(canvas, video, width, height);
    costume = create_costume(canvas);
    image_recognitions[cloud_provider] = {costume: create_costume(canvas)};
    if (show_photo) {
        add_costume(costume);
    }
    switch (cloud_provider) {
    case "IBM Watson":
    case "Microsoft":
        canvas.toBlob(
            function (blob) {
                post_image(blob,
                           cloud_provider,
                           function (event) {
                               if (typeof event === 'string') {
                                   inform("Error from service provider", event);
                               } else {
                                   callback(event.currentTarget.response);
                               }
                           });
            },
            "image/png");
        break;
    case "Google":
        post_image(canvas.toDataURL('image/png'),
                   cloud_provider,
                   function (event) {
                       if (typeof event === 'string') {
                           inform("Error from Google", event);
                       } else {
                           callback(event.currentTarget.response);
                       }
                   });
        break;
    default:
        invoke_callback(snap_callback, cloud_provider === "" ? 
                                       "A vision recognition service provider needs to be chosen." :
                                       "Unknown cloud provider: " + cloud_provider);
    }
  };

    if (document.body) {
        startup();
    } else {
        window.addEventListener('load', startup, false);
    }
  },

  image_property: function (cloud_provider, property_name_or_names) {
      var get_property = function (array_or_object, property_name_or_names) {
          var property;
          if (Array.isArray(array_or_object)) {
              return new List(array_or_object.map(function (item) {
                                                      return get_property(item, property_name_or_names);
                                                  }));
          } else if (typeof property_name_or_names === 'string') {
              property = array_or_object[property_name_or_names];
              if (!property) {
                  return "No property named " + property_name_or_names + " found.";
              }
              return property;
          } else if (property_name_or_names.length < 1) {
              return array_or_object;
          } else if (property_name_or_names.length < 2) {
              return get_property(array_or_object, property_name_or_names[0]);
          } else if (array_or_object.statusCode >= 400 && array_or_object.statusCode <= 404) {
              return "Unable to connect to " + cloud_provider + ". " + array_or_object.message;
          } else {
              property = array_or_object[property_name_or_names[0]];
              if (!property) {
                  return "No property named " + property_name_or_names[0] + " found.";
              }
              return get_property(property, property_name_or_names.splice(1));
          }
      };
      if (cloud_provider === 'Watson') {
          cloud_provider = 'IBM Watson';
      }
      var recognition = image_recognitions[cloud_provider];
      if (!recognition) {
          return cloud_provider + " has not been asked to recognize a photo.";
      }
      if (!recognition.response) {
          return cloud_provider + " has not (yet) recognized the image.";
      }
      if (!Array.isArray(property_name_or_names) && typeof property_name_or_names !== 'string') {
          // convert from a Snap list to a JavaScript array
          property_name_or_names = property_name_or_names.contents;
      }
      return javascript_to_snap(get_property(recognition.response, property_name_or_names));
  },

  add_current_photo_as_costume: function (cloud_provider) {
      var recognition = image_recognitions[cloud_provider];
      if (!recognition || !recognition.costume) {
          if (cloud_provider === "") {
              inform("No service provided selected",
                     "A vision recognition service provider needs to be chosen.");
          } else {
              inform("No photo",
                     "No photo has been created for " + cloud_provider + " to recognize.");
          }
      } else {
          add_costume(recognition.costume);
      }
  },

  speak: function (message, pitch, rate, voice_number, volume, language, finished_callback) {
      check_for_voices(function () {
                          no_voices_alert();
                       },
                       function () {
                           speak(message, pitch, rate, voice_number, volume, language, finished_callback)
                       });
  },
  get_voice_names: function () {
      return new List(window.speechSynthesis.getVoices().map(function (voice) {
          return voice.name;
      }));
  },
  get_voice_name: function (voice_number) {
      var voice = get_voice(voice_number);
      if (voice) {
          return voice.name;
      }
      return "No voice numbered " + voice_number;
  },
  get_voice_number_matching: function (name_parts) {
      return get_matching_voice(true, name_parts);
  },
  get_mary_tts_voice_number_matching: function (name_parts) {
      return get_matching_voice(false, name_parts);
  },
  get_mary_tts_voice_name: function (voice_number) { // user friendly name
      return get_voice_from(voice_number, mary_tts_voices.map(function (voice) { return voice[1]; }));
  },
  speak_using_mary_tts: function (message, volume, voice_number, finished_callback) {
     var voice = get_mary_tts_voice(voice_number);
     var voice_parameter = voice ? "&VOICE=" + voice : "";
     // due possible use of default_language the following can't use the voice_number
     var locale = mary_tts_voices[mary_tts_voices.findIndex(function (entry) {return entry[0] === voice;})][2];
     var locale_parameter = "&LOCALE=" + locale;
     var sound = new Audio("http://mary.dfki.de:59125/process?INPUT_TEXT=" + (typeof message === 'string' ? message.replace(/\s/g, "+") : message) + 
                           "&INPUT_TYPE=TEXT&OUTPUT_TYPE=AUDIO&AUDIO=WAVE_FILE" + voice_parameter + locale_parameter);
     if (finished_callback) {
         sound.addEventListener("ended", 
                                function () {
                                     invoke_callback(finished_callback, javascript_to_snap(message));
                                },
                                false);
     }
     if (+volume > 0) {
         sound.volume = +volume;
     }
     sound.addEventListener('canplay',
                            function () {
                                sound.play();
                            });
     sound.addEventListener('error',
                            function () {
                                invoke_callback(finished_callback, javascript_to_snap(sound.error.message));
                            });
  },
  get_mary_tts_voice_names: function () {
    return new List(mary_tts_voices.map(function (voice) { return voice[1]; }));
  },
  speak_using_browser_voices_or_mary_tts: function (message, finished_callback) {
    check_for_voices(function () {
                         // no voices in browser to use Mary TTS
                         ecraft2learn.speak_using_mary_tts(message, 1, 0, finished_callback);
                     },
                     function () {
                         ecraft2learn.speak(message, 0, 0, 0, 0, 0, finished_callback);
                     });
  },
  open_project: function (name) {
      get_snap_ide().openProject(name);
  },
  save_project: function (name) {
      get_snap_ide().saveProject(name);
  },
  // experimenting with compiling Snap4Arduino to Arduino C sketch
//   transpile_to_arduino_sketch: function () {
//     try {
//         console.log(
//                 this.world().Arduino.transpile(
//                     this.mappedCode(),
//                     this.parentThatIsA(ScriptsMorph).children.filter(
//                         function (each) {
//                             return each instanceof HatBlockMorph &&
//                                 each.selector == 'receiveMessage';
//                         })));
//     } catch (error) {
//         console.log('Error exporting to Arduino sketch!', error.message)
//     }
//   },
  console_log: function (message) {
      console.log(message);
  },
  open_help_page: function () {
      // prefer window.open but then is blocked as a popup
      document.location.assign("https://github.com/ecraft2learn/ai/wiki", "_blank");
  },
  wikipedia_domain: function () {
      if (ecraft2learn.default_language) {
          return "https://" + ecraft2learn.default_language.substring(0, 2) + ".wikipedia.org";
      }
      return "https://en.wikipedia.org";
  },
  handle_server_json_response: function (response, callback) {
     invoke_callback(callback, javascript_to_snap(JSON.parse(response)));
  },
  handle_server_json_response_to_pins_request: function (response_text,
                                                         callback_for_pins_read,
                                                         callback_for_pins_written,
                                                         callback_for_errors) {
      try {
          var response = JSON.parse(response_text);
          var read = response.pins;
          var written = response.write_responses;
          invoke_callback(callback_for_pins_read,    javascript_to_snap(read));
          invoke_callback(callback_for_pins_written, javascript_to_snap(written));
      } catch (error) {
          invoke_callback(callback_for_errors, error.message);
      }
  },
  train_using_camera: function (buckets_as_snap_list, add_to_previous_training, page_introduction, callback) {
      train("camera", buckets_as_snap_list, add_to_previous_training, page_introduction, callback);
  },
  train_using_images: function (buckets_as_snap_list, add_to_previous_training, page_introduction, callback) {
      // old name kept for backwards compatibility
      train("camera", buckets_as_snap_list, add_to_previous_training, page_introduction, callback);
  },
  train_using_microphone: function (buckets_as_snap_list, add_to_previous_training, page_introduction, callback, version) {
      // version is for when this is replaced by a deep learning model
      train("microphone", buckets_as_snap_list, add_to_previous_training, page_introduction, callback);
  },
  image_confidences: function (callback) {
      var receive_confidences = function (event) {
          if (typeof event.data.confidences !== 'undefined') {
              invoke_callback(callback, javascript_to_snap(event.data.confidences));
              window.removeEventListener("message", receive_confidences);
           };
      };
      training_window_request("You need to train the system before using 'Current image label confidences'.\n" +
                              "Run the 'Train using image buckets ...' command before this.", 
                              function (image) {
                                  return {predict: image};
                              }, 
                              receive_confidences);
  },
  costume_confidences: function (costume_number, callback, sprite) {
      var receive_confidences = function (event) {
          if (typeof event.data.confidences !== 'undefined') {
                invoke_callback(callback, javascript_to_snap(event.data.confidences));
                window.removeEventListener("message", receive_confidences);
             };
        };
        var costume = costume_of_sprite(costume_number, sprite);
        costume_to_image(costume,
                         function (image) {
                            training_window_request("You need to train the system before using 'Image label confidences'.\n" +
                                                    "Run the 'Add costume ...' block before this.", 
                                                    function (image_URL) {
                                                                 return {predict: image_URL};
                                                    },
                                                    receive_confidences,
                                                    image);
                         });                            
  },
  audio_confidences: function (callback, duration_in_seconds, version) {
      // version is for when this is replaced by a deep learning model
      var receive_confidences = function (event) {
          if (typeof event.data.confidences !== 'undefined') {
              invoke_callback(callback, javascript_to_snap(event.data.confidences));
              window.removeEventListener("message", receive_confidences);
           };
      };
      if (!ecraft2learn.machine_learning_window) {
          inform("Training request warning",
                 "Run the 'Train with audio buckets ...' command before using 'Audio label confidences'");
          return;
      }
      if (typeof duration_in_seconds != 'number' || duration_in_seconds <= 0) {
          duration_in_seconds = 3; // 3 second default 
      }
      // convert from milliseconds to seconds
      ecraft2learn.machine_learning_window.postMessage({predict: duration_in_seconds*1000}, "*");
      window.addEventListener("message", receive_confidences);  
  },
  add_image_to_training: function (costume_number, label, callback, sprite) {
      var receive_comfirmation = 
          function (event) {
              if (typeof event.data.confirmation !== 'undefined') {
                  invoke_callback(callback, event.data.confirmation);
                  window.removeEventListener("message", receive_comfirmation);
              };
      };
      var costume = costume_of_sprite(costume_number, sprite);
      costume_to_image(costume,
                       function (image) {
                          training_window_request("You need to train the system before using 'Add image to training'.\n" +
                                                  "Run 'Train using camera ...' before this " +
                                                  " so the system knows the list of possible labels.", 
                                                  function (image_URL) {
                                                      return {train: image_URL,
                                                              label: label};
                                                  },
                                                  receive_comfirmation,
                                                  image);
                       });
  },
  costume_count: function (sprite) {
      return get_costumes(sprite).length;
  },
  training_window_ready: function () {
      return ecraft2learn.machine_learning_window === true && 
             !ecraft2learn.machine_learning_window.closed &&
             ecraft2learn.machine_learning_window_ready === true;
  },
  inform: inform,
        
}} ());
window.speechSynthesis.getVoices(); // to ensure voices are loaded
ecraft2learn.chrome_languages =
[
// based upon https://cloud.google.com/speech/docs/languages
// [Language name, Language code, English language name, right-to-left]
["Afrikaans (Suid-Afrika)", "af-ZA", "Afrikaans (South Africa)"],
["አማርኛ (ኢትዮጵያ)", "am-ET", "Amharic (Ethiopia)"],
["Հայ (Հայաստան)", "hy-AM", "Armenian (Armenia)"],
["Azərbaycan (Azərbaycan)", "az-AZ", "Azerbaijani (Azerbaijan)"],
["Bahasa Indonesia (Indonesia)", "id-ID", "Indonesian (Indonesia)"],
["Bahasa Melayu (Malaysia)", "ms-MY", "Malay (Malaysia)"],
["বাংলা (বাংলাদেশ)", "bn-BD", "Bengali (Bangladesh)"],
["বাংলা (ভারত)", "bn-IN", "Bengali (India)"],
["Català (Espanya)", "ca-ES", "Catalan (Spain)"],
["Čeština (Česká republika)", "cs-CZ", "Czech (Czech Republic)"],
["Dansk (Danmark)", "da-DK", "Danish (Denmark)"],
["Deutsch (Deutschland)", "de-DE", "German (Germany)"],
["English (Australia)", "en-AU", "English (Australia)"],
["English (Canada)", "en-CA", "English (Canada)"],
["English (Ghana)", "en-GH", "English (Ghana)"],
["English (Great Britain)", "en-GB", "English (United Kingdom)"],
["English (India)", "en-IN", "English (India)"],
["English (Ireland)", "en-IE", "English (Ireland)"],
["English (Kenya)", "en-KE", "English (Kenya)"],
["English (New Zealand)", "en-NZ", "English (New Zealand)"],
["English (Nigeria)", "en-NG", "English (Nigeria)"],
["English (Philippines)", "en-PH", "English (Philippines)"],
["English (South Africa)", "en-ZA", "English (South Africa)"],
["English (Tanzania)", "en-TZ", "English (Tanzania)"],
["English (United States)", "en-US", "English (United States)"],
["Español (Argentina)", "es-AR", "Spanish (Argentina)"],
["Español (Bolivia)", "es-BO", "Spanish (Bolivia)"],
["Español (Chile)", "es-CL", "Spanish (Chile)"],
["Español (Colombia)", "es-CO", "Spanish (Colombia)"],
["Español (Costa Rica)", "es-CR", "Spanish (Costa Rica)"],
["Español (Ecuador)", "es-EC", "Spanish (Ecuador)"],
["Español (El Salvador)", "es-SV", "Spanish (El Salvador)"],
["Español (España)", "es-ES", "Spanish (Spain)"],
["Español (Estados Unidos)", "es-US", "Spanish (United States)"],
["Español (Guatemala)", "es-GT", "Spanish (Guatemala)"],
["Español (Honduras)", "es-HN", "Spanish (Honduras)"],
["Español (México)", "es-MX", "Spanish (Mexico)"],
["Español (Nicaragua)", "es-NI", "Spanish (Nicaragua)"],
["Español (Panamá)", "es-PA", "Spanish (Panama)"],
["Español (Paraguay)", "es-PY", "Spanish (Paraguay)"],
["Español (Perú)", "es-PE", "Spanish (Peru)"],
["Español (Puerto Rico)", "es-PR", "Spanish (Puerto Rico)"],
["Español (República Dominicana)", "es-DO", "Spanish (Dominican Republic)"],
["Español (Uruguay)", "es-UY", "Spanish (Uruguay)"],
["Español (Venezuela)", "es-VE", "Spanish (Venezuela)"],
["Euskara (Espainia)", "eu-ES", "Basque (Spain)"],
["Filipino (Pilipinas)", "fil-PH", "Filipino (Philippines)"],
["Français (Canada)", "fr-CA", "French (Canada)"],
["Français (France)", "fr-FR", "French (France)"],
["Galego (España)", "gl-ES", "Galician (Spain)"],
["ქართული (საქართველო)", "ka-GE", "Georgian (Georgia)"],
["ગુજરાતી (ભારત)", "gu-IN", "Gujarati (India)"],
["Hrvatski (Hrvatska)", "hr-HR", "Croatian (Croatia)"],
["IsiZulu (Ningizimu Afrika)", "zu-ZA", "Zulu (South Africa)"],
["Íslenska (Ísland)", "is-IS", "Icelandic (Iceland)"],
["Italiano (Italia)", "it-IT", "Italian (Italy)"],
["Jawa (Indonesia)", "jv-ID", "Javanese (Indonesia)"],
["ಕನ್ನಡ (ಭಾರತ)", "kn-IN", "Kannada (India)"],
["ភាសាខ្មែរ (កម្ពុជា)", "km-KH", "Khmer (Cambodia)"],
["ລາວ (ລາວ)", "lo-LA", "Lao (Laos)"],
["Latviešu (latviešu)", "lv-LV", "Latvian (Latvia)"],
["Lietuvių (Lietuva)", "lt-LT", "Lithuanian (Lithuania)"],
["Magyar (Magyarország)", "hu-HU", "Hungarian (Hungary)"],
["മലയാളം (ഇന്ത്യ)", "ml-IN", "Malayalam (India)"],
["मराठी (भारत)", "mr-IN", "Marathi (India)"],
["Nederlands (Nederland)", "nl-NL", "Dutch (Netherlands)"],
["नेपाली (नेपाल)", "ne-NP", "Nepali (Nepal)"],
["Norsk bokmål (Norge)", "nb-NO", "Norwegian Bokmål (Norway)"],
["Polski (Polska)", "pl-PL", "Polish (Poland)"],
["Português (Brasil)", "pt-BR", "Portuguese (Brazil)"],
["Português (Portugal)", "pt-PT", "Portuguese (Portugal)"],
["Română (România)", "ro-RO", "Romanian (Romania)"],
["සිංහල (ශ්රී ලංකාව)", "si-LK", "Sinhala (Sri Lanka)"],
["Slovenčina (Slovensko)", "sk-SK", "Slovak (Slovakia)"],
["Slovenščina (Slovenija)", "sl-SI", "Slovenian (Slovenia)"],
["Urang (Indonesia)", "su-ID", "Sundanese (Indonesia)"],
["Swahili (Tanzania)", "sw-TZ", "Swahili (Tanzania)"],
["Swahili (Kenya)", "sw-KE", "Swahili (Kenya)"],
["Suomi (Suomi)", "fi-FI", "Finnish (Finland)"],
["Svenska (Sverige)", "sv-SE", "Swedish (Sweden)"],
["தமிழ் (இந்தியா)", "ta-IN", "Tamil (India)"],
["தமிழ் (சிங்கப்பூர்)", "ta-SG", "Tamil (Singapore)"],
["தமிழ் (இலங்கை)", "ta-LK", "Tamil (Sri Lanka)"],
["தமிழ் (மலேசியா)", "ta-MY", "Tamil (Malaysia)"],
["తెలుగు (భారతదేశం)", "te-IN", "Telugu (India)"],
["Tiếng Việt (Việt Nam)", "vi-VN", "Vietnamese (Vietnam)"],
["Türkçe (Türkiye)", "tr-TR", "Turkish (Turkey)"],
["(اردو (پاکستان", "ur-PK", "Urdu (Pakistan)", true],
["(اردو (بھارت", "ur-IN", "Urdu (India)", true],
["Ελληνικά (Ελλάδα)", "el-GR", "Greek (Greece)"],
["Български (България)", "bg-BG", "Bulgarian (Bulgaria)"],
["Русский (Россия)", "ru-RU", "Russian (Russia)"],
["Српски (Србија)", "sr-RS", "Serbian (Serbia)"],
["Українська (Україна)", "uk-UA", "Ukrainian (Ukraine)"],
["(עברית (ישראל", "he-IL", "Hebrew (Israel)", true],
["(العربية (إسرائيل", "ar-IL", "Arabic (Israel)", true],
["(العربية (الأردن", "ar-JO", "Arabic (Jordan)", true],
["(العربية (الإمارات", "ar-AE", "Arabic (United Arab Emirates)", true],
["(العربية (البحرين", "ar-BH", "Arabic (Bahrain)", true],
["(العربية (الجزائر", "ar-DZ", "Arabic (Algeria)", true],
["(العربية (السعودية", "ar-SA", "Arabic (Saudi Arabia)", true],
["(العربية (العراق", "ar-IQ", "Arabic (Iraq)", true],
["(العربية (تونس", "ar-KW", "Arabic (Kuwait)", true],
["(العربية (المغرب", "ar-MA", "Arabic (Morocco)", true],
["(العربية (عُمان", "ar-TN", "Arabic (Tunisia)", true],
["(العربية (فلسطين", "ar-OM", "Arabic (Oman)", true],
["(العربية (قطر", "ar-PS", "Arabic (State of Palestine)", true],
["(العربية (لبنان", "ar-QA", "Arabic (Qatar)", true],
["(العربية (مصر", "ar-LB", "Arabic (Lebanon)", true],
["(العربية (مصر", "ar-EG", "Arabic (Egypt)", true],
["(فارسی (ایران", "fa-IR", "Persian (Iran)", true],
["हिन्दी (भारत)", "hi-IN", "Hindi (India)"],
["ไทย (ประเทศไทย)", "th-TH", "Thai (Thailand)"],
["한국어 (대한민국)", "ko-KR", "Korean (South Korea)"],
["國語 (台灣)", "cmn-Hant-TW", "Chinese, Mandarin (Traditional, Taiwan)"],
["廣東話 (香港)", "yue-Hant-HK", "Chinese, Cantonese (Traditional, Hong Kong)"],
["日本語（日本）", "ja-JP", "Japanese (Japan)"],
["普通話 (香港)", "cmn-Hans-HK", "Chinese, Mandarin (Simplified, Hong Kong)"],
["普通话 (中国大陆)", "cmn-Hans-CN", "Chinese, Mandarin (Simplified, China)"],
];
ecraft2learn.language_defaults =
 // many arbitrary choices but some default is needed
 {english:    "en-GB",
  en:         "en-GB",
  español:    "es-ES",
  spanish:    "es-ES",
  français:   "fr-FR",
  french:     "fr-FR",
  português:  "pt-PT",
  portuguese: "pt-PT",
  swahili:    "sw-KE", 
  தமிழ்:      "ta-IN",
  tamil:      "ta-IN",
  "اردو":     "ur-PK",
  urdu:       "ur-PK",
  "العربية":  "ar-SA",
  arabic:      "ar-SA",
  chinese:     "cmn-Hans-CN"
  }
