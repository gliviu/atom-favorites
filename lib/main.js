'use babel'
import pathUtils from 'path'
import crypto from 'crypto'
import fs from 'fs'
import readline from 'readline'
import common from './common'
import fsPromise from './fsPromise'
const ADD_FAVORITE_COMMAND_KEY='favorites:add-to-favorites'
const ADD_FAVORITE_FOLDER_COMMAND_KEY='favorites:add-folder-to-favorites'
const REMOVE_FAVORITE_COMMAND_KEY='favorites:remove-from-favoritess'
const GENERATE_KEY_BINDING_COMMAND_KEY='favorites:generate-key-binding';
const OPEN_SETTINGS_COMMAND_KEY='favorites:configure'
const FAVORITE_PATHS_CONFIG_KEY = 'favorites.paths'
const SHOW_IN_COMMAND_PALETTE_CONFIG_KEY = 'favorites.showInCommandPalette'
const SHOW_IN_CONTEXT_MENUS_CONFIG_KEY = 'favorites.showInContextMenus'
const SHOW_FULL_PATH_CONFIG_KEY = 'favorites.showFullPath'
const MENU_CONFIG_KEY = 'favorites.menuLocation'

const ADD_TO_FAVORITES_TEXT = 'Add to favorites'
const REMOVE_FROM_FAVORITES_TEXT = 'Remove from favorites'
const CONFIGURE_TEXT = 'Configure'

const ADD_TO_FAVORITES_LABEL = '&Add to favorites'
const REMOVE_FROM_FAVORITES_LABEL = '&Remove from favorites'
const CONFIGURE_LABEL = '&Configure'

let favoriteActions = []    // disposable actions
let favoritesMenu = undefined  // disposable menu
let favoritesKeyBindings = undefined  // disposable key bindings


export default {
  activate() {
    // Create config section if not already present
    let favs = atom.config.get(FAVORITE_PATHS_CONFIG_KEY)
    if(!favs){
      favs = []
      atom.config.set(FAVORITE_PATHS_CONFIG_KEY, favs)
    }
    addUninitializedFavoritesMenu()
    buildFavoritesInfoAsync(favs)
    .then(favoritesInfo =>{
      refreshFavorites(favoritesInfo)
      refreshFavoritesMenu(favoritesInfo)
      refreshKeyBindings()
      createAddToFavoritesCommand()
      createRemoveFromFavoritesCommand()
      createSettingsCommand()
      onFavoritesChanged()
      addContextMenus()
    })
    .catch(error =>{
      console.error(error);
    })

  }
}

function addContextMenus(){
  let showInContextMenus = atom.config.get(SHOW_IN_CONTEXT_MENUS_CONFIG_KEY)
  if(showInContextMenus===undefined){
    showInContextMenus = true
  }
  if(!showInContextMenus){
    return
  }
  atom.contextMenu.add({
    'atom-text-editor, .tree-view .directory': [
      { label: ADD_TO_FAVORITES_LABEL, command: ADD_FAVORITE_COMMAND_KEY },
      { label: REMOVE_FROM_FAVORITES_LABEL, command: REMOVE_FAVORITE_COMMAND_KEY }
    ]
  })

}

// Display a dummy 'Updating...' menu item until
// favorites are fully initialized
function addUninitializedFavoritesMenu(favoritesInfo){
  if(favoritesMenu){
    favoritesMenu.dispose()
    favoritesMenu=undefined
  }
  buildMenu([{label: 'Updating...', enabled: false}])
}

function refreshFavoritesMenu(favoritesInfo){
  if(favoritesMenu){
    favoritesMenu.dispose()
    favoritesMenu=undefined
  }

  const favoriteMenuItems = []
  for (let favInfo of favoritesInfo) {
    const favConfig = favInfo.favConfig
    const {isTopic, topic, isRenamed, newName, fav} = favConfig
    if(isTopic){
      favoriteMenuItems.push({ label: topicDisplay(topic), enabled: false})
      continue
    }
    if(!fav){
      reportFavConfigError(favConfig)
      continue
    }
    const favHash = hash(fav)
    const label = computeLabel(favInfo)
    favoriteMenuItems.push({ label, command: buildCommandKey(favHash) })
  }
  if(favoritesInfo.length>0){
    favoriteMenuItems.push({ label: topicDisplay(), enabled: false})
  }
  favoriteMenuItems.push({ label: CONFIGURE_LABEL, command: OPEN_SETTINGS_COMMAND_KEY })
  favoriteMenuItems.push({ label: REMOVE_FROM_FAVORITES_LABEL, command: REMOVE_FAVORITE_COMMAND_KEY })
  favoriteMenuItems.push({ label: ADD_TO_FAVORITES_LABEL, command: ADD_FAVORITE_COMMAND_KEY })

  buildMenu(favoriteMenuItems)
}

