var sys = require('sys'),
OperationHelper = require('apac').OperationHelper;
var _ = require('underscore');
var isbnlib = require('./isbn');
var aws_credentials = require('./aws_cred');

opHelper = new OperationHelper({
    awsId:     aws_credentials.awsId,
    awsSecret: aws_credentials.awsSecret,
    assocId:   aws_credentials.assocId
});

// Lookup a book by ISBN-13, and get product information from AWS
isbn_lookup_unthrottled = function(isbn_dirty, callback) {
    // normalize ISBN to 13:
    if (_.isNull(isbn_dirty)) {
        callback("Null ISBN", null);
    }
    var isbn = isbnlib.to_isbn_13(isbn_dirty);
    if (_.isNull(isbn)) {
        console.log("Provided ISBN could not be parsed:",isbn);
    }
    var idtype = "EAN";
    opHelper.execute('ItemLookup', {
        'SearchIndex': 'Books',
        'IdType': idtype,
        'ItemId': isbn,
        'ResponseGroup': 'ItemAttributes,Images'
    }, function(error, results) {
        if (error) { console.log("Error:",error); }
        if (!! _.isUndefined(results.Items.Item)) {
        } else if (results.Items.Item.constructor == Array) {
            console.log("This query returned multiple books, we'll just blindly take the first for now.");
            // We need to figure out which one of these items we should display...
            // for now we just take the first.
            callback(error, results.Items.Item.shift());
        } else {
            //console.log(sys.inspect(results.Items.Item));
            callback(error, results.Items.Item);
        }
    });
};

// Amazon prefers 1 second between calls, or 503 errors become likely.
exports.isbn_lookup = _.throttle(isbn_lookup_unthrottled, 1100);
