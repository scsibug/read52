var sys = require('sys'),
    vows = require('vows'),
    assert = require('assert');
var books = require('../books');
var rclient = require('../redisclient');
var client = rclient.initClient(99);
client.flushdb();

vows.describe('Books').addBatch({
    'Create Book': {
        topic: function() {
            var context = this;
            var b = new books.Book("9780060733353",function(err,res) {
                context.callback(err,b);
            });
        },
        'uses Book constructor': function(err,book) {
            assert.equal(book.constructor.name, "Book");
        },
        'has ASIN': function(err,book) {
            assert.equal(book.asin, "0060733357");
        },
        'has Title': function(err, book) {
            assert.equal(book.title, "The Confusion (The Baroque Cycle, Vol. 2)");
        },
        'has ISBN': function(err, book) {
            assert.equal(book.isbn, "0060733357");
        },
        'has EAN': function(err, book) {
            assert.equal(book.ean, "9780060733353");
        },
        'has Author': function(err, book) {
            assert.equal(book.author, "Neal Stephenson");
        },
        'has NumberOfPages': function(err, book) {
            assert.equal(book.number_of_pages, "848");
        },
        'has Images': function(err, book) {
            assert.isString(book.amz_img_small);
            assert.isString(book.amz_img_medium);
            assert.isString(book.amz_img_large);
        },
    }
}).addBatch({
    'Key/EAN conversion': {
        topic: "9780060733353",
        'key->ean': function(ean) {
            assert.equal(books.ean_from_key("book:"+ean+":amz"), "9780060733353");
        },
        'ean->key': function(ean) {
            assert.equal(books.key_from_ean(ean), "book:9780060733353:amz");
        }
    }
}).addBatch({
    'Book Listing': {
        topic: function() {
            var context = this;
            // flush db, add two books, and get a full list.
            client.flushdb(function() {
                books.list_books(0,99,context.callback);
            });
        },
        'No books returns array': function(err,booklist) {
            assert.isTrue(_.isArray(booklist));
            assert.equal(booklist.length,0);
        },
    }
}).addBatch({
    'Book Listing': {
        topic: function() {
            var context = this;
            // flush db, add two books, and get a full list.
            client.flushdb(function() {
                new books.Book("9780060733353",function(err,book) {
                    new books.Book("9780471292524",function(err,book) {
                        books.list_books(0,99,context.callback);
                    });
                });
            });
        },
        'returns Books': function(err,booklist) {
            _.each(booklist,function(b) {
                assert.equal(b.constructor.name, "Book");
            });
        },
        'has correct count': function(err, booklist) {
            assert.equal(booklist.length, 2);
        },
        'contains correct books': function(err,booklist) {
            assert.equal(booklist[0].title, "The Confusion (The Baroque Cycle, Vol. 2)");
            assert.equal(booklist[1].title,"Developing Products in Half the Time: New Rules, New Tools, 2nd Edition");
        },
        'matches count': function(err, booklist) {
            books.book_count(function(err,result){
                assert.equal(booklist.length, result);
            });
        },
        teardown: function() {rclient.quit();} // do this in last batch, to ensure clean exit.
    }
}).export(module);