function buildMenu(favoriteMenuItems){
  const menuConfig = atom.config.get(MENU_CONFIG_KEY) || 'File/Fa&vorites'
  const menu = []
  let currentMenu = menu
  for(menuItem of menuConfig.split('/')){
    currentMenu.push({label: menuItem, submenu: []})
    currentMenu = currentMenu[0].submenu
  }
  currentMenu.push(...favoriteMenuItems)

  favoritesMenu = atom.menu.add (menu)
}

function refreshKeyBindings(){
  const favs = atom.config.get(FAVORITE_PATHS_CONFIG_KEY) || []
  const favoriteMenuItems = []
  const keymaps = {}
  const bindings = {'atom-workspace':keymaps}
  for (let favConfigLine of favs) {
    const favConfig = common.parseFavoriteConfig(favConfigLine)
    const {hasKeymap, keymap, fav, isTopic} = favConfig
    if(isTopic){
      continue
    }
    if(!fav){
      reportFavConfigError(favConfig)
      continue
    }
    const favHash = hash(fav)
    const commandKey = buildCommandKey(favHash)
    if(hasKeymap){
      keymaps[keymap] = commandKey
    }
  }
  if(favoritesKeyBindings){
    favoritesKeyBindings.dispose()
  }
  favoritesKeyBindings = atom.keymaps.add('favorites-keymap', bindings)
}

function refreshFavorites(favoritesInfo){
  const showInCommandPalette = atom.config.get(SHOW_IN_COMMAND_PALETTE_CONFIG_KEY) || false
  favoriteActions.forEach(action=>action.dispose())
  favoriteActions = []

  for (let favInfo of favoritesInfo) {
    const favConfig = favInfo.favConfig
    const {fav, isTopic} = favConfig
    if(isTopic){
      continue
    }
    if(!fav){
      reportFavConfigError(favConfig)
      continue
    }
    const label = computeLabel(favInfo)
    const handler = {
      displayName: `Favorites: ${label}`,
      hiddenInCommandPalette: !showInCommandPalette,
      didDispatch: ()=>{
        if(favInfo.exists){
          favInfo.isFolder
            ?revealInTreeView(fav, true)
            :atom.workspace.open(fav).catch(e => console.log(e))
        } else{
          // Show file missing warning and add button to allow favorite removal
          const notification = atom.notifications.addInfo(`File not found: ${fav}`, {
            dismissable: true,
            buttons: [{
              text:REMOVE_FROM_FAVORITES_TEXT,
              onDidClick: ()=>{
                removeFavorite(fav)
                notification.dismiss()
              }
            }]
          })
        }
      }
    }
    const favHash = hash(fav)
    const action = atom.commands.add('atom-workspace', buildCommandKey(favHash), handler)
    favoriteActions.push(action)
  }
}

function onFavoritesChanged(){
  atom.config.onDidChange("favorites", ({newValue, oldValue}) =>{
    addUninitializedFavoritesMenu()
    try{
      const favs = atom.config.get(FAVORITE_PATHS_CONFIG_KEY) || []
      buildFavoritesInfoAsync(favs)
      .then(favoritesInfo =>{
        refreshFavorites(favoritesInfo)
        refreshFavoritesMenu(favoritesInfo)
        refreshKeyBindings()
      })
      .catch(error =>{
        console.error(error);
      })
    } catch(e){
      console.error(e)
    }
  })
}

