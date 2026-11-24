import { createError, defineEventHandler, getCookie, getRouteRules, useRuntimeConfig } from 'nuxt/server'
import { useKV } from 'nitro/kv'

import { decrypt, encrypt, verify, createCookie } from './utils/uncsrf'
import { useIP } from './utils/use-ip'

import type { SecurityContext } from './types'
import type { ServerHandlerMethod } from 'nuxt/schema'

export default defineEventHandler(async (event) => {
  event.context.security ??= {}

  const { uncsrf } = getRouteRules(event)
  if (uncsrf === false) return

  const runtime = useRuntimeConfig()
  const { cookie } = runtime.public.uncsrf
  const { ttl = 0, error } = runtime.uncsrf
  const storage = useKV<SecurityContext>(runtime.uncsrf.storage)

  const ip = useIP(event)
  event.context.clientAddress ??= ip

  let token = getCookie(event, cookie.name) || ''
  const data = await decrypt(token) || ''

  const updatedAt = Date.now()
  const value = await storage.getItem<SecurityContext>(data) || {}
  let save = false

  if (data && data !== ip) {
    token = await encrypt(ip)
    await storage.removeItem(data)
    save = true
  }

  const endAt = (value.uncsrf?.updatedAt || 0) + ttl
  const expired = ttl ? endAt <= updatedAt : false

  if (!value.uncsrf || expired || !token) {
    token = await encrypt(ip)
    save = true
  }

  const api = event.url.pathname.startsWith('/api')
  const allowed = api && !uncsrf

  if (allowed || uncsrf) {
    const method = event.req.method as ServerHandlerMethod
    if (!uncsrf?.methods?.length || uncsrf.methods.includes(method)) {
      const valid = await verify(ip, token)
      if (!valid) throw createError(uncsrf?.error ?? error ?? {})
    }
  }

  // Add to context
  const security: SecurityContext = { ...value, uncsrf: { token, updatedAt } }
  event.context.security = security

  if (save) {
    if (!security.uncsrf?.token) return
    await storage.setItem(ip, security)
    await createCookie(event, security.uncsrf.token)
    return
  }

  delete security.uncsrf?.updatedAt
})
