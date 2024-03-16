import { defineNuxtModule, useLogger, createResolver, addServerHandler, addServerPlugin, addImportsDir } from "@nuxt/kit"
import { defu } from 'defu'
import type { ModuleOptions } from './types'
export type * from './types'

const configKey = "uncsrf"

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: `@nuxt/${configKey}`,
    configKey
  },
  defaults: {
    ttl: 1000 * 60 * 60 * 24 * 7,
    cookie: {
      name:'x-csrf-token',
      path: '/',
      httpOnly: false,
      sameSite: true
    },
    secret:'Put your secret key here',
    encrypt: {
      algorithm:'aes-256-cbc'
    },
    storage: {
      driver:'memory'
    }
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
    runtime.public.uncsrf = defu(runtime.public.uncsrf,{ cookie: { name:options.cookie?.name } })

		// Import server functions
    addServerHandler({ handler: resolve(serverDir,'middleware'), middleware:true })
    addServerPlugin(resolve(serverDir,'plugin'))
    addImportsDir(resolve(runtimeDir,'composables'))

    logger.success('Uncsrf initialized')
  }
})
