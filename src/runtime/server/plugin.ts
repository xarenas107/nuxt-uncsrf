
import { useRuntimeConfig, createError } from '#imports'
import { getRequestIP, setCookie } from 'h3'
import * as csrf from './utils/uncsrf'
import { useCsrfKey } from './utils/useCsrfKey'

import type { StorageMounts } from 'nitropack'
type Storage = Partial<StorageMounts[string]>

export default defineNitroPlugin(async nitro => {
  const { uncsrf } = useRuntimeConfig()

	const storage = useStorage()
	const { default:driver } = await import(`unstorage/drivers/${ uncsrf?.storage?.driver || 'memory' }`)
	if (!driver) throw createError('Must provide an unstorage valid driver for csrf storage')

	const options:Storage = { ...uncsrf?.storage }
	delete options.driver
	storage.mount('uncsrf', driver(options))

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
		setCookie(event,'x-csrf-token',token)
  })

})
