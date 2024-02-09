import { defineNuxtModule, useLogger, createResolver, addServerHandler, addServerPlugin, addImportsDir } from "@nuxt/kit"
import { defu } from 'defu'
import type { ModuleOptions } from './types'

export * from './types'

const configKey = "uncsrf"

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: '@nuxt/${configKey}',
    configKey
  },
  // Default configuration options of the Nuxt module
  defaults: {
    https: process.env.NODE_ENV === 'production',
    cookieKey: 'x-csrf-token',
		storage:{
			driver:'memory',
		},
    encrypt: {
      algorithm:'aes-256-cbc'
    },
  },
  setup (options, nuxt) {
    const logger = useLogger(`nuxt:${configKey}`)

    const { resolve } = createResolver(import.meta.url)
    const runtimeDir = resolve('./runtime')
    const serverDir = resolve(runtimeDir,'server')

    // Transpile and alias runtime
		nuxt.options.build.transpile.push(runtimeDir)

		// Add default options
		const runtime = nuxt.options.runtimeConfig
		runtime.uncsrf = defu(runtime.uncsrf,options)

		// Import server functions
    addServerHandler({ handler: resolve(serverDir,'middleware'), middleware:true })
    addServerPlugin(resolve(serverDir,'plugin'))
    addImportsDir(resolve(runtimeDir,'composables'))

    logger.success('Uncsrf initialized')
  }
})
