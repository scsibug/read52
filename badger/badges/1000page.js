// 1000-page badge
// Awarded when total read page count exceeds 1000.

var sys = require('sys');
var rclient = require('../../redisclient');
var _ = require('underscore');
var users = require('../../users');
var badge_template = require('./badge');
// badge key, must be unique.
var name = "1000page";

exports.badge_info =
    {
        id: name,
        name: "1000 Pages",
        achievement: "Reading over 1,000 pages."
    }

// the in-work state of a badge for a user
function Badge (userid) {
    badge_template.Badge.apply(this,arguments);
    this.id = name;
};

sys.inherits(Badge, badge_template.Badge);

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

// Steps to perform when a book is removed from the read list.
Badge.prototype.remove_book_transform = function(book,callback) {
    delete(this.state[book.id]);
    callback();
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

exports.Badge = Badge;