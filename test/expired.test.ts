import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { setup, fetch } from '@nuxt/test-utils/e2e'

describe('Csrf token expiration', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./fixtures/basic', import.meta.url)),
    dev: true,
    nuxtConfig: {
      uncsrf: {
        ttl: 1,
      },

      compatibilityDate: 'latest',
    },
  })

  it('Expired token is renewed', async () => {
    const page = await fetch('/')
    const cookie = page.headers.get('set-cookie')!.split(';')[0]!
    await new Promise(resolve => setTimeout(resolve, 20))

    const response = await fetch('/api/test', { method: 'POST', headers: { cookie } })
    expect(response.status).toBe(200)
    const cookies = response.headers.get('set-cookie')
    expect(cookies).toContain('x-csrf-token=')
    expect(cookies).not.toContain(cookie)

    const renewed = await fetch('/', { headers: { cookie } })
    expect(renewed.status).toBe(200)
    expect(renewed.headers.get('set-cookie')).not.toContain(cookie)
  })

  it('Replaced token is rejected', async () => {
    const page = await fetch('/')
    const cookie = page.headers.get('set-cookie')!.split(';')[0]!
    await new Promise(resolve => setTimeout(resolve, 20))

    await fetch('/api/test', { method: 'POST', headers: { cookie } })
    const response = await fetch('/api/test', { method: 'POST', headers: { cookie } })
    expect(response.status).toBe(403)
    expect(response.headers.get('set-cookie')).toBeNull()
  })

  it.each(['', 'abc:def', `${'0'.repeat(32)}%3A${'0'.repeat(32)}`])('Forged token "%s" is rejected and not renewed', async (token) => {
    const response = await fetch('/api/test', { method: 'POST', headers: { cookie: `x-csrf-token=${token}` } })
    expect(response.status).toBe(403)
    expect(response.headers.get('set-cookie')).toBeNull()
  })
})
