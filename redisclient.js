// Global registry for our Redis connection.
// Use this instead of passing around a single 'client' handle.
// Also allows us to select a database within Redis.
var redis = require("redis");
var _ = require("underscore");

var client;
var db = 0;

var sessionclient;
var session_db = 1;

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

exports.initSessionClient = function(select_db) {
    sessionclient = redis.createClient();
    if (select_db) {session_db = select_db;}
    sessionclient.select(session_db,function(){});
    return sessionclient;
}

exports.getSessionClient = function() {
    if (_.isUndefined(client)) {
        console.log("Error: session client has not been initialized");
    }
    return sessionclient;
}

