import type { StorageMounts } from 'nitropack'
import type { NuxtError } from 'nuxt/app'
import type { EncryptAlgorithm } from './runtime/server/utils/uncsrf'
import type { HTTPMethod } from 'h3'

type Storage = StorageMounts[string] | string

export interface ModuleOptions {
  ttl?:number
  cookieKey?: string
  encrypt:{
    secret?: Buffer
    algorithm?: EncryptAlgorithm
  },
	storage?: Storage
}

type CsrfRules = {
	methods?:HTTPMethod[]
	error?: NuxtError
} | false

declare module 'nitropack' {
	interface NitroRouteRules {
		uncsrf?:CsrfRules
	}
	interface NitroRouteConfig {
		uncsrf?:CsrfRules
	}
}

export interface ModuleRuntimeConfig {
  uncsrf?:ModuleOptions
}

export interface ModulePublicRuntimeConfig {
  uncsrf?:Pick<ModuleOptions,'cookieKey'>
}
