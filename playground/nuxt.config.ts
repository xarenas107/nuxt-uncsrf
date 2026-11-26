export default defineNuxtConfig({
  modules: ['../src/module'],
  imports: {
    autoImport: true,
  },
  devtools: { enabled: false },
  compatibilityDate: 'latest',
  nitro: {
    kv: {
      dedicated: {
        driver: 'fs',
        base: './playground/.db',
      },
    },
  },
  uncsrf: {
    storage: 'dedicated',
    cookie: {
      httpOnly: false,
    },
  },
})
