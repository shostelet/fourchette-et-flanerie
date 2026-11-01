import { isDeleted } from './entities'
import type { Rating, RatingCriterion, Visit } from './models'

export interface RatingSummary {
  /** Exact average, between 1 and 5. */
  average: number
  /** Number of visits that rated this criterion. */
  count: number
  /** Face closest to the average, the one that is "lit". */
  nearest: Rating
}

export type PlaceRatings = Record<RatingCriterion, RatingSummary | null>

/** Face closest to an average (half rounds up: 2.5 → 3). */
export function nearestRating(average: number): Rating {
  const rounded = Math.round(average)
  return Math.min(5, Math.max(1, rounded)) as Rating
}

/** Averages the available ratings; `null` when none is available. */
export function summarizeRatings(
  values: readonly (Rating | undefined | null)[],
): RatingSummary | null {
  const ratings = values.filter((v): v is Rating => v != null)
  if (ratings.length === 0) return null
  const average = ratings.reduce((sum, v) => sum + v, 0) / ratings.length
  return { average, count: ratings.length, nearest: nearestRating(average) }
}

/** Per-criterion summary of a place's visits (deleted visits ignored). */
export function summarizeVisits(visits: readonly Visit[]): PlaceRatings {
  const active = visits.filter((v) => !isDeleted(v))
  return {
    quality: summarizeRatings(active.map((v) => v.quality)),
    value: summarizeRatings(active.map((v) => v.value)),
  }
}

/** Position of an average on the precision gauge, from 0 (1/5) to 1 (5/5). */
export function ratingGaugePosition(average: number): number {
  return Math.min(1, Math.max(0, (average - 1) / 4))
}

const averageFormatter = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

/** "3,7" */
export function formatAverage(average: number): string {
  return averageFormatter.format(average)
}
