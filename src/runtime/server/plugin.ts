import { getRouteRules, useStorage } from 'nitropack/runtime'
import type { NitroApp, StorageMounts } from 'nitropack'
import { createError, getCookie, getRequestIP } from 'h3'
import * as csrf from './utils/uncsrf'
import { useRuntimeConfig } from '#imports'

type NitroAppPlugin = (nitro: NitroApp) => void

type Uncsrf = {
	uncsrf?: {
		token: string
		updatedAt?: number
	}
} & {
	[key: string]: any
}

declare module 'h3' {
	interface H3EventContext {
		security: Uncsrf
	}
}

function defineNitroPlugin(def: NitroAppPlugin): NitroAppPlugin {
	return def
}

export default defineNitroPlugin(async (nitro) => {
	const runtime = useRuntimeConfig()
	const { uncsrf } = runtime
	const config = uncsrf.storage as StorageMounts[string] | string
	const name = uncsrf?.storage?.driver || 'memory'
	const localhost = '127.0.0.1'

	// Define storage
	if (typeof config !== 'string') {
		const storage = useStorage<Uncsrf>()

		const { default: driver } = await import(`unstorage/drivers/${name}`)
		const keys = Object.keys(config)

		const options = keys.reduce((opts, key) => {
			if (key !== 'driver') opts[key] = config[key]
			return opts
		}, <StorageMounts[string]>{})

		storage.mount('uncsrf', driver(options))
	}

	nitro.hooks.hook('request', async (event) => {
		event.context.security ||= {}

		const { uncsrf } = getRouteRules(event)
		if (uncsrf === false) return

		const { cookie } = runtime.public.uncsrf ?? {}
		const name = typeof config === 'string' ? config : 'uncsrf'

		const storage = useStorage<Uncsrf>(name)

		// Get client ip
		const ip = getRequestIP(event, { xForwardedFor: true }) || localhost
		event.context.clientAddress ??= ip

		const updatedAt = Date.now()
		const value = await storage.getItem(ip) ?? {}

		const state = {
			remove: false,
			valid: false,
			save: false,
			value,
		}

		// Get token from request
		const token = getCookie(event, cookie.name) ?? ''
		const endAt = (state.value?.uncsrf?.updatedAt || 0) + (runtime.uncsrf.ttl || 0)
		const expired = runtime.uncsrf.ttl ? endAt <= updatedAt : false

		if (!state.value?.uncsrf || expired || !token) {
			const token = await csrf.encrypt(event, ip)
			state.value.uncsrf = { updatedAt, token }
			state.save = true
		}

		const api = event.path.startsWith('/api')
		const defaults = api && !uncsrf

		if (defaults || uncsrf) {
			// Protect methods
			if (!uncsrf?.methods || uncsrf?.methods?.includes(event.method)) {
				// Validate token
				state.valid = await csrf.verify(event, ip, token)

				if (token && !state.valid) {
					// Obtain decrypted token (ip)
					const data = await csrf.decrypt(event, token)

					if (data) {
						state.value = await storage.getItem(data) ?? {}
						const token = await csrf.encrypt(event, ip)
						state.value.uncsrf = { token, updatedAt }
						state.save = true

						await storage.removeItem(data)
						state.valid = true
					}
				}

				if (!state.valid) throw createError(uncsrf?.error ?? runtime.uncsrf.error)
			}
		}

		// Add to context
		event.context.security = state.value

		if (state.save) {
			await storage.setItem(ip, state.value)
			await csrf.createCookie(event, state.value.uncsrf.token)
		}
		else delete state.value.uncsrf.updatedAt
	})

	nitro.hooks.hook('render:html', async (_, { event }) => {
		const { security } = event.context

		if (!security.uncsrf?.updatedAt) {
			const ip = getRequestIP(event, { xForwardedFor: true }) || localhost
			const token = await csrf.encrypt(event, ip)
			const updatedAt = Date.now()
			security.uncsrf = { token, updatedAt }

			const storage = useStorage<Uncsrf>(name)
			await storage.setItem(ip, security)
		}

		const { token } = security.uncsrf
		if (token) await csrf.createCookie(event, token)
	})
})
