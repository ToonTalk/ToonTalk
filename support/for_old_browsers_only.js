 /**
 * Implements workarounds for old browsers (e.g. IE8)
 * Authors: Ken Kahn
 * License: New BSD
 */
 
if (typeof Object.create !== 'function') {
	// not defined -- i.e. in IE8
    Object.create = function (o) {
        var F = function () {};
        F.prototype = o;
        return new F();
    };
}

if (!String.prototype.trim) {
    String.method('trim', function ( ) {
        return this.replace(/^\s+|\s+$/g, '');
    });
}