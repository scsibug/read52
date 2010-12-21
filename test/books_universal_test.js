var sys = require('sys'),
    vows = require('vows'),
    assert = require('assert');
var books = require('../books_universal');
var rclient = require('../redisclient');
var client = rclient.initClient(15);
var _ = require('underscore');
client.flushdb();
vows.describe('Books').addBatch({
    'EAN': {
        topic: function() {
            return books.detect_search_type('978-0452011878');
        },
        'search type&value': function(val) {
            assert.deepEqual(val, {type: "EAN", value: "9780452011878"});
        },
    },
    'ISBN-10': {
        topic: function() {
            return books.detect_search_type('0452011876');
        },
        'search type&value': function(val) {
            assert.deepEqual(val, {type: "EAN", value: "9780452011878"});
        },
    },
    'ASIN': {
        topic: function() {
            return books.detect_search_type('B003V8B5XO');
        },
        'search type&value': function(val) {
            assert.deepEqual(val, {type: "ASIN", value: "B003V8B5XO"});
        },
        teardown: function() {
            client.quit();
        }
    }
}).export(module);

