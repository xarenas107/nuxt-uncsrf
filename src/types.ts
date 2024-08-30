import type { StorageMounts } from 'nitropack'
import type { NuxtError, CookieOptions } from 'nuxt/app'
import type { EncryptAlgorithm } from './runtime/server/utils/uncsrf'
import type { H3Error, HTTPMethod } from 'h3'

type Storage = StorageMounts[string] | keyof StorageMounts[string]

export interface ModuleOptions {
  ttl?:number
  cookie?:CookieOptions & { name?:string }
  secret?:string
  encrypt:{
    // secret?: Buffer
    algorithm?: EncryptAlgorithm
  },
	storage?: Storage
  error?: Pick<H3Error, 'cause' | 'data' | 'name' | 'statusMessage' | 'message' | 'statusCode'>
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
  uncsrf?: {
    name: string,
    path?: string,
    httpOnly?: boolean,
    sameSite?: boolean
  }
}
