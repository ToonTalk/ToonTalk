 /**
 * Implements ToonTalk's 'module'
 * Authors: Ken Kahn
 * License: New BSD
 */
 
 // create ToonTalk 'module' -- using 'window' as recommended by Caja to avoid use of global variables
 if (!window.TOONTALK) {
     window.TOONTALK = {};
 }

 // each widget type, path, and robot actions adds to this
 window.TOONTALK.creators_from_json = {};

// so can optionally have Google Translate
 function googleTranslateElementInit() {
    TOONTALK.initialise_translator = function () {
        new google.translate.TranslateElement({pageLanguage: 'en', layout: google.translate.TranslateElement.InlineLayout.SIMPLE}, 'google_translate_element');
    };
    if (TOONTALK.TRANSLATION_ENABLED) {
        TOONTALK.initialise_translator();
        TOONTALK.initialise_translator = undefined;
    }
}

