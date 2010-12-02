var sys = require('sys'),
    vows = require('vows'),
    assert = require('assert');
var users = require('../users');
var rclient = require('../redisclient');
require('underscore');
var client = rclient.initClient(15);

vows.describe('Users').addBatch({
    'Create User': {
        topic: function() {
            var context = this;
            client.flushdb(function() {
                new users.User("scsibug@imap.cc",function(err,res) {
                    context.callback(err,res);
                });
            });
        },
        'has ID': function(err, user) {
            assert.equal(user.id, 1);
            assert.equal(user.email, "scsibug@imap.cc");
        },
        'has email': function(err, user) {
            assert.equal(user.email, "scsibug@imap.cc");
        },
        'has creation date': function(err, user) {
            assert.instanceOf(user.creation_date,Date);
        },
        ', Second User': {
            topic: function(user1) {
                var context = this;
                new users.User("user@example.com",function(err,user2) {
                    context.callback(err, user1, user2);
                });
            },
            'has different email': function(err,user1,user2) {
                assert.notEqual(user1.email,user2.email);
            },
            'unique ID': function(err,user1,user2) {
                assert.notEqual(user1.id,user2.id);
            },
            'has methods': function(err,user1,user2) {
                assert.isFunction(user2.setPassword);
            }
        }
    }
}).addBatch({
    'Password': {
        topic: function() {
            var context = this;
            client.flushdb(function() {
                new users.User("user@example.com",function(err,user) {
                    user.setPassword("espresso", function(err,res) {
                        context.callback(err, user);
                    });
                });
            });
        },
        'check password': function(err,user) {
            user.checkPassword("espresso", function(err,res) {
                assert.isTrue(res);
            });
            user.checkPassword("espress0", function(err,res) {
                assert.isFalse(res);
            });
        },
        'password not plaintext': function(err,user) {
            assert.notEqual(user.password,"espresso");
        },
        'password retrieved from DB': function(err,user) {
            new users.User("user@example.com",function(err,dbuser) {
                dbuser.checkPassword("espresso", function(err,res) {
                    assert.isTrue(res);
                });
                dbuser.checkPassword("espress0", function(err,res) {
                    assert.isFalse(res);
                });
            });
        }
    }
}).addBatch({
    'Close Connection (HACK for nested context teardown bug)': {
        topic: function() {
            return 1;
        },
        'close': function(id) {
            assert.equal(id,1);
            client.quit();
        }
    }
}).export(module);
