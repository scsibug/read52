var express = require('express');
var sys = require('sys');
require('underscore');
var books = require("./books");
var users = require("./users");
var rclient = require('./redisclient');
var client = rclient.initClient();
var auth = require('connect-auth')
var form_strategy = require('./form_strategy');
var MemoryStore = require('connect/middleware/session/memory');
var app = express.createServer();
// Enable cookies/sessions (stored in memory)

app.configure(function() {
    app.use(express.bodyDecoder());
    app.use(express.cookieDecoder());
    app.use(express.session({ store: new MemoryStore({ reapInterval: 60000 * 60 })}));
    app.use(auth(form_strategy()));
});

// EJS is our default templating system
app.set('view engine', 'ejs');

// Front page
app.get('/', function(req, res){
    res.send('hello world');
});

// Display login screen
app.get('/login', function(req, res) {
    res.render('login', {
        locals: { title: "Login" }
    });
});

// Registration Form
app.get('/register', function(req, res) {
    res.render('register', {
        locals: { title: "Create New Account" }
    });
});

app.post('/register', function(req, res) {
    
    res.redirect('/',303);
});

// Registration Processing
app.post('/register', function(req, res) {

});

// Process logins
app.post('/login', function(req, res) {
    req.authenticate(["form"], function(error, authenticated) {
        sys.print("POST to login, authenticate callback called\n")
        res.send(sys.inspect(authenticated));
    });
});

app.get('/private', function(req, res) {
    if( !req.isAuthenticated() ) {
        res.send("You are not authenticated");
    } else {
        res.send("you are authenticated!\n " + JSON.stringify( req.getAuthDetails().user ) );
    }
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