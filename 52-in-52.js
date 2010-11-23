var app = require('express').createServer();
var sys = require('sys');

var client = require("./lib/redis-client").createClient();

app.get('/', function(req, res){
    res.send('hello world');
});

app.get('/users', function(req, res){
    var userlist = "User List\n"
    client.keys("user:*:name", function(err,reply){
        sys.print(reply);
        userlist=String(reply)
        res.send(userlist);
        client.get(reply, function(err,reply){
        });
    });
});

app.listen(8124);
