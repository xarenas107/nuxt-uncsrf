import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto'
import { setCookie, useRuntimeConfig } from 'nuxt/server'
import catchError from './catch-error'

import type { CipherCCMTypes, CipherOCBTypes, CipherGCMTypes } from 'node:crypto'
import type { RequestEvent } from 'nuxt/server'

export type EncryptAlgorithm = CipherCCMTypes | CipherOCBTypes | CipherGCMTypes | string
type Create = (event: RequestEvent, secret: string) => Promise<string | null>
type Decrypt = (token: string) => Promise<string | undefined>

const encoding: BufferEncoding = 'hex'
const input: BufferEncoding = 'utf8'

export const createCookie: Create = async (event, secret) => {
  const runtime = useRuntimeConfig()
  const { cookie } = runtime.public.uncsrf

  setCookie(event, cookie.name, secret, {
    secure: !import.meta.dev,
    ...cookie,
  })
  return secret
}

export const encrypt = (id: string) => {
  const { uncsrf } = useRuntimeConfig()

  return catchError(async () => {
    const secret = useHash(uncsrf.secret)
    const iv = randomBytes(16)
    const cipher = createCipheriv(uncsrf.encrypt.algorithm, secret, iv)
    const encrypted = cipher.update(id, input, encoding) + cipher.final(encoding)
    const token = `${iv.toString(encoding)}:${encrypted}`
    return token
  }, 403)
}

export const decrypt: Decrypt = async (token) => {
  const { uncsrf } = useRuntimeConfig()

  return catchError(() => {
    const [iv = '', encrypted = ''] = token.split(':')
    const secret = useHash(uncsrf.secret)
    const decipher = createDecipheriv(uncsrf.encrypt.algorithm, secret, Buffer.from(iv, encoding))
    return decipher.update(encrypted, encoding, input) + decipher.final(input)
  }, 403)
}

const useHash = (key: string) => {
  return createHash('sha256').update(key).digest('hex').substring(0, 32)
}
