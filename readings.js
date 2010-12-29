// Module to manage readings, instances of a book being read.
// Readings essentially consist of a book, start/finish date, rating, and comments.

var _ = require('underscore');
var sys = require('sys');
var rclient = require('./redisclient');
var actions = require('./actions');
var books = require('./books');

// Keys that are specific to a reading object, that should be serialized/deserialized
var reading_keys = ["userid", "book_id", "comment", "rating", "completion_date", "creation_date"];

var user_reading_set = function(user_id) {
    return("user:"+user_id+":reading_set");
};

var key_from_id = function (user_id,book_id) {
    return("user:"+user_id+":reading_id:"+book_id);
};

// Add (or update) a reading.  read_date argument is standard javascript date (millis since epoch)
var set_add_reading = function(user_id, read_date, reading_key, callback) {
    var client = rclient.getClient();
    client.zadd(user_reading_set(user_id), read_date, reading_key, callback);
};

var set_remove_reading = function(user_id, reading_key, callback) {
    var client = rclient.getClient();
    client.zrem(user_reading_set(user_id), reading_key, callback);
};

exports.reading_exists = function(user_id,book_id,callback) {
    var client = rclient.getClient();
    var reading_id = key_from_id(user_id,book_id);
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
};

// take a (possibly user-input) rating, and clean it for saving to DB
exports.clean_rating = function (dirty_rating) {
    var clean_rating = null;
    if (_.isString(dirty_rating)) {
        dirty_rating = parseInt(dirty_rating);
    }
    if (_.isNumber(dirty_rating)) {
        clean_rating = parseInt(dirty_rating)
        if (clean_rating < 0) {clean_rating = 0;}
        if (clean_rating > 100) {clean_rating = 100;}
    }
    return clean_rating;
}

// Create a reading object from a set of attributes.
function Reading (attrs) {
    var context = this;
    context.load_from_json(attrs);
    return context;
}

// Creating a reading should save the reading itself, and associate it with a user.
exports.create = function(attrs, callback) {
    var client = rclient.getClient();
    if (!_.isNumber(attrs.creation_date)) {
        attrs.creation_date = +new Date();
    }
    if (!_.isNumber(attrs.completion_date)) {
        attrs.completion_date = +new Date();
    }
    attrs.rating = exports.clean_rating(attrs.rating);
    var reading_id = key_from_id(attrs.userid,attrs.book_id);
    // Ensure there isn't an existing reading for this user/book combination
    exports.reading_exists(attrs.userid,attrs.book_id,function(err,res) {
        if (!err && !res) {
            var reading = new Reading(attrs);
            set_add_reading(attrs.userid,+(attrs.completion_date),attrs.book_id,function (err,res) {
                reading.save(function (err,res) {
                    callback(err,res);
                    // after save, publish action with user name and book title
                    books.get_from_id(attrs.book_id,function(err,book) {
                        if (!_.isNull(book.title) && !_.isUndefined(book.title)) {
                            actions.publish_action(attrs.userid,"read " + book.title)
                        }
                    });
                });
            });
        } else {
            callback("Reading already exists, will not overwrite.", null);
        }
    });
};

exports.get_by_book_id = function(userid, book_id, callback) {
    var client = rclient.getClient();
    var rkey = key_from_id(userid,book_id);
    console.log("get",rkey);
    client.get(rkey,function(err,res) {
        console.log("returns ",res);
        if (err) {
            console.log("Error: ",err);
            callback(err,null);
            return;
        } else if (_.isNull(res) || _.isUndefined(res)) {
            console.log("No value for",rkey);
            callback("Reading does not exist",null);
            return;
        }
        try {
            var json = JSON.parse(res);
        } catch (e) {
            console.log(e);
            console.log("tried to parse",res);
        }
        var reading = new Reading(json);
        books.get_from_id(book_id,function(err,book) {
            reading.book = book;
            callback(err,reading);
        });
    });
};

Reading.prototype.load_from_json = function(json) {
    var context = this;
    _.select(reading_keys, function (key) {
        context[key] = json[key];
    });
};

// Get rating suitable for display (divisible by 5) or null
Reading.prototype.get_rating = function get_rating() {
    var incr = 5;
    if (_.isNull(this.rating) || _.isUndefined(this.rating)) {
        return null;
    } else {
        return (incr * parseInt(this.rating / incr));
    }
}

Reading.prototype.save = function save(callback) {
    var client = rclient.getClient();
    var context = this;
    context.modified_date = +new Date();
    var obj_string = JSON.stringify(context);
    client.set(key_from_id(context.userid,context.book_id),obj_string, function(err,r) {
        if (err) {
            callback(err,null);
        } else {
            callback(err,context);
        }
    });
};

Reading.prototype.toJSON = function() {
    var json = {};
    var context = this;
    _.select(reading_keys, function (key) {
        json[key] = context[key];
    });
    return json;
};

// Find the date (as millis-since-epoch) since the given date.
function one_year_ago_from(date_millis) {
    var one_year = 1000*60*60*24*365;
    return date_millis - one_year;
}

exports.annual_page_count = function(userid, callback) {
    var client = rclient.getClient();
    var pagecount = 0;
    var replies = 0;
    var now = +new Date();
    // get books read within past year
    client.zrangebyscore(user_reading_set(userid),one_year_ago_from(now),now, function(err,reply){
        if (err) {
            console.log(err);
            callback("Could not get page count", 0);
            return;
        } else if (_.isNull(reply) || reply.length == 0) {
            callback(null,0);
            return;
        }
        for(var i=0; i < reply.length; i++) {
            var book_id = reply[i].toString();
            exports.get_by_book_id(userid,book_id,function(err,reading) {
                replies++;
                if (err && !_.isNull(reading)) {
                    console.log("Error loading reading, userid:",userid," book_id:",book_id);
                } else {
                    var pages = +reading.book.pages;
                    if (_.isNumber(pages)) {
                        pagecount += pages;
                    }
                }
                if (replies == reply.length) {
                    callback(err,pagecount);
                }
            });
        }
    });
};


// Calculate how many books have been read in the past year
exports.annual_book_count = function(userid, callback) {
    var client = rclient.getClient();
    var now = +new Date();
    // get books read within past year
    // client.zrangebyscore(user_reading_set(userid),one_year_ago,now, function(err,reply){
    // get count of books between last year and now
    client.zcount(user_reading_set(userid),one_year_ago_from(now),now, function(err,reply){
        if (err) {
            callback(err,null);
        } else if (_.isNull(reply)) {
            callback("Could not find key for sorted set of books",null);
        } else {
            callback(null,reply);
        }
    });
};

exports.readings_for_user = function(userid, start, end, callback) {
    var client = rclient.getClient();
    client.zrange(user_reading_set(userid),start,end, function(err,reply){
        var replies = 0;
        var readings = [];
        if (err) {
            console.log("Error:",err);
            callback(err,null);
            return;
        }
        if (_.isNull(reply) || reply.length == 0) {
            console.log("user has not read any books");
            callback(null,readings);
            return;
        }
        for(var i=0; i < reply.length; i++) {
            var book_id = reply[i].toString();
            exports.get_by_book_id(userid,book_id,function(err,reading) {
                if (err) {
                    console.log("Error loading reading, userid:",userid," book_id:",book_id);
                } else {
                    readings.push(reading);
                }
                replies++;
                if (replies == reply.length) {
                    callback(err,readings.reverse());
                }
            });
        }
    });
};

exports.Reading = Reading;