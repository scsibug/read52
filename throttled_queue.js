var sys = require('sys');
var _ = require('underscore');

// This module defines a queue that will process items
// with a defined delay (FIFO).  Every item will be processed.
// Probably buggy, but we need a cheap way to throttle API calls.
// we lose the return value, but doesn't matter for our purposes.

// Give a queue and a function, and get a *real* throttled function.
exports.throttle = function(queue, func) {
    return function() {
        var context = this, args = arguments;
        var throttler = function() {
            func.apply(context, args);
        };
        queue.add(throttler);
    };
};


function ThrottledQueue(options) {
    if (_.isUndefined(options)) {
        options = {};
    }
    this.delay = 1000;
    this.queue = [];
    this.prior_process_date = 0;
    if (!_.isUndefined(options.delay)) {
        this.delay = options.delay;
    }
    this.running = false;
    this.processors = 0;
}

// add a function to the queue
ThrottledQueue.prototype.add = function(callback) {
    this.queue.push(callback);
    this.process();
}

ThrottledQueue.prototype.process = function() {
    var context = this;
    // this method protects raw_process, so that multiple copies are not spawned.
    if (this.running == true) {
        // if the process is already running, exit.
        return;
    } else {
        // start it up
        this.running = true;
        // account for time between starts/stops.
        var timediff = (+new Date()) - this.prior_process_date;
        this.prior_process_date = (+new Date());
        // Too soon to start running:
        if (timediff < this.delay) {
            setTimeout(function() { context.raw_process(); });
            return;
        // Long enough delay to start immediately
        } else {
            context.raw_process();
            return;
        }
    }
}

ThrottledQueue.prototype.raw_process = function() {
// Should only have one instance of this function running on a queue at a time
    var context = this;
    // process as much of the queue as we can.
    if (this.queue.length > 0) {
        // pull first function
        var callback = this.queue.shift();
        // call function immediately
        console.log(new Date());
        callback();
        setTimeout(function() {
            context.raw_process(null);
        },this.delay);
    } else {
        this.running = false;
    }
}

exports.ThrottledQueue = ThrottledQueue;