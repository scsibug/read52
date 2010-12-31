// 1000-page badge
// Awarded when total read page count exceeds 1000.

// Template for other badges

var rclient = require('../../redisclient');
var _ = require('underscore');
var users = require('../../users');
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
    var context = this;
    if (_.isNumber(reading.book.pages)) {
        context.state.reading.book_id = reading.book.pages
    }
    context.save(function(err,result) {
        context.check_award(callback);
    });
};

Badge.prototype.remove_reading = function(reading,callback) {
    console.log("badge is removing reading ",reading.book.title);
    var context = this;
    if (_.isNumber(reading.book.pages)) {
        delete(context.state.reading.book_id);
    }
    context.save(function(err,result) {
        context.check_award(callback);
    });
};

Badge.prototype.save = function(callback) {
    var client = rclient.getClient();
    var key = user_key(this.userid);
    client.set(key,JSON.stringify(this.state),callback);
}

// determine if the badge should be awarded, and if yes, do so
Badge.prototype.check_award = function(callback) {
    // sum all page counts in state
    var pagecount = 0;
    for (bookid in this.state) {
        pagecount =+ this.state[bookid]
    }
    if (pagecount >= 1000) {
        console.log("Award badge!");
        this.award(callback);
    } else {
        // Take badge away?
        console.log("User has not met criteria for badge",this.id);
        callback();
    }
}

// Note that this badge was awarded to the user
Badge.prototype.award = function(callback) {
    var client = rclient.getClient();
    var award_date = +new Date();
    var key = users.user_badges_zset(this.userid);
    // check if badge has already been awarded
    client.zrank(key,this.id,function(err,rank) {
        if (err) {
            console.log("Error:",err);
            callback();
        } else {
            if (_.isNull(rank)) {
                // badge has not been awarded
                client.zadd(key,this.id,function(err,res) {
                    if (err) {
                        console.log("Error:",err);
                    } else {
                        console.log("Awarded badge");
                    }
                    callback();
                });
            } else {
                // badge was already awarded, nothing to be done
                callback();
            }
        }
    });
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