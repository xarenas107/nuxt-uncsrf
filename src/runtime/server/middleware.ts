import { getRequestIP, getCookie, H3Event, defineEventHandler } from 'h3'
import * as csrf from './utils/uncsrf'
import { useRuntimeConfig, createError, useStorage } from '#imports'
import { useCsrfKey } from './utils/useCsrfKey'

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
	if (isApi && uncsrf !== false) {
		const config = runtime.uncsrf as ModuleOptions & { encrypt: Options }
    const name = typeof config.storage === 'string' ? config.storage : 'uncsrf'

    // Protect methods
		if (uncsrf?.methods && !uncsrf?.methods?.includes(event.method)) return

		const storage = useStorage<Uncsrf>(name)
		const ip = getRequestIP(event,{ xForwardedFor:true }) ?? '::1'
		let token = getCookie(event,runtime.uncsrf.cookieKey) ?? ''
		let item = await storage.getItem(ip)

    config.encrypt.secret = await useCsrfKey(config)
    const encrypt = config.encrypt

    if (token) {
      const decryptedToken = await csrf.decrypt(token,encrypt)
      const data = csrf.decryptToken(decryptedToken)
      const current = await storage.getItem(data)

      if (current && data !== ip) {
        const encrypt = {
          ...runtime.uncsrf.encrypt,
          secret: await useCsrfKey(runtime.uncsrf)
        }

        item = item || {}
        item.uncsrf = {
          token: csrf.encryptToken(ip),
          updatedAt: Date.now()
        }

        token = await csrf.create(event,item?.uncsrf?.token, encrypt)
        await storage.removeItem(data)
        await storage.setItem(ip,item)
      }
    }

    // Verify the incoming csrf token
    const isValid = await csrf.verify(item?.uncsrf?.token, token, encrypt)

    const error = {
      name: 'BadScrfToken',
      statusMessage: 'Csrf Token Mismatch',
      statusCode: 403,
    }

		if (!isValid) throw createError(uncsrf?.error ?? error)
	}

})
