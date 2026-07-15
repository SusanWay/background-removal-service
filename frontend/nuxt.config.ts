export default defineNuxtConfig({
  compatibilityDate: "2026-07-15",

  devtools: {
    enabled: true,
  },

  modules: [
    "@pinia/nuxt",
  ],

  css: [
    "modern-normalize/modern-normalize.css",
    "~/assets/scss/main.scss",
  ],

  runtimeConfig: {
    grpcAddress: process.env.NUXT_GRPC_ADDRESS ?? "127.0.0.1:50051",
  },
});