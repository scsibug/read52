var sys = require('sys'),
    vows = require('vows'),
    assert = require('assert');
var isbn = require('../isbn');
require('underscore');

vows.describe('ISBN').addBatch({
    'Conversion': {
        topic: function() {
            return {
                "0060733357" : "9780060733353",
                "0226320553" : "9780226320557",
                "0316005401" : "9780316005401",
                "031600538X" : "9780316005388",
                "0446537519" : "9780446537513",
                "0760757615" : "9780760757611",
                   };
        },
        'convert to ISBN-13': function(isbns) {
            _.each(isbns, function(isbn_13,isbn_10) {
                assert.equal(isbn_13, isbn.to_isbn_13(isbn_10));
            });
        },
    },
    'Cleanup': {
        topic: function() {
            return {
                "0-060733-35-7" : "9780060733353",
                "0-226320-55-3" : "9780226320557",
                "0-316005-40-1" : "9780316005401",
                "0-316005-38-X" : "9780316005388",
                "0-446537-51-9" : "9780446537513",
                "0-760757-61-5" : "9780760757611",
                "978-0-060733-35-3" : "9780060733353",
                "978-0-226320-55-7" : "9780226320557",
                "978-0-316005-40-1" : "9780316005401",
                "978-0-316005-38-8" : "9780316005388",
                "978-0-446537-51-3" : "9780446537513",
                "978-0-760757-61-1" : "9780760757611",
                   };
        },
        'cleanup dashes/spaces': function(isbns) {
            _.each(isbns, function(clean,dirty) {
                assert.equal(clean, isbn.to_isbn_13(dirty));
            });
        },
    },
    'Invalid': {
        'handle empty': function() {
            assert.isNull(isbn.to_isbn_13(""));
        },
        'handle too-short': function() {
            assert.isNull(isbn.to_isbn_13("006073335"));
            assert.isNull(isbn.to_isbn_13("00607"));
        },
        'handle too-long': function() {
            assert.isNull(isbn.to_isbn_13("97800607333533"));
        },
        'handle length in-between': function() {
            assert.isNull(isbn.to_isbn_13("97800607333"));
            assert.isNull(isbn.to_isbn_13("978006073335"));
        },
        'handle null': function() {
            assert.isNull(isbn.to_isbn_13(null));
        },
        'handle undefined': function() {
            assert.isNull(isbn.to_isbn_13(undefined));
        },
        'handle invalid alpha': function() {
            assert.isNull(isbn.to_isbn_13("978A060733353"));
            assert.isNull(isbn.to_isbn_13("006C733357"));
        },
    }
}).export(module);

