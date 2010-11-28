var sys = require('sys'),
    vows = require('vows'),
    assert = require('assert');
var users = require('../users');
var rclient = require('../redisclient');
var client = rclient.initClient(99);
client.flushdb();

vows.describe('Users').addBatch({
    'Create User': {
        topic: function() {
            var context = this;
            var user = new users.User("scsibug@imap.cc",function(err,res) {
                context.callback(err,user);
            });
        },
        'has ID': function(err, user) {
            assert.equal(user.id, 1);
            assert.equal(user.email, "scsibug@imap.cc");
        },
        'has email': function(err, user) {
            assert.equal(user.email, "scsibug@imap.cc");
        },
        teardown: function() {rclient.quit();} // do this in last batch, to ensure clean exit.
    }
}).export(module);
