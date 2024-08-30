import { getCookie, defineEventHandler } from 'h3'
import { getRouteRules, useStorage } from 'nitropack/runtime'
import type { ModuleOptions } from '../../types'
import { useIP } from './utils/useIP'

import * as csrf from './utils/uncsrf'
import type { Options } from './utils/uncsrf'
import { useRuntimeConfig, createError } from '#imports'

interface Uncsrf {
	uncsrf?: {
		token: string
		updatedAt: number
	}
}

export default defineEventHandler(async (event) => {
	const { uncsrf } = getRouteRules(event)
	const runtime = useRuntimeConfig(event)
	const { cookie } = runtime.public.uncsrf ?? {}

	const isApi = event.path.startsWith('/api')
	const isAllowed = isApi && !uncsrf && uncsrf !== false

	if (isAllowed || uncsrf) {
		const config = runtime.uncsrf as ModuleOptions & { encrypt: Options }
		const name = typeof config.storage === 'string' ? config.storage : 'uncsrf'

		// Protect methods
		if (uncsrf?.methods && !uncsrf?.methods?.includes(event.method)) return

		const storage = useStorage<Uncsrf>(name)

		const ip = useIP(event)
		event.context.clientAddress ||= ip

		// Get token from request
		let token = getCookie(event, cookie.name) ?? ''

		// Validate token
		const state = {
			valid: await csrf.verify(event, ip, token),
		}

		if (token && !state.valid) {
			// Obtain decrypted token (ip)
			const data = await csrf.decrypt(event, token)

			if (data) {
				const item = await storage.getItem(data) ?? {}

				item.uncsrf = {
					token: await csrf.encrypt(event, ip),
					updatedAt: Date.now(),
				}

				token = item.uncsrf.token

				const promises = [storage.setItem(ip, item), csrf.createCookie(event, token)]
				if (data !== ip) promises.push(storage.removeItem(data))
				await Promise.all(promises)
				state.valid = true
			}
		}

		if (!state.valid) throw createError(uncsrf?.error ?? runtime.uncsrf.error)
	}
})
