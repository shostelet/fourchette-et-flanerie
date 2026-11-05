import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { usePreferencesStore } from '@/stores/preferences'
import { removeAllPreferences } from '@/utils/local-storage'
import CategorySwitch from '../CategorySwitch.vue'

describe('CategorySwitch', () => {
  beforeEach(() => {
    removeAllPreferences()
    setActivePinia(createPinia())
  })

  it('shows both categories and switches the active one', async () => {
    const wrapper = mount(CategorySwitch)
    const buttons = wrapper.findAll('button')

    expect(buttons.map((b) => b.text())).toEqual(['Fourchette', 'Flânerie'])
    expect(buttons[0]!.attributes('aria-pressed')).toBe('true')

    await buttons[1]!.trigger('click')

    expect(usePreferencesStore().activeCategory).toBe('stroll')
    expect(buttons[1]!.attributes('aria-pressed')).toBe('true')
  })
})
