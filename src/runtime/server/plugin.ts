
import { useRuntimeConfig } from '#imports'
import * as csrf from './utils/uncsrf'
import { getRouteRules, useStorage } from 'nitropack/runtime'
import type { NitroApp,  StorageMounts } from 'nitropack'
import { createError, getCookie, getRequestIP } from 'h3'

type NitroAppPlugin = (nitro: NitroApp) => void

interface Uncsrf {
  uncsrf?:{
    token:string,
    updatedAt:number
  }
}

function defineNitroPlugin(def: NitroAppPlugin): NitroAppPlugin {
  return def
}

export default defineNitroPlugin(async nitro => {
  const runtime = useRuntimeConfig()
  const { uncsrf } = runtime
  const config = uncsrf.storage as StorageMounts[string] | string

  // Define storage
  if (typeof config !== 'string') {
    const storage = useStorage<Uncsrf>()

    const name = uncsrf?.storage?.driver || "memory"
    const { default: driver } = await import(`unstorage/drivers/${name}`)
    const keys = Object.keys(config)

    const options = keys.reduce((opts,key) => {
      if (key !== 'driver') opts[key] = config[key]
      return opts
    }, <StorageMounts[string]>{})

    storage.mount('uncsrf', driver(options))
  }

  nitro.hooks.hook('request', async (event) => {
    const { uncsrf } = getRouteRules(event)
    if (uncsrf === false) return

    const { cookie } = runtime.public.uncsrf ?? {}
    const name = typeof config === 'string' ? config : 'uncsrf'

    const storage = useStorage<Uncsrf>(name)

    // Get client ip
    const ip =  getRequestIP(event,{ xForwardedFor:true }) || '127.0.0.1'
    event.context.clientAddress ??= ip

    const updatedAt = Date.now()

    const state = {
      value: await storage.getItem(ip) ?? {},
      save: false,
      valid: false,
      remove: false,
    }

    // Get token from request
    const token = getCookie(event, cookie.name) ?? ''
    const endAt = (state.value?.uncsrf?.updatedAt || 0) + (runtime.uncsrf.ttl || 0)
    const expired = runtime.uncsrf.ttl ? endAt <= updatedAt : false

    if (!state.value?.uncsrf || expired || !token) {
      state.value.uncsrf= { updatedAt, token }
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
          const data = await csrf.decrypt(event,token)

          if (data) {
            state.value = await storage.getItem(data) ?? {}
            state.value.uncsrf = { token, updatedAt }
            state.save = true

            const promises = [
              storage.removeItem(data),
              csrf.createCookie(event, token),
            ]

            await Promise.all(promises)
            state.valid = true
          }
        }

        if (!state.valid) throw createError(uncsrf?.error ?? runtime.uncsrf.error)
      }

    }

    if (state.save) {
      state.value.uncsrf.token = await csrf.encrypt(event, ip)
      await storage.setItem(ip, state.value)
    }

    nitro.hooks.hookOnce('render:html', async (_, { event }) => {
      if (!state.save) {
        const token = await csrf.encrypt(event, ip)
        state.value.uncsrf = { token, updatedAt }
        await storage.setItem(ip, state.value)
      }

      const { token = '' } = state.value.uncsrf ?? {}
      await csrf.createCookie(event, token)
    })
  })

})
