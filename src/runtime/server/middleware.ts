import { getRequestIP, getCookie, H3Event, defineEventHandler } from 'h3'
import * as csrf from './utils/uncsrf'
import { useRuntimeConfig, useStorage, createError } from '#imports'
import { useCsrfKey } from './utils/useCsrfKey'

import type { ModuleOptions } from '../../types'
import type { Options } from './utils/uncsrf'
import type { NitroRouteRules } from 'nitropack'

const error = {
	name: 'BadScrfToken',
	statusMessage: 'Csrf Token Mismatch',
	statusCode: 403,
}

type Uncsrf = ModuleOptions & { encrypt:Options }

const getRouteRules = (event:H3Event):NitroRouteRules => event.context._nitro.routeRules

export default defineEventHandler(async event => {
	const { uncsrf } = getRouteRules(event)
	const runtime = useRuntimeConfig(event)

  const isApi = event.path.startsWith('/api')
	if (isApi && uncsrf !== false) {
		const config = runtime.uncsrf as Uncsrf

    // Protect methods
		if (uncsrf?.methods && !uncsrf?.methods?.includes(event.method)) return

		const storage = useStorage('uncsrf')
		const ip = getRequestIP(event,{ xForwardedFor:true }) ?? '::1'
		const token = getCookie(event,'x-csrf-token') ?? ''
		const secret = await storage.getItem(ip) as string

    config.encrypt.secret = await useCsrfKey(config)

    // Verify the incoming csrf token
    const encrypt = config.encrypt
    const isValid = await csrf.verify(secret, token, encrypt)
		if (!isValid) throw createError(uncsrf?.error ?? error)
	}

})
