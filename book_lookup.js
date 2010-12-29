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
    console.log("lookup_unthrottled called",idtype,id);
    if (_.isNull(id)) {
        console.log("lookup on null ID");
        callback("Null ID", null);
    }
    if (_.isNull(idtype)) {
        console.log("lookup on null id type");
        callback("Null ID type", null);
    }
    var lookupquery = {
        'IdType': idtype,
        'ItemId': id,
        'ResponseGroup': 'ItemAttributes,Images'
    };
    if (idtype!=='ASIN') {
        // SearchIndex is not valid for ASIN
        lookupquery.SearchIndex = 'Books';
    }
    opHelper.execute('ItemLookup', lookupquery, function(error, results) {
        if (error) { console.log("Error:",error); }
        var amz_res = process_amz_result(results);
        if (_.isNull(amz_res)) {
            callback("Could not find book",null);
        } else {
            callback(error,amz_res);
        }
    });
};

// Take results from AMZ and pull out relevant attributes for a book
var process_amz_result = function(results) {
    console.log("process_amz_result called");
    var result = null;
    if (!! _.isUndefined(results.Items.Item)) {
        console.log("Item from result is undefined (nothing found?)");
        return null;
    } else if (results.Items.Item.constructor == Array) {
        console.log("This query returned multiple books, we'll just blindly take the first for now.");
        result = results.Items.Item.shift();
        callback(error, results.Items.Item.shift());
    } else {
        console.log("single result");
        result = results.Items.Item
        console.log(sys.inspect(result));
    }
    var ctx = {};
    ctx.title = result.ItemAttributes.Title;
    ctx.ean = result.ItemAttributes.EAN;
    ctx.dewey_decimal_number = result.ItemAttributes.DeweyDecimalNumber;
    ctx.asin = result.ASIN;
    ctx.authors = result.ItemAttributes.Author;
    ctx.isbn10 = result.ItemAttributes.ISBN;
    ctx.pages = result.ItemAttributes.NumberOfPages;
    if (!_.isUndefined(result.SmallImage)) {
        ctx.cover_image_url_small = result.SmallImage.URL;
    } else {
        ctx.cover_image_url_small = "/images/no_image_available_small.png";
    }
    if (!_.isUndefined(result.MediumImage)) {
        ctx.cover_image_url_medium = result.MediumImage.URL;
    } else {
        ctx.cover_image_url_medium = "/images/no_image_available_medium.png";
    }
    if (!_.isUndefined(result.LargeImage)) {
        ctx.cover_image_url_large = result.LargeImage.URL;
    } else {
        // TODO: make large version
        ctx.cover_image_url_large = "/images/no_image_available_medium.png";
    }
    ctx.url = result.DetailPageURL;
    ctx.created_date = +new Date();
    return ctx;
}

// Amazon prefers 1 second between calls, or 503 errors become likely.
exports.lookup = _.throttle(lookup_unthrottled, 1100);
