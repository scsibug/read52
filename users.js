// Module to manage users
var sys = require('sys');
var rclient = require('./redisclient');
var pw = require('./passwords');
var _ = require('underscore');
// We store users by a unique numeric ID.
// We also maintain a mapping of email addresses -> ID's

// email must be unique
exports.email_available = function() {
    var client = rclient.getClient();
};

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
    client.set(email_key(email),user_id,callback);
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
exports.make_user_id = function(callback) {
    var client = rclient.getClient();
    client.incr(user_incr,callback);
}

exports.get_user = function(email, callback) {
    new User(email,null, null, false, callback);
}

exports.create_user = function(email, name, password, callback) {
    new User(email, name, password, true, callback);
}

// Get/Create user by email address.
function User (email, name, password, create, callback) { 
    var client = rclient.getClient();
    var context = this;
    // Check if a user with this email exists.
    exports.key_from_email(email,function(err,result) {
        // User exists, pull from DB
        if (!_.isUndefined(result) && !_.isNull(result)) {
            client.get(key_from_id(result), function(err,result) {
                var json = JSON.parse(result);
                context.load_from_json(json);
                callback(err,context);
                return context;
            });
        } else if (!create) {
            callback("Could not find user "+email);
        } else if (create) {
            // Create new user from scratch, save in DB
            exports.make_user_id(function(err,result) {
                if (err) {sys.print("Error: "+err+"\n");callback(err, null);}
                context.id = result;
                context.email = email;
                context.id = result;
                context.creation_date = new Date();
                var obj_string = JSON.stringify(context);
                client.set(key_from_id(result), obj_string, function(err,r) {
                    context.setPassword(password,function() {
                        set_email_key(email,result,function() {
                            callback(err,context);
                            return context;
                        });
                    });
                });
            });
        }
    });
}

User.prototype.load_from_json = function(json) {
    this.id = json.id;
    this.name = json.name;
    this.email = json.email;
    this.creation_date = json.creation_date;
    this.password = json.password;
    this.salt = json.salt;
}

User.prototype.save = function save(callback) {
    var client = rclient.getClient();
    var context = this;
    var obj_string = JSON.stringify(context);
    client.set(key_from_id(context.id),obj_string, function(err,r) {
        set_email_key(context.email,context.id,function() {
            callback(err,context);
            return context;
        });        
    });
}

User.prototype.setPassword = function setPassword(pass,callback) {
    var pw_safe = pw.hash(pass);
    this.password = pw_safe.hashed_pw;
    this.salt = pw_safe.salt;
    this.save(callback);
};

User.prototype.checkPassword = function checkPassword(test_pass,callback) {
    callback(null,(pw.validate(this.password, this.salt, test_pass)));
};

exports.User = User;