import type { CookieOptions } from 'nuxt/app'
import type { NuxtErrorDetails } from 'nuxt/server'
import type { KVMount } from 'nitro/types'
import type { EncryptAlgorithm } from './utils/uncsrf'

export type { UncsrfRule } from '../types/augments'

type Cookie = CookieOptions & {
  name?: string
  path?: string
}

export type Storage = KVMount | string

export interface SecurityContext {
  uncsrf?: {
    token: string
    updatedAt?: number
  }
  [key: string]: unknown
}

export interface ModuleOptions {
  enabled: boolean
  ttl?: number
  cookie?: Cookie
  secret: string
  encrypt: {
    algorithm: EncryptAlgorithm
  }
  storage?: Storage
  error?: NuxtErrorDetails
}

export interface ModuleRuntimeConfig {
  uncsrf: Omit<ModuleOptions, 'cookie'>
}

export interface ModulePublicRuntimeConfig {
  uncsrf: {
    cookie: Cookie & { name: string }
  }
}
