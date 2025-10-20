// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@nuxt/eslint',
    '@nuxt/test-utils',
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt'
  ],

  runtimeConfig: {
    public: {
      nodeMode: process.env.NUXT_PUBLIC_NODE_MODE || 'capture-point',
      adminUrl: process.env.NUXT_PUBLIC_ADMIN_URL || ''
    }
  },

  nitro: {
    experimental: {
      websocket: true
    }
  },

  app: {
    head: {
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no' }
      ]
    }
  }
})