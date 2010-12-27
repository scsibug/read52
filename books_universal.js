// Module to manage books with arbitrary identification and retrieval schemes.
var sys = require('sys');
var _ = require('underscore');
require('./lib/underscore.strings');
var strings = require('./lib/underscore.strings');
_.mixin(_s); // extend underscore with strings
var rclient = require('./redisclient');
var isbn = require('./isbn');

// Each book-thing gets a unique number
var bookincr = "book:incr";

// Collection of all book keys, scores are created_date field
var bookzset = "book:allbycreated";

// We maintain a mapping of URIs (ISBN/ASIN,etc.) to book ID's.
// This allows for a quick lookup of arbitrary identifiers to a book.
var book_uri_hash = "book:uri"

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

exports.isbn_to_uri = function(i) {
    var isbn_num = isbn.to_isbn_13(i);
    if (_.isNull(isbn_num)) {
        return null
    } else {
        return "urn:isbn:"+isbn_num;
    }
}

exports.asin_to_uri = function(asin) {
    if (_.isNull(asin)||!exports.isASINlike(asin)) {
        return null
    } else {
        return "http://amzn.com/"+asin;
    }
}


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
        //exports.get_from_asin(search.value,callback);
        callback("We do not support ASIN (Amazon) identifiers just yet...",null);
    } else {
        callback("Could not locate book",null);
    }
};

// Get the key for a book object from its unique ID
function id_to_key (id) {
    return "book:id:"+id;
};

// Get an existing book via ID
exports.get_from_id = function(id, callback) {
    
}

// Get an existing book via EAN
exports.get_from_ean = function(ean,callback) {
    // Find book ID
var bookeanzset = "ean_book_hash"
// Hash of ASINs to book ID
var bookeanzset = "asin_book_hash"
};

exports.get_from_asin = function(asin,callback) {
};

function Book (attrs) {
    var context = this;
    context.load_from_json(attrs);
    return context;
}

Book.prototype.load_from_json = function(json) {
    var context = this;
    _.select(reading_keys, function (key) {
        context[key] = json[key];
    });
};

// Save a book to redis
Book.prototype.save = function save(callback) {
    var client = rclient.getClient();
    var context = this;
    var obj_string = JSON.stringify(context);
    client.set(id_to_key(context.id),obj_string, function(err,r) {
        if (err) {
            callback(err,null);
        } else {
            // callback when the book itself is saved
            callback(err,context);
            // update hash entries for ean/asin
            context.update_indexes(null);
        }
    });
    
};


Book.prototype.update_indexes = function(callback) {
    var client = rclient.getClient();
    // if EAN exists, use that and clear out other indexes.
    // if ASIN exists, use that and clear out other indexes.
    var book_ean_prefix = "book:ean:";
    var book_asin_prefix = "book:asin:";
    if (!_.isNull(this.ean) && (!_.isUndefined(this.ean))) {
        client.set(book_ean_prefix+this.ean,this.id,callback);
        client.hdel(book_asin_prefix+this.asin,this.asin,this.id,callback);
    } else if (!_.isNull(this.asin) && (!_.isUndefined(this.asin))) {
        client.hset(this.ean,this.id,callback);
    }
}

Book.prototype.toJSON = function() {
    var json = {};
    var context = this;
    _.select(reading_keys, function (key) {
        json[key] = context[key];
    });
    return json;
};


exports.Book = Book;