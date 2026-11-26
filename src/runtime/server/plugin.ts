import { getCookie, getRouteRules, useRuntimeConfig } from 'nuxt/server'
import { createCookie } from './utils/uncsrf'
import session from './utils/session'
import { definePlugin } from 'nitro'

export default definePlugin(({ hooks }) => {
  // Before rendering, so the token is available to `csrf` and to requests made by the page
  hooks.hook('render:html', async (_, { event }) => {
    // Cached pages are shared between clients
    const rules = getRouteRules(event)
    if (import.meta.prerender || rules.cache || rules.isr) return

    const runtime = useRuntimeConfig()
    const { uncsrf } = runtime.public
    const cookie = getCookie(event, uncsrf.cookie.name)
    const current = await session.resolve(cookie)
    if (!current || current.expired) return session.issue(event, current)

    event.context.security = current.item
    await createCookie(event, cookie!)
  })
})
