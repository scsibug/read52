// 1000-page badge
// Awarded when total read page count exceeds 1000.

var sys = require('sys');
var _ = require('underscore');
var users = require('../../users');
var badge_template = require('./badge');
// badge key, must be unique.
var name = "1000page";

exports.badge_info =
    {
        id: name,
        name: "1,000 Pages",
        achievement: "Reading over 1,000 pages."
    }

// the in-work state of a badge for a user
function Badge (userid) {
    badge_template.Badge.apply(this,arguments);
    this.id = name;
    this.page_goal = 1000;
};
// inherit from the badge template
sys.inherits(Badge, badge_template.Badge);

// Steps to perform when a book is added or modified in the read list
Badge.prototype.add_reading_transform = function(reading,callback) {
    var pages = parseInt(reading.book.pages);
    if (_.isNumber(pages)) {
        this.state[reading.book_id] = pages
    }
    callback();
};

// Steps to perform when a book is removed from the read list.
Badge.prototype.remove_book_transform = function(book,callback) {
    delete(this.state[book.id]);
    callback();
};

// determine if the badge should be awarded, and if yes, do so
Badge.prototype.should_award = function(callback) {
    // sum all page counts in state
    var pagecount = 0;
    for (bookid in this.state) {
        pagecount += this.state[bookid]
    }
    return (pagecount >= this.page_goal);
}

exports.Badge = Badge;