import { createRouter, createWebHashHistory } from 'vue-router'
import MapView from '@/views/MapView.vue'
import { EXIT_GUARD_ROUTE, exitGuardBeforeEnter } from './exit-guard'

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
        {
          path: 'import',
          name: 'import',
          component: () => import('@/features/import-export/ImportPanel.vue'),
        },
        {
          path: 'review',
          name: 'review',
          component: () => import('@/features/review/ReviewPanel.vue'),
        },
        {
          path: 'home',
          name: 'home',
          component: () => import('@/features/place/HomePanel.vue'),
        },
        {
          path: 'place/:id',
          name: 'place',
          component: () => import('@/features/place/PlacePanel.vue'),
          props: true,
        },
      ],
    },
    {
      // Invisible entry below the map in the installed app (see exit-guard.ts).
      path: '/start',
      name: EXIT_GUARD_ROUTE,
      component: MapView,
      beforeEnter: exitGuardBeforeEnter,
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

export default router
