// Module to manage books
// Stores all the metadata we get from Amazon's Product API.
var sys = require('sys');
require('underscore');
var rclient = require('./redisclient');
var book_lookup = require('./book_lookup');

exports.key_from_ean = function (ean) {
    return ("book:"+ean+":amz");
}
exports.ean_from_key = function (key) {
    return key.replace(/^book:/,"").replace(/:amz$/,"");
}
var bookzset = "book_zset";

exports.Book = function Book (ean,callback) {
    // need to check for valid EAN, or convert from ISBN-10
    var context = this;
    exports.get_book(ean,function(err,result) {
            context.title = result.ItemAttributes.Title;
            context.ean = result.ItemAttributes.EAN;
            context.asin = result.ASIN;
            context.author = result.ItemAttributes.Author;
            context.isbn = result.ItemAttributes.ISBN;
            context.number_of_pages = result.ItemAttributes.NumberOfPages;
            callback(err,context);
    });
}

// Take a redis client handle, and EAN/ISBN-13 and return book
// structure, querying Amazon and saving into Redis if necessary.
exports.get_book = function(ean, callback) {
    var client = rclient.getClient();
    // check if we've saved information about this book before.
    var ean_clean = ean.replace(/-/g,"");
    client.get(exports.key_from_ean(ean), function(err,result) {
        if (err) {
            sys.print('Error: ' + err + "\n");
        } else if (result==null) {
            // book is not in database, need to query AWS and save
            exports.save_book(ean_clean,callback);
        } else {
            // book exists, just need to query for it
            exports.query_book(ean_clean,callback);
        }
    });
}

// Query Redis for a book, but do not invoke AWS.
exports.query_book = function(ean,callback) {
    var client = rclient.getClient();
    client.get(exports.key_from_ean(ean), function(err,result) {
        if (err) {
            callback(err,null);
        } else {
            callback(err,JSON.parse(result));
        }
    });
}

// Lookup a book through AWS, save into Redis store, and return book.
exports.save_book = function(ean, callback) {
    var client = rclient.getClient();
    book_lookup.isbn_lookup(ean, function(err, result) {
        if (err) {
            sys.print('Error: ' + err + "\n");
            callback(err,null);
        } else {
            if(! _.isUndefined(result)) {
                var book_key = exports.key_from_ean(ean);
                client.set(book_key, JSON.stringify(result) ,function(err,set_result){
                    if (err) {
                        sys.print('Error: ' + err + "\n");
                        callback(err,null);
                    } else {
                        // Add this key to the set of books
                        client.zadd(bookzset,ean,book_key);
                        callback(null,result);
                    }
                });
            }
        }
    });
}

// How many books exist in the DB?
exports.book_count = function(callback) {
    var client = rclient.getClient();
    client.zcard(bookzset,callback);
}

exports.list_books = function(start, end, callback) {
    var client = rclient.getClient();
    client.zrange(bookzset,start,end, function(err,reply){
        var replies = 0;
        var books = new Array();
        if (err) {
            sys.print('Error: ' + err + "\n");
        }
        for(var i=0; i < reply.length; i++) {
            var ean = exports.ean_from_key(reply[i].toString());
            new exports.Book(ean, function(err,book){
                books.push(book);
                replies++;
                if (replies == reply.length) {
                    callback(err, books);
                }
            });
        }
    });
}