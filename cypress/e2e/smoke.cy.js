// cypress/e2e/smoke.cy.js

describe('Smoke Tests - Application EcoBlissBath', () => {
    let userData;
    let allProducts = [];
  
    before(() => {
      // Charger les données utilisateur et produits une seule fois
      cy.fixture('user').then((data) => {
        userData = data;
      });
      cy.request('GET', 'http://localhost:8081/products').then((response) => {
        expect(response.status).to.eq(200);
        allProducts = response.body;
      });
    });
  
    // Section 1: Tests de Disponibilité de l'Application
    describe('Disponibilité des Pages Principales', () => {
      it('Devrait charger la page d\'accueil et afficher les produits', () => {
        cy.intercept('GET', '**/products/random').as('getRandomProducts');
        cy.visit('/#/');
        cy.url().should('include', '/#/');
        cy.wait('@getRandomProducts', { timeout: 10000 });
        cy.get('[data-cy="product-home"]', { timeout: 10000 }).find('[data-cy="product-home-link"]').first().should('be.visible');
        cy.get('header').should('be.visible');
        cy.get('footer').should('be.visible');
      });
  
      it('Devrait charger une page produit (si des produits existent)', function() {
        if (!allProducts || allProducts.length === 0) {
          cy.log('Aucun produit disponible pour le test de la page produit.');
          this.skip(); // Ignore le test si aucun produit
        }
        const productToTest = allProducts[0];
        cy.intercept('GET', `**/products/${productToTest.id}`).as('getProductDetail');
        cy.visit(`/#/products/${productToTest.id}`);
        cy.wait('@getProductDetail', { timeout: 10000 }).its('response.statusCode').should('eq', 200);
  
        cy.url().should('include', `/#/products/${productToTest.id}`);
        cy.get('[data-cy="detail-product-add"]').should('be.visible');
        cy.get('[data-cy="detail-product-name"]', { timeout: 10000 })
          .should('not.be.empty')
          .and('contain.text', productToTest.name);
      });
  
      it('Devrait charger la page du panier (après connexion)', () => {
        cy.loginViaApi(userData.email, userData.password).then(token => {
          // Définir le token dans localStorage dans le contexte de la fenêtre de l'application
          cy.visit('/#/'); // Visiter une page pour avoir un contexte de fenêtre
          cy.window().then(win => {
              win.localStorage.setItem('user', token);
          });
        });
        cy.visit('/#/cart'); // Visiter la page du panier après la configuration du localStorage
        cy.url().should('include', '/#/cart');
        // Vérifier la présence du formulaire de panier ou du message panier vide
        cy.get('[data-cy="cart-form"], [data-cy="cart-empty"]', { timeout: 10000 }).should('exist');
      });
  
      it('Devrait charger la page de connexion', () => {
        cy.visit('/#/login');
        cy.url().should('include', '/#/login');
        cy.get('[data-cy="login-submit"]').should('be.visible');
      });
  
      it('Devrait charger la page d\'inscription', () => {
        cy.visit('/#/register');
        cy.url().should('include', '/#/register');
        cy.get('[data-cy="register-submit"]').should('be.visible');
      });
  
      it('Devrait charger la page des avis', () => {
        cy.visit('/#/reviews');
        cy.url().should('include', '/#/reviews');
        cy.contains("Votre avis").should('be.visible');
      });
  
      it('Devrait obtenir une réponse réussie de l\'API des produits', () => {
        cy.request('GET', 'http://localhost:8081/products').its('status').should('eq', 200);
      });
  
      it('Devrait gérer les routes inexistantes en redirigeant vers l\'accueil', () => {
        cy.visit('/#/non-existent-page-for-smoke-test', { failOnStatusCode: false });
        cy.url().should('match', /\/#\/$/);
        cy.get('[data-cy="product-home-link"]', { timeout: 10000 }).first().should('be.visible');
      });
    });
  
    // Section 2: Tests de Caractères Spéciaux et Limites
    describe('Validation des Champs de Saisie (Caractères Spéciaux et Limites)', () => {
      const specialCharsPayloads = [
        { name: 'guillemets simples', value: "test'test" },
        { name: 'guillemets doubles', value: 'test"test' },
        { name: 'chevrons (potentiel XSS)', value: '<alert>test</alert>', isXSSAttempt: true },
        { name: 'barres obliques', value: '/\\test/\\' },
        { name: 'caractères divers', value: '!@#$%^&*()_+-=[]{};:,./<>?`~' },
      ];
      const longString260 = 'L'.repeat(260);
      const longString550 = 'M'.repeat(550);
  
      // Fonction d'aide pour tester la validation des champs
      function testInputValidation(fieldSelector, submitSelector, pageUrl, setupAction, payload, expectedOutcome) {
        cy.visit(pageUrl);
        if (setupAction) setupAction();
  
        cy.get(fieldSelector).clear().type(payload.value, { delay: 0, parseSpecialCharSequences: false });
        if (submitSelector) cy.get(submitSelector).click();
  
        if (expectedOutcome === 'validationError') {
          // S'attend à ce que le champ soit marqué comme invalide par Angular
          cy.get(fieldSelector).should('have.class', 'ng-invalid');
          // Et que la soumission (si effectuée) n'ait pas abouti à une redirection inattendue
          if (submitSelector) cy.url().should('include', pageUrl.split('/').pop());
        } else if (expectedOutcome === 'submissionError') {
          // S'attend à ce que la soumission échoue (ex: erreur de login, erreur backend)
           if (submitSelector) cy.url().should('include', pageUrl.split('/').pop());
           // Optionnel: vérifier un message d'erreur global si pertinent
           // cy.get('[data-cy="login-errors"]').should('be.visible');
        } else if (expectedOutcome === 'accept') {
          // S'attend à ce que la soumission réussisse (ex: redirection vers page de confirmation)
          // Les assertions spécifiques de redirection sont dans les tests individuels.
        }
      }
      
      describe('Formulaire de Connexion', () => {
        const pageUrl = '/#/login';
        specialCharsPayloads.filter(p => !p.isXSSAttempt).forEach(payload => { // XSS moins pertinent pour les champs de login
          it(`Champ Email - "${payload.name}"`, () => {
            testInputValidation(
              '[data-cy="login-input-username"]',
              '[data-cy="login-submit"]',
              pageUrl,
              () => cy.get('[data-cy="login-input-password"]').type(userData.password),
              payload,
              'submissionError' 
            );
          });
        });
        it('Champ Email - chaîne longue', () => {
          testInputValidation('[data-cy="login-input-username"]', '[data-cy="login-submit"]', pageUrl, () => cy.get('[data-cy="login-input-password"]').type(userData.password), { value: longString260 }, 'submissionError');
        });
      });
  
      describe('Formulaire d\'Inscription', () => {
          const pageUrl = '/#/register';
          const submitBtn = '[data-cy="register-submit"]';
          const fieldsToTest = [
              { name: 'Nom', selector: '[data-cy="register-input-lastname"]' },
              { name: 'Prénom', selector: '[data-cy="register-input-firstname"]' },
              { name: 'Email', selector: '[data-cy="register-input-email"]', isEmail: true },
              { name: 'Mot de passe', selector: '[data-cy="register-input-password"]', isPassword: true },
          ];
  
          fieldsToTest.forEach(field => {
              specialCharsPayloads.filter(p => !p.isXSSAttempt || field.isEmail).forEach(payload => {
                  it(`Champ ${field.name} - "${payload.name}"`, () => {
                      testInputValidation(
                          field.selector,
                          submitBtn,
                          pageUrl,
                          () => { 
                              fieldsToTest.filter(f => f.selector !== field.selector).forEach(otherField => {
                                  if (otherField.isEmail) cy.get(otherField.selector).type(`valid${Date.now()}@test.com`);
                                  else if (otherField.isPassword) {
                                      cy.get(otherField.selector).type(userData.password);
                                      cy.get('[data-cy="register-input-password-confirm"]').type(userData.password);
                                  } else cy.get(otherField.selector).type(userData.firstname);
                              });
                              if (field.isPassword) cy.get('[data-cy="register-input-password-confirm"]').type(payload.value);
                          },
                          payload,
                          'validationError' 
                      );
                  });
              });
              it(`Champ ${field.name} - chaîne longue (260 caractères)`, () => {
                  testInputValidation(field.selector, submitBtn, pageUrl, () => {/* ... */}, { value: longString260 }, 'validationError');
              });
              it(`Champ ${field.name} - chaîne très longue (550 caractères)`, () => {
                  testInputValidation(field.selector, submitBtn, pageUrl, () => {/* ... */}, { value: longString550 }, 'validationError');
              });
          });
      });
      
      describe('Formulaire de Livraison Panier (Code Postal)', () => {
        const pageUrl = '/#/cart';
        const zipCodeField = '[data-cy="cart-input-zipcode"]';
        const setupCart = function() { // Utiliser function pour this.skip
          cy.loginViaApi(userData.email, userData.password).then(token => {
              cy.window().then(win => win.localStorage.setItem('user', token));
          });
          cy.emptyCartViaApi(); // S'assurer que le panier est vide avant d'ajouter
          if (allProducts.length === 0) {
              cy.log("Aucun produit disponible pour le test du panier.");
              this.skip();
          }
          cy.addProductToCartViaApi(allProducts[0].id, 1);
          cy.visit(pageUrl); // Visiter après avoir ajouté au panier
          cy.get('[data-cy="cart-input-lastname"]').type(userData.lastname);
          cy.get('[data-cy="cart-input-firstname"]').type(userData.firstname);
          cy.get('[data-cy="cart-input-address"]').type(userData.address);
          cy.get('[data-cy="cart-input-city"]').type(userData.city);
        };
  
        it('Devrait accepter 5 chiffres et permettre la soumission', function() {
          setupCart.call(this); // Appeler avec le contexte du test
          testInputValidation(zipCodeField, '[data-cy="cart-submit"]', pageUrl, null, { value: '75001' }, 'accept'); // setupCart est déjà appelé
          cy.url({ timeout: 10000 }).should('include', '/confirmation');
        });
        it('Ne devrait pas valider plus de 5 caractères', function() {
          setupCart.call(this);
          testInputValidation(zipCodeField, '[data-cy="cart-submit"]', pageUrl, null, { value: '123456' }, 'validationError');
          cy.get(zipCodeField).should('have.value', '12345');
        });
        it('Ne devrait pas valider moins de 5 caractères', function() {
          setupCart.call(this);
          testInputValidation(zipCodeField, '[data-cy="cart-submit"]', pageUrl, null, { value: '1234' }, 'validationError');
        });
        it('Devrait rejeter les non-numériques', function() {
          setupCart.call(this);
          testInputValidation(zipCodeField, '[data-cy="cart-submit"]', pageUrl, null, { value: 'abcde' }, 'validationError');
        });
      });
    });
  
    // Section 3: Tests de Vulnérabilité XSS Ciblés
    describe('Tests de Vulnérabilité XSS (Champ Commentaire des Avis)', () => {
      // Ces payloads sont conçus pour que leur exécution soit détectable.
      const xssPayloadsForReview = [
        { 
          name: 'script créant un élément DOM spécifique', 
          value: "<script>var d=document.createElement('div');d.id='xssPwnedBySmokeTest';document.body.appendChild(d);</script>", 
          // L'assertion doit échouer si l'élément #xssPwnedBySmokeTest EST créé.
          check: () => cy.get('body').then($body => expect($body.find('#xssPwnedBySmokeTest').length).to.equal(0))
        },
        { 
          name: 'img onerror modifiant une variable window', 
          value: '<img src=x onerror="window.xssImgExecutedBySmokeTest=true">',
          // L'assertion doit échouer si window.xssImgExecutedBySmokeTest DEVIENT true.
          check: () => cy.window({log:false}).should(win => expect(win.xssImgExecutedBySmokeTest).to.be.undefined)
        },
        { 
          name: 'svg onload modifiant une variable window', 
          value: '<svg onload="window.xssSvgExecutedBySmokeTest=true;"></svg>',
          // L'assertion doit échouer si window.xssSvgExecutedBySmokeTest DEVIENT true.
          check: () => cy.window({log:false}).should(win => expect(win.xssSvgExecutedBySmokeTest).to.be.undefined)
        }
      ];
  
      beforeEach(() => {
        cy.loginViaApi(userData.email, userData.password).then(token => {
          cy.window().then(win => {
            win.localStorage.setItem('user', token);
            // Nettoyage des indicateurs XSS avant chaque test
            delete win.xssPwnedBySmokeTest;
            delete win.xssImgExecutedBySmokeTest;
            delete win.xssSvgExecutedBySmokeTest;
            const el = win.document.getElementById('xssPwnedBySmokeTest');
            if (el) el.remove();
          });
        });
        cy.visit('/#/reviews');
        // Remplir les champs obligatoires du formulaire d'avis
        cy.get('[data-cy="review-input-rating-images"] img:nth-child(5)', { timeout: 10000 }).click();
        cy.get('[data-cy="review-input-title"]').type('Test XSS Ciblé');
      });
  
      xssPayloadsForReview.forEach(payload => {
        it(`Champ Commentaire - "${payload.name}" - (le test doit échouer si vulnérable)`, () => {
          cy.get('[data-cy="review-input-comment"]').type(payload.value, { parseSpecialCharSequences: false, delay: 0 });
          cy.get('[data-cy="review-submit"]').click();
          
          cy.wait(2000);
  
          payload.check();
  
          cy.get('[data-cy="review-detail"]').last().find('[data-cy="review-comment"]').then($comment => {
              const commentHtml = $comment.html().toLowerCase();
              expect(commentHtml).to.not.include('<script'); // Ne devrait pas y avoir de balise script active
              expect(commentHtml).to.not.include('onerror='); // Ne devrait pas y avoir d'attribut onerror actif
              expect(commentHtml).to.not.include('<svg onload'); // Ne devrait pas y avoir de svg avec onload actif
          });
        });
      });
    });
  });
  