// Module to manage books
// Stores all the metadata we get from Amazon's Product API.
var sys = require('sys');
require('underscore');
var book_lookup = require('./book_lookup');

// Take a redis client handle, and EAN/ISBN-13 and return book
// structure, querying Amazon and saving into Redis if necessary.
exports.get_book = function(client, ean, callback) {
    // check if we've saved information about this book before.
    ean_clean = ean.replace(/-/g,"");
    client.get("book:"+ean_clean+":ean", function(err,result) {
        if (err) {
            sys.print('Error: ' + err + "\n");
        } else if (result==null) {
            // book is not in database, need to query AWS and save
            exports.save_book(client,ean_clean,callback);
        } else {
            // book exists, just need to query for it
            exports.query_book(client,ean_clean,callback);
        }
    });
}

var key_from_ean = function(ean) {"book:"+ean+":amz"}

// Query Redis for a book, but do not invoke AWS.
exports.query_book = function(client,ean,callback) {
    client.get(key_from_ean(ean), function(err,result) {
        if (err) {
            callback(err,null)
        } else {
            callback(err,JSON.parse(result))
        }
    });
}

// Lookup a book through AWS, save into Redis store, and return book.
exports.save_book = function(client, ean, callback) {
    book_lookup.isbn_lookup(ean, function(err, result) {
        if (err) {
            sys.print('Error: ' + err + "\n");
            callback(err,null);
        } else {
            if(! _.isUndefined(result)) {
                client.set(key_from_ean(ean), JSON.stringify(result) ,function(err,set_result){
                    if (err) {
                        sys.print('Error: ' + err + "\n");
                        callback(err,null);
                    } else {
                        callback(null,result);
                    }
                });
            }
        }
    });
}

exports.listBooks = function(client, userCallback, endCallback) {
    client.keys("book:*:title", function(err,reply){
        var replies = 0;
        for(var i=0; i < reply.length; i++) {
            client.get(reply[i], function(err,title){
                userCallback(title);
                replies++;
                if (replies == reply.length) {endCallback();}
            });
        }
    });
}
