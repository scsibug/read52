var sys = require('sys');

module.exports= function(options) {
    options= options || {};
    var that= {};
    var my= {}; 
    that.name     = options.name || "form";
    that.authenticate= function(request, response, callback) {
        sys.print("Form Authenticate called\n");
        this.success( {id:'1', name:'someUser'}, callback );
    }
    return that;
};  