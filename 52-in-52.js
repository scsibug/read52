var express = require('express');
var sys = require('sys');
var books = require("./books");
var users = require("./users");
var redis = require("redis"),
    client = redis.createClient();

var app = express.createServer();

// EJS is our default templating system
app.set('view engine', 'ejs');

// Front page
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

// Get book information from amazon
app.get('/books/:id', function(req, res) {
    books.get_book(client, req.params.id, function (book) {
        res.render('book', {
            locals: { title: book.title, book: book }
        });
    });
});

// Force an update of book metadata... mostly useful for debugging
app.post('/books/:id/update', function(req, res) {
    sys.print("Forcing an update of "+req.params.id+" via AWS\n");
    books.save_book(client, req.params.id);
    res.redirect('/books/'+req.params.id, 200);
});

// Static files.  Keep this last so it doesn't interfere with dynamic routes.
app.use(express.staticProvider(__dirname + '/static'));
// Start the server
app.listen(8124);