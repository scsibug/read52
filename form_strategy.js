var sys = require('sys');
var _ = require('underscore');
var users = require('./users');

module.exports= function(options) {
    options= options || {};
    var that= {};
    var my= {}; 
    that.name     = options.name || "form";
    var send_to_login = function(response) {
        response.redirect('/login',303);
    }
    that.authenticate= function(request, response, callback) {
        var context = this;
        var email = request.body.email;
        var password = request.body.password;
        if (!email || !password) {
            send_to_login(response);
        }
        users.get_by_email(email, function(err, user) {
            if (!user || err) {
                send_to_login(response);
            } else {
                user.checkPassword(password, function(err, result) {
                    if (result) {
                        context.success( {id : user.id, name : user.name, email : user.email}, callback );    
                    } else {
                        context.fail(callback);
                    }
                });
            }
        });
    }
    return that;
};