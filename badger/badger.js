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

// have every active badge process a reading, callback when all have completed.
var process_reading = function(action, reading, callback) {
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
        procs[i].get_user_badge(reading.userid,function(err,badge) {
            if (action === '+') {
                badge.add_reading(reading,finished);
            } else if (action === '-') {
                badge.remove_reading(reading,finished);
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
            // get the reading for the entry
            readings.get_by_book_id(entry.userid,entry.bookid,function(err,r) {
                if (err) {
                    console.log("Error getting reading:",err);
                    console.log("This event has been dropped!");
                    process_logs(callback);
                } else {
                    console.log("Examining ",r.book.title,"for user",r.userid);
                    // send the reading to each badge,
                    // when they finish, execute this function again.
                    process_reading(entry.action,r,function() {process_logs(callback);});
                }
            });
        }
    });
};

console.log("Badger starting...");
process_logs(function() {
    client.quit();
});
console.log("Badger completed...");

