import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto'
import type { CipherCCMTypes, CipherOCBTypes, CipherGCMTypes } from 'node:crypto'
import { setCookie, useRuntimeConfig, createError } from 'nuxt/server'

import type { RequestEvent } from 'nuxt/server'

export type EncryptAlgorithm = CipherCCMTypes | CipherOCBTypes | CipherGCMTypes | string
type Create = (event: RequestEvent, secret: string) => Promise<string | null>
type Verify = (secret: string, token: string) => Promise<boolean>
type Decrypt = (token: string) => Promise<string | undefined>

const encoding: BufferEncoding = 'hex'
const input: BufferEncoding = 'utf8'

const catchError = <T>(callback: () => T) => {
  try {
    return callback()
  }
  catch (error) {
    const err = error as Record<string, unknown>
    err.message = `Uncsrf: ${err.message}`
    throw createError(err)
  }
}

export const createCookie: Create = async (event, secret) => {
  const runtime = useRuntimeConfig()
  const { cookie } = runtime.public.uncsrf

  setCookie(event, cookie.name, secret, {
    secure: !import.meta.dev,
    ...cookie,
  })
  return secret
}

export const encrypt = (ip: string) => {
  const { uncsrf } = useRuntimeConfig()
  const secret = useHash(uncsrf.secret)

  return catchError(async () => {
    const iv = randomBytes(16)
    const cipher = createCipheriv(uncsrf.encrypt.algorithm, secret, iv)
    const encrypted = cipher.update(ip, input, encoding) + cipher.final(encoding)
    const token = `${iv.toString(encoding)}:${encrypted}`
    return token
  })
}

export const decrypt: Decrypt = async (token) => {
  const { uncsrf } = useRuntimeConfig()

  return catchError(() => {
    const [iv = '', encrypted = ''] = token.split(':')
    const secret = useHash(uncsrf.secret)
    const decipher = createDecipheriv(uncsrf.encrypt.algorithm, secret, Buffer.from(iv, encoding))
    return decipher.update(encrypted, encoding, input) + decipher.final(input)
  })
}

export const verify: Verify = async (secret, token) => {
  try {
    const [iv, encrypted] = token.split(':')
    if (!iv || !encrypted) return Promise.resolve(false)
    const decrypted = await decrypt(token)
    return decrypted === secret
  }
  catch { return false }
}

const useHash = (key: string) => {
  return createHash('sha256').update(key).digest('hex').substring(0, 32)
}
