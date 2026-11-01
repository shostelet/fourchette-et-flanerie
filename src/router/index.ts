import { createRouter, createWebHashHistory } from 'vue-router'
import MapView from '@/views/MapView.vue'

/**
 * Hash history ("/#/settings") works on GitHub Pages without server config.
 *
 * Overlays (menu, place detail, forms…) are child routes of the map: the
 * map stays mounted underneath, and the Android back gesture closes them.
 */
const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'map',
      component: MapView,
      children: [
        {
          path: 'settings',
          name: 'settings',
          component: () => import('@/features/settings/SettingsPanel.vue'),
        },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

export default router
