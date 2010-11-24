// Module to manage users.
// This primarily serves to keep track of who has which readings.
var readings = require('./readings');

// sends user names to userCallback, endCallback called at completion
exports.listUsers = function(client, userCallback, endCallback) {
    client.keys("user:*:name", function(err,reply){
        var replies = 0;
        for(var i=0; i < reply.length; i++) {
            client.get(reply[i], function(err,name){
                 userCallback(name);
                replies++;
                if (replies == reply.length) {endCallback();}
            });
        }
    });
}