# Nuxt Unscrf

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

My new Nuxt module for doing amazing things.

- [✨ &nbsp;Release Notes](/CHANGELOG.md)
<!-- - [🏀 Online playground](https://stackblitz.com/github/your-org/my-module?file=playground%2Fapp.vue) -->
<!-- - [📖 &nbsp;Documentation](https://example.com) -->
## 🚀 Features

- ⛰ **Nuxt 3 ready**
- 👌 **Zero config**: Configuration for common use cases
- ⚡ **Nitro ready**: Customizable nitro storage.
- ⚙️ **Auto import**: Provide auto import functions.
- 🦾 **Type strong**: Written in typescript

## 📦 Install

```bash
npm i @xarenas107/nuxt-uncsrf -D 
```

## 🦄 Usage

> Add `@xarenas107/nuxt-uncsrf` to the `modules` section of `nuxt.config.ts`.

```js
export default defineNuxtConfig({
  modules: [
    '@xarenas107/nuxt-uncsrf'
  ]
})
```

By default csrf protection is applied only for routes `/api`. All methods are protected, including `GET`, `HEAD` and `OPTIONS`. If you need more control, use nitro route rules.

Each browser gets a random identifier, stored encrypted in the `x-csrf-token` cookie when a page is rendered. Requests without a valid token are rejected with a `403`. Set `NUXT_UNCSRF_SECRET` or `uncsrf.secret` to your own secret.

> Use false to disable protection

```js
routeRules:{
  '/locale/**': {
    uncsrf: false,
  }
}
```

> Protect other routes, or only some methods

```js
routeRules:{
  '/form': {
    uncsrf: {},
  },
  '/api/**': {
    uncsrf: { methods: ['POST', 'PUT', 'PATCH', 'DELETE'] },
  }
}
```

> You can customize storage

```js
// define storage on `nuxt.config.ts`
export default defineNuxtConfig({
  uncsrf:{
    storage:{
      driver:'memory'
    }
  }
})
```

> Or use a previously defined storage'

```js
export default defineNuxtConfig({
  nitro:{
    kv:{
      'security':{
        driver:'memory',
      }
    }
  },
  uncsrf:{
    storage:'security'
  } 
})
```

### Limitations

- The token is only read from the cookie, so protection relies on `SameSite=Strict`. It does not cover attacks from sibling subdomains.
- Prerendered and cached pages (`cache`, `swr`, `isr`) do not issue tokens, a dynamic page has to be visited first.
- CORS preflight requests carry no cookies, so `OPTIONS` is rejected unless excluded with `methods`.
- An expired token is renewed once. Other requests sent at the same time with it can be rejected.
- Identifiers that are no longer used are not removed from storage automatically.

That's it! You can now use @nuxt/uncsrf in your Nuxt app ✨

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/@xarenas107/nuxt-uncsrf/latest.svg?style=flat&colorA=18181B&colorB=28CF8D
[npm-version-href]: https://npmjs.com/package/@xarenas107/nuxt-uncsrf

[npm-downloads-src]: https://img.shields.io/npm/dm/@xarenas107/nuxt-uncsrf.svg?style=flat&colorA=18181B&colorB=28CF8D
[npm-downloads-href]: https://npmjs.com/package/@xarenas107/nuxt-uncsrf

[license-src]: https://img.shields.io/npm/l/@xarenas107/nuxt-uncsrf.svg?style=flat&colorA=18181B&colorB=28CF8D
[license-href]: https://npmjs.com/package/@xarenas107/nuxt-uncsrf

[nuxt-src]: https://img.shields.io/badge/Nuxt-18181B?logo=nuxt.js
[nuxt-href]: https://nuxt.com
