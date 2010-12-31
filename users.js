// Module to manage users
var sys = require('sys');
var rclient = require('./redisclient');
var pw = require('./passwords');
var _ = require('underscore');
// We store users by a unique numeric ID.
// We also maintain a mapping of email addresses -> ID's

var user_incr = "user_incr";
var user_prefix = "user:";
var user_mail_prefix = "user_email:";
exports.user_badges_zset = function(userid) {
    return (user_prefix+userid+":badgeset");
}

// Form the key used for looking up a userID from an email.
// Performing a GET on the result returns the ID of the user.
var email_key = function(email) {
    return user_mail_prefix+email;
};

// Get user key from email
exports.key_from_email = function (email,callback) {
    var client = rclient.getClient();
    client.get(email_key(email),callback);
};

// Create email -> ID mapping
var set_email_key = function(email, user_id, callback) {
    var client = rclient.getClient();
    // use setnx to prevent emails from overwriting others.
    client.setnx(email_key(email),user_id,callback);
};

var key_from_id = function (id) {
    return (user_prefix+id+":info");
};

// Create a new unique user ID
var make_user_id = function(callback) {
    var client = rclient.getClient();
    client.incr(user_incr,callback);
};

exports.user_id_exists = function(id, callback) {
    var client = rclient.getClient();
    client.exists(key_from_id(id),callback);
};

exports.get_by_email = function(email, callback) {
    // Map email to user ID
    exports.key_from_email(email,function(err,result) {
        if (err) {
            callback("User does not exist",null);
        } else {
            exports.get_by_id(result,callback);
        }
    });
};

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

exports.get_by_id = function(id,callback) {
    get_by_key(key_from_id(id),callback);
};

var get_by_key = function(key, callback) {
    var client = rclient.getClient();
    // Lookup user by ID directly
    client.get(key, function(err,result) {
        if (err) {
            console.log("Error getting user by key:", err);
        }
        console.log("result is",result);
        var json = JSON.parse(result); // seems to die on occasion...maybe due to redis reconnect?
        var user = new User(json);
        callback(err,user);
    });
};

// Creating new user
//  users.create({name="foo", email="foo@bar.com", name="Foo Bar", password="fb"},callback)
exports.create = function(attrs, callback) {
   if (!_.isNumber(attrs.creation_date)) {
        attrs.creation_date = +new Date();
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
};

User.prototype.load_from_json = function(json) {
    this.id = json.id;
    this.name = json.name;
    this.email = json.email;
    this.creation_date = json.creation_date;
    this.password_hash = json.password_hash;
    this.salt = json.salt;
};

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
};

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

exports.get_users = function(callback) {
    var client = rclient.getClient();
    var replies = 0;
    var users = [];
    // hack, should make a set if we really want this functionality.
    client.keys(key_from_id("*"), function(err, reply) {
        if (err || _.isNull(reply)) {
            callback(err,users);
            return;
        }
        for(var i=0; i < reply.length; i++) {
            var user_key = reply[i].toString();
            get_by_key(user_key,function(err,thisuser) {
                if (err) {
                    console.log("Error loading user key:",user_key);
                } else {
                    users.push(thisuser);
                }
                replies++;
                if (replies == reply.length) {
                    callback(err,users);
                }
            });
        }
    });
};

exports.User = User;