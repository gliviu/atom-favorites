'use babel'
import common from '../lib/common'
const DELIM=common.CONFIG_DELIMITER
describe("Favorite config parser", ()=>{
  it("parses regular favorites with no properties", ()=>{
    const config = common.parseFavoriteConfig('/path1 /path2/p4/x.js')
    expect(config.isTopic).toBe(false)
    expect(config.hasKeymap).toBe(false)
    expect(config.fav).toBe('/path1 /path2/p4/x.js')
  })
  it("parses windows paths", ()=>{
    const config = common.parseFavoriteConfig('d:\\path1 \\path2\\p4\\x.js')
    expect(config.isTopic).toBe(false)
    expect(config.hasKeymap).toBe(false)
    expect(config.fav).toBe('d:\\path1 \\path2\\p4\\x.js')
  })
  it("parses topics", ()=>{
    const config = common.parseFavoriteConfig('topic:My topic')
    expect(config.isTopic).toBe(true)
    expect(config.topic).toBe('My topic')
  })
  it("parses names", ()=>{
    const config = common.parseFavoriteConfig(`name:new name${DELIM}/x/b/x`)
    expect(config.isRenamed).toBe(true)
    expect(config.newName).toBe('new name')
  })
  it("parses favorites with keymap", ()=>{
    const config = common.parseFavoriteConfig(`key:alt-shift-ctrl-w x y z${DELIM}/P1/p2 /F*%$alt-e x y z#&*:-abc-cde 1 2.txt`)
    expect(config.hasKeymap).toBe(true)
    expect(config.keymap).toBe('alt-shift-ctrl-w x y z')
    expect(config.fav).toBe('/P1/p2 /F*%$alt-e x y z#&*:-abc-cde 1 2.txt')
  })
  it("parses windows favorites with keymap", ()=>{
    const config = common.parseFavoriteConfig(`key:alt-shift-ctrl-w x y z${DELIM}d:\\a\c D\$$2##.,tdde`)
    expect(config.hasKeymap).toBe(true)
    expect(config.keymap).toBe('alt-shift-ctrl-w x y z')
    expect(config.fav).toBe('d:\\a\c D\$$2##.,tdde')
  })
  it("parses keymaps with one key", ()=>{
    const config = common.parseFavoriteConfig(`key:pageup${DELIM}/a/b/c`)
    expect(config.hasKeymap).toBe(true)
    expect(config.keymap).toBe('pageup')
    expect(config.fav).toBe('/a/b/c')
  })
  it("parses multiple properties", ()=>{
    const config = common.parseFavoriteConfig(`name:new name${DELIM}/x/b/x${DELIM}key:alt-r`)
    expect(config.isRenamed).toBe(true)
    expect(config.newName).toBe('new name')
    expect(config.hasKeymap).toBe(true)
    expect(config.keymap).toBe('alt-r')
  })
  it("allows favorite path containing config delimiter escape", ()=>{
    const config = common.parseFavoriteConfig(`name:xx${DELIM}${DELIM}yy${DELIM}/a/b${DELIM}${DELIM}c${DELIM}${DELIM}d.txt`)
    expect(config.isRenamed).toBe(true)
    expect(config.newName).toBe('xx|yy')
    expect(config.fav).toBe(`/a/b${DELIM}c${DELIM}d.txt`)
  })
  it("ignores wrong properties", ()=>{
    const config = common.parseFavoriteConfig(`nameXA:new name${DELIM}/x/b/x${DELIM}keyEEE:alt-r`)
    expect(config.isRenamed).toBe(false)
    expect(config.hasKeymap).toBe(false)
    expect(config.fav).toBe('/x/b/x')
  })
})