function createAddToFavoritesCommand(){
  atom.commands.add('atom-workspace', ADD_FAVORITE_COMMAND_KEY, ()=>{
    const {path} = getActiveItem()
    if(!path){
      notifyNoActiveItem()
      return
    }
    const favs = atom.config.get(FAVORITE_PATHS_CONFIG_KEY) || []
    if(isFavorite(path)){
      atom.notifications.addInfo(`Already a favorite: ${path}`)
    } else{
      favs.push(path)
      atom.config.set(FAVORITE_PATHS_CONFIG_KEY, favs)
      const notification = atom.notifications.addInfo(`Added to favorites: ${path}`, {
        buttons: [{
          text:CONFIGURE_TEXT,
          onDidClick: ()=>{
            openSettings(path)
            notification.dismiss()
          }
        }]
      })
    }
  })
}

function createRemoveFromFavoritesCommand(){
  atom.commands.add('atom-workspace', REMOVE_FAVORITE_COMMAND_KEY, ()=>{
    const {path, source} = getActiveItem()
    if(!path){
      notifyNoActiveItem()
      return
    }
    if(isFavorite(path)){
      removeFavorite(path)
    } else{
      atom.notifications.addInfo(`Not a favorite: ${path}`)
    }
  })
}

function removeFavorite(path){
  if(!path){
    return
  }
  const favs = atom.config.get(FAVORITE_PATHS_CONFIG_KEY) || []
  const hash1 = hash(path)
  const newFavs = favs
  .map(favConfigLine => common.parseFavoriteConfig(favConfigLine))
  .filter(favConfig => favConfig.fav)
  .filter(favConfig => hash(favConfig.fav)!=hash1)
  .map(favConfig => favConfig.favConfigLine)

  if(favs.length!==newFavs.length){
    atom.config.set(FAVORITE_PATHS_CONFIG_KEY, newFavs)
    atom.notifications.addInfo(`Removed from favorites: ${path}`)
  } else{
    atom.notifications.addInfo(`Not a favorite: ${path}`)
  }
}

function createSettingsCommand(){
  atom.commands.add('atom-workspace', OPEN_SETTINGS_COMMAND_KEY, ()=>openSettings())
}

// Opens config.cson and positions cursor at 'favorites' section.
// If fav is specified, positions cursor at specified favorite.
function openSettings(fav=undefined){
  const configFilePath = `${process.env.ATOM_HOME}/config.cson`
  let favoritesSectionLine = undefined
  let favLines = []  // fav path may appear in other unrelated lines within config file
  let startPathSectionLine = undefined
  let endPathSectionLine = undefined
  let count = 0
  const lineReader = readline.createInterface({
    input: fs.createReadStream(configFilePath),
    crlfDelay: Infinity
  });
  lineReader.on('line', line => {
    if(line.search('favorites.*?:')>=0){
      favoritesSectionLine = count
    }
    if(line.search('path.*?:')>=0){
      startPathSectionLine = count
    }
    if(startPathSectionLine && !endPathSectionLine && line.search('\]')>=0){
      endPathSectionLine = count
    }
    if(fav && line.search(fav)>=0){
      favLines.push(count)
    }
    count++
  });

  lineReader.on('close', function (line) {
    // Find fav line within 'favorite.path' section
    let favLine;
    if(fav && startPathSectionLine && endPathSectionLine && favLines.length>0){
      favLine = favLines.find(
        line => line>startPathSectionLine && line<endPathSectionLine)
    }

    // Open config file.
    if(favLine){
      atom.workspace.open(configFilePath, {initialLine: favLine})
      .then(textEditor => textEditor.scrollToCursorPosition({center: true}))
    }
    else if(favoritesSectionLine){
      atom.workspace.open(configFilePath, {initialLine: favoritesSectionLine})
      .then(textEditor => textEditor.scrollToCursorPosition({center: true}))
    } else{
      atom.workspace.open(configFilePath)
    }
  });
}

function isFavorite(path){
  if(!path){
    return false
  }
  const currentFavHash = hash(path)
  const favs = atom.config.get(FAVORITE_PATHS_CONFIG_KEY) || []
  for (let favConfigLine of favs) {
    const {isTopic, fav} = common.parseFavoriteConfig(favConfigLine)
    if(isTopic){
      continue
    }
    if(hash(fav)===currentFavHash){
      return true
    }
  }
  return false
}

function hash(fav){
  const normalizedFav = common.ISWIN?pathUtils.normalize(fav).toLowerCase():pathUtils.normalize(fav)
  const fileName = pathUtils.basename(normalizedFav)
  const hash = crypto.createHash('md5').update(normalizedFav).digest('hex').substring(0,4)
  return `${hash}-${fileName}`
}

