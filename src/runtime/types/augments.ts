import type { ServerHandlerMethod } from 'nuxt/schema'
import type { NuxtErrorDetails } from 'nuxt/server'
import type { SecurityContext } from '../server/types'

export type UncsrfRule = {
  enabled?: boolean
  methods?: ServerHandlerMethod[]
  error?: NuxtErrorDetails
} | false

declare module 'nuxt/schema' {
  interface AppRouteRulesExtensions {
    uncsrf?: UncsrfRule
  }

  interface RouteRuleConfigExtensions {
    uncsrf?: UncsrfRule
  }

  interface RequestEventContext {
    security?: SecurityContext
  }
}

declare module 'h3' {
  interface H3EventContext {
    security?: SecurityContext
  }
}

export {}
