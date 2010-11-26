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
        },
        teardown: function() { client.quit()}
    }
}).export(module);
