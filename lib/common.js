'use babel'
import pathUtils from 'path'


export default {
  CONFIG_DELIMITER: '|',
  CONFIG_DELIMITER_ESCAPE_REGEXP: /\|\|/g,
  ISWIN: /^win/.test(process.platform),
  ISLIN: /^linux/.test(process.platform),
  ISMAC: /^darwin/.test(process.platform),
  parseFavoriteConfig(favConfigLine) {
    const ESCAPE = '#@#@@##@!#@@##' // replaces 'a|b||c|d' with 'a|bESCAPEC|d' so that split('|') works
    const ESCAPE_REGEXP = /#@#@@##@!#@@##/g
    const originalFavConfigLine = favConfigLine
    favConfigLine = favConfigLine.replace(this.CONFIG_DELIMITER_ESCAPE_REGEXP, ESCAPE)
    const items = favConfigLine.split(this.CONFIG_DELIMITER)
    let isTopic = false, isRenamed = false
    let topic = undefined, newName = undefined
    const keymapRegex = /^key:([^- ]+(-[^- ]+)*( [^- ]+)*)$/
    const topicRegex = /^topic:(.*)$/
    const nameRegex = /^name:(.*)$/
    let hasKeymap = false
    let keymap = undefined
    let fav = undefined
    for(let i=0; i<items.length; i++){
      const configItem = items[i].replace(ESCAPE_REGEXP, `${this.CONFIG_DELIMITER}`)
      const matchKeymap = keymapRegex.exec(configItem)
      const matchTopic = topicRegex.exec(configItem)
      const matchName = nameRegex.exec(configItem)
      if(matchName){
        isRenamed = true
        newName = matchName[1]
        continue
      } else if(matchTopic){
        isTopic = true
        topic = matchTopic[1]
        continue
      } else if(matchKeymap){
        hasKeymap = matchKeymap?true:false
        keymap = matchKeymap?matchKeymap[1]:undefined
        continue
      } else if(pathUtils.isAbsolute(configItem)){
        fav = configItem
        continue
      } else{
        console.error(`Could not parse config item '${configItem}'`);
      }
    }
    return {isTopic, topic, isRenamed, newName, hasKeymap, keymap, fav, favConfigLine: originalFavConfigLine}
  }

}
