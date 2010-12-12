var sys = require('sys');
var isbnlib = require('./lib/isbn');
var _ = require("underscore");
// Take ISBN-10 and ISBN-13 to well-formed (no dashes) ISBN-13 codes.
// If the input cannot be reliably transformed, returns null.
exports.to_isbn_13 = function (isbn) {
    isbn = isbn.replace(/-/g,"");
    if (_.isNull(isbn) || _.isUndefined(isbn)) { return null; }
    return isbnlib.ISBN.asIsbn13(isbn,false)
}