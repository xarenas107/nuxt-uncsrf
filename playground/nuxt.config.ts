export default defineNuxtConfig({
  modules: ['../src/module'],
  ssr:false,
  devtools: { enabled: true },
  imports: {
    autoImport: true,
  },
  nitro:{
    storage:{
      'dedicated':{
        driver:'memory',
      }
    }
  },
  uncsrf:{
    storage:'dedicated'
  }
})
