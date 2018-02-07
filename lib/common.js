'use babel'

export default {
  CONFIG_DELIMITER: '|',
  parseFavoriteConfig(favConfigLine) {
    const items = favConfigLine.split(this.CONFIG_DELIMITER)
    let isTopic = false, isRenamed = false
    let topic = undefined, newName = undefined
    const keymapRegex = /^key:([^- ]+(-[^- ]+)*( [^- ]+)*)$/
    const topicRegex = /^topic:?(.*)$/
    const nameRegex = /^name:?(.*)$/
    let hasKeymap = false
    let keymap = undefined
    let fav = undefined
    for(let i=0; i<items.length; i++){
      const f = items[i]
      const matchKeymap = keymapRegex.exec(f)
      const matchTopic = topicRegex.exec(f)
      const matchName = nameRegex.exec(f)
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
      } else{
        fav = items.slice(i).join(this.CONFIG_DELIMITER)
        break
      }
    }
    return {isTopic, topic, isRenamed, newName, hasKeymap, keymap, fav, favConfigLine}
  }

}
