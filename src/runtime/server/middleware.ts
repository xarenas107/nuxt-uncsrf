import { createError, defineEventHandler, getCookie, getRouteRules, useRuntimeConfig } from 'nuxt/server'
import token from './utils/session'

import type { ServerHandlerMethod } from 'nuxt/schema'

export default defineEventHandler(async (event) => {
  // Requests made while rendering a page inherit its context, and the token issued for it
  const { security } = event.context
  event.context.security ??= {}

  const { uncsrf } = getRouteRules(event)
  if (uncsrf === false || uncsrf?.enabled === false) return

  const { pathname } = event.url

  // Apply to /api on default
  const api = pathname.startsWith('/api')
  if (!uncsrf && !api) return

  const method = event.req.method as ServerHandlerMethod
  if (uncsrf?.methods?.length && !uncsrf.methods.includes(method)) return

  const runtime = useRuntimeConfig()
  const { cookie } = runtime.public.uncsrf

  const value = security?.uncsrf?.token ?? getCookie(event, cookie.name)
  const session = await token.resolve(value)

  if (!session) {
    const error = uncsrf?.error ?? runtime.uncsrf.error
    throw createError(error)
  }

  // A cookie set on an inherited request would not reach the browser
  if (session.expired && !security?.uncsrf?.token) {
    return token.issue(event, session)
  }

  event.context.security = session.item
})
