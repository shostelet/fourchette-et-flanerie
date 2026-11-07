import { describe, expect, it } from 'vitest'
import { nextTagColor, TAG_COLORS } from '../tag-colors'

describe('nextTagColor', () => {
  it('starts with the first color', () => {
    expect(nextTagColor([])).toBe(TAG_COLORS[0])
  })

  it('picks the least used color', () => {
    const used = TAG_COLORS.slice(0, 3).map((color) => ({ color }))
    expect(nextTagColor(used)).toBe(TAG_COLORS[3])
  })

  it('ignores case and colors outside the palette', () => {
    expect(nextTagColor([{ color: '#995D2E' }, { color: '#123456' }])).toBe(TAG_COLORS[1])
  })
})
