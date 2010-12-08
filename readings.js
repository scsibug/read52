// Module to manage readings, instances of a book being read.
// Readings essentially consist of a book, start/finish date, rating, and comments.

// Store reading at user:4:reading_isbn:ISBN

var _ = require('underscore');
var sys = require('sys');
var rclient = require('./redisclient');

var user_reading_set = function(user_id) {
    return("user:"+user_id+":reading_set");
}

var key_from_id = function (user_id,ean) {
    return("user:"+user_id+":reading_isbn:"+ean);
}

// Add (or update) a reading.  read_date argument is standard javascript date (millis since epoch)
var set_add_reading = function(user_id, read_date, reading_key, callback) {
    var client = rclient.getClient();
    client.zadd(user_reading_set(user_id), read_date, reading_key, callback);
}

var set_remove_reading = function(user_id, reading_key, callback) {
    var client = rclient.getClient();
    client.zrem(user_reading_set(user_id), reading_key, callback);
}

exports.reading_exists = function(user_id,ean,callback) {
    var client = rclient.getClient();
    var reading_id = key_from_id(user_id,ean);
    client.exists(reading_id,function(err,res) {
        if (err) {
            console.log("Error:",err);
            callback(err,true);
        } else if (res == "1") {
            console.log("Reading does exist");
            callback(null, true);
        } else {
            console.log("Reading does not exist");
            callback(null,false);
        }
    });
}

// Creating a reading should save the reading itself, and associate it with a user.
exports.create = function(attrs, callback) {
    var client = rclient.getClient();
    if (!_.isDate(attrs.creation_date)) {
        attrs.creation_date = new Date();
    }
    if (!_.isDate(attrs.completion_date)) {
        attrs.completion_date = new Date();
    }
    var reading_id = key_from_id(attrs.userid,attrs.isbn);
    // Ensure there isn't an existing reading for this user/ISBN combination
    exports.reading_exists(attrs.userid,attrs.isbn,function(err,res) {
        if (!err && !res) {
            var reading = new Reading(attrs);
            set_add_reading(attrs.userid,+(attrs.completion_date),attrs.isbn,function (err,res) {
                reading.save(callback);
            });
        } else {
            callback("Reading already exists, will not overwrite.", null);
        }
    });
}

exports.get_by_ean = function(userid, ean, callback) {
    var client = rclient.getClient();
    client.get(key_from_id(userid,ean),function(err,res) {
        var json = JSON.parse(res);
        var reading = new Reading(json);
        callback(err,reading);
    });
}

// Create a reading object from a set of attributes.
function Reading (attrs) {
    var context = this;
    context.load_from_json(attrs);
    return context;
}

Reading.prototype.load_from_json = function(json) {
    this.userid = json.userid;
    this.isbn = json.isbn;
    this.comment = json.comment;
    this.rating = json.rating;
    this.completion_date = json.completion_date;
    this.creation_date = json.creation_date;
}

Reading.prototype.save = function save(callback) {
    var client = rclient.getClient();
    var context = this;
    var obj_string = JSON.stringify(context);
    client.set(key_from_id(context.userid,context.isbn),obj_string, function(err,r) {
        if (err) {
            callback(err,null);
        } else {
            callback(err,context);
        }
    });
}

exports.readings_for_user = function(userid, start, end, callback) {
    var client = rclient.getClient();
    client.zrange(user_reading_set(userid),start,end, function(err,reply){
        var replies = 0;
        var readings = new Array();

        if (err) {
            console.log("Error:",err);
            callback(err,null);
            return;
        }
        if (_.isNull(reply)) {
            console.log("user has not read any books");
            callback(null,readings);
            return;
        }
        for(var i=0; i < reply.length; i++) {
            var ean = reply[i].toString();
            var reading_key = key_from_id(userid,ean);
            exports.get_by_ean(userid,ean,function(err,reading) {
                readings.push(reading);
                replies++;
                if (replies == reply.length) {
                    callback(err,readings);
                }
            });
        }
    });
}

exports.Reading = Reading;