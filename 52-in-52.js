var app = require('express').createServer();
var sys = require('sys');

var client = require("./lib/redis-client").createClient();

app.listen(8124);

app.get('/', function(req, res){
    res.send('hello world');
});

app.get('/users', function(req, res){
    var userlist = "<h1>User List</h1><br />"
    listUsers(client,
              function(name) {userlist+=String(name+"<br />")},
              function() {res.send(userlist)}
             );
});

// sends user names to userCallback, endCallback called at completion
var listUsers = function(client, userCallback, endCallback) {
    client.keys("user:*:name", function(err,reply){
        var replies = 0;
        for(var i=0; i < reply.length; i++) {
            client.get(reply[i], function(err,name){
                 userCallback(name);
                replies++;
                if (replies == reply.length) {endCallback();}
            });
        }
    });
}