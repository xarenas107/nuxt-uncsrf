import { importEncryptSecret } from './uncsrf'
import type { ModuleOptions } from '../../../types'

let secret: Awaited<ReturnType<typeof importEncryptSecret>>
export const useCsrfKey = async (options: ModuleOptions) => {
  const { encrypt } = options
	secret = secret ?? await importEncryptSecret(encrypt?.secret, encrypt?.algorithm)
	return secret
}
