import { readonly, ref, shallowRef } from 'vue'
import type { GeoPoint } from '@/domain/models'

/**
 * - `prompt`: not asked yet (or asked and dismissed)
 * - `granted`: allowed
 * - `denied`: blocked by the user; the browser won't ask again
 * - `unavailable`: allowed, but the phone's location is turned off
 * - `unsupported`: no geolocation (old browser, or page not served over HTTPS)
 */
export type GeolocationStatus = 'prompt' | 'granted' | 'denied' | 'unavailable' | 'unsupported'

// Module-level singleton: one permission state and one position for the app.
const status = ref<GeolocationStatus>('prompt')
const position = shallowRef<GeoPoint>()
let watchId: number | undefined
let initialized = false

const isSupported = () =>
  typeof navigator !== 'undefined' && 'geolocation' in navigator && window.isSecureContext

function toGeoPoint(p: GeolocationPosition): GeoPoint {
  return { lat: p.coords.latitude, lng: p.coords.longitude }
}

function handlePosition(p: GeolocationPosition): void {
  position.value = toGeoPoint(p)
  status.value = 'granted'
}

function handleError(error: GeolocationPositionError): void {
  if (error.code === error.PERMISSION_DENIED) {
    status.value = 'denied'
    stopWatching()
  } else if (error.code === error.POSITION_UNAVAILABLE) {
    status.value = 'unavailable'
  }
  // TIMEOUT: keep the current status, the caller gets the rejection.
}

/** Continuous tracking; only started once the user asked to locate themselves. */
function startWatching(): void {
  if (watchId !== undefined || !isSupported()) return
  watchId = navigator.geolocation.watchPosition(handlePosition, handleError, {
    enableHighAccuracy: true,
    maximumAge: 10_000,
  })
}

function stopWatching(): void {
  if (watchId === undefined) return
  navigator.geolocation.clearWatch(watchId)
  watchId = undefined
}

function applyPermission(state: PermissionState): void {
  if (state === 'denied') {
    status.value = 'denied'
    stopWatching()
  } else if (state === 'granted') {
    status.value = 'granted'
    // One cheap, low-accuracy fix to show the dot, without draining the battery.
    navigator.geolocation.getCurrentPosition(handlePosition, handleError, {
      maximumAge: 5 * 60_000,
    })
  } else {
    status.value = 'prompt'
  }
}

/** Reads the permission state without prompting the user. */
async function init(): Promise<void> {
  if (initialized) return
  initialized = true
  if (!isSupported()) {
    status.value = 'unsupported'
    return
  }
  try {
    const permission = await navigator.permissions.query({ name: 'geolocation' })
    applyPermission(permission.state)
    permission.addEventListener('change', () => applyPermission(permission.state))
  } catch {
    // Permissions API unavailable: stay on "prompt".
  }
}

/**
 * Gets the current position, prompting the user if needed, then keeps
 * tracking it. Rejects if denied, unavailable or too slow.
 */
function locate(): Promise<GeoPoint> {
  return new Promise((resolve, reject) => {
    if (!isSupported()) {
      status.value = 'unsupported'
      reject(new Error('Geolocation unsupported'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        handlePosition(p)
        startWatching()
        resolve(toGeoPoint(p))
      },
      (error) => {
        handleError(error)
        reject(error)
      },
      { enableHighAccuracy: true, timeout: 15_000 },
    )
  })
}

export function useGeolocation() {
  void init()
  return {
    status: readonly(status),
    position: readonly(position),
    locate,
  }
}
