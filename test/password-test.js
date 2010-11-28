var sys = require('sys'),
    vows = require('vows'),
    assert = require('assert');
var pw = require('../passwords');
require('underscore');

vows.describe('Passwords').addBatch({
    'Salt creation': {
        topic: function() {
            return pw.create_salt()
        },
        'salts are unique': function(salt) {
            setTimeout(function() {
                assert.notEqual(salt, pw.create_salt());
            }, 2);
        },
    },
    'Password Hashing': {
        topic: function() {
            var this_pw = 'NodeRulez!';
            var this_salt = pw.create_salt();
            var this_hash = pw.hash(this_pw,this_salt);
            return {password: this_pw,
                    salt: this_salt,
                    hash: this_hash,
                   };
        },
        'validation of correct password': function(data) {
            assert.isTrue(pw.validate(data.hash,data.salt,data.password));
        },
        'rejection of incorrect password': function(data) {
            assert.isFalse(pw.validate(data.hash,data.salt,"another password"));
        }
    }
}).export(module);

