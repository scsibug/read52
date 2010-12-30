// 1000-page badge
// Awarded when total read page count exceeds 1000.

// Template for other badges

var rclient = require('../../redisclient');
var _ = require('underscore');

// badge key, must be unique.
var name = "1000page";

var user_key = function(userid) {
    return "user:"+userid+":badgestate:"+name;
}

// the in-work state of a badge for a user
function Badge (userid,attrs) {
    var context = this;
    context.userid = userid;
    context.id = name;
    context.state = attrs; // persisted state
    return context;
};

Badge.prototype.add_reading = function(reading,callback) {
    console.log("badge is adding reading ",reading.book.title);
    callback();
};

Badge.prototype.remove_reading = function(reading,callback) {
    console.log("badge is removing reading ",reading.book.title);
    callback();
};


// sends callback error and stored state of the badge
exports.get_user_badge = function(userid,callback) {
    var client = rclient.getClient();
    // attempt to get the key
    client.get(user_key(userid),function(err,result) {
        if (err) {
            console.log(err);
            callback(err,null);
        }
        if (_.isNull(result)) {
            result = '{}'
        }
        var b = new Badge(userid,JSON.parse(result));
        callback(err,b);
    });
}

exports.Badge = Badge;