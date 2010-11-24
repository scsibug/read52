var app = require('express').createServer();
var sys = require('sys');

var client = require("./lib/redis-client").createClient();
var books = require("./books");

app.listen(8124);

app.get('/', function(req, res){
    res.send('hello world');
});

// List All Users
app.get('/users', function(req, res){
    var userlist = "<h1>User List</h1><br />"
    users.listUsers(
        client,
        function(name) {userlist+=String(name+"<br />")},
        function() {res.send(userlist)}
    );
});

// List All Books
app.get('/books', function(req, res){
    var booklist = "<h1>Book List</h1><br />"
    books.listBooks(client,
              function(title) {booklist+=String(title+"<br />")},
              function() {res.send(booklist)}
             );
});

