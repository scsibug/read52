var express = require('express');
var sys = require('sys');
var _ = require('underscore');
var books = require("./books");
var users = require("./users");
var readings = require("./readings");
var actions = require("./actions");
var rclient = require('./redisclient');
var client = rclient.initClient();
var auth = require('connect-auth');
var form_strategy = require('./form_strategy');
var RedisStore = require('./connect_redis');
var app = express.createServer();
var isbn = require('./isbn');
var io = require('socket.io');
var form = require('connect-form');
var fs = require('fs');

app.configure(function() {
    app.use(express.bodyDecoder());
    app.use(express.cookieDecoder());
    app.use(express.session({ store: new RedisStore({ maxAge: 60000 * 60 * 24 * 30 })}));
    app.use(auth(form_strategy()));
    app.use(form({ keepExtensions: true }));
});

// EJS is our default templating system
app.set('view engine', 'ejs');

// Check if a userid matches the current authenticated user
var authzUser = function authzUser(req,userid) {
    var isAuthz = (req.isAuthenticated() && (req.getAuthDetails().user.id == userid));
    return isAuthz;
};

// Front page
app.get('/', function(req, res){
    res.render('index', {
        locals: { title: "Read52",
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
    var flash = req.flash();
    res.render('register', {
        locals: { title: "Create New Account",
                  nav: "login",
                  user: req.getAuthDetails().user,
                  flash: flash
                }
    });
});

app.post('/register', function(req, res) {
    if (_.isNull(req.body.password) || req.body.password == "") {
        req.flash('error', 'You must enter a password');
        res.redirect('/register');
        return;
    }
    if (req.body.password !== req.body.verify_password) {
        req.flash('error', 'Passwords must match');
        res.redirect('/register');
        return;
    }
    users.create({email:req.body.email, name:req.body.user, password:req.body.password}, function(err,user) {
        if (err) {
            req.flash('error', err);
            return;
        }
        // User can now be authenticated and directed to their user page.
        req.authenticate(["form"], function(error, authenticated) {
            if (authenticated) {
                res.redirect('/user/'+user.id);
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

app.get('/users', function(req, res) {
    users.get_users(function(err,users) {
        res.render('users', {
            locals: {title: "Users",
                     nav: "users",
                     user: req.getAuthDetails().user,
                     users: users
                    }
        });
    });
});

app.get('/user/:id/annual_page_count', function(req,res) {
    readings.annual_page_count(req.params.id, function(err,pagecount) {
        res.send(pagecount.toString());
    });
});

// This is used as an iframe for embedded "reading counts"
app.get('/user/:id/book_count_button.html', function(req,res) {
    readings.annual_book_count(req.params.id, function(err,bookcount) {
        res.render('book_count_button', {
            layout: false,
            locals: { count: bookcount.toString() }
        });
    });
});

app.get('/user/:id/annual_book_count', function(req,res) {
    readings.annual_book_count(req.params.id, function(err,bookcount) {
        res.send(bookcount.toString());
    });
});

app.get('/user/:id', function(req, res, next) {
    users.user_id_exists(req.params.id,function(err,exists) {
        if (err || !exists) {
            return next(new NotFound("User "+req.params.id+" does not exist."));
        }
        users.get_by_id(req.params.id, function(err, pageuser) {
            if (err) {
                console.log(err);
                res.redirect('/');
            }
            readings.readings_for_user(req.params.id,0,52,function(err,myreadings) {
                if (err) {
                    console.log(err);
                    res.redirect('/');
                }
                readings.annual_book_count(req.params.id,function(err,bookcount) {
                    if (err) {
                        console.log(err);
                        res.redirect('/');
                    }
                    readings.annual_page_count(req.params.id, function(err,pagecount) {
                        if (err) {
                            console.log(err);
                            res.redirect('/');
                        }
                        var nav = "user";
                        if (authzUser(req,req.params.id)) {
                            nav = "userhome";
                        }
                        res.render('user', {
                            locals: {title: "User",
                                     nav: nav,
                                     bookcount: bookcount,
                                     user: req.getAuthDetails().user,
                                     pageuser: pageuser,
                                     userIsHome: authzUser(req,req.params.id),
                                     readings: myreadings,
                                     pagecount: pagecount.toString()
                                    }
                        });
                    });
                });
            });
        });
    });
});

// Get all public data a user has entered
app.get('/user/:id/export', function (req, res) {
    readings.readings_for_user(req.params.id,0,-1,function(err,readings) {
        res.send(JSON.stringify(readings));
    });
});

app.get('/user/:id/import', function (req, res) {
    res.render('import', {
        locals: { title: "Import Data",
                  nav: "",
                  userIsHome: authzUser(req,req.params.id),
                  user: req.getAuthDetails().user
                }
    });
});

// Bulk import user data
// TODO: make this work with ISBN/EAN/ASIN instead of non-portable book IDs
// format for POSTed import data.
// Must be JSON.
// A single array of entries.
// Each entry is an object with the following fields (if they exist):
// ean, asin, comment, rating, completion_date
app.post('/user/:id/import', function (req, res) {
    sys.print(sys.inspect(req));
    if (authzUser(req,req.params.id)) {
        if (req.form) {
            req.form.complete(function(err, fields, files) {
                console.log("ERR",err);
                console.log("Fields",sys.inspect(fields));
                console.log("Files",sys.inspect(files));
                // our file is at:
                var location = files.datafile.path
                fs.readFile(location, function (err,data) {
                    fs.unlink(location,function(err) {
                        if (err) {
                            console.log(err);
                        }
                    });
                    var importjson = JSON.parse(data);
                    // We are expecting the body to be JSON-encoded readings.
                    // We ignore some fields(userid), and use the rest to recreate readings.
                    
                    _.each(importjson,function(elem, index, list) {
                        var total = list.length;
                        var identifier = elem.asin;
                        // prefer EAN if it exists
                        if (elem.ean) {
                            identifier = elem.ean
                        }
                        var addElem = function(identifier,elem) {
                            books.create_from_identifier(identifier,function(err,book) {
                            var book_id = book.id;
                                readings.create(
                                    {userid: req.params.id,
                                     book_id: book_id,
                                     comment: elem.comment,
                                     rating: elem.rating,
                                     completion_date: elem.completion_date
                                    },function(err,reading) {
                                    });
                            });
                        }
                        addElem(identifier,elem);
                        res.send("thanks...will try to import this!");
                    });
                });
            });
        } else {
            res.redirect('/'); // No form data!
        }
    } else {
        console.log("Unauthorized POST against user",req.params.id);
        res.send("Not authorized",401);
    }
});

app.get('/user/:id/read/:bookid', function (req, res, next) {
    users.get_by_id(req.params.id, function(err, pageuser) {
        if (err) {
            console.log(err);
            res.redirect('/');
        }
        readings.get_by_book_id(req.params.id, req.params.bookid, function(err,r) {
            if (err) {
                console.log("Error:",err);
                res.redirect('/');
            } else if (_.isNull(r)) {
                return next(new NotFound("Reading does not exist."));
            } else {
                res.render('read', {
                    locals: { reading: r,
                              title: r.book.title,
                              nav: "books",
                              userIsHome: authzUser(req,req.params.id),
                              pageuser: pageuser,
                              user: req.getAuthDetails().user
                            }
                });
            }
        });
    });
});


// Add a book that a user has read
app.post('/user/:id/read', function (req, res) {
    var completion_date = parseInt(req.body["completion-date"]);
    if (_.isNull(completion_date) || _.isNull(completion_date) || !_.isNumber(completion_date)) {
        completion_date = +new Date();
        console.log("set completion date to the current timestamp");
    }
    if (authzUser(req,req.params.id)) {
        var term = req.body.searchterm;
        if (_.isNull(term)) {
            console.log("Book search term is not valid");
            res.send("Invalid Search Term",409);
            return;
        }
        // get book (creating if necessary)
        books.create_from_identifier(term,function(err,book) {
            console.log(book);
            console.log(err);
            var book_id = book.id;
            readings.create(
                {userid: req.params.id,
                 book_id: book_id,
                 comment: req.body.comment,
                 rating: req.body.rating,
                 completion_date: completion_date},
                function(err,reading) {
                    res.redirect('/user/'+req.params.id+'/read/'+book_id);
                });
        });        
    } else {
        console.log("Unauthorized POST against user",req.params.id);
        res.send("Not authorized",401);
    }
});

// Remove a reading
app.post('/user/:id/read/:bookid/remove', function (req, res) {
    console.log("remove called");
    if (authzUser(req,req.params.id)) {
        readings.remove(req.params.id,req.params.bookid,function(err,rm) {
            if (err) {
                console.log("Error removing reading",err);
            } else {
                console.log("Remove happened without error");
            }
            
            res.redirect('/user/'+req.params.id);
        });
    } else {
        console.log("Unauthorized POST against user",req.params.id);
        res.send("Not authorized",401);
    }
});

// Update a book that a user has read
app.post('/user/:id/read/:bookid', function (req, res) {
    if (authzUser(req,req.params.id)) {
        // lookup the existing reading
        readings.get_by_book_id(req.params.id,req.params.bookid,function(err,reading) {
            if (err) {
                console.log("Error updating reading",err);
            }
            // Update fields from form
            reading.comment = req.body["comment"];
            reading.rating = req.body.rating;
            reading.completion_date = parseInt(req.body["completion-date"]);
            // Save the updated reading entry
            reading.save(function(err,newreading) {
                if (!err) {
                    console.log("Save successful");
                }
                res.redirect('/user/'+req.params.id+'/read/'+req.params.bookid);
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
    books.get_by_id(req.params.id, function(err,b) {
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
app.get('/book/:id/:key', function(req, res, next) {
    (new books.Book(req.params.id, function(err,b) {
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
            return next(new NotFound("Key "+req.params.key+" does not exist."));
        }
    }));
});

// Force an update of book metadata... mostly useful for debugging
app.post('/book/:id/update', function(req, res) {
    console.log("Forcing an update of ",req.params.id," via AWS");
    books.save_book(req.params.id,function() {
        (new books.Book(req.params.id, function(err,b) {
            res.redirect('/book/'+b.id, 200);
        }));
    });
});

// Static files.  Keep this last so it doesn't interfere with dynamic routes.
app.use(express.staticProvider(__dirname + '/static'));

/*************** Error Handling *************/
function NotFound(msg) {
    this.name = 'NotFound';
    this.msg = msg;
    Error.call(this, msg);
    Error.captureStackTrace(this, arguments.callee);
}

sys.inherits(NotFound, Error);

// Error page
app.get('/error', function(req, res) {
    unknownMethod();
});

app.error(function(err, req, res, next) {
    if (err instanceof NotFound) {
        res.render('404', { status: 404,
                            locals: {
                                title: "Not Found",
                                user: null,
                                nav: "",
                                msg: err.msg
                            }
                          });
    } else {
        next(err);
    }
});

app.error(function(err, req, res) {
    console.log(sys.inspect(err));
    console.log(err.message);
    res.render('500', {
        status: 500,
        locals: {
            title: "Error",
            nav: "",
            user: req.getAuthDetails().user,
            error: err
        } 
    });
});


// Start the server
app.listen(8124);

/************** Socket.IO *****************/
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