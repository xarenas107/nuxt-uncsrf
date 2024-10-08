import { defineNuxtModule, useLogger, createResolver, addServerPlugin, addImportsDir } from '@nuxt/kit'
import { defu } from 'defu'
import type { ModuleOptions } from './types'

export type * from './types'

const configKey = 'uncsrf'

export default defineNuxtModule<ModuleOptions>({
	meta: {
		name: `@nuxt/${configKey}`,
		configKey,
	},
	defaults: {
		enabled: true,
		ttl: 1000 * 60 * 60 * 24 * 7,
		cookie: {
			name: 'x-csrf-token',
			path: '/',
			httpOnly: false,
			sameSite: true,
		},
		secret: 'Put your secret key here',
		encrypt: {
			algorithm: 'aes-256-cbc',
		},
		storage: {
			driver: 'memory',
		},
		error: {
			name: 'BadScrfToken',
			statusMessage: 'Csrf Token Mismatch',
			message: 'Csrf: Invalid token provided',
			statusCode: 403,
		},
	},
	setup(options, nuxt) {
		if (!options.enabled) return

		const logger = useLogger(`nuxt:${configKey}`)
		const { resolve } = createResolver(import.meta.url)
		const runtimeDir = resolve('./runtime')
		const serverDir = resolve(runtimeDir, 'server')

		// Transpile and alias runtime
		nuxt.options.build.transpile.push(runtimeDir)

		// Add default options
		const { cookie } = options
		const runtime = nuxt.options.runtimeConfig
		runtime.public.uncsrf = defu(runtime.public.uncsrf, { cookie })

		delete options?.cookie
		runtime.uncsrf = defu(runtime.uncsrf, options)

		// Import server functions
		// addServerHandler({ handler: resolve(serverDir,'middleware'), middleware:true })
		addServerPlugin(resolve(serverDir, 'plugin'))
		addImportsDir(resolve(runtimeDir, 'composables'))

		logger.success('Uncsrf initialized')
	},
})
