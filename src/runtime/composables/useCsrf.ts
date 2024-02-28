import { useNuxtApp, useCookie, useRuntimeConfig } from '#app'
import { getCookie } from 'h3'
import type { H3Event } from 'h3'

export function useCsrf() {
  const runtime = useRuntimeConfig()

  if (import.meta.server) {
		const app = useNuxtApp()
		const event = app.ssrContext?.event as H3Event
		const cookie = event ? getCookie(event,runtime.uncsrf?.cookie?.name) : null
		const csrf = cookie || null
    return { csrf }
  }

	const token = useCookie<string>(runtime.public.uncsrf?.cookie?.name)
  return { csrf:token.value || null }
}
