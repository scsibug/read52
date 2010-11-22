var http = require('http');
http.createServer(function (req, res) {
        res.writeHead(200, {'Content-Type': 'text/plain'});
        res.end('Hello World\n');
    }).listen(8124, "127.0.0.1");
console.log('Server running at http://127.0.0.1:8124/');

var sys = require('sys');
var client = require("./lib/redis-client").createClient();
client.info(function (err, info) {
        if (err) throw new Error(err);
        sys.puts("Redis Version is: " + info.redis_version);
        client.close();
    });
