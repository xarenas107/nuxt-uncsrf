
import { useRuntimeConfig, useStorage } from '#imports'
import { getRequestIP, setCookie } from 'h3'
import * as csrf from './utils/uncsrf'
import { useCsrfKey } from './utils/useCsrfKey'
import type { NitroApp,  StorageMounts } from 'nitropack'

type NitroAppPlugin = (nitro: NitroApp) => void

function defineNitroPlugin(def: NitroAppPlugin): NitroAppPlugin {
  return def
}

export default defineNitroPlugin(async nitro => {
  const { uncsrf } = useRuntimeConfig()

  // Define storage
  const storage = useStorage()
  const { default:driver } = await import(`unstorage/drivers/${uncsrf.storage.driver || "memory" }`)
  const config = uncsrf.storage as StorageMounts[string]
  const keys = Object.keys(config)

  const options = keys.reduce((_options,key) => {
    if (key !== 'driver') _options[key] = config[key]
    return _options
  },{} as StorageMounts[string])

  storage.mount('uncsrf',driver(options))

  nitro.hooks.hook('render:html', async (_, { event }) => {
		const storage = useStorage('uncsrf')
		const ip = getRequestIP(event,{ xForwardedFor:true }) ?? '::1'

    const exist = await storage.hasItem(ip)
    if (!exist) await storage.setItem(ip,csrf.randomSecret())
		const secret = await storage.getItem(ip) as string

    const encrypt = {
      ...uncsrf.encrypt,
      secret: await useCsrfKey(uncsrf)
    }

    const token = await csrf.create(secret, encrypt)
		setCookie(event,uncsrf.cookieKey,token)
  })

})
