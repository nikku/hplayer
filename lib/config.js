var fs = require('fs'),
    path = require('path'),
    _ = require('lodash'),
    AppDirs = require('appdirectory'),
    mkdirp = require('mkdirp');


var dirs = new AppDirs('hplayer');

var DEFAULT_PATH = path.join(dirs.userConfig(), 'config.json');

module.exports = new Config(DEFAULT_PATH);

module.exports.Config = Config;


function load(path) {
  
  try {
    var contents = fs.readFileSync(path, { encoding: 'utf-8' });
    return JSON.parse(contents);
  } catch (e) {
  }
}

function save(location, config) {
  
  var dirName = path.dirname(location);

  // make sure directory exists
  mkdirp.sync(dirName);

  try {
    var contents = JSON.stringify(config);
    fs.writeFileSync(location, contents, { encoding: 'utf-8' });
  } catch (e) {
    throw new Error('failed to save config: ' + e.message);
  }
}


function Config(location) {

  var config = load(location) || {};

  function localSave(path) {
    save(path || location, config);
  }

  function set(name, value, pivot) {
    var parts = name.split('.');
    var first = parts.shift();

    pivot = pivot || config;

    if (parts.length) {
      var sub = pivot[first] = pivot[first] || {};
      set(parts.join('.'), value, sub);
    } else {
      pivot[first] = value;
    }
  }

  function get(name, defaultValue, pivot) {
    var parts = name.split('.');
    var first = parts.shift();

    pivot = pivot || config;

    var element = pivot[first] = pivot[first] || (parts.length ? {} : defaultValue);

    if (parts.length) {
      return get(parts.join('.'), defaultValue, element);
    } else {
      return element;
    }
  }

  // API
  this.save = localSave;
  this.get = get;
  this.set = set;

  this.location = function() {
    return location;
  };
}