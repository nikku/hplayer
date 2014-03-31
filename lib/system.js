var os = require('os'),
    spawn = require('child_process').spawn;

var config = require('./config');

module.exports = new System(config);

module.exports.System = System;


function defaultShutdown() {
  switch (os.platform()) {
  case 'win32':
    return 'shutdown /h';
  default:
    throw new Error('default shutdown hook not implemented');
  }
}

function System(config) {

  var shutdown = config.get('system.shutdown', defaultShutdown());
  var debug = config.get('system.debug', false);

  function sleep() {
    var args = shutdown.split(/\s+/);
    var cmd = args.shift();

    internalDebug('sleep | %s %s', cmd, args);
    var proc = spawn(cmd, args);

    proc.on('close', function(code) {
      internalDebug('sleep | exit with code %s', code);
    });
  }

  function internalDebug() {
    if (debug) {
      var args = Array.prototype.slice.call(arguments);
      console.log.apply(console, args);
    }
  }

  function failSafe(fn, done) {
    try {
      fn();
    } catch (e) {
      internalDebug('err: ' + e.message);
      done(e);
    }
  }
  
  // api
  this.sleep = sleep;

  this.debug = internalDebug;
  this.failSafe = failSafe;
}