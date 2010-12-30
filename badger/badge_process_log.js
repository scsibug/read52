var sys = require('sys');
var _ = require('underscore');
var rclient = require('../redisclient');

var badge_log_key = "badge_log"

exports.add_action = "+"; //add/modify
exports.remove_action = "-"; // remove

// notify the badge process of a new reading
exports.add_reading = function(userid,bookid) {
    add_reading_log_entry(exports.add_action,userid,bookid);
};

// notify the badge process of a removed reading
exports.remove_reading = function(userid,bookid) {
    add_reading_log_entry(exports.remove_action,userid,bookid);
};

var add_reading_log_entry = function (action,userid,bookid) {
    var client = rclient.getClient();
    var log = {
        action: action,
        userid: userid,
        bookid: bookid
    };
    client.lpush(badge_log_key,JSON.stringify(log), function(err,res) {
        if (err) {
            console.log(err);
        }
        console.log("Added badge log entry");
    });
};

var pop_reading_log_entry = function (callback) {
    var client = rclient.getClient();
    client.rpop(badge_log_key,function(err,elem) {
        if (err) {
            console.log(err);
            callback(err,null);
        } else {
            var entry = JSON.parse(elem);
            callback(err,entry)
        }
    });
};