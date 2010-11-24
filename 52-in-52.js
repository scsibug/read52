var app = require('express').createServer();
var sys = require('sys');

var client = require("./lib/redis-client").createClient();
var books = require("./books");

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

app.get('/books', function(req, res){
    var booklist = "<h1>Book List</h1><br />"
    books.listBooks(client,
              function(title) {booklist+=String(title+"<br />")},
              function() {res.send(booklist)}
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