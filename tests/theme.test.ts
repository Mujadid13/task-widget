import { test } from 'node:test'
import assert from 'node:assert/strict'
import { inkFor, presets, readableOnDark } from '../src/renderer/src/lib/theme.ts'

test('button text is dark on bright accents and white on dark ones', () => {
  assert.equal(inkFor('#2dd4bf'), '#020617')
  assert.equal(inkFor('#facc15'), '#020617')
  assert.equal(inkFor('#1e3a8a'), '#ffffff')
  assert.equal(inkFor('#000000'), '#ffffff')
})

test('bright presets are already readable, so they are used unchanged as text', () => {
  for (const p of presets) assert.equal(readableOnDark(p.color), p.color, p.name)
})

test('dark custom colors are lightened just enough to read on the dark card', () => {
  const navy = readableOnDark('#1e3a8a')
  assert.notEqual(navy, '#1e3a8a')
  assert.notEqual(navy, '#ffffff')
  assert.equal(readableOnDark('#000000'), '#7f7f7f') // black: first 5% step at 4.5:1 (#737373 is 4.3:1)
})
