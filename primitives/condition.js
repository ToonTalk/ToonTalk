 /**
 * Implements ToonTalk's conditions for running robots, e.g. a thought bubble
 * Authors: Ken Kahn
 * License: New BSD
 */
 
 /*jslint browser: true, devel: true, plusplus: true, vars: true, white: true */

window.TOONTALK.condition = 
(function(TT) {
    "use strict";
    return {
        create: function(items) {
            // items can be a single primitive or a backside
            var result = Object.create(this);
            result.items = items;
            return result;
        },
        
        copy: function() {
            // copy items?
            return this.create(this.items);
        },
        
        match: function(context) {
            return this.items.match(context);
        }
        
    };
}(window.TOONTALK));