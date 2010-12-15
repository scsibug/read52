var sys = require('sys');
var _ = require('underscore');
var users = require('./users');
var rclient = require('./redisclient');

var global_action_list = "actions";
var list_max_size = 1000;
var listener;

exports.publish_action = function(user_id, action, callback) {
    var client = rclient.getClient();
    users.get_by_id(user_id, function(err,user) {
        if(!_.isNull(user.name)) {
            action = user.name + " " + action;
             if (!_.isUndefined(listener)) {
                if (_.isFunction(listener)) {console.log("Listener is a function");}
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
