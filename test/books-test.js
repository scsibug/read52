var sys = require('sys'),
    vows = require('vows'),
    assert = require('assert');
var books = require('../books');
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
}).addBatch({
    'Good ASINs': {
        topic: function() {
            return "B00005N5PF";
        },
        'like': function(asin) {
            assert.isTrue(books.isASINlike(asin));
        },
    },
    'Bad ASINs': {
        topic: function() {
            return "B00005N5PF+";
        },
        'not like': function(asin) {
            assert.isFalse(books.isASINlike(asin));
        },
    }
}).addBatch({
    'ISBN': {
        topic: function() {
            return "9780312863555";
        },
        'converts to URI': function(isbn) {
            assert.equal(books.isbn_to_uri(isbn), "urn:isbn:9780312863555");
        }
    },
    'ASIN': {
        topic: function() {
            return "020530902X";
        },
        'converts to URI': function(asin) {
            assert.equal(books.asin_to_uri(asin), "http://amzn.com/020530902X");
        }
    }
}).export(module);

