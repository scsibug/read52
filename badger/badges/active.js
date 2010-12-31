// module that imports and makes available all active badges

var _ = require('underscore');

var active_badge_names =
    [
        '1000page',
        'millenium_trilogy'
    ];

var active_badges = [];

for(var i = 0; i < active_badge_names.length; i++) {
    var bn = active_badge_names[i];
    console.log("Loading badge:",bn);
    var badge = require('./'+bn);
    active_badges.push(badge);
}

exports.badges = active_badges;