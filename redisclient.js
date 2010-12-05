// Global registry for our Redis connection.
// Use this instead of passing around a single 'client' handle.
// Also allows us to select a database within Redis.
var redis = require("redis");
var _ = require("underscore");

var client;
var db = 0;

exports.initClient = function(select_db) {
    client = redis.createClient();
    if (select_db) {db = select_db;}
    client.select(db,function(){});
    return client;
}

exports.getClient = function() {
    if (_.isUndefined(client)) {
        console.log("Error: client has not been initialized");
    }
    return client;
}

//exports.quit = function(callback) {
//    var quitting = client;
//    client = undefined;
//}