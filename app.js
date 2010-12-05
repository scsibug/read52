var express = require('express');
var sys = require('sys');
var _ = require('underscore');
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
    users.create_user(req.body.email, req.body.user, req.body.password, function(err,user) {
        res.redirect('/',303);
    });
});

// Process logins
app.post('/login', function(req, res) {
    req.authenticate(["form"], function(error, authenticated) {
        if (authenticated) {
            res.redirect('/user/'+req.getAuthDetails().user.id);
        } else {
            res.redirect('/login'); //
        }
    });
});

app.get('/user/:id', function(req, res) {
    if (req.isAuthenticated()) {
        res.render('user', {
            locals: {title: "User", user: req.getAuthDetails().user}
        });
    } else {
        res.redirect('/login');
    }
});

app.get('/private', function(req, res) {
    if( !req.isAuthenticated() ) {
        res.send("You are not authenticated");
    } else {
        res.send("you are authenticated!\n " + JSON.stringify( req.getAuthDetails().user ) );
    }
});

// List All Books
app.get('/book', function(req, res){
    books.list_books(0,100, function(err, booklist) {
        res.render('books', {
            locals: { books: booklist, title: "book list" }
        });       
    });
});

// Get book information from amazon
app.get('/book/:id', function(req, res) {
    new books.Book(req.params.id, function(err,b) {
        res.render('book', {
            locals: { title: b.title, book: b }
        });
    });
});

// Show raw AMZ information
app.get('/book/:id/amz', function(req, res) {
    new books.Book(req.params.id, function(err,b) {
        res.send(b.raw);
    });
});

// Force an update of book metadata... mostly useful for debugging
app.post('/book/:id/update', function(req, res) {
    console.log("Forcing an update of ",req.params.id," via AWS");
    books.save_book(req.params.id,function() {
        new books.Book(req.params.id, function(err,b) {
            res.redirect('/book/'+b.ean, 200);
        });
    });
});

// Static files.  Keep this last so it doesn't interfere with dynamic routes.
app.use(express.staticProvider(__dirname + '/static'));
// Start the server
app.listen(8124);