import { useNuxtApp, useRequestEvent, useRuntimeConfig, useState } from '#app'

type Response = { token: string | null }

export function useCsrf() {
  const runtime = useRuntimeConfig()
  const { endpoint } = runtime.public.uncsrf
  const token = useState<string | null>('uncsrf:token', () => null)

  // Server side: the token issued for this request, transferred to the client in the payload
  if (import.meta.server) {
    const event = useRequestEvent()
    token.value ??= event?.context.security?.uncsrf?.token ?? null
  }

  // Client side: the cookie is httpOnly, ask the server for it
  const refresh = async () => {
    if (!endpoint) return token.value
    const nuxtApp = useNuxtApp()
    nuxtApp._uncsrf ??= $fetch<Response>(endpoint, { credentials: 'same-origin' })
      .then(response => token.value = response.token)
      .finally(() => nuxtApp._uncsrf = undefined)
    return nuxtApp._uncsrf
  }

  if (import.meta.client && !token.value) refresh()

  return { token, refresh }
}

declare module '#app' {
  interface NuxtApp {
    _uncsrf?: Promise<string | null>
  }
}
