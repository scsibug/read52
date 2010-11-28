var sys = require('sys');

module.exports= function(options) {
    options= options || {};
    var that= {};
    var my= {}; 
    that.name     = options.name || "form";
    that.authenticate= function(request, response, callback) {
        this.success( {id:'1', name:'someUser'}, callback );
    }
    return that;
};  