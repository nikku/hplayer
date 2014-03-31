var fs = require('fs'),
    path = require('path'),
    minimatch = require('minimatch'),
    _ = require('lodash');


var tags = require('./tags'),
    config = require('./config');


module.exports = new Tracks(config, tags);

module.exports.Tracks = Tracks;


function Tracks(config, tags) {

  var types = config.get('types', '+(mp3|ogg|wma)');


  function taggedDirectories(tagName) {

    var tag = tags.get(tagName);
    
    return (tag || {}).directories || [];
  }


  function isAudioTrack(f) {
    return minimatch(f, '*.' + types, { matchBase: true });
  }


  function fileStats(f) {
    return fs.statSync(f);
  }


  function readSingleFileSet(file) {
    if (isAudioTrack(file)) {
      return { name: path.basename(file, path.extname(file)), tracks: [ file ]};
    }
  }

  function readDirectoryFileSet(dir) {

    var tracks = _.collect(fs.readdirSync(dir), function(f) {
      var absoluteFile = path.join(dir, f);

      try {
        if (isAudioTrack(absoluteFile) &&
            fileStats(absoluteFile).isFile()) {

          return absoluteFile;
        }
      } catch (e) { }
    });

    tracks = _.compact(tracks);

    if (tracks.length) {
      return { name: path.basename(dir), tracks: tracks };
    }
  }


  function readSet(file) {
    var stat = fileStats(file);

    if (stat.isFile()) {
      return readSingleFileSet(file);
    }

    if (stat.isDirectory()) {
      return readDirectoryFileSet(file);
    }
  }

  function find(tag, track) {

    var directories = taggedDirectories(tag);

    var result = [];

    _.forEach(directories, function(dir) {
      var files, filtered, sets;

      try {
        files = fs.readdirSync(dir);
      } catch (e) {
        console.log('  %s %s %s', 'error'.red, 'failed to read directory', dir);
        return null;
      }

      filtered = minimatch.match(files, '*' + track + '*', { nocase: true });

      sets = _.collect(filtered, function(f) {

        var absFile = path.join(dir, f);

        return readSet(absFile);
      });
      
      sets = _.compact(sets);

      result = result.concat(sets);
    });

    return result;
  }


  // API
  this.find = find;
}