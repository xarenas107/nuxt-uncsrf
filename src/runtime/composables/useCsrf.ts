import { useNuxtApp, useCookie } from '#app'
import { getCookie } from 'h3'
import type { H3Event } from 'h3'

export function useCsrf() {
  if (import.meta.server) {
		const app = useNuxtApp()
		const event = app.ssrContext?.event as H3Event
		const cookie = event ? getCookie(event,'x-csrf-token') : ''
		const csrf = cookie || ''
    return { csrf }
  }

	const token = useCookie('x-csrf-token')
  return { csrf:token.value || '' }
}
