'use babel'

export default {
  CONFIG_DELIMITER: '|',
  parseFavoriteConfig(favConfig) {
    const items = favConfig.split(this.CONFIG_DELIMITER)
    let isTopic = false
    let topic = undefined
    const keymapRegex = /^key:([^- ]+(-[^- ]+)*( [^- ]+)*)$/
    const topicRegex = /^topic:?(.*)$/
    let hasKeymap = false
    let keymap = undefined
    let fav = undefined
    for(let i=0; i<items.length; i++){
      const f = items[i]
      const matchKeymap = keymapRegex.exec(f)
      const matchTopic = topicRegex.exec(f)
      if(matchTopic){
        isTopic = true
        topic = matchTopic[1]
        break
      } else if(matchKeymap){
        hasKeymap = matchKeymap?true:false
        keymap = matchKeymap?matchKeymap[1]:undefined
        continue
      } else{
        fav = items.slice(i).join(this.CONFIG_DELIMITER)
        break
      }
    }
    return {isTopic, topic, hasKeymap, keymap, fav}
  }

}
