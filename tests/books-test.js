var vows = require('vows'),
    assert = require('assert');

var books = require('../books');
var redis = require("redis"),
    client = redis.createClient();
client.select(99,function() {}); // UNIT TEST database

vows.describe('Books').addBatch({
    'Create Book': {
        topic: {title: "book title"},
        'has title': function(book) {
            assert.equal(book.title, "book title");
        }
    }
}).addBatch({
    'Retrieve Existing Book': {
        topic: {title: "book title"},
        'has title': function(book) {
            assert.equal(book.title, "book title");
        }
    }
}).export(module);

// Shutdown redis client
client.quit();