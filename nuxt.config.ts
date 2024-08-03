// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ["@nuxt/ui", "nuxt-lodash", "@nuxt/fonts", "@pinia/nuxt"],
  devtools: { enabled: false },

  lodash: {
    prefix: "_",
    prefixSkip: ["string"],
    upperAfterPrefix: false,
    exclude: [],
    alias: [
      ["camelCase", "stringToCamelCase"], // => stringToCamelCase
      ["kebabCase", "stringToKebab"], // => stringToKebab
      ["isDate", "isLodashDate"], // => _isLodashDate
    ],
  },

  runtimeConfig: {
    public: {
      API_URL: process.env.API_URL || 'https://primetime-api.onrender.com/',
    },
  }
});