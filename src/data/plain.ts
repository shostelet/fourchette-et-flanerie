/**
 * Deep copy into a plain object.
 *
 * Objects coming from Vue state are reactive proxies, which IndexedDB
 * refuses to store (DataCloneError). Copying through JSON also drops
 * `undefined` fields, keeping stored records tidy.
 */
export function toPlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}
