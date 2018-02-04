'use babel'
import common from '../lib/common'

describe("Favorite config parser", ()=>{
  it("handles regular favorites with no properties", ()=>{
    const config = common.parseFavoriteConfig('/path1 /path2/p4/x.js')
    expect(config.isTopic).toBe(false)
    expect(config.hasKeymap).toBe(false)
    expect(config.fav).toBe('/path1 /path2/p4/x.js')
  })
  it("handles windows paths", ()=>{
    const config = common.parseFavoriteConfig('d:\\path1 \\path2\\p4\\x.js')
    expect(config.isTopic).toBe(false)
    expect(config.hasKeymap).toBe(false)
    expect(config.fav).toBe('d:\\path1 \\path2\\p4\\x.js')
  })
  it("handles topics", ()=>{
    const config = common.parseFavoriteConfig('topic:My topic')
    expect(config.isTopic).toBe(true)
    expect(config.topic).toBe('My topic')
  })
  it("handles favorites with keymap", ()=>{
    const config = common.parseFavoriteConfig('key:alt-shift-ctrl-w x y z#/P1/p2 /F*%$alt-e x y z#&*:-abc-cde 1 2.txt')
    expect(config.hasKeymap).toBe(true)
    expect(config.keymap).toBe('alt-shift-ctrl-w x y z')
    expect(config.fav).toBe('/P1/p2 /F*%$alt-e x y z#&*:-abc-cde 1 2.txt')
  })
  it("handles windows favorites with keymap", ()=>{
    const config = common.parseFavoriteConfig('key:alt-shift-ctrl-w x y z#d:\\a\c D\$$2##.,tdde')
    expect(config.hasKeymap).toBe(true)
    expect(config.keymap).toBe('alt-shift-ctrl-w x y z')
    expect(config.fav).toBe('d:\\a\c D\$$2##.,tdde')
  })
  it("handles keymaps with one key", ()=>{
    const config = common.parseFavoriteConfig('key:pageup#/a/b/c')
    expect(config.hasKeymap).toBe(true)
    expect(config.keymap).toBe('pageup')
    expect(config.fav).toBe('/a/b/c')
  })
  it("allows favorite path containing config delimiter", ()=>{
    const config = common.parseFavoriteConfig('/a/b#c#d.txt')
    expect(config.fav).toBe('/a/b#c#d.txt')
  })
})
