This is a simple webapp for keeping track of, and publicizing, books you have read.  Specifically, it is meant for anyone trying to read 52 books in 52 weeks.

# Requirements #
In short, install node, npm, load dependent libraries using npm, install & start the redis server.  Get an Amazon Associates account, and then start this application.

## Node ##
[node.js](http://nodejs.org/) 0.2.5 is required.

## NPM Packages ##
Libraries can be installed with [npm](https://github.com/isaacs/npm#readme).  Run `npm install packag@version` for each of the following.

* express@1.0.0
* connect@0.3.0
* apac@latest
* underscore@1.1.3
* ejs@0.2.1
* redis@0.3.7
* connect-auth@0.2.1
* vows@0.5.2

## Redis ##
Data Storage is through [Redis](http://code.google.com/p/redis/), so you'll need a server installed and available (Only tested with 2.0+).

## Amazon Associates Account ##
You'll need an Amazon Associate account in order to retrieve book metadata and pictures.  In particular, you'll need access to the [Product API](https://affiliate-program.amazon.com/gp/advertising/api/detail/main.html).  Credentials should be places in `aws_cred.js` (`aws_cred_EXAMPLE.js` is a template).

# Running #

`node app.js` will start a server on port 8124.

# Licensing #

This application is BSD-3 licensed (see `LICENSE`).

Included in this repository directly in /lib under its own license:
* isbnjs (MIT licensed by hetappi.pm, http://code.google.com/p/isbnjs/)

