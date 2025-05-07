// cypress/e2e/smoke.cy.js

describe('Smoke Tests - Application EcoBlissBath', () => {
    let userData;
  
    before(() => {
      // Charger les données utilisateur une seule fois pour tous les tests de ce bloc
      cy.fixture('user').then((data) => {
        userData = data;
      });
    });
  
    // Section 1: Tests de Disponibilité de l'Application
    // Ces tests vérifient que les pages principales se chargent correctement.
    describe('Disponibilité des Pages Principales', () => {
      it('Devrait charger la page d\'accueil et afficher les produits', () => {
        cy.visit('/#/');
        cy.url().should('include', '/#/');
        cy.get('[data-cy="product-link"]').should('be.visible');
        cy.get('header').should('be.visible');
        cy.get('footer').should('be.visible');
      });
  
      it('Devrait charger une page produit', () => {
        const productId = 1; // Assumer que le produit avec ID 1 existe
        cy.visit(`/#/products/${productId}`);
        cy.url().should('include', `/#/products/${productId}`);
        cy.get('[data-cy="detail-product-add"]').should('be.visible');
        cy.get('[data-cy="detail-product-name"]').should('not.be.empty');
      });
  
      it('Devrait charger la page du panier (vide initialement)', () => {
        cy.visit('/#/cart');
        cy.url().should('include', '/#/cart');
        cy.get('[data-cy="cart-empty"]').should('be.visible');
      });
  
      it('Devrait charger la page de connexion', () => {
        cy.visit('/#/login');
        cy.url().should('include', '/#/login');
        cy.get('[data-cy="login-submit"]').should('be.visible');
        cy.get('[data-cy="login-input-username"]').should('be.visible');
        cy.get('[data-cy="login-input-password"]').should('be.visible');
      });
  
      it('Devrait charger la page d\'inscription', () => {
        cy.visit('/#/register');
        cy.url().should('include', '/#/register');
        cy.get('[data-cy="register-submit"]').should('be.visible');
      });
  
      it('Devrait charger la page des avis', () => {
        cy.visit('/#/reviews');
        cy.url().should('include', '/#/reviews');
        // Vérifier un élément spécifique à la page des avis, par exemple le formulaire si non connecté
        // ou la liste des avis
        cy.contains("Votre avis").should('be.visible');
      });
  
      it('Devrait obtenir une réponse réussie de l\'API des produits', () => {
        cy.request('GET', 'http://localhost:8081/products')
          .its('status')
          .should('eq', 200);
      });
  
      it('Devrait gérer les routes inexistantes en redirigeant vers l\'accueil', () => {
        cy.visit('/#/non-existent-page-for-smoke-test', { failOnStatusCode: false });
        cy.url().should('match', /\/#\/$/); // Redirection vers la racine (/#/)
        cy.get('[data-cy="product-link"]').should('be.visible');
      });
    });
  
    // Section 2: Tests de Caractères Spéciaux et Limites de Caractères
    describe('Validation des Champs de Saisie (Caractères Spéciaux et Limites)', () => {
      const specialCharsPayloads = [
        { name: 'guillemets simples', value: "test'test", testXSS: false },
        { name: 'guillemets doubles', value: 'test"test', testXSS: false },
        { name: 'chevrons simples', value: '<test>', testXSS: true, xssOutcome: '&lt;test&gt;' },
        { name: 'script tags', value: "<script>document.title='XSSedSmoke'</script>", testXSS: true, xssOutcome: '&lt;script&gt;document.title=\'XSSedSmoke\'&lt;/script&gt;' },
        { name: 'balise img avec onerror', value: '<img src=x onerror="document.title=\'XSSedImgSmoke\'">', testXSS: true, xssOutcome: '&lt;img src=x onerror="document.title=\'XSSedImgSmoke\'"&gt;' },
        { name: 'barres obliques', value: '/\\test/\\', testXSS: false },
        { name: 'caractères divers', value: '!@#$%^&*()_+-=[]{};:,./<>?`~', testXSS: false },
        { name: 'emojis', value: '😊🚀👍', testXSS: false },
        { name: 'chaîne vide', value: '', testXSS: false }, // Pour les champs non requis ou pour vérifier le comportement
      ];
  
      const longString260 = 'a'.repeat(260); // Chaîne de 260 caractères 'a'
      const longString1050 = 'b'.repeat(1050); // Chaîne de 1050 caractères 'b'

      function testInputField(fieldSelector, submitSelector, pageUrl, initialActions, testPayload, expectedBehavior, xssOutcomeIfSanitized) {
        cy.visit(pageUrl);
        if (initialActions) initialActions();
  
        cy.get(fieldSelector).clear().type(testPayload.value, { delay: 0 }); // delay: 0 pour accélérer la saisie longue
        if (submitSelector) { // Certains champs n'ont pas de soumission directe
          cy.get(submitSelector).click();
        }
  
        if (expectedBehavior === 'error') {
          // Vérifier la présence d'une classe d'erreur ou d'un message d'erreur spécifique

          // Pour cet exemple générique, on peut vérifier que l'URL n'a pas changé si la soumission devait échouer
          if (submitSelector) cy.url().should('include', pageUrl); 
          cy.log(`Test pour "${testPayload.name}" avec valeur "${testPayload.value}" attendu : ERREUR`);
        } else if (expectedBehavior === 'accept') {
          // La valeur est acceptée, vérifier qu'elle est bien là ou que la navigation a réussi
          cy.log(`Test pour "${testPayload.name}" avec valeur "${testPayload.value}" attendu : ACCEPTE`);
        } else if (expectedBehavior === 'sanitize') {
          // La valeur est acceptée mais doit être sanitizée.
          cy.log(`Test pour "${testPayload.name}" avec valeur "${testPayload.value}" attendu : SANITIZE`);
        } else if (expectedBehavior === 'noXSSExecution') {
          cy.log(`Test XSS pour "${testPayload.name}" avec payload "${testPayload.value}"`);
          // Vérifier que le titre du document n'a pas été modifié par un XSS
          if (testPayload.value.includes("document.title='XSSedSmoke'")) {
            cy.title().should('not.eq', 'XSSedSmoke');
          }
          if (testPayload.value.includes("document.title='XSSedImgSmoke'")) {
            cy.title().should('not.eq', 'XSSedImgSmoke');
          }
        }
      }
  
      describe('Formulaire de Connexion', () => {
        const pageUrl = '/#/login';
        const usernameField = '[data-cy="login-input-username"]';
        const passwordField = '[data-cy="login-input-password"]';
        const submitBtn = '[data-cy="login-submit"]';
  
        specialCharsPayloads.forEach(payload => {
          if (payload.value === '') return; // Le champ email est requis
          it(`Champ Email - devrait gérer "${payload.name}"`, () => {
            testInputField(usernameField, submitBtn, pageUrl, () => cy.get(passwordField).type(userData.password), payload, payload.testXSS ? 'noXSSExecution' : 'error', payload.xssOutcome);
          });
        });
        it('Champ Email - devrait gérer une chaîne longue', () => {
          testInputField(usernameField, submitBtn, pageUrl, () => cy.get(passwordField).type(userData.password), { name: 'long string', value: longString260 }, 'error'); // Attend une erreur de validation email ou backend
        });
  


        [{ name: 'guillemets simples', value: "pass'word" }, { name: 'guillemets doubles', value: 'pass"word' }, { name: 'caractères divers', value: '$pec!@lPass' }].forEach(payload => {
          it(`Champ Mot de Passe - devrait gérer "${payload.name}"`, () => {
            testInputField(passwordField, submitBtn, pageUrl, () => cy.get(usernameField).type(userData.email), payload, 'error'); // Attend une erreur si le mdp est incorrect
          });
        });
        it('Champ Mot de Passe - devrait gérer une chaîne longue', () => {
          testInputField(passwordField, submitBtn, pageUrl, () => cy.get(usernameField).type(userData.email), { name: 'long string', value: longString260 }, 'error'); // Attend une erreur si le mdp est incorrect
        });
      });
  
      describe('Formulaire d\'Inscription', () => {
        const pageUrl = '/#/register';
        const fields = [
          { name: 'Nom', selector: '[data-cy="register-input-lastname"]', required: true },
          { name: 'Prénom', selector: '[data-cy="register-input-firstname"]', required: true },
          { name: 'Email', selector: '[data-cy="register-input-email"]', required: true, isEmail: true },
          { name: 'Mot de passe', selector: '[data-cy="register-input-password"]', required: true, isPassword: true },
          // Le champ confirmation est testé par sa logique de correspondance, pas directement par des caractères spéciaux ici.
        ];
        const submitBtn = '[data-cy="register-submit"]';
  
        fields.forEach(field => {
          specialCharsPayloads.forEach(payload => {
            if (payload.value === '' && field.required) return;
            // Pour les champs email, certains caractères spéciaux mèneront toujours à une erreur de format
            const expected = (field.isEmail && (payload.value.includes('<') || payload.value.includes('"'))) ? 'error' : (payload.testXSS ? 'noXSSExecution' : 'error'); // 'error' car la soumission échouera si les autres champs ne sont pas valides
  
            it(`Champ ${field.name} - devrait gérer "${payload.name}"`, () => {
              testInputField(field.selector, submitBtn, pageUrl, () => {
                // Remplir les autres champs avec des données valides pour isoler le test du champ actuel
                if (field.selector !== '[data-cy="register-input-lastname"]') cy.get('[data-cy="register-input-lastname"]').type(userData.lastname);
                if (field.selector !== '[data-cy="register-input-firstname"]') cy.get('[data-cy="register-input-firstname"]').type(userData.firstname);
                if (field.selector !== '[data-cy="register-input-email"]') cy.get('[data-cy="register-input-email"]').type(`test${Date.now()}@example.com`);
                if (field.selector !== '[data-cy="register-input-password"]') {
                  cy.get('[data-cy="register-input-password"]').type(userData.password);
                  cy.get('[data-cy="register-input-password-confirm"]').type(userData.password);
                } else {
                   cy.get('[data-cy="register-input-password-confirm"]').type(payload.value); // S'assurer que la confirmation correspond si on teste le mdp
                }
              }, payload, expected, payload.xssOutcome);
            });
          });
          it(`Champ ${field.name} - devrait gérer une chaîne longue (260 caractères)`, () => {
            testInputField(field.selector, submitBtn, pageUrl, () => { /* ... */ }, { name: 'long string 260', value: longString260 }, 'error'); // La soumission échouera à cause d'autres champs ou de la validation globale
          });
           it(`Champ ${field.name} - devrait gérer une chaîne très longue (1050 caractères)`, () => {
            testInputField(field.selector, submitBtn, pageUrl, () => { /* ... */ }, { name: 'long string 1050', value: longString1050 }, 'error');
          });
        });
      });
  
      describe('Formulaire d\'Avis (nécessite connexion)', () => {
        const pageUrl = '/#/reviews';
        const titleField = '[data-cy="review-input-title"]';
        const commentField = '[data-cy="review-input-comment"]';
        const submitBtn = '[data-cy="review-submit"]';
  
        beforeEach(() => {
          // Connexion via API pour plus de rapidité et de fiabilité
          cy.loginViaApi(userData.email, userData.password).then(token => {
            localStorage.setItem('user', token); // Assurer que le token est dans localStorage
          });
          cy.visit(pageUrl);
          // Action initiale commune : donner une note
          cy.get('[data-cy="review-input-rating-images"] img:nth-child(4)').click();
        });
  
        specialCharsPayloads.forEach(payload => {
          if (payload.value === '') return; // Les champs sont requis
  
          it(`Champ Titre - devrait gérer "${payload.name}"`, () => {
            testInputField(titleField, submitBtn, pageUrl, () => cy.get(commentField).type('Commentaire valide.'), payload, payload.testXSS ? 'noXSSExecution' : 'accept', payload.xssOutcome);
             if (payload.testXSS) { // Vérifier si le titre est affiché et encodé (nécessite que l'avis soit visible)
               cy.wait(500); // Attendre que l'avis apparaisse
               cy.get('[data-cy="review-detail"]').last().find('[data-cy="review-title"]').should('not.contain', payload.value.replace(/<script>document\.title='XSSedSmoke'<\/script>/, "XSSedSmoke"));
             }
          });
  
          it(`Champ Commentaire - devrait gérer "${payload.name}"`, () => {
            testInputField(commentField, submitBtn, pageUrl, () => cy.get(titleField).type('Titre valide.'), payload, payload.testXSS ? 'noXSSExecution' : 'accept', payload.xssOutcome);
            if (payload.testXSS) { 
              cy.wait(500);

            }
          });
        });
  
        [longString260, longString1050].forEach(longStr => {
          it(`Champ Titre - devrait gérer une chaîne longue (${longStr.length} caractères)`, () => {
            testInputField(titleField, submitBtn, pageUrl, () => cy.get(commentField).type('Commentaire valide.'), { name: `long string ${longStr.length}`, value: longStr }, 'accept'); // Ou 'error' si le backend rejette et affiche une erreur
          });
          it(`Champ Commentaire - devrait gérer une chaîne longue (${longStr.length} caractères)`, () => {
            testInputField(commentField, submitBtn, pageUrl, () => cy.get(titleField).type('Titre valide.'), { name: `long string ${longStr.length}`, value: longStr }, 'accept'); // Ou 'error'
          });
        });
      });
  
      describe('Formulaire de Livraison Panier (nécessite connexion et article)', () => {
        const pageUrl = '/#/cart';
        const zipCodeField = '[data-cy="cart-input-zipcode"]';
        const cityField = '[data-cy="cart-input-city"]';
        // ... autres champs si nécessaire pour la soumission
        const submitBtn = '[data-cy="cart-submit"]';
  
        beforeEach(() => {
          cy.loginViaApi(userData.email, userData.password).then(token => {
            localStorage.setItem('user', token);
          });
          // Vider le panier et ajouter un produit via API
          cy.emptyCartViaApi();
          cy.addProductToCartViaApi(1, 1); // Ajoute produit ID 1, quantité 1
          cy.visit(pageUrl);
          // Remplir les champs obligatoires pour isoler le test
          cy.get('[data-cy="cart-input-lastname"]').type(userData.lastname);
          cy.get('[data-cy="cart-input-firstname"]').type(userData.firstname);
          cy.get('[data-cy="cart-input-address"]').type(userData.address);
        });
  
        it('Champ Code Postal - devrait accepter 5 chiffres', () => {
          cy.get(zipCodeField).type('75001');
          cy.get(cityField).type(userData.city);
          cy.get(submitBtn).click();
          cy.url().should('include', '/confirmation');
        });
  
        it('Champ Code Postal - ne devrait pas accepter plus de 5 caractères (test de la validation Angular maxLength)', () => {
          cy.get(zipCodeField).type('123456');
          // La validation Angular devrait empêcher la saisie de plus de 5
          // Ici, on vérifie si le champ est marqué invalide après tentative de soumission.
          cy.get(cityField).type(userData.city);
          cy.get(submitBtn).click();
          cy.get(zipCodeField).should('have.class', 'ng-invalid');
          cy.url().should('include', pageUrl); // Devrait rester sur la page panier
        });
  
        it('Champ Code Postal - ne devrait pas accepter moins de 5 caractères', () => {
          cy.get(zipCodeField).type('1234');
          cy.get(cityField).type(userData.city);
          cy.get(submitBtn).click();
          cy.get(zipCodeField).should('have.class', 'ng-invalid');
          cy.url().should('include', pageUrl);
        });
  
        it('Champ Code Postal - devrait rejeter les non-numériques', () => {
          cy.get(zipCodeField).type('abcde');
          cy.get(cityField).type(userData.city);
          cy.get(submitBtn).click();
          cy.get(zipCodeField).should('have.class', 'ng-invalid'); 
          cy.url().should('include', pageUrl);
        });
  
        // Test de chaîne longue pour un champ sans maxlength explicite (Ville)
        it('Champ Ville - devrait gérer une chaîne longue', () => {
          cy.get(zipCodeField).type(userData.zipCode);
          // vérifie  la saisie et l'absence d'erreur JS immédiate.
          cy.get(cityField).type(longString260, {delay:0});
          cy.get(cityField).should('have.value', longString260.substring(0, 255));
          // Tenter de soumettre pour voir si une erreur backend est gérée.
          cy.get(submitBtn).click();

           cy.log("Test de chaîne longue pour Ville - vérifier le comportement de l'application ou du backend.");
        });
      });
    });
  
  
    // Section 3: Tests de Vulnérabilité XSS (plus ciblés)
    // Ces tests sont déclenchés si l'étape précédente (caractères spéciaux)
    // a indiqué une potentielle faiblesse dans la sanitization.

    describe('Tests de Vulnérabilité XSS Ciblés', () => {
      const xssSpecificPayloads = [
        { name: 'script simple', value: "<script>window.xssExecutedSmoke=true;</script>", check: () => cy.window().its('xssExecutedSmoke').should('not.exist') },
        { name: 'img onerror', value: '<img src=x onerror="window.xssExecutedImgSmoke=true">', check: () => cy.window().its('xssExecutedImgSmoke').should('not.exist') },
        { name: 'iframe src javascript', value: '<iframe src="javascript:window.xssExecutedIframeSmoke=true"></iframe>', check: () => cy.window().its('xssExecutedIframeSmoke').should('not.exist') },
        { name: 'svg onload', value: '<svg onload="window.xssExecutedSvgSmoke=true"></svg>', check: () => cy.window().its('xssExecutedSvgSmoke').should('not.exist') },
      ];
  
      describe('Formulaire d\'Avis - Champ Commentaire (XSS Approfondi)', () => {
        beforeEach(() => {
          cy.loginViaApi(userData.email, userData.password).then(token => {
            localStorage.setItem('user', token);
            // Nettoyer les variables globales potentielles avant chaque test
            cy.window().then(win => {
              delete win.xssExecutedSmoke;
              delete win.xssExecutedImgSmoke;
              delete win.xssExecutedIframeSmoke;
              delete win.xssExecutedSvgSmoke;
            });
          });
          cy.visit('/#/reviews');
          cy.get('[data-cy="review-input-rating-images"] img:nth-child(5)').click(); // 5 étoiles
          cy.get('[data-cy="review-input-title"]').type('Test XSS Approfondi');
        });
  
        xssSpecificPayloads.forEach(payload => {
          it(`Ne devrait pas exécuter de script injecté via ${payload.name}`, () => {
            cy.get('[data-cy="review-input-comment"]').type(payload.value, { parseSpecialCharSequences: false });
            cy.get('[data-cy="review-submit"]').click();
            cy.wait(1000); // Attendre la soumission et le réaffichage potentiel
  
            // Exécuter la vérification spécifique pour ce payload
            payload.check();
  
            // Vérifier également que le commentaire affiché (s'il l'est) ne contient pas le script brut
            // On s'attend à ce que le texte brut du payload ne soit pas interprété comme du HTML.
            cy.get('[data-cy="review-detail"]').last().find('[data-cy="review-comment"]')
              .should($el => {
                expect($el.find('script').length).to.equal(0);
                expect($el.find('img[onerror]').length).to.equal(0);
                expect($el.find('iframe[src^="javascript:"]').length).to.equal(0);
                expect($el.find('svg[onload]').length).to.equal(0);
              });
          });
        });
      });
    });
  });
  