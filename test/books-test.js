var sys = require('sys'),
    vows = require('vows'),
    assert = require('assert');
var rclient = require('../redisclient');
var books = require('../books');
sys.print("initing client from test\n");
var client = rclient.initClient(99);
rclient.getClient();
client.flushdb();

vows.describe('Books').addBatch({
    'Create Book': {
        topic: function() {
            var context = this;
            var b = new books.Book("9780060733353",function(err,res) {
                context.callback(err,b);
            });
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
        'has Author': function(err, book) {
            assert.equal(book.author, "Neal Stephenson");
        },
        'has NumberOfPages': function(err, book) {
            assert.equal(book.number_of_pages, "848");
        }
    }
}).addBatch({
    'Retrieve Book w/o AWS': {
        topic: function() {
            var context = this;
            client.flushdb(function() {
                new books.Book("9780060733353",function() {
                    books.query_book("9780060733353",context.callback);
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
                new books.Book("9780060733353",function() {
                    new books.Book("9780471292524",function() {
                        books.list_books(0,99,context.callback);
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
        'matches count': function(err, booklist) {
            books.book_count(function(err,result){
                assert.equal(booklist.length, result);
            });
        },
        teardown: function() {rclient.quit();} // do this in last batch, to ensure clean exit.
    }
}).export(module);
