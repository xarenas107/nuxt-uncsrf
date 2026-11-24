import { useRuntimeConfig } from 'nuxt/server'
import { useKV } from 'nitro/kv'

import type { RendererPlugin } from 'nuxt/server'
import { encrypt, createCookie } from './utils/uncsrf'
import { useIP } from './utils/use-ip'
import type { SecurityContext } from './types'

const plugin: RendererPlugin = ({ hooks }) => {
  hooks.hook('render:html', async (_, { event }) => {
    event.context.security ??= {}
    const security = event.context.security

    if (!security.uncsrf?.updatedAt) {
      const runtime = useRuntimeConfig()
      const storage = useKV<SecurityContext>(runtime.uncsrf.storage)
      const ip = useIP(event)

      const token = await encrypt(ip)
      const updatedAt = Date.now()

      security.uncsrf = { token, updatedAt }
      await storage.setItem(ip, security)
    }

    await createCookie(event, security.uncsrf.token)
  })
}

export default plugin
