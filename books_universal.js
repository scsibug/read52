// Module to manage books with arbitrary identification and retrieval schemes.
var sys = require('sys');
var _ = require('underscore');
require('./lib/underscore.strings');
var strings = require('./lib/underscore.strings');
_.mixin(_s); // extend underscore with strings
var rclient = require('./redisclient');
var isbn = require('./isbn');

// Each book-thing gets a unique number
var bookincr = "book_incr";

// Collection of all book keys, scores are created_date field
var bookzset = "univ_book_zset";

// Set of books mapped by EAN
var bookeanzset = "book_ean_set"
// Set of books mapped by ASIN
var bookeanzset = "book_asin_set"

// Keys for a book object that are eligible for serialization.
var book_keys =
    ["id", // our unique numeric identifier
     "datasource", // where information was retrieved
     "ean", // EAN/ISBN-13
     "isbn10", // ISBN-10
     "asin", // Amazon identifier (useful for kindle books)
     "librarything_work", // LibraryThing work
     "url", // where to direct users for more info (amazon referral, librarything work, etc.)
     "title", // book title
     "authors", // array of author names
     "pages", // number of pages in the book
     "dewey_decimal_number",
     "cover_image_url_small", // link to a small cover image
     "cover_image_url_medium", // link to a medium-sized cover image
     "cover_image_url_large", // link to a large cover image
     "created_date", // date this book was first entered (millis-since-epoch number)
     "modified_date" // date this book was last modified (millis-since-epoch number)
    ];

// Detect what our search term contains.
// Returns either "EAN", "ASIN", or "unknown"
// Return an object with type/value attributes:
//  type is "EAN", "ASIN", or "unknown".
//  value will be the "sanitized" term.
exports.detect_search_type = function (search) {
    var result = {}
    var search = _.trim(search);
    var ean = isbn.to_isbn_13(search);
    if (!_.isNull(ean)) {
        result.type="EAN";
        result.value=ean
    } else if (search.length === 10) {
        result.type="ASIN";
        result.value=search;
    } else {
        result.type="unknown";
        result.value=search;
    }
    return result;
};
