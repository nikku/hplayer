var config = require('./config'),
    _ = require('lodash');


module.exports = new Tags(config);

module.exports.Tags = Tags;


function Tags(config) {

  var tags = config.get('tags', {});

  function create(name) {
    tags[name] = {
      name: name,
      directories: []
    };

    return tags[name];
  }

  function remove(name, file) {

    if (file) {
      var tag = get(name);
      if (!tag) {
        return;
      }

      var directories = tag.directories,
          idx = directories.indexOf(file);

      if (idx !== -1) {
        directories.splice(idx, 1);
      }
    } else {
      delete tags[name];
    }
  }

  function get(name) {
    if (name !== undefined) {
      return tags[name];
    }

    return tags;
  }

  function add(name, file) {

    var tag = get(name);

    if (!tag) {
      tag = create(name);
    }

    if (tag.directories.indexOf(file) === -1) {
      tag.directories.push(file);
    }
  }


  // API
  this.get = get;
  this.add = add;
  this.remove = remove;

  this.save = config.save;
}