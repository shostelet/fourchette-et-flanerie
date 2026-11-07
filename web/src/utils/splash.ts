/**
 * The splash screen lives in index.html (inline SVG + CSS), so it shows from
 * the first frame. The app removes it once it's really usable: data loaded
 * and map drawn. A fallback timer makes sure it never stays forever (offline
 * first launch, map style unreachable…).
 */
const FALLBACK_MS = 6000
const FADE_MS = 250

let hidden = false

export function hideSplash(): void {
  if (hidden) return
  hidden = true
  const splash = document.getElementById('splash')
  if (!splash) return
  splash.classList.add('splash-hidden')
  setTimeout(() => splash.remove(), FADE_MS)
}

/** Call once at startup. */
export function armSplashFallback(): void {
  setTimeout(hideSplash, FALLBACK_MS)
}
