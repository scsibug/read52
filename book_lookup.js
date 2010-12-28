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
lookup_unthrottled = function(idtype, id, callback) {
    if (_.isNull(id)) {
        callback("Null ID", null);
    }
    if (_.isNull(idtype)) {
        callback("Null ID type", null);
    }
    opHelper.execute('ItemLookup', {
        'SearchIndex': 'Books',
        'IdType': idtype,
        'ItemId': id,
        'ResponseGroup': 'ItemAttributes,Images'
    }, function(error, results) {
        if (error) { console.log("Error:",error); }
        callback(error,process_amz_result(results));
    });
};

// Take results from AMZ and pull out relevant attributes for a book
var process_amz_result = function(results) {
    var result = null;
    if (results.Items.Item.constructor == Array) {
        console.log("This query returned multiple books, we'll just blindly take the first for now.");
        result = results.Items.Item.shift();
        callback(error, results.Items.Item.shift());
    } else {
        result = results.Items.Item
    }
    var ctx = {};
    ctx.title = result.ItemAttributes.Title;
    ctx.ean = result.ItemAttributes.EAN;
    ctx.dewey_decimal = result.ItemAttributes.DeweyDecimalNumber;
    ctx.asin = result.ASIN;
    ctx.author = result.ItemAttributes.Author;
    ctx.isbn = result.ItemAttributes.ISBN;
    ctx.number_of_pages = result.ItemAttributes.NumberOfPages;
    if (!_.isUndefined(result.SmallImage)) {
        ctx.amz_img_small = result.SmallImage.URL;
    } else {
        ctx.amz_img_small = "/images/no_image_available_small.png";
    }
    if (!_.isUndefined(result.MediumImage)) {
        ctx.amz_img_medium = result.MediumImage.URL;
    } else {
        ctx.amz_img_medium = "/images/no_image_available_medium.png";
    }
    if (!_.isUndefined(result.LargeImage)) {
        ctx.amz_img_large = result.LargeImage.URL;
    } else {
        // TODO: make large version
        ctx.amz_img_large = "/images/no_image_available_medium.png";
    }
    ctx.amz_detail_url = result.DetailPageURL;
    return ctx;
}

// Amazon prefers 1 second between calls, or 503 errors become likely.
exports.lookup = _.throttle(lookup_unthrottled, 1100);
