// Millenium badge
// Awarded when completing Millenium trilogy

var sys = require('sys');
var _ = require('underscore');
var users = require('../../users');
var badge_template = require('./badge');
// badge key, must be unique.
var name = "millenium_trilogy";

exports.badge_info =
    {
        id: name,
        name: "Millenium Trilogy",
        achievement: "Completing Stieg Larsson's Millenium Trilogy."
    }

// the in-work state of a badge for a user
function Badge (userid) {
    badge_template.Badge.apply(this,arguments);
    this.id = name;
};
// inherit from the badge template
sys.inherits(Badge, badge_template.Badge);

// returns true if the book meets criteria for book 1
var like_book_1 = function(book) {
    console.log("this book has author",sys.inspect(book.authors));
    console.log("this book has title",book.title);
    if (!book.author_like(/Larsson/i)) {
        console.log("Author does not qualify");
        return false;
    }
    if (book.title_like(/girl with the dragon tattoo/i)) {
        console.log("book title is good enough");
        return true;
    }
    // check for original title too
    if (book.title_like(/hatar kvinnor/i)) {
        console.log("original title is good enough");
        return true;
    }
    console.log("returning false");
    return false;
}

// returns true if the book meets criteria for book 1
var like_book_2 = function(book) {
    if (!book.author_like(/Larsson/i)) {
        return false;
    }
    if (book.title_like(/girl who played with fire/i)) {
        return true;
    }
    // check for original title too
    if (book.title_like(/flickan som lekte med elden/i)) {
        return true;
    }
    return false;
}

// returns true if the book meets criteria for book 1
var like_book_3 = function(book) {
    if (!book.author_like(/Larsson/i)) {
        return false;
    }
    if (book.title_like(/girl who kicked the hornets/i)) {
        return true;
    }
    // check for original title too
    if (book.title_like(/luftslottet som/i)) {
        return true;
    }
    return false;
}

// Add evidence that a bookID was read for trilogy number
Badge.prototype.add_state_book = function(number,bookid) {
    var s = this.state;
    if (_.isUndefined(s.number)) {
        s[number] = [bookid];
    } else {
        s[number].push(bookid);
    }
};

// Remove book/evidence from state
Badge.prototype.remove_state_book = function(bookid) {
    var s = this.state;
    // remove bookid from each of the trilogy slots
    if (!_.isUndefined(s['1']) && !_.isNull(s['1'])) {
        s['1'] = _.without(s['1'],bookid);
    }
    if (!_.isUndefined(s['2']) && !_.isNull(s['2'])) {
        s['2'] = _.without(s['2'],bookid);
    }
    if (!_.isUndefined(s['3']) && !_.isNull(s['3'])) {
        s['3'] = _.without(s['3'],bookid);
    }
};

// Steps to perform when a book is added or modified in the read list
Badge.prototype.add_reading_transform = function(reading,callback) {
    // Keep track of books that meet criteria for each book.
    // state has keys for books 1,2,3, and the values are lists of book ids.
    if (like_book_1(reading.book)) {
        this.add_state_book(1,reading.book_id);
    } else if (like_book_2(reading.book)) {
        this.add_state_book(2,reading.book_id);
    } else if (like_book_3(reading.book)) {
        this.add_state_book(3,reading.book_id);
    }
    callback();
};

// Steps to perform when a book is removed from the read list.
Badge.prototype.remove_book_transform = function(book,callback) {
    // remove bookid from all values
    this.remove_state_book(book.id);
    callback();
};

// Award if there are values in all three slots of the trilogy.
Badge.prototype.should_award = function() {
    var s = this.state;
    var nonempty = function(arr) {
        if (_.isNull(arr) || _.isUndefined(arr) || !_.isArray(arr)) {
            return false;
        }
        return (arr.length > 0);
    }
    if (nonempty(s['1']) && nonempty(s['2']) && nonempty(s['3'])) {
        return true;
    } else {
        return false;
    }    
}

exports.Badge = Badge;