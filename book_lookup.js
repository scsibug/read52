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
exports.isbn_lookup = function(isbn, callback) {
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
            sys.print("Item is array!");
            // We need to figure out which one of these items we should display...
            // for now we just take the firest
            callback(error, results.Items.Item.shift());
        } else {
            sys.print("Item is not array");
            callback(error, results.Items.Item);
        }
    });
}
