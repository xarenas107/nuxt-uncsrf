export default defineNuxtConfig({
  compatibilityDate: '2024-08-29',
  modules: ['../src/module'],
  ssr: false,
  devtools: { enabled: true },
  imports: {
    autoImport: true,
  },
  nitro:{
    storage:{
      'dedicated':{
        driver:'fs',
        base: './playground/db'
      }
    }
  },

  uncsrf:{
    storage:'dedicated'
  },
})
