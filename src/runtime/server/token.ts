import { defineEventHandler, getCookie, useRuntimeConfig } from 'nuxt/server'
import session from './utils/session'

// Exposes the httpOnly cookie token to the client. Other origins cannot read the response,
// and the cookie is not sent cross-site, so this does not help an attacker forge requests.
export default defineEventHandler(async (event) => {
  const runtime = useRuntimeConfig()
  const { uncsrf } = runtime.public

  const cookie = getCookie(event, uncsrf.cookie.name)
  // A forged or malformed cookie is replaced, not rejected
  const current = await session.resolve(cookie, false)

  // Also bootstraps clients that only visited prerendered or cached pages
  const { context } = event
  if (!current || current.expired) await session.issue(event, current)
  else context.security = current.item

  // The token is per client, never cache it
  event.res.headers.set('cache-control', 'no-store')

  const token = context.security?.uncsrf?.token ?? null
  return { token }
})
