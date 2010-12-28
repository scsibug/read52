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
// Return an object with type/value/uri attributes:
//  type is "EAN", "ASIN", or "unknown".
//  value will be the "sanitized" term.
//  uri is formed from the value.
exports.detect_search_type = function (search) {
    var result = {}
    var search = _.trim(search);
    var ean = isbn.to_isbn_13(search);
    if (!_.isNull(ean)) {
        result.type="EAN";
        result.value=ean
        result.uri=exports.isbn_to_uri(ean);
    } else if (exports.isASINlike(search)) {
        result.type="ASIN";
        result.value=search;
        result.uri=exports.asin_to_uri(search);
    } else {
        result.type="unknown";
        result.value=search;
        result.uri=null;
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

// Create a book from URI
// callback will be invoked with error,book
exports.create_from_identifier = function(term,callback) {
    var search = exports.detect_search_type(term);
    var uri = search.uri;
    if (!_.isNull(uri)) {
        // Find existing book
        exports.id_from_uri(uri,function(err,result) {
            if (err) {
                callback("Error finding book ID",null);
            } else if (_.isNull(result)) {
                // if book not found, send URI to book lookup service
                book_lookup.lookup(search.type,uri, function(err,lookup_book) {
                    var b = new Book(lookup_book);
                    b.save(function() {
                        callback(null,b);
                    });
                });
                callback("Book could not be found",null);
            } else {
                // book already exists
                exports.get_from_id(result,callback);
            }
        });
    } else {
        // error out... book URI couldn't be determined
        callback("Book must be identified by an ISBN or Amazon ASIN.",null);
    }
};

// Get the key for a book object from its unique ID
function id_to_key (id) {
    return "book:info:"+id;
};

// Get an existing book via ID
exports.get_from_id = function(id, callback) {
    var key = id_to_key(id);
    console.log("getting key",key);
}

// Get an existing book via URI
exports.id_from_uri = function(uri,callback) {
    var client = rclient.getClient();
    client.hget(book_uri_hash,uri,callback);
};

function Book (attrs) {
    var context = this;
    context.load_from_json(attrs);
    return context;
}

Book.prototype.load_from_json = function(json) {
    var context = this;
    _.select(book_keys, function (key) {
        context[key] = json[key];
    });
};

// Save a book to redis
// this writes JSON to the :info key, and updates the
// hash that points URIs to the book ID.
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
    var actions_complete = 0; var actions_total = 2;
    var notify = function(err,result) {
        actions_complete++;
        if (actions_complete == actions_total) {
            if (!_.isNull(callback)) callback();
        }
    }
    if (!_.isNull(this.ean) && (!_.isUndefined(this.ean))) {
        client.hset(book_uri_hash,exports.isbn_to_uri(this.ean),this.id,notify)
    }
    if (!_.isNull(this.asin) && (!_.isUndefined(this.asin))) {
        client.hset(book_uri_hash,exports.asin_to_uri(this.asin),this.id,notify);
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