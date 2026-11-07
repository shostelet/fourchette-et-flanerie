import type { Rating, RatingCriterion } from '@/domain/models'

export interface RatingFace {
  value: Rating
  icon: string
  label: string
}

/** 1 = angry … 5 = beaming, as Lucide icons. */
export const RATING_FACES: readonly RatingFace[] = [
  { value: 1, icon: 'angry', label: 'En colère' },
  { value: 2, icon: 'frown', label: 'Déçu' },
  { value: 3, icon: 'meh', label: 'Mitigé' },
  { value: 4, icon: 'smile', label: 'Content' },
  { value: 5, icon: 'laugh', label: 'Ravi' },
]

export const CRITERION_LABELS: Record<RatingCriterion, string> = {
  quality: 'Qualité',
  value: 'Rapport qualité/prix',
}
