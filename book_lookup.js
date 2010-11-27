var sys = require('sys'),
OperationHelper = require('apac').OperationHelper;
require('underscore');
var isbnlib = require('./isbn');
var aws_credentials = require('./aws_cred');

opHelper = new OperationHelper({
    awsId:     aws_credentials.awsId,
    awsSecret: aws_credentials.awsSecret,
    assocId:   aws_credentials.assocId,
});

// Lookup a book by ISBN-13, and get product information from AWS
isbn_lookup_unthrottled = function(isbn_dirty, callback) {
    // normalize ISBN to 13:
    var isbn = isbnlib.to_isbn_13(isbn_dirty)
    if (_.isNull(isbn)) {
        sys.print("Provided ISBN could not be parsed. ("+isbn+")\n");
    }
    var idtype = "EAN";
    opHelper.execute('ItemLookup', {
        'SearchIndex': 'Books',
        'IdType': idtype,
        'ItemId': isbn,
        'ResponseGroup': 'ItemAttributes,Images'
    }, function(error, results) {
        if (error) { sys.print('Error: ' + error + "\n") }
        //sys.print("Results:\n" + sys.inspect(results) + "\n");
        if (!! _.isUndefined(results.Items.Item)) {
        } else if (results.Items.Item.constructor == Array) {
            sys.print("This query returned multiple books, we'll just blindly take the first for now.");
            // We need to figure out which one of these items we should display...
            // for now we just take the first.
            callback(error, results.Items.Item.shift());
        } else {
            //sys.print(sys.inspect(results.Items.Item));
            callback(error, results.Items.Item);
        }
    });
}

// Amazon prefers 1 second between calls, or 503 errors become likely.
var throttle_time = 1100
var previous_run = 0;

// This runs an ISBN lookup, ensuring that calls are spaced at least
// 'throttle_time' apart.
exports.isbn_lookup = function() {
    var context = this, args = arguments;
    var delta = +new Date() - previous_run;
    previous_run = +new Date();
    if (delta > throttle_time) {
        isbn_lookup_unthrottled.apply(context,args);
    } else {
        sys.print("(throttling AWS for "+(throttle_time-delta)/1000+" seconds)\n");
        setTimeout(function() {
            isbn_lookup_unthrottled.apply(context,args);
        }, throttle_time - delta);
    }
}