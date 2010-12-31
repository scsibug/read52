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
    var context = this;
    console.log("before transform:",sys.inspect(context.state));
    this.add_reading_transform(reading,function() {
        console.log("after transform:",sys.inspect(context.state));
        context.save(function(err,result) {
            if (err) {
                console.log("error saving: ",err);
            }
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
    console.log("before transform:",sys.inspect(context.state));
    context.remove_book_transform(book,function() {
        console.log("after transform:",sys.inspect(context.state));
        context.save(function(err,result) {
            if (err) {
                console.log("error saving: ",err);
            }
            context.check_award(callback);
        });
    });
};

Badge.prototype.save = function(callback) {
    console.log("saving badge state");
    var client = rclient.getClient();
    var key = this.user_key();
    console.log("saving at key:",key);
    var state_string = JSON.stringify(this.state);
    if (state_string === "{}") {
        console.log("Not saving anything");
        // don't bother saving the default state
        callback(null,null);
    } else {
        var state_to_save = JSON.stringify(this.state);
        console.log("saving state: ",state_to_save);
        client.set(key,state_to_save,callback);
    }
}

// determine if the badge should be awarded, and if yes, do so
Badge.prototype.check_award = function(callback) {
    if (this.should_award()) {
        this.award(callback);
    } else {
        callback();
    }
}

// boolean function that determines if user should get badge.
// keeps pesky callbacks out of actual badge subclasses.
Badge.prototype.should_award() {
    return false;
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
    console.log("loading state for ",context.user_key());
    // attempt to get the key
    client.get(context.user_key(),function(err,result) {
        if (err) {
            console.log("Error:",err);
            callback(err,null);
            return;
        }
        console.log("retrieved key is: ",result);
        if (_.isNull(result) || _.isUndefined(result)) {
            console.log("key was null/undefined");
            result = '{}'
        }
        context.state = JSON.parse(result);
        console.log("parsed result is",sys.inspect(context.state));
        callback(err,context);
    });
}

exports.Badge = Badge;