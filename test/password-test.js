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
            var hash = pw.hash(this_pw);
            return {password: this_pw,
                    salt: hash.salt,
                    hash: hash.hashed_pw
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

