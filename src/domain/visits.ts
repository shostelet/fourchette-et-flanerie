import type { Visit } from './models'

/**
 * Most recent first. Visits with an unknown date come after dated ones;
 * ties are broken by creation time (most recent first).
 */
export function compareVisitsByDateDesc(a: Visit, b: Visit): number {
  if (a.date && b.date && a.date !== b.date) return b.date.localeCompare(a.date)
  if (a.date && !b.date) return -1
  if (!a.date && b.date) return 1
  return b.createdAt.localeCompare(a.createdAt)
}

export function sortVisits(visits: readonly Visit[]): Visit[] {
  return [...visits].sort(compareVisitsByDateDesc)
}
