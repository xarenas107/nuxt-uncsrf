import { randomUUID } from 'node:crypto'
import { useRuntimeConfig } from 'nuxt/server'
import { useKV } from 'nitro/kv'
import { createCookie, decrypt, encrypt } from './uncsrf'

import type { RequestEvent } from 'nuxt/server'
import type { SecurityContext } from '../types'

interface Session {
  id: string
  item: SecurityContext
  expired: boolean
}

function useStorage() {
  const { uncsrf } = useRuntimeConfig()
  return useKV<SecurityContext>(uncsrf.storage)
}

async function resolve(token?: string) {
  if (!token) return null

  const id = await decrypt(token)
  if (!id) return null

  const storage = useStorage()
  const item = await storage.getItem<SecurityContext>(id)
  if (item?.uncsrf?.token !== token) return null

  const runtime = useRuntimeConfig()
  const { ttl } = runtime.uncsrf

  const { updatedAt = 0 } = item.uncsrf
  const expired = !!ttl && updatedAt + ttl <= Date.now()
  return { id, item, expired }
}

async function issue(event: RequestEvent, previous?: Session | null) {
  const storage = useStorage()
  if (previous) await storage.removeItem(previous.id)

  const id = randomUUID()
  const token = await encrypt(id)

  const updatedAt = Date.now()
  const uncsrf = { token, updatedAt }
  const record: SecurityContext = { ...previous?.item, uncsrf }

  await storage.setItem(id, record)
  await createCookie(event, token)
  event.context.security = record
}

export default { issue, resolve }
