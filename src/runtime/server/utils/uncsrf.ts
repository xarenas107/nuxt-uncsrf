import { createCipheriv, createDecipheriv, randomBytes, randomUUID, createHash } from 'node:crypto'
import { useRuntimeConfig, createError } from '#imports'
import { setCookie } from 'h3'
import type { CipherCCMTypes, CipherOCBTypes, CipherGCMTypes, Encoding } from 'node:crypto'
import type { H3Event } from 'h3'
export interface Options {
  algorithm: EncryptAlgorithm
}

export type EncryptAlgorithm = CipherCCMTypes | CipherOCBTypes | CipherGCMTypes | string
type Create = (event:H3Event,secret: string) => Promise<string | null>
type Verify = (event:H3Event,secret: string, token: string) => Promise<boolean>
type Decrypt = (event:H3Event, token: string) => Promise<string | null>

const encoding:BufferEncoding = 'hex'
const input:Encoding = 'utf8'

const catchError = <T>(callback:() => T) => {
  try { return callback() }
  catch(error) {
    const err = error as Record<string,unknown>
    err.message = `Uncsrf: ${err.message}`
    createError(err)
    return null
  }
}

export const create:Create = async (event,secret) => {
  const { uncsrf } = useRuntimeConfig(event)
  setCookie(event,uncsrf.cookie.name,secret,{
    secure: !import.meta.dev,
    ...uncsrf.cookie
  })
  return secret
}

export const encrypt = (event:H3Event,ip:string) => {
  const { uncsrf } = useRuntimeConfig(event)
  const secret = useHash(uncsrf.secret)

  return catchError(async () => {
    const iv = randomBytes(16)
    const cipher = createCipheriv(uncsrf.encrypt.algorithm, secret, iv)
    const encrypted = cipher.update(ip, input, encoding) + cipher.final(encoding)
    const token = `${iv.toString(encoding)}:${ encrypted }`
    await create(event,token)
    return token
  })
}

export const decrypt:Decrypt = async (event,token) => {
  const { uncsrf } = useRuntimeConfig(event)

  return catchError(() => {
    const [iv, encrypted] = token.split(':')
    const secret = useHash(uncsrf.secret)
    const decipher = createDecipheriv(uncsrf.encrypt.algorithm,secret, Buffer.from(iv, encoding))
    return decipher.update(encrypted, encoding, input) + decipher.final(input)
  })
}

export const verify:Verify = async (event,secret,token) => {
  try {
    const [iv, encrypted] = token.split(':')
    if (!iv || !encrypted) return Promise.resolve(false)
		const decrypted = await decrypt(event,token)
    return decrypted === secret
	}
	catch { return false }
}

const useHash = (key:string) => createHash('sha256').update(key).digest('hex').substring(0, 32)

export const randomSecret = () => randomUUID()

