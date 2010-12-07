var express = require('express');
var sys = require('sys');
var _ = require('underscore');
var books = require("./books");
var users = require("./users");
var readings = require("./readings");
var rclient = require('./redisclient');
var client = rclient.initClient();
var auth = require('connect-auth')
var form_strategy = require('./form_strategy');
var MemoryStore = require('connect/middleware/session/memory');
var app = express.createServer();
var isbn = require('./isbn');
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
    users.create({email:req.body.email, name:req.body.user, password:req.body.password}, function(err,user) {
        req.authenticate(["form"], function(error, authenticated) {
            if (authenticated) {
                res.redirect('/user/'+user.id);
            } else {
                res.redirect('/',303);
            }

        });
    });
});

// Process logins
app.post('/login', function(req, res) {
    req.authenticate(["form"], function(error, authenticated) {
        if (authenticated) {
            console.log("successful authentication");
            res.redirect('/user/'+req.getAuthDetails().user.id);
        } else {
            console.log("authentication failed");
            res.redirect('/login');
        }
    });
});

app.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
});

var authzUser = function authzUser(req,userid) {
    var isAuthz = (req.isAuthenticated() && (req.getAuthDetails().user.id == userid));
    return isAuthz;
}

app.get('/user/:id', function(req, res) {
    res.render('user', {
        locals: {title: "User",
                 user: req.getAuthDetails().user,
                 userIsHome: authzUser(req,req.params.id),
                }
    });
});

app.get('/user/:id/read/:ean', function (req, res) {
    //res.send("Request for user:"+req.params.id+", EAN:"+req.params.ean);
    res.redirect('/book/'+req.params.ean);
});

// Add a book that a user has read
app.post('/user/:id/read', function (req, res) {
    if (authzUser(req,req.params.id)) {
        var ean = isbn.to_isbn_13(req.body.isbn);
        if (_.isNull(ean)) {
            console.log("ISBN/EAN is not valid");
            res.send("Invalid ISBN",409);
            return;
        }
        readings.create(
            {userid: req.params.id,
             isbn: ean,
             comment: req.body.comment,
             rating: req.body.rating,
             completion_date: req.body.completion_date,
            },function(err,reading) {
                // Create book, if necessary
                books.get_book(ean,function(err,book) {
                    res.redirect('/user/'+req.params.id+'/read/'+ean);
                });
            });
    } else {
        console.log("Unauthorized POST against user",req.params.id);
        res.send("Not authorized",401);
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