function buildCommandKey(favHash){
  return `fav:${favHash.replace(/[:\s'"`]/g, '-')}` // escape characters not allowed in command key
}

function topicDisplay(label=''){
  if(label){
    return `── ${label} ──`
  }
  return `────────`
}

function revealInTreeView(path, isFolder){
  const treeView = getTreeView()
  if(!treeView){
    return
  }
  path = pathUtils.normalize(path)
  let entry = treeView.entryForPath(path)
  if(!entry && isFolder){
    atom.project.addPath(path)
    entry = treeView.entryForPath(path)
  }
  if(!entry){
    atom.notifications.addError(`Path not found in tree view: ${path}`)
    return
  }
  // credit https://github.com/atom/tree-view/blob/2f01e5952642acadeaad56f2958b82caf6d5fafc/lib/tree-view.coffee#L364
  [rootPath, relativePath] = atom.project.relativizePath(path)
  if(!rootPath){
    return
  }
  activePathComponents = relativePath.split(pathUtils.sep)
  // Add the root folder to the path components
  activePathComponents.unshift(rootPath.substr(rootPath.lastIndexOf(pathUtils.sep) + 1))
  // And remove it from the current path
  let currentPath = rootPath.substr(0, rootPath.lastIndexOf(pathUtils.sep))
  for(const pathComponent of activePathComponents){
    currentPath += pathUtils.sep + pathComponent
    entry = treeView.entryForPath(currentPath)
    if(entry.classList.contains('directory')){
      entry.expand()
    }
  }
  treeView.selectEntry(entry)
  treeView.scrollToEntry(entry)
  treeView.show(true)
}

function isTreeViewActive(){
  const treeView = getTreeView()
  if(!treeView){
    return false
  }
  const paneItem = atom.workspace.getActivePaneItem()
  return paneItem===treeView
}

function getTreeViewSelectedPath(){
  const treeView = getTreeView()
  if(!treeView){
    return undefined
  }
  let selectedPath = treeView.selectedPaths()
  if(selectedPath.length!==1) {
    atom.notifications.addError(`One item must be selected in tree view`)
    return
  }
  selectedPath = selectedPath[0]
  return selectedPath
}

// Returns file/folder path selected in treeview or current
// file opened in editor.
function getActiveItem(){
  let path = undefined
  let source = undefined
  if(isTreeViewActive()){
    path = getTreeViewSelectedPath()
    source = `treeview`
  }
  if(!path){
    const editor = atom.workspace.getActiveTextEditor()
    if(editor){
      path = editor.getPath()
      source = `editor`
    }
  }
  return {path, source}
}

function getTreeView(){
  const tv = atom.packages.getActivePackage('tree-view').mainModule.treeView
  if(tv && tv.selectedPaths && tv.entryForPath
      && tv.selectEntry && tv.scrollToEntry && tv.show){
    return tv
  }
  console.error(`Tree view could not be loaded`);
  return undefined
}

function notifyNoActiveItem() {
  atom.notifications.addError(`Please select a file/folder in Tree View or open a file in editor`)
}

function reportFavConfigError(favConfig){
  console.error(`Invalid config line: ${favConfig.favConfigLine} - ${JSON.stringify(favConfig)}`);
}

function computeLabel(favInfo){
  const showFullPath = atom.config.get(SHOW_FULL_PATH_CONFIG_KEY) || false
  let folderIcon = '>'
  if(common.ISLIN || common.ISMAC){
    folderIcon = '📁'
  }
  const favConfig = favInfo.favConfig
  const name = showFullPath?favConfig.fav:pathUtils.basename(favConfig.fav)
  const label = favConfig.isRenamed?favConfig.newName:name
  return favInfo.exists && favInfo.isFolder?`${folderIcon} ${label}`:`${label}`
}

function buildFavoriteInfoAsync(favConfig){
  return fsPromise.stat(favConfig.fav)
  .then(stats => ({favConfig, exists: true, isFolder: stats.isDirectory()}))
  .catch(error => ({favConfig, exists: false}))
}

function buildFavoritesInfoAsync(favs){
  const promises = []
  for (let favConfigLine of favs) {
    const favConfig = common.parseFavoriteConfig(favConfigLine)
    promises.push(buildFavoriteInfoAsync(favConfig))
  }
  return Promise.all(promises)
}
