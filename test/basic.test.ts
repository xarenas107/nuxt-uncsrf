import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { setup, $fetch, fetch } from '@nuxt/test-utils/e2e'
import type { HTTPMethod } from '#app'

// Module default: e2e tests run outside of Nuxt and cannot read its runtime config
const cookie = 'x-csrf-token'

describe('Csrf protection', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./fixtures/basic', import.meta.url)),
    dev: true,
    nuxtConfig: {
      test: true,
      uncsrf: {
        storage: 'dedicated',
      },
      compatibilityDate: 'latest',
      routeRules: {
        '/api/guarded': { uncsrf: { methods: ['GET'] } },
        '/api/open/**': { uncsrf: false },
        '/api/open/closed': { uncsrf: {} },
      },
    },
  })

  it('Token recieved', async () => {
    await $fetch('/', {
      onResponse: ({ response }) => {
        const cookies = response.headers.get('set-cookie')
        expect(cookies).contains(cookie)
      },
    })
  })

  it('Malformed token is replaced', async () => {
    const token = 'abc:def'
    const response = await fetch('/', {
      headers: { cookie: `${cookie}=${token}` },
    })
    expect(response.status).toBe(200)
    const cookies = response.headers.get('set-cookie')

    const value = '[0-9a-f]{32}%3A[0-9a-f]{96}'
    const regex = new RegExp(`${cookie}=${value};`)
    expect(cookies).toMatch(regex)
  })

  const getCookie = async () => {
    const response = await fetch('/')
    return response.headers.get('set-cookie')!.split(';')[0]!
  }

  it.each(['GET', 'HEAD', 'OPTIONS'])('%s api without token is rejected', async (method) => {
    const response = await fetch('/api/test', { method })
    expect(response.status).toBe(403)
  })

  const library = [
    ['POST', '/api/test'],
    ['PUT', '/api/test'],
    ['PATCH', '/api/test'],
    ['DELETE', '/api/test'],
    ['POST', '/api'],
    ['GET', '/api/guarded'],
    ['POST', '/api/open/closed'],
  ]

  it.each(library)('%s %s without token is rejected', async (method, path) => {
    const response = await fetch(path, { method })
    expect(response.status).toBe(403)
    expect(response.headers.get('set-cookie')).toBeNull()
  })

  const tokens = ['127.0.0.1', 'abc:def', 'invalid', `${'0'.repeat(32)}%3A${'0'.repeat(32)}`]
  it.each(tokens)('Api with forged token %s is rejected', async (token) => {
    // Ensure there is a stored record
    await getCookie()
    const response = await fetch('/api/test', {
      method: 'POST',
      headers: { cookie: `${cookie}=${token}` },
    })
    expect(response.status).toBe(403)
  })

  const methods: HTTPMethod[] = ['GET', 'POST']
  it.each(methods)('%s api with a valid token is accepted', async (method) => {
    const cookie = await getCookie()
    const headers = { cookie }
    const response = await $fetch('/api/test', { method, headers })
    expect(response).toBe('ok')
  })

  it.each(library)('%s %s with a valid token is accepted', async (method, path) => {
    const cookie = await getCookie()
    const response = await fetch(path, { method, headers: { cookie } })
    expect(response.status).toBe(200)
  })

  it('Each client keeps its own token', async () => {
    const first = await getCookie()
    const second = await getCookie()
    expect(first).not.toBe(second)

    for (const token of [first, second]) {
      const response = await fetch('/api/test', { method: 'POST', headers: { cookie: token } })
      expect(response.status).toBe(200)
    }
  })

  it('Valid token is kept by a page visit', async () => {
    const token = await getCookie()
    const response = await fetch('/', { headers: { cookie: token } })
    expect(response.headers.get('set-cookie')).toContain(token)
  })

  it('Koken is kept when the client ip changes', async () => {
    const response = await fetch('/api/test', {
      method: 'POST',
      headers: { 'cookie': await getCookie(), 'x-forwarded-for': '10.0.0.1' },
    })
    expect(response.status).toBe(200)
    expect(response.headers.get('set-cookie')).toBeNull()
  })

  const endpoints = ['/%61pi/test', '//api/test', '/API/test', '/x/../api/test', '/api%2Ftest']
  it.each(endpoints)('%s does not reach the api without token', async (path) => {
    const response = await fetch(path, { method: 'POST' })
    // Either rejected, or not routed to the api at all (e.g. rendered as a page)
    expect(await response.text()).not.toBe('ok')
  })

  it('First visit can use the token while rendering', async () => {
    const html = await $fetch<string>('/')
    expect(html).toMatch(/id="csrf">[0-9a-f]{32}:[0-9a-f]{96}</)
    expect(html).toContain('id="data">ok<')
  })

  it('Endpoint returns the token of the cookie', async () => {
    const cookie = await getCookie()
    const response = await fetch('/_uncsrf', { headers: { cookie } })
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(response.headers.get('set-cookie')).toBeNull()

    const { token } = await response.json()
    expect(cookie).toBe(`x-csrf-token=${encodeURIComponent(token)}`)
  })

  it.each(['', `${'0'.repeat(32)}%3A${'0'.repeat(32)}`])('Endpoint issues a token for cookie "%s"', async (token) => {
    const response = await fetch('/_uncsrf', { headers: { cookie: `${cookie}=${token}` } })
    const { token: issued } = await response.json()
    expect(issued).toMatch(/^[0-9a-f]{32}:[0-9a-f]{96}$/)
    expect(response.headers.get('set-cookie')).toContain(`${cookie}=${encodeURIComponent(issued)}`)

    const api = await fetch('/api/test', { method: 'POST', headers: { cookie: `${cookie}=${encodeURIComponent(issued)}` } })
    expect(api.status).toBe(200)
  })

  it('Endpoint only answers GET', async () => {
    const response = await fetch('/_uncsrf', { method: 'POST' })
    expect(response.headers.get('content-type')).not.toContain('json')
  })
})
