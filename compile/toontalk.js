 /**
 * This is for backwards compatibility with published pages that refer to
 * compile/toontalk.js
 
 * Authors: Ken Kahn
 * License: New BSD
 */

 (function () {
"use strict";

var script = document.createElement("script");
script.src = "https://toontalk.github.io/ToonTalk/toontalk.js?published=1&old_reference_to_toontalk_js=1"; 
document.head.appendChild(script);
console.log("Old published pages generate many errors but eventually should load OK and errors ignored.");
}());
