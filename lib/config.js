var fs = require('fs'),
    path = require('path'),
    _ = require('lodash');


var DEFAULT_PATH = path.join(__dirname, '..', 'config.json');

module.exports = new Config(DEFAULT_PATH);

module.exports.Config = Config;


function load(path) {
  
  try {
    var contents = fs.readFileSync(path, { encoding: 'utf-8' });
    return JSON.parse(contents);
  } catch (e) {
  }
}

function save(path, config) {
  
  try {
    var contents = JSON.stringify(config);
    fs.writeFileSync(path, contents, { encoding: 'utf-8' });
  } catch (e) {
    throw new Error('failed to save config: ' + e.message);
  }
}


function Config(location) {

  var config = load(location) || {};

  function localSave(path) {
    save(path || location, config);
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
}