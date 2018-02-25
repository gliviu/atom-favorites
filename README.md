favorites
==========
Registers **File->Favorites** menu with useful commands to access favorite files and folders.

**Install**

```apm install favorites```

**Settings**

```cson
favorites:
  showInCommandPalette: false
  paths: [
    "topic:Dev"
    "/main.js"
    "name:readme|/README.md"
    "topic:Other"
    "key:alt-n|/notes.txt"
    "key:alt-d|/downloads"
  ]

```
Options
* showInCommandPalette - show/hide favorites in command palette (defaults to false)

Known Issues
* Manually adding paths in config.cson may cause 'Path not found in tree view: ...' errors. Make sure favorites are always added with 'Add to favorites' command.


**License** [MIT](https://github.com/gliviu/atom-favorites/blob/master/LICENSE)

[Issues and suggestions](https://github.com/gliviu/atom-favorites/issues)
