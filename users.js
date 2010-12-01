// Module to manage users
var sys = require('sys');
var rclient = require('./redisclient');

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
    sys.print("make_user_id called\n");
    var client = rclient.getClient();
    client.incr(user_incr,callback);
}

// Get/Create user by email address.
exports.User = function User (email, callback) {
    var client = rclient.getClient();
    var context = this;
// Check if a user with this email exists.
    exports.key_from_email(email,function(err,result) {
        // User exists, pull from DB
        if (!_.isUndefined(result) && !_.isNull(result)) {
            client.get(key_from_id(result), function(err,result) {
                context = JSON.parse(result);
                callback(err,context);
                return context;
            });
        } else {
            // Create new user from scratch, save in DB
            exports.make_user_id(function(err,result) {
                if (err) {sys.print("Error: "+err+"\n");callback(err,undefined);}
                context.email = email;
                context.id = result;
                context.creation_date = new Date();
                var obj_string = JSON.stringify(context);
                client.set(key_from_id(result), obj_string, function(err,r) {
                    set_email_key(email,result,function() {
                        callback(err,context);
                        return context;
                    });
                });
            });
        }
    });
}
