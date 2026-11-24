import { getRequestIP } from 'nuxt/server'
import type { RequestEvent } from 'nuxt/server'

export const useIP = (event: RequestEvent) => {
  return getRequestIP(event, { xForwardedFor: true }) || '127.0.0.1'
}
