// Helpers for safely dealing with passwords, hashes, and salts
var sys = require('sys'),
crypto = require('crypto'),
algo = "sha256"
encoding = "base64";

// Create a unique value to use as a per-user salt.
exports.create_salt = function() {
    var hash = crypto.createHash(algo);
    hash.update(new Date().getTime());
    return hash.digest(encoding);
}

var form_raw_pw = function(password, salt) {
    return (password + "|:|" + salt);
}

// Given a password, returns the 'hashed_pw' and 'salt' that
// should be stored in a database.
exports.hash = function(password) {
    var hash = crypto.createHash(algo);
    var salt = exports.create_salt();
    hash.update(form_raw_pw(password,salt));
    return {'hashed_pw':(hash.digest(encoding)),
            'salt':salt};
}

// Test a password against a hashed password and salt.
exports.validate = function(hashed_pw, salt, test_password) {
    var testpw = crypto.createHash(algo);
    testpw.update(form_raw_pw(test_password,salt));
    return hashed_pw == testpw.digest(encoding);
}