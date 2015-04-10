effluent-logger
===============

<a href="https://github.com/joshwilsdon/effluent-logger" target="_blank">effluent-logger</a> is a stream-based logger based on: <a href="https://github.com/cjpark87/fluent-logger-nodejs" target="_blank">fluent-logger-stream</a> redesigned to only log using the 'forward' type and to allow a filtered stream of log messages.

# Usage
### Create bunyan log stream

You can create a bunyan logger `log` with an EffluentLogger stream attached to
send all messages that have an `evt` property to a remote fluentd server:

```
var bunyan = require('bunyan');
var EffluentLogger = require('effluent-logger');

var evtLogger = new EffluentLogger({
    filter: function _evtFilter(obj) { return (!!obj.evt); },
    host: '127.0.0.1',
    port: 24224,
    tag: 'debug'
});

var log = bunyan.createLogger({
    name: 'myapp-eventlog',
    streams: [{
        stream: evtLogger,
        type: 'raw'
    }],
    level: 'debug'
});
```

# License
The MIT License
