// 100000-page badge
// Awarded when total read page count exceeds 100000.
// TODO: ideally we'd reuse state for the 1000page badge...

var sys = require('sys');
var _ = require('underscore');
var users = require('../../users');
var badge_template = require('./badge');
var thousandpagebadge = require('./1000page');
// badge key, must be unique.
var name = "100000page";

exports.badge_info =
    {
        id: name,
        name: "100,000 Pages",
        achievement: "Reading over 100,000 pages."
    }

// the in-work state of a badge for a user
function Badge (userid) {
    badge_template.Badge.apply(this,arguments);
    this.id = name;
    this.page_goal = 100000;
};
// inherit from the 1000page badge
sys.inherits(Badge, thousandpagebadge.Badge);

exports.Badge = Badge;