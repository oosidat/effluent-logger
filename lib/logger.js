/*
 * Copyright (c) 2013 Chunjong Park
 * Copyright (c) 2015, Joyent, Inc.
 *
 * This is a modified version of cjpark87's fluent-logger-nodejs intended for
 * use as a bunyan stream sending specific messages to a fluentd server.
 */

var assert = require('assert');
var net = require('net');
var stream = require('stream');
var util = require('util');

// GLOBAL
var INITIAL_RETRY = 2; // Seconds
var MAX_RETRY = 60;    // Seconds
var MODULE_NAME = 'EffluentLogger';

function Logger(options) {
    var self = this;
    var log = options.log;

    self.connected = false;
    self.writable = true;

    self.droppedWrites = 0;
    self.host = options.host || '127.0.0.1';
    self.port = options.port || 24224;
    self.retryTime = INITIAL_RETRY;
    self.filter = options.filter;
    self.tag = options.tag || 'debug';

    function tryConnection() {
        if (log) {
            log.debug(MODULE_NAME + ': connecting');
        }
        self.writeStream = net.connect({
            port: self.port,
            host: self.host
        }, function () {
            if (log) {
                log.info(MODULE_NAME + ': connected to <'
                    + self.host + ':' + self.port + '>');
            }
            self.connected = true;
            if (self.droppedWrites > 0) {
                if (log) {
                    log.warn(MODULE_NAME + ': dropped: ' + self.droppedWrites
                        + ' messages while disconnected');
                }
                self.droppedWrites = 0;
            }
            self.retryTime = INITIAL_RETRY;
        });

        self.writeStream.on('close', function () {
            self.connected = false;
            if (log) {
                log.info(MODULE_NAME + ': connection closed. Waiting '
                    + self.retryTime + 's for reconnect');
            }
            setTimeout(tryConnection, self.retryTime * 1000); // Try reconnect
            self.retryTime = self.retryTime * 2;
            if (self.retryTime > MAX_RETRY) {
                self.retryTime = MAX_RETRY;
            }
        });

        self.writeStream.on('error', function (err) {
            if (!log) {
                return;
            }
            if (err.code) {
                log.error({err: err}, MODULE_NAME + ' encountered an error');
            } else {
                log.error({err: err}, MODULE_NAME + ' unexpected error');
            }
        });
    }

    tryConnection();
}

util.inherits(Logger, stream.Stream);

Logger.prototype.write = function (data, encoding) {
    var self = this;

    assert(typeof (data) === 'object', 'data must be a bunyan object');
    assert(data.time, 'data must have a time field');

    if (!self.connected) {
        self.droppedWrites++;
        return;
    }

    // If a filter was passed and it returns anything but true for this object
    // we skip sending it.
    if (self.filter && !self.filter(data)) {
        return;
    }

    self.send(self.tag, data);
};

Logger.prototype.send = function (tag, data) {
    var packet;
    var timestamp;

    timestamp = new Date(data.time).getTime() / 1000;
    packet = JSON.stringify([tag, timestamp, data]);
    this.writeStream.write(packet);
};

Logger.prototype.end = function () {
    this.writeStream.end();
};

Logger.prototype.destroy = function () {
    this.writeStream.destroy();
};

module.exports = Logger;
