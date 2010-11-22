var app = require('express').createServer();
var sys = require('sys');

var client = require("./lib/redis-client").createClient();

app.get('/', function(req, res){
        res.send('hello world');
    });

app.listen(8124);
