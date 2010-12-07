// Module to manage users
var sys = require('sys');
var rclient = require('./redisclient');
var pw = require('./passwords');
var _ = require('underscore');
// We store users by a unique numeric ID.
// We also maintain a mapping of email addresses -> ID's

const user_incr = "user_incr";
const user_prefix = "user:";
const user_mail_prefix = "user_email:";

// Get user key from email
exports.key_from_email = function (email,callback) {
    var client = rclient.getClient();
    client.get(email_key(email),callback);
}

// Create email -> ID mapping
var set_email_key = function(email, user_id, callback) {
    var client = rclient.getClient();
    // use setnx to prevent emails from overwriting others.
    client.setnx(email_key(email),user_id,callback);
}

// Form the key used for looking up a userID from an email.
// Performing a GET on the result returns the ID of the user.
var email_key = function(email) {
    return user_mail_prefix+email;
}

var key_from_id = function (id) {
    return (user_prefix+id+":info");
}

// Create a new unique user ID
var make_user_id = function(callback) {
    var client = rclient.getClient();
    client.incr(user_incr,callback);
}

exports.get_by_email = function(email, callback) {
    // Map email to user ID
    exports.key_from_email(email,function(err,result) {
        if (err) {
            callback("User does not exist",null);
        } else {
            exports.get_by_id(result,callback);
        }
    });
}

exports.get_by_id = function(id, callback) {
    var client = rclient.getClient();
    // Lookup user by ID directly
    client.get(key_from_id(id), function(err,result) {
        var json = JSON.parse(result);
        var user = new User(json);
        callback(err,user);
    });
}

// Creating new user
//  users.create({name="foo", email="foo@bar.com", name="Foo Bar", password="fb"},callback)
exports.create = function(attrs, callback) {
    if (!_.isDate(attrs.creation_date)) {
        attrs.creation_date = new Date();
    }
    // Attempt to find an existing account ID with the same email.
    exports.key_from_email(attrs.email,function(err,result) {
        if (err) {
            console.log("Error: ",err);
            callback(err,null);
        } else if (!_.isUndefined(result)) {
            make_user_id(function(err,result) {
                if (err) {
                    console.log("Error: ",err);
                } else {
                    attrs.id = result;
                    var user = new User(attrs);
                    user.save(callback);
                }
            });
        } else {
            callback("User with email already exists",null);
        }
    });
}

// Create a user object from a set of attributes.
function User (attrs) {
    var context = this;
    context.load_from_json(attrs);
    // new users may have 'password' attribute set, turn this into password_hash/salt attributes.
    if (_.isString(attrs.password)) {
        context.setPassword(attrs.password);
        attrs.password = undefined; //forget password
    }
    return context;
}

User.prototype.load_from_json = function(json) {
    this.id = json.id;
    this.name = json.name;
    this.email = json.email;
    this.creation_date = json.creation_date;
    this.password_hash = json.password_hash;
    this.salt = json.salt;
}

User.prototype.save = function save(callback) {
    var client = rclient.getClient();
    var context = this;
    var obj_string = JSON.stringify(context);
    client.set(key_from_id(context.id),obj_string, function(err,r) {
        if (err) {callback(err,null);}
        set_email_key(context.email,context.id,function(seterr,didset) {
            callback(seterr,context);
            return context;
        });
    });
}

// Set user password and update salt/hash.
User.prototype.setPassword = function setPassword(pass) {
    var pw_safe = pw.hash(pass);
    this.password_hash = pw_safe.hashed_pw;
    this.salt = pw_safe.salt;
    return;
};

User.prototype.checkPassword = function checkPassword(test_pass,callback) {
    callback(null,(pw.validate(this.password_hash, this.salt, test_pass)));
};

exports.User = User;