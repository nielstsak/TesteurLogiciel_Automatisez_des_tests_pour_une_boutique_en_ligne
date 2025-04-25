const { defineConfig } = require("cypress");

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:8088/',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
  // video: false, // Optionnel : désactiver l'enregistrement vidéo
  // defaultCommandTimeout: 5000, // Optionnel : augmenter le timeout par défaut
  env: { 
     apiUrl: 'http://localhost:8081'
   }
});