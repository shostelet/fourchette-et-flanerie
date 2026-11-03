import { describe, expect, it } from 'vitest'
import { createTag } from '../entities'
import { filterAndSortTags } from '../tags'

const tag = (name: string) => createTag({ category: 'food', name, color: '#000000' })
const bouchon = tag('Bouchon')
const asiatique = tag('Asiatique')
const ethiopien = tag('Éthiopien')
const bib = tag('BIB')
const all = [bouchon, asiatique, ethiopien, bib]
const usage = new Map([
  [bouchon.id, 3],
  [bib.id, 7],
  [asiatique.id, 3],
])
const names = (tags: { name: string }[]) => tags.map((t) => t.name)

describe('filterAndSortTags', () => {
  it('sorts A→Z, accents included', () => {
    expect(names(filterAndSortTags(all, '', 'name', usage))).toEqual([
      'Asiatique',
      'BIB',
      'Bouchon',
      'Éthiopien',
    ])
  })

  it('sorts by number of places, then A→Z', () => {
    expect(names(filterAndSortTags(all, '', 'usage', usage))).toEqual([
      'BIB',
      'Asiatique',
      'Bouchon',
      'Éthiopien',
    ])
  })

  it('searches ignoring case and accents', () => {
    expect(names(filterAndSortTags(all, 'ETHIO', 'name', usage))).toEqual(['Éthiopien'])
    expect(names(filterAndSortTags(all, 'bi', 'name', usage))).toEqual(['BIB'])
    expect(names(filterAndSortTags(all, '  ', 'name', usage))).toHaveLength(4)
  })
})
