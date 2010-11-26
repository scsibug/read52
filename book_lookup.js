var sys = require('sys'),
OperationHelper = require('apac').OperationHelper;
require('underscore');
var aws_credentials = require('./aws_cred');

opHelper = new OperationHelper({
    awsId:     aws_credentials.awsId,
    awsSecret: aws_credentials.awsSecret,
    assocId:   aws_credentials.assocId,
});

// Lookup a book by ISBN-13, and get product information from AWS
isbn_lookup_unthrottled = function(isbn, callback) {
    // strip out dashes/spaces from ISBN
    isbn_clean = isbn.replace(/-/g,"");
    var idtype = "EAN";
    if (isbn_clean.length == 13) {
        idtype="EAN"
    } else if (isbn_clean.length == 10) {
        idtype="ISBN"
    } else {
        sys.print("ISBN length is incorrect, must be 10 or 13 ("+isbn_clean+")\n");
        return;
    }
    sys.print("executing item lookup now!\n");
    opHelper.execute('ItemLookup', {
        'SearchIndex': 'Books',
        'IdType': idtype,
        'ItemId': isbn_clean,
        'ResponseGroup': 'ItemAttributes,Images'
    }, function(error, results) {
        if (error) { sys.print('Error: ' + error + "\n") }
        //sys.print("Results:\n" + sys.inspect(results) + "\n");
        if (!! _.isUndefined(results.Items.Item)) {
        } else if (results.Items.Item.constructor == Array) {
            sys.print("This query returned multiple books, we'll just blindly take the first for now.");
            // We need to figure out which one of these items we should display...
            // for now we just take the firest
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
        sys.print("making call without throttling\n");
        isbn_lookup_unthrottled.apply(context,args);
    } else {
        sys.print("(AWS throttling "+(throttle_time-delta)/1000+" seconds)\n");
        
        setTimeout(function() {
            isbn_lookup_unthrottled.apply(context,args);
        }, throttle_time - delta);
    }
}