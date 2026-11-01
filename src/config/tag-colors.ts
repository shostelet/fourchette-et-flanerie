/** Colors offered for tags: muted, distinct, readable as small dots on cream. */
export const TAG_COLORS = [
  '#995d2e', // bouchon brown
  '#c65d3b', // terracotta
  '#b8862f', // ochre
  '#6b7f4e', // olive
  '#408078', // teal
  '#405580', // slate blue
  '#7a4e6b', // plum
  '#80405f', // wine
  '#5d6470', // grey
] as const

/** The least used palette color, so new tags are easy to tell apart. */
export function nextTagColor(existing: readonly { color: string }[]): string {
  const usage = new Map<string, number>(TAG_COLORS.map((c) => [c, 0]))
  for (const { color } of existing) {
    const key = color.toLowerCase()
    if (usage.has(key)) usage.set(key, usage.get(key)! + 1)
  }
  let best: string = TAG_COLORS[0]
  for (const [color, count] of usage) {
    if (count < usage.get(best)!) best = color
  }
  return best
}
