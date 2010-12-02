var sys = require('sys');
var isbnlib = require('./lib/isbn');
require('underscore');
// Take ISBN-10 and ISBN-13 to well-formed (no dashes) ISBN-13 codes.
// If the input cannot be reliably transformed, returns null.
exports.to_isbn_13 = function (isbn) {
    if (_.isNull(isbn) || _.isUndefined(isbn)) { return null; }
    var parsed_isbn = isbnlib.ISBN.parse(isbn);
    return (parsed_isbn ? parsed_isbn.codes.isbn13 : null);
}