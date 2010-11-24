// Module to manage books
// Stores all the metadata we get from Amazon's Product API.
var sys = require('sys');
var book_lookup = require('./book_lookup');
// Creating books is done by:
//  * Checking if the ISBN already exists in our database (if so, we're already done)
//  * Querying Amazon for the book's metadata.
//  * Set the following attributes for the key prefix "book:[ISBN]:"
//    * ean (ISBN-13, always set if the book exists)
//    * title
//    * pages
//    * asin
//    * isbn
//    * author
//    * amz_detail_url
//    * amz_img_small (JSON with URL, Height, Width properties)
//    * amz_img_med
//    * amz_img_large
//    * amz  (should be the result of the isbn_lookup function from book_lookup)


// Take a redis client handle, and EAN/ISBN-13 and return book
// structure, querying Amazon and saving into Redis if necessary.
exports.get_book = function(client, ean, callback) {
    // check if we've saved information about this book before.
    ean_clean = ean.replace(/-/g,"");
    client.get("book:"+ean_clean+":ean", function(err,result) {
        if (err) {
            sys.print('Error: ' + err + "\n");
        } else if (result==null) {
            // book is not in database
            save_book(client,ean_clean,callback);
        } else {
            // book exists, just need to query for it
            query_book(client,ean_clean,callback);
        }
    });
}

exports.save_book = function(client, ean) {
    book_lookup.isbn_lookup(ean, function(err, result) {
        if (err) {
            sys.print('Error: ' + err + "\n");
        } else {
            sys.print(sys.inspect(result));
            // fire and forget a bunch of updates
            if(isDef(result.ItemAttributes.EAN)) {
                client.set("book:"+ean+":ean", result.ItemAttributes.EAN);
            }
            if(isDef(result.ItemAttributes.Title)) {
                client.set("book:"+ean+":title", result.ItemAttributes.Title);
            }
            if(isDef(result.ItemAttributes.NumberOfPages)) {
                client.set("book:"+ean+":pages", result.ItemAttributes.NumberOfPages);
            }
            if(isDef(result.ASIN)) {
                client.set("book:"+ean+":asin", result.ASIN);
            }
            if(isDef(result.ItemAttributes.ISBN)) {
                client.set("book:"+ean+":isbn", result.ItemAttributes.ISBN);
            }
            if(isDef(result.DetailPageURL)) {
                client.set("book:"+ean+":amz_detail_url", result.DetailPageURL);
            }
            if(isDef(result.SmallImage)) {
                client.set("book:"+ean+":amz_img_small", result.SmallImage);
            }
            if(isDef(result.MediumImage)) {
                client.set("book:"+ean+":amz_img_med", result.MediumImage);
            }
            if(isDef(result.LargeImage)) {
                client.set("book:"+ean+":amz_img_large", result.LargeImage);
            }
            if(isDef(result)) {
            client.set("book:"+ean+":amz", result);
            }
            if(isDef(result.ItemAttributes.Author)) {
                client.set("book:"+ean+":author", result.ItemAttributes.Author);
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

var isDef = function(x) {if (typeof x != "undefined" && x !== null) {return true;};}