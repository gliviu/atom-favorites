'use babel'
import pathUtils from 'path'
import crypto from 'crypto'
import fs from 'fs'

const ADD_FAVORITE_COMMAND_KEY='favorites:add-to-favorites'
const REMOVE_FAVORITE_COMMAND_KEY='favorites:remove-from-favoritess'
const GENERATE_KEY_BINDING_COMMAND_KEY='favorites:generate-key-binding';
const FAVORITE_FILES_CONFIG_KEY = 'favorites.files'

let favoriteActions = []    // disposable actions
let favoritesMenu = undefined  // disposable menu

export default {
  activate() {
    refreshFavorites()
    refreshFavoritesMenu()
    generateKeyBindingCommand()
    createFavoriteCommand()
    removeFavoriteCommand()
    onFavoritesChanged()
  }
}

function refreshFavoritesMenu(){
  if(favoritesMenu){
    favoritesMenu.dispose()
    favoritesMenu=undefined
  }

  const favs = atom.config.get(FAVORITE_FILES_CONFIG_KEY) || []
  const favoriteMenuItems = []
  for (let fav of favs) {
    const match = /topic:?(.*)/.exec(fav)
    if(match){
      favoriteMenuItems.push({ label: topic(match[1]), enabled: false})
    } else {
      const favHash = hash(fav)
      const label = fs.existsSync(fav) ? pathUtils.basename(fav) : fav
      favoriteMenuItems.push({ label, command: buildCommandKey(favHash) })
    }
  }
  favoriteMenuItems.push({ label: topic(), enabled: false})
  favoriteMenuItems.push({ label: 'Generate key binding', command: GENERATE_KEY_BINDING_COMMAND_KEY })
  favoriteMenuItems.push({ label: 'Remove from favorites', command: REMOVE_FAVORITE_COMMAND_KEY })
  favoriteMenuItems.push({ label: 'Add to favorites', command: ADD_FAVORITE_COMMAND_KEY })
  favoritesMenu = atom.menu.add ([
    {
      label: 'File',
      submenu : [{
        label: 'Favorites',
        submenu: favoriteMenuItems
      }]
    }
  ])

}

function refreshFavorites(){
  favoriteActions.forEach(action=>action.dispose())
  favoriteActions = []

  const favs = atom.config.get(FAVORITE_FILES_CONFIG_KEY) || []
  for (let fav of favs) {
    const label = fs.existsSync(fav) ? pathUtils.basename(fav) : fav
    const handler = {
      displayName: `Favorites: ${label}`,
      didDispatch: ()=>{
        if(fs.existsSync(fav)){
          atom.workspace.open(fav).catch(e => console.log(e))
        } else{
          // Show file missing warning and add button to allow favorite removal
          const notification = atom.notifications.addInfo(`File not found: ${fav}`, {
            dismissable: true,
            buttons: [{
              text:`Remove from favorites`,
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
  atom.config.onDidChange("favorites", function({newValue, oldValue}){
    refreshFavorites()
    refreshFavoritesMenu()
  })
}

function checkActiveEditor(editor){
  if(!editor){
    atom.notifications.addInfo('This command needs some file opened')
    return false
  }
  const editorPath = editor.getPath()
  if(!editorPath){
    atom.notifications.addInfo('Current file is not persisted')
    return false
  }
  return true
}

function createFavoriteCommand(){
  atom.commands.add('atom-workspace', ADD_FAVORITE_COMMAND_KEY, ()=>{
    const editor = atom.workspace.getActiveTextEditor()
    if(!checkActiveEditor(editor)){
      return
    }
    const editorPath = editor.getPath()
    const favs = atom.config.get(FAVORITE_FILES_CONFIG_KEY) || []
    if(isFavorite(editorPath)){
        atom.notifications.addInfo(`Already a favorite: ${editorPath}`)
    } else{
        favs.push(editorPath)
        atom.config.set(FAVORITE_FILES_CONFIG_KEY, favs)
        atom.notifications.addInfo(`Added to favorites: ${editorPath}`)
    }
  })
}

function removeFavoriteCommand(){
  atom.commands.add('atom-workspace', REMOVE_FAVORITE_COMMAND_KEY, ()=>{
    const editor = atom.workspace.getActiveTextEditor()
    if(!checkActiveEditor(editor)){
      return
    }
    const editorPath = editor.getPath()
    removeFavorite(editorPath)
  })
}

function removeFavorite(path){
  const favs = atom.config.get(FAVORITE_FILES_CONFIG_KEY) || []
  const hash1 = hash(path)
  const newFavs = favs.filter(fav =>{
    const hash2 = hash(fav)
    return hash1!==hash2
  })
  if(favs.length!==newFavs.length){
    atom.config.set(FAVORITE_FILES_CONFIG_KEY, newFavs)
    atom.notifications.addInfo(`Removed from favorites: ${path}`)
  } else{
    atom.notifications.addInfo(`Not a favorite: ${path}`)
  }
}

function generateKeyBindingCommand(){
  atom.commands.add('atom-workspace', GENERATE_KEY_BINDING_COMMAND_KEY, ()=>{
    const editor = atom.workspace.getActiveTextEditor()
    if(!checkActiveEditor(editor)){
      return
    }
    const editorPath = editor.getPath()
    if(isFavorite(editorPath)){
      const commandKey = buildCommandKey(hash(editorPath))
      const fileNamePrefix = pathUtils.basename(editorPath).toLowerCase().substring(0,1)
      const message = `'atom-workspace':\n  'alt-${fileNamePrefix}': '${commandKey}'`
      const notification = atom.notifications.addInfo(`Keybinding for ${editorPath}`, {
        dismissable: true,
        detail: message,
        buttons: [{
          text:`Open keymap`,
          onDidClick: ()=>{
            atom.workspace.open(`${process.env.ATOM_HOME}/keymap.cson`)
            notification.dismiss()
          }
        }]
      })
    } else{
      atom.notifications.addInfo(`Not a favorite: ${editorPath}`)
    }
  })
}

function isFavorite(editorPath){
  const favs = atom.config.get(FAVORITE_FILES_CONFIG_KEY) || []
  const favHashes = new Set()
  for (let fav of favs) {
    favHashes.add(hash(fav))
  }
  const currentFavHash = hash(editorPath)
  return favHashes.has(currentFavHash)
}

function hash(fav){
  const isWin = /^win/.test(process.platform)
  const normalizedFav = isWin?pathUtils.normalize(fav).toLowerCase():pathUtils.normalize(fav)
  const fileName = pathUtils.basename(normalizedFav)
  const hash = crypto.createHash('md5').update(normalizedFav).digest('hex').substring(0,4)
  return `${hash}-${fileName}`
}

function buildCommandKey(favHash){
  return `fav:${favHash.replace(/[:\s'"`]/g, '-')}` // escape characters not allowed in command key
}

function topic(label=''){
  if(label){
    return `── ${label} ──`
  }
  return `────────`
}
