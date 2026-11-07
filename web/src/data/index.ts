import { AppDatabase } from './local/database'
import { createLocalRepositories } from './local/local-repositories'
import type { Repositories } from './repositories'

let current: Repositories | undefined

/**
 * The repositories used by the app. Local (IndexedDB) for now; this is the
 * single place to switch to the HTTP API later.
 */
export function getRepositories(): Repositories {
  current ??= createLocalRepositories(new AppDatabase())
  return current
}

/** Replaces the repositories (unit tests, future API switch). */
export function setRepositories(repositories: Repositories): void {
  current = repositories
}
