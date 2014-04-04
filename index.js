var path = require('path'),
    colors = require('colors'),
    _ = require('lodash');

var version = require('./package.json').version;

var program = require('commander'),
    Command = program.Command;


var tags = require('./lib/tags'),
    tracks = require('./lib/tracks'),
    player = require('./lib/player'),
    system = require('./lib/system'),
    config = require('./lib/config');


function showTags() {

  var allTags = tags.get();

  var found = false;

  _.forEach(allTags, function(tag) {

    var directories = tag.directories;

    console.log('\n  %s', tag.name.underline.yellow);

    _.forEach(directories, function(dir) {
      console.log('  %s', dir);
    });

    found = true;
  });

  if (!found) {
    console.log('\n  %s', 'no tags'.grey);
  }
}


function createTagsSubcommand(name) {

  var subcommand = new Command(name);

  subcommand
    .command('add <name> <dir>')
    .description('add a tag to the given directory')
    .action(function(name, location) {
      tags.add(name, location);
      tags.save();

      console.log('done.');
    });

  subcommand
    .command('remove <name> [dir]')
    .description('remove a tag or a specific directory from it')
    .action(function(name, location) {
      tags.remove(name, location);
      tags.save();

      console.log('done.');
    });

  subcommand
    .command('list')
    .description('list all configured tags')
    .action(showTags);

  subcommand
    .on('*', function(str) {
      console.error();
      console.error('\n  %s: unknown command: %s, try --help\n', 'error'.red, str[0]);
      console.error();

      process.exit(1);
    });

  return subcommand;
}


function createWithTagsSubCommand(name, tag) {

  function assertTag() {
    if (!tag) {
      console.error();
      console.error('\n  %s: no #tag supplied, try hplayer #tag --help\n', 'error'.red);
      console.error();

      process.exit(1);
    }
  }

  var subcommand = new Command(name);

  subcommand
    .command('find <pattern>')
    .description('find tracks by <pattern>')
    .action(function(pattern) {

      assertTag();

      var sets = tracks.find(tag, pattern);

      if (sets.length) {
        console.log('\n  %s', (sets.length + ' match(es)').yellow);

        _.forEach(sets, function(s) {
          console.log('  %s (%s tracks)', s.name, s.tracks.length);
        });

      } else {
        console.log('\n  %s', 'no matches'.grey);
      }
    });

  subcommand
    .command('play [pattern]')
    .option('-r, --random', 'play random file')
    .option('-s, --sleep-after', 'put the computer to sleep after finish')
    .option('-v, --verbose', 'Tell me everything')
    .description('play first file with the given [pattern]')
    .action(function(pattern, program) {
      assertTag();

      var random = program.random,
          sleepAfter = program.sleepAfter;

      if (!pattern && !random) {
        console.error();
        console.error('  %s: must specify pattern or --random', 'error'.red);
        console.error();

        process.exit(1);
      }

      if (program.verbose) {
        system.verbose(true);
      }

      if (!pattern) {
        pattern = '*';
      }

      var sets = tracks.find(tag, pattern);

      if (!sets.length) {
        console.error();
        console.error('  %s: no matching files', 'error'.red);
        console.error();

        process.exit(1);
      }

      var set;

      if (random) {
        var idx = Math.floor(Math.random() * sets.length);
        set = sets[idx];
      } else {
        set = sets[0];
      }

      if (sleepAfter) {
        console.log('\n  %s', 'going to sleep after finish'.grey);
      }

      var progress = player.play(set);

      progress.on('start', function(totalDuration) {

        console.log('\n  playing %s (%s tracks, ~%smin)\n', set.name.yellow, set.tracks.length, Math.floor(totalDuration / 60));

        var ProgressBar = require('progress');

        var bar = new ProgressBar('  [:bar] :elapsed/' + Math.floor(totalDuration) + ' :percent', { total: 100, width: 50 });
        
        progress.on('change', function(current) {
          bar.update(Math.max(0.01, Math.min(current / totalDuration, 1.0)));
        });

        progress.on('end', function() {

          if (program.sleepAfter) {
            console.log('\n\n  finished. %s', 'sleeping in 10s.'.magenta);

            setTimeout(function() {
              console.log('  sleeping now.'.yellow);

              system.sleep();

              setTimeout(function() {
                process.exit();
              }, 1000);

            }, 10000);
          } else {
            console.log('\n\n  finished.');
            process.exit();
          }
        });

      });

      progress.on('error', function(err) {
        console.error();
        console.error('  %s', err.message);
        console.error();
      });

    });

  subcommand
    .on('*', function(str) {
      console.error();
      console.error('  %s: unknown command: %s, try hplayer #tag --help', 'error'.red, str[0]);
      console.error();
      
      process.exit(1);
    });

  return subcommand;
}

program.version(version);

// program initialization

var tagsCmd = program.command('tag <cmd>');

tagsCmd
  .description('add/remove or list tags')
  .action(function(cmd) {

    var args = program.rawArgs;
    var subArgs = args.slice(0, 2).concat(args.slice(3));

    createTagsSubcommand('hplayer tag').parse(subArgs);
  });

tagsCmd.outputHelp = function() {
  createTagsSubcommand('hplayer tag').outputHelp();
};

function withTagAction() {

  var args = program.rawArgs;
  var subArgs = args.slice(3);
  var allArgs = args.slice(0, 2).concat(subArgs);

  var tag = args[2];

  if (!subArgs.length) {
    console.error();
    console.error('  %s: missing tag command, try hplayer #tag --help', 'error'.red);
    console.error();

    process.exit(1);
  }

  createWithTagsSubCommand('hplayer #tag', tag).parse(allArgs);
}


var withTagCommand =
program
  .command('#tag <cmd>')
  .description('execute a command with <#tag>')
  .action(withTagAction);

withTagCommand.outputHelp = function() {
  createWithTagsSubCommand('hplayer #tag').outputHelp();
};


program.on('*', withTagAction);


program
  .option('--cfg', 'display configuration file location');

program.parse(process.argv);

if (!program.args.length) {

  if (program.cfg) {
    console.log();
    console.log('  config file location: %s', config.location());
    console.log();
  } else {
    console.log();
    console.log('  %s - an audio drama fall asleep specialized command line based media player', 'hplayer'.yellow);
    console.log();
    console.log('  type hplayer --help for assistance');
    console.log();
  }

  process.exit();
}