import { getRequestIP, getCookie, H3Event, defineEventHandler } from 'h3'
import * as csrf from './utils/uncsrf'
import { useRuntimeConfig, createError, useStorage } from '#imports'

import type { ModuleOptions } from '../../types'
import type { Options } from './utils/uncsrf'
import type { NitroRouteRules } from 'nitropack'

interface Uncsrf {
  uncsrf?:{
    token:string,
    updatedAt:number
  }
}

const getRouteRules = (event:H3Event):NitroRouteRules => event.context._nitro.routeRules

export default defineEventHandler(async event => {
	const { uncsrf } = getRouteRules(event)
	const runtime = useRuntimeConfig(event)

  const isApi = event.path.startsWith('/api')
  const isAllowed = isApi && !uncsrf && uncsrf !== false

  if (isAllowed || uncsrf) {
    const error = {
      name: 'BadScrfToken',
      statusMessage: 'Csrf Token Mismatch',
      message: 'Csrf: Invalid token provided',
      statusCode: 403,
    }

		const config = runtime.uncsrf as ModuleOptions & { encrypt: Options }
    const name = typeof config.storage === 'string' ? config.storage : 'uncsrf'

    // Protect methods
		if (uncsrf?.methods && !uncsrf?.methods?.includes(event.method)) return

		const storage = useStorage<Uncsrf>(name)

		const ip = getRequestIP(event) || getRequestIP(event,{ xForwardedFor:true }) || '::1'
    if (!event.context.clientAddress) event.context.clientAddress = ip

    // Get token from request
		let token = getCookie(event,runtime.uncsrf.cookie.name) ?? ''

    // Validate token
    let valid = await csrf.verify(event,ip, token)

    if (token && !valid) {
      // Obtain decrypted token
      const data = await csrf.decrypt(event,token)
      if (data) {
        const item = await storage.getItem(data) ?? {}

        item.uncsrf = {
          token: await csrf.encrypt(event,ip),
          updatedAt: Date.now()
        }

        token = item.uncsrf.token
        await storage.removeItem(data)
        await storage.setItem(ip,item)
        valid = true
      }
    }

		if (!valid) throw createError(uncsrf?.error ?? error)
	}

})
