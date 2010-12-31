// Badge superclass
// Template for other badges
var sys = require('sys');
var rclient = require('../../redisclient');
var _ = require('underscore');
var users = require('../../users');
// badge key, must be unique.
var name = "badge_template";

exports.badge_info =
    {
        id: name,
        name: "Badge Template",
        achievement: "Doin' Nothing"
    }

// the in-work state of a badge for a user
function Badge (userid) {
    var context = this;
    context.userid = userid;
    context.id = name;
    return context;
};

Badge.prototype.user_key = function() {
    return "user:"+this.userid+":badgestate:"+this.id;
}

Badge.prototype.add_reading_transform = function(reading,callback) {
    callback();
}

Badge.prototype.add_reading = function(reading,callback) {
    console.log("badge is adding reading ",reading.book.title);
    this.add_reading_transform(reading,function() {
        context.save(function(err,result) {
            context.check_award(callback);
        });
    });
};

Badge.prototype.remove_book_transform = function(book,callback) {
    callback();
}

Badge.prototype.remove_book = function(book,callback) {
    console.log("badge is removing reading for ",book.title);
    var context = this;
    context.remove_book_transform(book,function() {
        context.save(function(err,result) {
            context.check_award(callback);
        });
    });
};

Badge.prototype.save = function(callback) {
    console.log("saving badge state");
    var client = rclient.getClient();
    var key = this.user_key();
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

// Read stored state
Badge.prototype.load = function(callback) {
    var client = rclient.getClient();
    var context = this;
    // attempt to get the key
    client.get(context.user_key(),function(err,result) {
        if (err) {
            console.log(err);
            callback(err,null);
        }
        if (_.isNull(result)) {
            result = '{}'
        }
        context.state = JSON.parse(result);
        callback(err,context);
    });
}

exports.Badge = Badge;