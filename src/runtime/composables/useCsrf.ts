import { useCookie, useRuntimeConfig } from '#app'

export function useCsrf() {
  const runtime = useRuntimeConfig()
  const { cookie } = runtime.public.uncsrf ?? {}

	const token = useCookie<string>(cookie?.name)
  return { csrf: token.value || null }
}
