import { defineNuxtModule, useLogger, createResolver, addServerHandler, addRendererPlugin, addImportsDir, addTypeTemplate } from '@nuxt/kit'
import { defu } from 'defu'

import type { ModuleOptions } from './runtime/server/types'
import type { Nuxt } from '@nuxt/schema'

export type * from './runtime/server/types'
export type * from './runtime/types/augments'

const configKey = 'uncsrf'

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: `@nuxt/${configKey}`,
    configKey,
    compatibility: {
      nuxt: '>=4.7.0',
    },
  },
  defaults: {
    enabled: true,
    ttl: 1000 * 60 * 60 * 24 * 7,
    endpoint: '/_uncsrf',
    cookie: {
      name: 'x-csrf-token',
      path: '/',
      httpOnly: true,
      sameSite: true,
    },
    secret: process.env.NUXT_UNCSRF_SECRET,
    encrypt: {
      algorithm: 'aes-256-cbc',
    },
    storage: {
      driver: 'memory',
    },
    error: {
      name: 'BadScrfToken',
      status: 403,
      statusText: 'Csrf Token Mismatch',
      message: 'Csrf: Invalid token provided',
    },
  },
  setup(options, nuxt) {
    if (!options.enabled) return

    const logger = useLogger(`nuxt:${configKey}`)
    const { resolve } = createResolver(import.meta.url)
    const runtimeDir = resolve('./runtime')
    const serverDir = resolve(runtimeDir, 'server')

    if (!options.secret) {
      options.secret = 'Put your secret key here'
      logger.warn('No secret provided, csrf tokens can be forged. Set `uncsrf.secret` in `nuxt.config` or the `NUXT_UNCSRF_SECRET` environment variable.')
    }

    // Transpile and alias runtime
    nuxt.options.build.transpile.push(runtimeDir)

    // Add default options
    const { cookie, storage, endpoint } = options
    const runtime = nuxt.options.runtimeConfig
    runtime.public.uncsrf = defu(runtime.public.uncsrf, { cookie, endpoint })

    // Mount a dedicated KV storage when a driver config is given,
    addStorage(nuxt, options)

    delete options?.cookie
    delete options?.endpoint
    runtime.uncsrf = defu(runtime.uncsrf, {
      ...options,
      storage: typeof storage === 'string' ? storage : configKey,
    })

    addServerHandler({ route: '/**', middleware: true, handler: resolve(serverDir, 'middleware') })

    // Lets the client read the httpOnly token
    if (endpoint) {
      addServerHandler({ route: endpoint, method: 'get', handler: resolve(serverDir, 'token') })
    }
    addRendererPlugin(resolve(serverDir, 'plugin'))
    addImportsDir(resolve(runtimeDir, 'composables'))

    addTypeTemplate({
      filename: 'types/uncsrf.d.ts',
      getContents: () => {
        return `import '${resolve(runtimeDir, 'types/augments')}'\nexport {}\n`
      },
    }, { nitro: true, nuxt: true, node: true })

    logger.success('Csrf protection initialized')
  },
})

function addStorage(nuxt: Nuxt, options: ModuleOptions) {
  const { storage } = options
  if (!storage || typeof storage === 'string') return

  nuxt.hook('nitro:config', (config) => {
    config.kv ??= {}
    config.kv[configKey] ??= storage
  })
}
