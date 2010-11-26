var sys = require('sys'),
    vows = require('vows'),
    assert = require('assert');
var book_lookup = require('../book_lookup');

// Test a known book for common values
vows.describe('Amazon Book Lookup').addBatch({
    'Lookup Book': {
        topic: function () {
            book_lookup.isbn_lookup("9780060733353",this.callback);
        },
        'has ASIN': function(err, book) {
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
}).export(module);
