var sys = require('sys');
var _ = require('underscore');
var users = require('./users');
var readings = require('./readings');
var rclient = require('./redisclient');

var global_action_list = "actions";
var list_max_size = 1000;
var listener;

exports.publish_action = function(user_id, action, object, callback) {
    if (action === "read") {
        publish_read_action(user_id,object,callback);
    } else {
        console.log("Unknown action:",action);
        callback(null,null);
    }
};

var publish_read_action = function(user_id, book, callback) {
    var client = rclient.getClient();
    users.get_by_id(user_id, function(err,user) {
        if(!_.isNull(user.name)) {
            var user_link = "<a href='"+users.url_for_id(user_id)+"'>"+user.name+"</a>";
            var read_link = "<a href='"+readings.url_for_id(user_id,book.id)+"'>"+book.title+"</a>";
            action = user_link + " read " + read_link;
            if (!_.isUndefined(listener)) {
                listener([action]);
            }
            client.lpush(global_action_list,action,function(err,res) {
                console.log("Saved action",action);
                if (!_.isNull(callback) && !_.isUndefined(callback)) {
                    console.log("calling callback in publish_action");
                    callback(err,res);
                }
                client.ltrim(global_action_list, 0, list_max_size, function(err,res) {
                    console.log("trimmed global action list");
                });
            });
        }
    });
};

exports.get_actions = function(count, callback) {
    var client = rclient.getClient();
    client.lrange(global_action_list, 0, count, function(err,res) {
        callback(err,res);
    });
};

exports.set_listener = function(callback) {
    listener = callback;
};
