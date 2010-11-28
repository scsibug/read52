// Module to manage users
var sys = require('sys');
var rclient = require('./redisclient');

// We store users by a unique numeric ID.
// We also maintain a mapping of email addresses -> ID's

// email must be unique
exports.email_available = function() {
    var client = rclient.getClient();
};

var user_incr = "user_incr";
var user_prefix = "user:";
var user_mail_prefix = "user_email:";

// Get user key from email
exports.key_from_email = function (email,callback) {
    var client = rclient.getClient();
    client.get(user_mail_prefix+email,callback);
}

var key_from_id = function (id) {
    return (user_prefix+id+":info");
}

// Create a new unique user key
exports.make_user_key = function(callback) {
    var client = rclient.getClient();
    client.incr(user_incr,callback);
}

// Get/Create user by email address.
exports.User = function User (email, callback) {
    var client = rclient.getClient();
    var context = this;
    // Check if a user with this email exists.
    exports.key_from_email(email,function(err,result) {
        // User exists, create and return object
        if (!_.isUndefined(result) && !_.isNull(result)) {
            client.get(key_from_id(result), function(err,result) {
                context = JSON.parse(result);
                callback(err,context);
            });
        } else {
            // If not, create and return a new user
            client.incr(user_incr,function(err,result) {
                if (err) {callback(err,undefined);}
                context.email = email;
                context.id = result;
                context.created = new Date().getTime();
                var obj_string = JSON.stringify(context);
                client.set(key_from_id(result), obj_string, function(err,result) {
                    callback(err,context);
                });
                // save email->key mapping
                client.set(email,key_from_id(result));
            });
        }
    });
}
