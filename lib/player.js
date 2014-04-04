var path = require('path'),
    spawn = require('child_process').spawn,
    EventEmitter = require('events').EventEmitter,
    _ = require('lodash');


var config = require('./config'),
    debug = require('./system').debug;
    failSafe = require('./system').failSafe;


module.exports = new Player(config);


var MPV_HOME = process.env.MPV_HOME;
var MPV_BIN = path.join(MPV_HOME, 'mpv');

function safeAsync(done) {
  return function(fn, delay) {
    
    var timedFn = function() {
      failSafe(fn, done);
    };

    return setTimeout(timedFn, delay || 0);
  };
}


function ProgressTracker() {}

// inherit from EventEmitter
ProgressTracker.prototype.__proto__ = EventEmitter.prototype;


function Player(config) {

  function play(set) {

    var player;

    var tracks = set.tracks;

    function getLength(tracks, done) {

      var args = [
        '--frames=0',
        '--identify',
        '--consolecontrols=no'
      ].concat(tracks);

      player = spawn(MPV_BIN, args);

      var result = [];

      player.stdout.on('data', function(data) {
        result.push(data.toString('utf-8'));
      });

      player.on('close', function(code) {
        var output = result.join('');

        var totalLength = 0;

        output.replace(/ID_LENGTH=(.*)/g, function(a, length) {
          totalLength += parseFloat(length);
          return "";
        });

        if (code !== 2) {
          return done(new Error('failed to get length: unexpected exit code ' + code));
        } else {
          return done(null, totalLength);
        }
      });
    }

    function playTracks(tracks, totalLength, progress, done) {

      var args = [
        '--consolecontrols=no',
        '--playing-msg=[play]${filename}:${=length}',
        '--status-msg=[pos]${=time-pos}'
      ].concat(tracks);

      player = spawn(MPV_BIN, args, { maxBuffer: 1024 });

      var result = [];
      var trackLength = 0;
      var elapsedLength = 0;

      var processOutput = _.throttle(function() {
        var str = result.join('');

        // clear
        result.length = 0;

        match = /.*\[play\](.*):(.*)\r\n/.exec(str);
        if (match) {
          if (trackLength) {
            // last track already ended
            elapsedLength += trackLength;
          }

          trackLength = parseFloat(match[2]);
          progress.emit('track', match[1], trackLength);
        }

        match = /.*\[pos\](.*)\r\n.*$/.exec(str);
        if (match) {
          var currentPosition = parseFloat(match[1]);
          progress.emit('change', elapsedLength + currentPosition);
        }
      }, 1000);

      player.stderr.on('data', function(data) {
        result.push(data.toString());
        processOutput();
      });

      player.stdout.on('data', function(data) {
        result.push(data.toString());
        processOutput();
      });

      player.on('close', function(code) {
        if (code) {
          return done(new Error('unexpected exit code ' + code));
        } else {
          return done(null);
        }
      });

      progress.emit('start', totalLength);
    }

    var progress = new ProgressTracker();

    getLength(tracks, function(err, length) {

      if (err) {
        return progress.emit('error', err);
      }

      playTracks(tracks, length, progress, function(err) {
        if (err) {
          return progress.emit('error', err);
        }

        return progress.emit('end');
      });
    });

    return progress;
  }


  // API
  this.play = play;
}