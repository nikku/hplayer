# hplayer

An audio drama fall asleep specialized command line based media player.

Written for NodeJS, built on top of [mpv](http://mpv.io/).


## Setup


### Install via npm

```
npm install hplayer
```


### Download and Configure VLC

Download and install a copy of [mpv](http://mpv.io/).

Configure the location of the player through the `MPV_HOME` environment variable.


## Usage

```plaintext
  Usage: hplayer [options] [command]

  Commands:

    tag <cmd>              add/remove or list tags
    #tag <cmd>             execute a command with <#tag>

  Options:

    -h, --help     output usage information
    -V, --version  output the version number

```

The player offers two APIs.

Use `hplayer tag <cmd>` to add or remove tags from directories.

Use `hplayer #tagname (find|play) <pattern> --random --sleep-after` to find or play songs from tagged directories.

Type `hplayer tag --help` or `hplayer #tag --help` to learn more.


## License

MIT