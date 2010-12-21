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

// Hash of EANs to book ID
var bookeanzset = "ean_book_hash"
// Hash of ASINs to book ID
var bookeanzset = "asin_book_hash"

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
    } else if (exports.isASINlike(search)) {
        result.type="ASIN";
        result.value=search;
    } else {
        result.type="unknown";
        result.value=search;
    }
    return result;
};

// there is no test that an ASIN is valid we assume that 10
// alphanum characters is an ASIN.
// This checks if a string looks like an Amazon ASIN
exports.isASINlike = function isASINlike(asin) {
    var re = /^[A-Za-z0-9]{10}$/;
    return re.test(asin);
};

// Create a book from a search term.
// callback will be called with error+book
exports.create_from_search_term = function(term,callback) {
    var search = exports.detect_search_type(term);
    if (search.type === "EAN") {
        exports.get_from_ean(search.value,callback);
    } else if (search.type === "ASIN") {
        exports.get_from_asin(search.value,callback);
    } else {
        callback("Could not locate book",null);
    }
};

exports.get_from_ean = function(ean,callback) {
    
};

exports.get_from_asin = function(asin,callback) {
};