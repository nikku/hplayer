var VLC = require('vlc'),
    EventEmitter = require('events').EventEmitter,
    _ = require('lodash');


var config = require('./config'),
    debug = require('./system').debug;
    failSafe = require('./system').failSafe;


module.exports = new Player(config);


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

  var vlc;

  function play(set) {
    var tracks = set.tracks;

    debug('play %s tracks', tracks.length);

    if (!vlc) {

      vlc = VLC([
        '-I', 'dummy',
        '-V', 'dummy',
        '--verbose', '0'
      ]);
    }

    var progress = new ProgressTracker();

    // must be set to keep alive the vlc instance
    var keepalive = setInterval(function() { }, 1000);


    var player =  vlc.mediaplayer,
        audio = player.audio;


    function playMedia(err, results) {
      var totalDuration = results.totalDuration,
          tracks = results.tracks;

      if (err) {
        return progress.emit('error', err);
      }

      var async = safeAsync(function(err) {
        progress.emit('error', err);
      });

      var idx = 0;
      var m;

      debug('play | start');

      function next() {
        var t = tracks[idx++];

        if (!t) {
          debug('play | done');

          player.release();

          async(function() {
            progress.emit('end');
          });

          return;
        }

        debug('play | next <%s>', t);

        m = vlc.mediaFromFile(t);
        m.parseSync();

        async(function() {
          player.media = m;
          player.play();
          audio.volume = 100;
        });
      }

      next();

      var lastDuration = 0;
      var current = 0;


      function timeChanged(_current) {
        current = _current;
        progress.emit('change', lastDuration + current);
      }

      function endReached() {
        lastDuration += current;
        
        debug('play | end reached');
        m.release();

        async(next, 50);
      }

      player.on('EndReached', endReached);
      player.on('TimeChanged', timeChanged);

      progress.emit('start', totalDuration);
    }

    
    function loadMedia(tracks, done) {
      var idx = 0;
      var totalDuration = 0;

      debug('loading | media');

      var async = safeAsync(done);

      function isDuration(obj) {

        if (typeof obj !== 'number') {
          return false;
        }

        return obj > 0 && obj < 86400000 /* less than a day long */;
      }

      function getDuration(m, done) {

        var DEFAULT_RETRIES = 10;
        var retries = DEFAULT_RETRIES;

        function localDone(err, duration) {
          async(function() {
            done(err, duration);
          }, 50);
        }

        function poll() {
          var duration = m.duration;

          debug('loading | duration poll result %s %s', duration, isDuration(duration));

          // we may or may not get a valid duration here
          // check for number and sanity (everything else is a memory hole, i.e. invalid)
          if (isDuration(duration)) {
            return localDone(null, duration);
          }

          if (retries--) {
            setTimeout(poll, 5);
          } else {
            return localDone(new Error('could not fetch duration after %s tries', DEFAULT_RETRIES));
          }
        }

        poll();
      }

      function next() {

        var timer;

        var track = tracks[idx++];
        if (!track) {
          debug('loading | done');
          return done(null, { tracks: tracks, totalDuration: totalDuration });
        }

        debug('loading | %s', track);

        var m = vlc.mediaFromFile(track);
        debug('loading | media created');

        m.parseSync();
        debug('loading | media parsed');
        
        function releaseAndNext() {
          clearTimeout(timer);

          async(function() {
            m.release();
            next();
          });
        }

        getDuration(m, function(err, duration) {

          if (duration) {
            debug('loading | duration (direct) loaded %s', duration);

            totalDuration += duration;

            return releaseAndNext();
          }

          // load via async duration changed event
          m.on('DurationChanged', function(duration) {
            debug('loading | duration (async) loaded %s', duration);

            totalDuration += duration;

            releaseAndNext();
          });

          debug('loading | mount');
          player.media = m;

          async(function() {
            debug('loading | play');
            player.play();

            async(function() {
              debug('loading | mute');
              audio.volume = 1;
            });
          }, 50);

          timer = async(function() {
            debug('loading | error | timeout after 4s');

            releaseAndNext();
          }, 4000);
        });
      }

      next();
    }

    loadMedia(tracks, playMedia);

    return progress;
  }


  // API
  this.play = play;
}