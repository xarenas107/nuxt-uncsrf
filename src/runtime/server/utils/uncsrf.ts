import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from 'node:crypto'
import type { CipherCCMTypes, CipherOCBTypes, CipherGCMTypes } from 'node:crypto'

export interface Options {
  secret: EncryptSecret,
  algorithm: EncryptAlgorithm
}

type EncryptSecret = Buffer
type ImportEncryptSecret = (secret?: Buffer | string, algorithm?: EncryptAlgorithm) => Promise<EncryptSecret>
export type EncryptAlgorithm = CipherCCMTypes | CipherOCBTypes | CipherGCMTypes | string
type Create = (secret: string, options:Options) => Promise<string>
type Verify = (secret: string | undefined, token: string, options:Options) => Promise<boolean>

const algorithm: EncryptAlgorithm = 'aes-256-cbc'
const encoding = 'base64'
const input = 'utf8'

export const importEncryptSecret:ImportEncryptSecret = secret => {
	return Promise.resolve(Buffer.from(secret ?? randomBytes(22).toString(encoding)))
}

export const create:Create = (secret, encrypt) => {
	const iv = randomBytes(16)
	const cipher = createCipheriv(encrypt.algorithm || algorithm, Buffer.from(encrypt?.secret), iv)
	const encrypted = cipher.update(secret, input, encoding) + cipher.final(encoding)
	return Promise.resolve(`${iv.toString(encoding)}:${encrypted}`)
}

export const verify:Verify = (secret,token,encrypt) => {
	const [iv, encrypted] = token.split(':')
	if (!iv || !encrypted) return Promise.resolve(false)
	let decrypted:string

	try {
		const decipher = createDecipheriv(
			encrypt.algorithm || algorithm,
			Buffer.from(encrypt.secret),
			Buffer.from(iv, encoding),
		)
		decrypted = decipher.update(encrypted, encoding, input) + decipher.final(input)
	}
	catch { return Promise.resolve(false) }
	return Promise.resolve(decrypted === secret)
}

export const randomSecret = () => randomUUID()
