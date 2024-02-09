
import { useRuntimeConfig, useStorage } from '#imports'
import { getRequestIP, setCookie } from 'h3'
import * as csrf from './utils/uncsrf'
import { useCsrfKey } from './utils/useCsrfKey'
import type { NitroApp } from 'nitropack'

type NitroAppPlugin = (nitro: NitroApp) => void

function defineNitroPlugin(def: NitroAppPlugin): NitroAppPlugin {
  return def
}

// type Storage = Partial<StorageMounts[string]>

export default defineNitroPlugin(async nitro => {
  const { uncsrf } = useRuntimeConfig()

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
