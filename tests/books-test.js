var vows = require('vows'),
    assert = require('assert');

var books = require('../books');

vows.describe('Books').addBatch({
    'A book': {
        topic: {title: "book title"},
        'has title': function(book) {
            assert.equal(book.title, "book title");
        }
    }
}).export(module);