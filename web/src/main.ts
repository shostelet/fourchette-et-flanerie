import './assets/main.css'

import { createPinia } from 'pinia'
import { createApp } from 'vue'

import App from './App.vue'
import router from './router'
import { installExitGuard } from './router/exit-guard'
import { armSplashFallback } from './utils/splash'

armSplashFallback()

const app = createApp(App)

app.use(createPinia())
app.use(router)

// Set up the history before the first render, so nothing flickers.
router
  .isReady()
  .then(() => installExitGuard(router))
  .catch((error: unknown) => console.error(error))
  .finally(() => app.mount('#app'))
