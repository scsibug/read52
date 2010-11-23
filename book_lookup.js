var sys = require('sys'),
OperationHelper = require('apac').OperationHelper;
var aws_credentials = require('./aws_cred');

opHelper = new OperationHelper({
    awsId:     aws_credentials.awsId,
    awsSecret: aws_credentials.awsSecret,
    assocId:   aws_credentials.assocId,
});

// Lookup a book by ISBN, and get AWS attributes & images.
exports.isbn_lookup = function(isbn, callback) {
    opHelper.execute('ItemLookup', {
        'SearchIndex': 'Books',
        'IdType': 'ISBN',
        'ItemId': isbn,
        'ResponseGroup': 'ItemAttributes,Images'
    }, function(error, results) {
        if (error) { sys.print('Error: ' + error + "\n") }
        sys.print("Results:\n" + sys.inspect(results) + "\n");
        callback(results);
    });
}
