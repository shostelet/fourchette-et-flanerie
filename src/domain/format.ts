import type { IsoDate } from './models'

const visitDateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

/** "2026-10-12" → "12 octobre 2026"; missing date → "Date inconnue". */
export function formatVisitDate(date: IsoDate | undefined): string {
  if (!date) return 'Date inconnue'
  const [year, month, day] = date.split('-').map(Number)
  if (!year || !month || !day) return date
  // Local date: no timezone shift around midnight.
  return visitDateFormatter.format(new Date(year, month - 1, day))
}

/** "1 visite", "4 visites" */
export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count > 1 ? plural : singular}`
}

/**
 * Short label for a link: "@handle" for Instagram, the host name otherwise.
 * "https://www.instagram.com/lemusee.lyon/" → "@lemusee.lyon"
 * "https://www.lemusee.fr/carte" → "lemusee.fr"
 */
export function linkLabel(link: { kind: string; url: string }): string {
  try {
    const url = new URL(link.url)
    if (link.kind === 'instagram') {
      const handle = url.pathname.split('/').find((segment) => segment !== '')
      if (handle) return `@${handle}`
    }
    return url.hostname.replace(/^www\./, '')
  } catch {
    return link.url
  }
}
