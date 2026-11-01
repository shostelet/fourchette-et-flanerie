import { readonly, ref } from 'vue'

// Module-level singleton: one short message at a time, for the whole app.
const message = ref<string>()
let timer: ReturnType<typeof setTimeout> | undefined

/** Shows a short, self-dismissing message (displayed by AppToast). */
export function useToast() {
  function show(text: string, durationMs = 2500): void {
    message.value = text
    clearTimeout(timer)
    timer = setTimeout(() => (message.value = undefined), durationMs)
  }

  return { message: readonly(message), show }
}
