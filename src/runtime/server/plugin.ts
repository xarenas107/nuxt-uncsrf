
import { useRuntimeConfig, useStorage } from '#imports'
import { getRequestIP, setCookie } from 'h3'
import * as csrf from './utils/uncsrf'
import { useCsrfKey } from './utils/useCsrfKey'
import type { NitroApp,  StorageMounts } from 'nitropack'

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
  const { uncsrf } = useRuntimeConfig()
  const config = uncsrf.storage as StorageMounts[string] | string

  // Define storage
  if (typeof config !== 'string') {
    const storage = useStorage<Uncsrf>()
    const { default:driver } = await import(`unstorage/drivers/${uncsrf.storage.driver || "memory" }`)
    const keys = Object.keys(config)

    const options = keys.reduce((_options,key) => {
      if (key !== 'driver') _options[key] = config[key]
      return _options
    },{} as StorageMounts[string])

    storage.mount('uncsrf',driver(options))
  }

  nitro.hooks.hook('render:html', async (_, { event }) => {
    const name = typeof config === 'string' ? config : 'uncsrf'

		const storage = useStorage<Uncsrf>(name)
		const ip = getRequestIP(event,{ xForwardedFor:true }) ?? '::1'

    const now = Date.now()
    let item = await storage.getItem(ip)

    const endAt = (item?.uncsrf?.updatedAt || 0) + uncsrf.ttl
    if (!item?.uncsrf || endAt <= now) {
      item = item || {}
      item.uncsrf = {
        token: csrf.randomSecret(),
        updatedAt: now
      }
      await storage.setItem(ip,item)
    }

    const encrypt = {
      ...uncsrf.encrypt,
      secret: await useCsrfKey(uncsrf)
    }

    const token = await csrf.create(item?.uncsrf?.token, encrypt)
		setCookie(event,uncsrf.cookieKey,token,{
      secure: !import.meta.dev
    })
  })

})
