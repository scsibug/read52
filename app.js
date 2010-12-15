var express = require('express');
var sys = require('sys');
var _ = require('underscore');
var books = require("./books");
var users = require("./users");
var readings = require("./readings");
var actions = require("./actions");
var rclient = require('./redisclient');
var client = rclient.initClient();
var auth = require('connect-auth')
var form_strategy = require('./form_strategy');
//var MemoryStore = require('connect/middleware/session/memory');
var RedisStore = require('./connect_redis');
var app = express.createServer();
var isbn = require('./isbn');
var io = require('socket.io')
// Enable cookies/sessions (stored in memory)

app.configure(function() {
    app.use(express.bodyDecoder());
    app.use(express.cookieDecoder());
    app.use(express.session({ store: new RedisStore({ maxAge: 60000 * 60 * 24 * 30 })}));
//    app.use(express.session({ store: new MemoryStore({ reapInterval: 60000 * 60 })}));
    app.use(auth(form_strategy()));
});

// EJS is our default templating system
app.set('view engine', 'ejs');

// Check if a userid matches the current authenticated user
var authzUser = function authzUser(req,userid) {
    var isAuthz = (req.isAuthenticated() && (req.getAuthDetails().user.id == userid));
    return isAuthz;
}

// Front page
app.get('/', function(req, res){
    res.render('index', {
        locals: { title: "52-in-52",
                  nav: "home",
                  user: req.getAuthDetails().user
                }
    });
});

// Display login screen
app.get('/login', function(req, res) {
    res.render('login', {
        locals: { title: "Login",
                  nav: "login",
                  user: req.getAuthDetails().user
                }
    });
});

// Registration Form
app.get('/register', function(req, res) {
    res.render('register', {
        locals: { title: "Create New Account",
                  nav: "login",
                  user: req.getAuthDetails().user
                }
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

app.get('/user/:id', function(req, res) {
    users.user_id_exists(req.params.id,function(err,exists) {
        if (err || !exists) {
            res.send("User "+req.params.id+" does not exist", 404);
            return;
        }
        readings.readings_for_user(req.params.id,0,52,function(err,readings) {
            if (err) {
                res.redirect('/');
            }
            res.render('user', {
                locals: {title: "User",
                         nav: "user",
                         user: req.getAuthDetails().user,
                         userIsHome: authzUser(req,req.params.id),
                         readings: readings,
                        }
            });
        });
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
            locals: { books: booklist,
                      title: "Book List",
                      nav: "books",
                      user: req.getAuthDetails().user
                    }
        });       
    });
});

// Get book information from amazon
app.get('/book/:id', function(req, res) {
    new books.Book(req.params.id, function(err,b) {
        res.render('book', {
            locals: { title: ("Info for "+b.title),
                      book: b,
                      nav: "books",
                      user: req.getAuthDetails().user
                    }
        });
    });
});

// Raw book information (mostly for debugging at the moment)
app.get('/book/:id/:key', function(req, res) {
    new books.Book(req.params.id, function(err,b) {
        var content = b[req.params.key];
        if (!_.isUndefined(content) && !_.isNull(content)) {
            console.log("content is",content);
            // redirect image URLs
            if (req.params.key.substr(0,"amz_img_".length) == "amz_img_") {
                console.log("Sending redirect to image",content);
                res.redirect(content,303);
                return;
            }
            res.send(b[req.params.key].toString());
        } else {
            res.send("Key "+req.params.key+" does not exist", 404);
        }
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

// Broadcast recent events
var socket = io.listen(app);

actions.set_listener(function(msg) {
    socket.broadcast(msg);
});


socket.on('connection', function(client){
    actions.get_actions(10, function(err,res) {
        if (err) {
            console.log("Err: ",err);
        }
        if (!_.isNull(res)) {
            client.send(res.reverse());
        }
    });
});