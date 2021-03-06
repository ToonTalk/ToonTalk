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
