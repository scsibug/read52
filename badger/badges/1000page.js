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
    var bid = reading.book_id;
    var pages = parseInt(reading.book.pages);
    if (_.isNumber(pages)) {
        context.state[bid] = pages
    } else {
        console.log("pages was not a number");
    }
    console.log("about to save state");
    context.save(function(err,result) {
        context.check_award(callback);
    });
};

Badge.prototype.remove_book = function(book,callback) {
    console.log("badge is removing reading for ",book.title);
    var context = this;
    delete(context.state[book.id]);
    context.save(function(err,result) {
        console.log("state save completed");
        context.check_award(callback);
    });
};

Badge.prototype.save = function(callback) {
    console.log("saving badge state");
    var client = rclient.getClient();
    var key = user_key(this.userid);
    console.log("saving at key:",key);
    console.log("state to save:",JSON.stringify(this.state));
    client.set(key,JSON.stringify(this.state),callback);
}

// determine if the badge should be awarded, and if yes, do so
Badge.prototype.check_award = function(callback) {
    // sum all page counts in state
    var pagecount = 0;
    for (bookid in this.state) {
        console.log("adding pagecount: ",this.state[bookid]);
        pagecount += this.state[bookid]
    }
    console.log("pagecount total was",pagecount);
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
    var context = this;
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
                client.zadd(key,award_date,context.id,function(err,res) {
                    if (err) {
                        console.log("Error:",err);
                    } else {
                        console.log("Awarded badge");
                    }
                    callback();
                });
            } else {
                console.log("badge had already been awarded, not actually doing anything...");
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