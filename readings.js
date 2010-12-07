// Module to manage readings, instances of a book being read.
// Readings essentially consist of a book, start/finish date, rating, and comments.

// Store reading at user:4:reading_isbn:ISBN

var _ = require('underscore');
var rclient = require('./redisclient');

var key_from_id = function (user_id,ean) {
    return("user:"+user_id+":reading_isbn:"+ean);
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
            reading.save(callback);
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

exports.Reading = Reading;