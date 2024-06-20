import { describe, it, expect } from 'vitest'
import { fileURLToPath } from 'node:url'
import { setup, $fetch } from '@nuxt/test-utils/e2e'

describe('csrf protection', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./fixtures/basic', import.meta.url)),
    dev: true,
    nuxtConfig: {
      test:true
    }
  })

  it('token recieved', async () => {
    await $fetch('/',{
      onResponse: ({ response }) => {
        const cookies = response.headers.get('set-cookie')
        expect(cookies).contain('x-csrf-token')
      }
    })
  })

})
