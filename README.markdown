This is a simple webapp for keeping track of, and publicizing, books you have read.  Specifically, it is meant for anyone trying to read 52 books in 52 weeks.

== Requirements ==

  52-in-52 runs on node.js, and requires the following packages (installable through npm).

* express 1.0
* connect 0.3.0
* apac@latest
* underscore
* ejs
* node_redis ("redis" on npm)
* connect-auth
* vows (testing)

Included:

* isbnjs (MIT licensed by hetappi.pm, http://code.google.com/p/isbnjs/)

Data Storage is through Redis, so you'll need a server installed and available (2.0+ is recommended).

Finally, you'll need an Amazon Associate account in order to have book information retrieved.  Credentials should be places in `aws_cred.js` (`aws_cred_EXAMPLE.js` is a template).