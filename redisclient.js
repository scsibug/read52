// Global registry for our Redis connection.
// Use this instead of passing around a single 'client' handle.
// Also allows us to select a database within Redis.
var sys = require('sys');
var redis = require("redis");
require("underscore");

var client;
var db = 0;

exports.initClient = function(select_db) {
    sys.print("initializing client\n");
    client = redis.createClient();
    if (select_db) {db = select_db;}
    client.select(db,function(){});
    return client;
}

exports.getClient = function() {
    if (_.isUndefined(client)) {
            sys.print("Error: client has not been initialized\n");
    }
    return client;
}

exports.quit = function(callback) {
    var quitting = client;
    quitting.quit(callback);
    client = undefined;
}