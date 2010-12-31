// Main processor, aka "the badger".
// Run periodically, it will look at all readings
// since the last run, and update user badges.
var sys = require('sys');
var rclient = require('../redisclient');
var client = rclient.initClient();
var bpl = require('./badge_process_log');
var _ = require('underscore');
var books = require('../books');
var readings = require('../readings');
var badges = require('./badges/active');

// have every active badge process a reading (if adding) or book (if removing),
// callback is triggered when all have completed.
var process_event = function(action, userid, object, callback) {
    var procs = badges.badges;
    var completed = 0;
    for (var i = 0; i < procs.length; i++) {
        var finished = function() {
            completed++;
            if (completed === procs.length) {
                callback();
            }
        }
        // get user badge
        var badge = new procs[i].Badge(userid);
        badge.load(function() {
            if (action === '+') {
                badge.add_reading(object,finished);
            } else if (action === '-') {
                badge.remove_book(object,finished);
            }
        });
    }
}

var process_logs = function(callback) {
    bpl.pop_reading_log_entry(function(err,entry) {
        if (err) {
            console.log("Error:",err);
        } else if (_.isNull(entry)) {
            console.log("All done");
            callback();
        } else {
            console.log("Got entry:",sys.inspect(entry));
            // get the reading or book for the entry
            if (entry.action === '+') {
                readings.get_by_book_id(entry.userid,entry.bookid,function(err,r) {
                    if (err) {
                        console.log("Error getting reading:",err);
                        console.log("This event has been dropped!");
                        process_logs(callback);
                    } else {
                        console.log("Examining ",r.book.title,"for user",r.userid);
                        // send the reading to each badge,
                        // when they finish, execute this function again.
                        process_event(entry.action, entry.userid, r,function() {process_logs(callback);});
                    }
                });
            } else if (entry.action === '-') {
                books.get_by_id(entry.bookid,function(err,b) {
                    if (err) {
                        console.log("Error getting reading:",err);
                        console.log("This event has been dropped!");
                        process_logs(callback);
                    } else {
                        console.log("Examining ",b.title,"for user",entry.userid);
                        // send the reading to each badge,
                        // when they finish, execute this function again.
                        process_event(entry.action, entry.userid, b,function() {process_logs(callback);});
                    }
                });
            }
        }
    });
};

console.log("Badger starting...");
process_logs(function() {
    client.quit();
});
console.log("Badger completed...");

