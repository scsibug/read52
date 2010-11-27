var express = require('express');
var sys = require('sys');
require('underscore');
var books = require("./books");
var users = require("./users");
var rclient = require('./redisclient');
var client = rclient.initClient(99);

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
        function(name) {userlist+=String(name+"<br />")},
        function() {res.send(userlist)}
    );
});

// List All Books
app.get('/books', function(req, res){
    var booklist = "<h1>Book List</h1><br />"
    books.list_books(0,100, function(err,booklist) {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        _.each(booklist,function(book) {
            res.write(book.ean +" --> "+ book.title+"\n",'utf8')
        });
        res.end();
    });
});

// Get book information from amazon
app.get('/books/:id', function(req, res) {
    new books.Book(req.params.id, function(err,b) {
        res.render('book', {
            locals: { title: b.title, book: b }
        });
    });
});

// Show raw AMZ information
app.get('/books/:id/amz', function(req, res) {
    new books.Book(req.params.id, function(err,b) {
        res.send(b.raw);
    });
});

// Force an update of book metadata... mostly useful for debugging
app.post('/books/:id/update', function(req, res) {
    sys.print("Forcing an update of "+req.params.id+" via AWS\n");
    books.save_book(req.params.id,function() {
        new books.Book(req.params.id, function(err,b) {
            res.redirect('/books/'+b.ean, 200);
        });
    });
});

// Static files.  Keep this last so it doesn't interfere with dynamic routes.
app.use(express.staticProvider(__dirname + '/static'));
// Start the server
app.listen(8124);