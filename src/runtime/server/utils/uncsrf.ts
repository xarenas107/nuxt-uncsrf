import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from 'node:crypto'
import { useRuntimeConfig, createError } from '#imports'
import { setCookie } from 'h3'
import type { CipherCCMTypes, CipherOCBTypes, CipherGCMTypes, Encoding } from 'node:crypto'
import type { H3Event } from 'h3'
export interface Options {
  secret: EncryptSecret,
  algorithm: EncryptAlgorithm
}

type EncryptSecret = Buffer
type ImportEncryptSecret = (secret?: Buffer | string, algorithm?: EncryptAlgorithm) => Promise<EncryptSecret>
export type EncryptAlgorithm = CipherCCMTypes | CipherOCBTypes | CipherGCMTypes | string
type Create = (event:H3Event,secret: string, options:Options) => Promise<string>
type Verify = (secret: string | undefined, token: string, options:Options) => Promise<boolean>
type Decrypt = (token: string, options:Options) => Promise<string>
type SetCookie = (event: H3Event, token:string) => void

const encoding:BufferEncoding = 'base64'
const input:Encoding = 'utf8'

export const importEncryptSecret:ImportEncryptSecret = secret => {
	return Promise.resolve(Buffer.from(secret ?? randomBytes(22).toString(encoding)))
}

export const create:Create = async (event,secret, encrypt) => {
	const iv = randomBytes(16)

  try {
    const cipher = createCipheriv(encrypt.algorithm, Buffer.from(encrypt?.secret), iv)
    const encrypted = cipher.update(secret, input, encoding) + cipher.final(encoding)
    const token = `${iv.toString(encoding)}:${encrypted}`
    createCookie(event,token)
    return token
  }
  catch(error:any) {
    throw createError(error)
  }
}

export const decrypt:Decrypt = async (token,encrypt) => {
  const [iv, encrypted] = token.split(':')
  const decipher = createDecipheriv(
    encrypt.algorithm,
    Buffer.from(encrypt.secret),
    Buffer.from(iv, encoding),
  )

  try {
    return decipher.update(encrypted, encoding, input) + decipher.final(input)
  }
  catch(error:any) {
    throw createError(error)
  }
}

export const verify:Verify = (secret,token,encrypt) => {
	const [iv, encrypted] = token.split(':')
	if (!iv || !encrypted) return Promise.resolve(false)
	let decrypted:string

	try {
		const decipher = createDecipheriv(
			encrypt.algorithm,
			Buffer.from(encrypt.secret),
			Buffer.from(iv, encoding),
		)
		decrypted = decipher.update(encrypted, encoding, input) + decipher.final(input)
	}
	catch { return Promise.resolve(false) }
	return Promise.resolve(decrypted === secret)
}

const key = 'vOVH6sdmpNWjRRIqCc7rdxs01lwHzfr3'
export const encryptToken = (ip:string) => {
  const iv = randomBytes(16)
	const cipher = createCipheriv('aes-256-ctr', key, iv)
	const encrypted = cipher.update(ip, input, 'hex') + cipher.final('hex')
	return `${iv.toString('hex')}:${encrypted}`
}
export const decryptToken = (token:string) => {
  const [iv, encrypted] = token.split(':')
  const decipher = createDecipheriv('aes-256-ctr',key, Buffer.from(iv, 'hex'))
  return decipher.update(encrypted, 'hex', input) + decipher.final(input)
}
export const randomSecret = () => randomUUID()


const createCookie:SetCookie = (event,token) => {
  const runtime = useRuntimeConfig(event)
  return setCookie(event,runtime.uncsrf.cookieKey,token,{
    secure: !import.meta.dev
  })
}
