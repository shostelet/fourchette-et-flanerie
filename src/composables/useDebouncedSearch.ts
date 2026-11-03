import { ref, shallowRef, watch, type Ref } from 'vue'

export type SearchStatus = 'idle' | 'loading' | 'done' | 'error'

/**
 * Runs an async search when `query` settles: debounced, at least `minLength`
 * characters, and only the latest request counts (older ones are aborted).
 */
export function useDebouncedSearch<T>(
  query: Ref<string>,
  run: (query: string, signal: AbortSignal) => Promise<T[]>,
  options: { delayMs?: number; minLength?: number } = {},
) {
  const delayMs = options.delayMs ?? 350
  const minLength = options.minLength ?? 3

  const results = shallowRef<T[]>([])
  const status = ref<SearchStatus>('idle')
  const error = ref<string>()
  let timer: ReturnType<typeof setTimeout> | undefined
  let controller: AbortController | undefined

  function cancel(): void {
    clearTimeout(timer)
    controller?.abort()
    controller = undefined
  }

  async function execute(value: string): Promise<void> {
    controller = new AbortController()
    const current = controller
    status.value = 'loading'
    try {
      const found = await run(value, current.signal)
      if (current.signal.aborted) return
      results.value = found
      status.value = 'done'
    } catch (e) {
      if (current.signal.aborted) return
      results.value = []
      error.value = e instanceof Error ? e.message : 'Erreur inattendue.'
      status.value = 'error'
    }
  }

  watch(query, (value) => {
    cancel()
    error.value = undefined
    const trimmed = value.trim()
    if (trimmed.length < minLength) {
      results.value = []
      status.value = 'idle'
      return
    }
    status.value = 'loading'
    timer = setTimeout(() => void execute(trimmed), delayMs)
  })

  /** Runs again right away (e.g. "retry" after an error). */
  function retry(): void {
    cancel()
    const trimmed = query.value.trim()
    if (trimmed.length >= minLength) void execute(trimmed)
  }

  return { results, status, error, retry, cancel }
}
