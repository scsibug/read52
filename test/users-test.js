var sys = require('sys'),
    vows = require('vows'),
    assert = require('assert');
var users = require('../users');
var rclient = require('../redisclient');
require('underscore');
var client = rclient.initClient(15);

vows.describe('Users').addBatch({
    'A user': {
        topic: function() {
            var context = this;
            client.flushdb(function() {
                (new users.create({email:"scsibug@imap.cc",name:"Greg",password:"123"},function(err,res) {
                    context.callback(err,res);
                }));
            });
        },
        'has ID': function(err, user) {
            if (err) {
                console.log(err);
            }
            assert.equal(user.id, 1);
            assert.equal(user.email, "scsibug@imap.cc");
        },
        'has email': function(err, user) {
            assert.equal(user.email, "scsibug@imap.cc");
        },
        'has creation date': function(err, user) {
            assert.instanceOf(user.creation_date,Date);
        },
        'and a second user': {
            topic: function(user1) {
                var context = this;
                (new users.create({email:"user@example.com",name:"user",password:"123"},function(err,user2) {
                    context.callback(err, user1, user2);
                }));
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
        topic: "espresso",
        'for new user': {
            topic: function(pw) {
                var context = this;
                client.flushdb(function() {
                    users.create({email:"user@example.com",name:"user",password:"123"},function(err,user) {
                        user.setPassword(pw);
                        user.save(function(err,res) {
                            context.callback(err, user, pw);
                        });
                    });
                });
            },
            'check password': function(err,user,pw) {
                user.checkPassword(pw, function(err,res) {
                    assert.isTrue(res);
                });
                user.checkPassword(pw+"0", function(err,res) {
                    assert.isFalse(res);
                });
            },
            'password not plaintext': function(err,user) {
                assert.notEqual(user.password,"espresso");
            },
            'and retrieved user': {
                topic: function (user1,pw) {
                    var context = this;
                    users.get_by_email(user1.email,function(err,dbuser) {
                        dbuser.checkPassword(pw, function(err,res) {
                            context.callback(err,res);
                        });
                    });
                },
                'password matches': function(err,res) {
                    assert.isTrue(res);
                }
            }
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
