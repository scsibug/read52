var sys = require('sys'),
    vows = require('vows'),
    assert = require('assert');
var books = require('../books');
var redis = require("redis"),
    client = redis.createClient();

client.select(99,function(err,result) {
    // Clear out this test database
    client.flushdb();
});

vows.describe('Books').addBatch({
    'Create Book': {
        topic: function() {
            books.save_book(client,"9780060733353",this.callback);
        },
        'has ASIN': function(err,book) {
            assert.equal(book.ASIN, "0060733357");
        },
        'has Title': function(err, book) {
            assert.equal(book.ItemAttributes.Title, "The Confusion (The Baroque Cycle, Vol. 2)");
        },
        'has ISBN': function(err, book) {
            assert.equal(book.ItemAttributes.ISBN, "0060733357");
        },
        'has Author': function(err, book) {
            assert.equal(book.ItemAttributes.Author, "Neal Stephenson");
        },
        'has NumberOfPages': function(err, book) {
            assert.equal(book.ItemAttributes.NumberOfPages, "848");
        }
    }
}).addBatch({
    'Retrieve Book': {
        topic: function() {
            var context = this;
            client.flushdb(function() {
                books.save_book(client,"9780060733353",function() {
                    books.query_book(client,"9780060733353",context.callback);
                });
            });
        },
        'has ASIN': function(book) {
            assert.equal(book.ASIN, "0060733357");            
        },
        'has Title': function(err, book) {
            assert.equal(book.ItemAttributes.Title, "The Confusion (The Baroque Cycle, Vol. 2)");
        },
        'has ISBN': function(err, book) {
            assert.equal(book.ItemAttributes.ISBN, "0060733357");
        },
        'has Author': function(err, book) {
            assert.equal(book.ItemAttributes.Author, "Neal Stephenson");
        },
        'has NumberOfPages': function(err, book) {
            assert.equal(book.ItemAttributes.NumberOfPages, "848");
        },
    }
}).addBatch({
    'Book Listing': {
        topic: function() {
            var context = this;
            // flush db, add two books, and get a full list.
            client.flushdb(function() {
                books.save_book(client,"9780060733353",function() {
                    books.save_book(client,"9780471292524",function() {
                        books.list_books(client,0,99,context.callback);
                    });
                });
            });
        },
        'has correct count': function(err, booklist) {
            assert.equal(booklist.length, 2);
        },
        'contains correct books': function(err,booklist) {
            assert.equal(booklist[0].ItemAttributes.Title, "The Confusion (The Baroque Cycle, Vol. 2)");
            assert.equal(booklist[1].ItemAttributes.Title,"Developing Products in Half the Time: New Rules, New Tools, 2nd Edition");
        },
        teardown: function() { client.quit();}
    }
}).export(module);
