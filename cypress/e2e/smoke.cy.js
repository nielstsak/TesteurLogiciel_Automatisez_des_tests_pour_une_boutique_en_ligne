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
            { name: 'chevrons (potentiel XSS)', value: '<alert>test</alert>', isXSSAttempt: true }, // Gardé pour tester la validation/le rejet initial si applicable
            { name: 'barres obliques', value: '/\\test/\\' },
            { name: 'caractères divers', value: '!@#$%^&*()_+-=[]{};:,./<>?`~' },
        ];
        const longString260 = 'L'.repeat(260);
        const longString550 = 'M'.repeat(550);

        // Fonction d'aide pour tester la validation des champs
        function testInputValidation(fieldSelector, submitSelector, pageUrl, setupAction, payload, expectedOutcome) {
            cy.visit(pageUrl);
            if (setupAction) setupAction();

            // Utiliser { parseSpecialCharSequences: false } pour taper les caractères littéralement
            cy.get(fieldSelector).clear().type(payload.value, { delay: 0, parseSpecialCharSequences: false });
            if (submitSelector) cy.get(submitSelector).click();

            if (expectedOutcome === 'validationError') {
                // S'attend à ce que le champ soit marqué comme invalide par Angular ou que la soumission échoue au front
                cy.get(fieldSelector).should('have.class', 'ng-invalid');
                // Et que la soumission (si effectuée) n'ait pas abouti à une redirection inattendue
                if (submitSelector) cy.url().should('include', pageUrl.split('/').pop());
            } else if (expectedOutcome === 'submissionError') {
                // S'attend à ce que la soumission échoue (ex: erreur de login, erreur backend)
                if (submitSelector) cy.url().should('include', pageUrl.split('/').pop());
                 // Optionnel: vérifier un message d'erreur spécifique si pertinent
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
                        'submissionError' // Erreur car l'email/login est invalide
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
                // Tester les caractères spéciaux (sauf potentiellement XSS dans les champs non destinés à afficher du HTML)
                specialCharsPayloads.filter(p => !p.isXSSAttempt || field.isEmail ).forEach(payload => {
                    it(`Champ ${field.name} - "${payload.name}"`, () => {
                        testInputValidation(
                            field.selector,
                            submitBtn,
                            pageUrl,
                            () => { // Remplir les autres champs valides
                                fieldsToTest.filter(f => f.selector !== field.selector).forEach(otherField => {
                                    if (otherField.isEmail) cy.get(otherField.selector).type(`valid${Date.now()}@test.com`);
                                    else if (otherField.isPassword) {
                                        cy.get(otherField.selector).type(userData.password);
                                        cy.get('[data-cy="register-input-password-confirm"]').type(userData.password);
                                    } else cy.get(otherField.selector).type(userData.firstname); // Utiliser une valeur valide
                                });
                                // Si le champ testé est le mot de passe, remplir aussi la confirmation
                                if (field.isPassword) cy.get('[data-cy="register-input-password-confirm"]').type(payload.value, { parseSpecialCharSequences: false });
                            },
                            payload,
                            field.isEmail ? 'validationError' : 'submissionError' // Email a une validation de format plus stricte, les autres peuvent passer la validation front mais échouer au back/DB
                        );
                    });
                });
                // Test XSS specific pour champs non email/password (Nom, Prénom) - s'attendre à une validation ou erreur back
                 if (!field.isEmail && !field.isPassword) {
                    const xssPayload = specialCharsPayloads.find(p => p.isXSSAttempt);
                     it(`Champ ${field.name} - "${xssPayload.name}"`, () => {
                         testInputValidation(
                             field.selector,
                             submitBtn,
                             pageUrl,
                             () => { /* Setup comme ci-dessus */
                                 fieldsToTest.filter(f => f.selector !== field.selector).forEach(otherField => {
                                     if (otherField.isEmail) cy.get(otherField.selector).type(`valid${Date.now()}@test.com`);
                                     else if (otherField.isPassword) { cy.get(otherField.selector).type(userData.password); cy.get('[data-cy="register-input-password-confirm"]').type(userData.password); }
                                     else cy.get(otherField.selector).type(userData.lastname);
                                 });
                             },
                             xssPayload,
                             'submissionError' // Devrait être rejeté par le backend ou validation
                         );
                     });
                 }
                 // Tests de longueur
                it(`Champ ${field.name} - chaîne longue (260 caractères)`, () => {
                    testInputValidation(field.selector, submitBtn, pageUrl, () => { /* setup */ }, { value: longString260 }, 'validationError'); // S'attendre à une erreur de validation de longueur max
                });
                it(`Champ ${field.name} - chaîne très longue (550 caractères)`, () => {
                    testInputValidation(field.selector, submitBtn, pageUrl, () => { /* setup */ }, { value: longString550 }, 'validationError'); // Idem
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
                // Remplir les champs obligatoires du formulaire de livraison
                cy.get('[data-cy="cart-input-lastname"]').type(userData.lastname);
                cy.get('[data-cy="cart-input-firstname"]').type(userData.firstname);
                cy.get('[data-cy="cart-input-address"]').type(userData.address);
                cy.get('[data-cy="cart-input-city"]').type(userData.city);
            };

            it('Devrait accepter 5 chiffres et permettre la soumission', function() {
                setupCart.call(this); // Appeler avec le contexte du test
                testInputValidation(zipCodeField, '[data-cy="cart-submit"]', pageUrl, null, { value: '75001' }, 'accept'); // setupCart est déjà appelé
                cy.url({ timeout: 10000 }).should('include', '/confirmation'); // Vérifier la redirection
            });
            it('Ne devrait pas valider plus de 5 caractères', function() {
                setupCart.call(this);
                cy.get(zipCodeField).type('123456', { delay: 0 });
                // L'input a probablement un maxlength="5" ou une validation Angular qui tronque/invalide
                cy.get(zipCodeField).should('have.value', '12345'); // Vérifier si la valeur est tronquée
                cy.get('[data-cy="cart-submit"]').should('be.enabled'); // La soumission peut être possible si tronquée
                // OU vérifier l'état de validation si Angular est utilisé
                // cy.get(zipCodeField).should('have.class', 'ng-valid'); // Si 5 chiffres sont valides
                // Pour être plus sûr, on vérifie que le formulaire n'est pas soumis avec 6 chiffres
                // Ce test est délicat sans connaître l'implémentation exacte (maxlength vs pattern/validation)
                // Alternative: tester directement la validation Angular
                cy.get(zipCodeField).clear().type('123456', { delay: 0 });
                cy.get(zipCodeField).should('have.value', '12345'); // Confirme la troncature ou la limitation d'entrée
            });
            it('Ne devrait pas valider moins de 5 caractères', function() {
                setupCart.call(this);
                testInputValidation(zipCodeField, '[data-cy="cart-submit"]', pageUrl, null, { value: '1234' }, 'validationError');
                 // Vérifier que le bouton de soumission est désactivé ou que le champ est invalide
                 cy.get(zipCodeField).should('have.class', 'ng-invalid');
                 cy.get('[data-cy="cart-submit"]').should('be.disabled');
            });
            it('Devrait rejeter les non-numériques', function() {
                setupCart.call(this);
                cy.get(zipCodeField).type('abcde', { delay: 0 });
                // Si l'input type="number" ou pattern="\d*", la saisie peut être bloquée ou la valeur sera vide
                cy.get(zipCodeField).invoke('val').then(val => expect(val).to.match(/^\d*$/)); // S'assurer que seuls des chiffres sont présents
                // Test explicite d'invalidité si on tape des non-numériques puis on essaie de soumettre
                cy.get(zipCodeField).clear().type('abcde', { delay: 0 });
                // La valeur sera probablement vide ou invalide
                 cy.get(zipCodeField).should('have.class', 'ng-invalid');
                 cy.get('[data-cy="cart-submit"]').should('be.disabled');
            });
        });
    });

    // Section 3: Tests de Vulnérabilité XSS Ciblés
    describe('Tests de Vulnérabilité XSS (Champ Commentaire des Avis)', () => {
        // Payloads variés pour tester différentes techniques XSS et l'injection HTML simple.
        const xssPayloadsForReview = [
            {
                name: 'script créant un élément DOM spécifique',
                value: "<script>var d=document.createElement('div');d.id='xssPwnedBySmokeTest';document.body.appendChild(d);</script>",
                // Vérifie que l'élément #xssPwnedBySmokeTest N'EST PAS créé.
                check: () => cy.get('body').then($body => expect($body.find('#xssPwnedBySmokeTest').length).to.equal(0))
            },
            {
                name: 'img onerror modifiant une variable window',
                value: '<img src=x onerror="window.xssImgExecutedBySmokeTest=true">',
                // Vérifie que window.xssImgExecutedBySmokeTest RESTE undefined.
                check: () => cy.window({log:false}).should(win => expect(win.xssImgExecutedBySmokeTest).to.be.undefined)
            },
            {
                name: 'svg onload modifiant une variable window',
                value: '<svg onload="window.xssSvgExecutedBySmokeTest=true;"></svg>',
                // Vérifie que window.xssSvgExecutedBySmokeTest RESTE undefined.
                check: () => cy.window({log:false}).should(win => expect(win.xssSvgExecutedBySmokeTest).to.be.undefined)
            },
            {
                name: 'Simple HTML Injection (h1 tag)',
                value: '<h1 class=titre>Titre en vert foncé</h1>',
                // Vérifie que l'élément h1.titre N'EST PAS rendu dans le commentaire et que le HTML est échappé.
                check: () => {
                    cy.get('[data-cy="review-detail"]').first().find('[data-cy="review-comment"]').as('commentDisplay');
                    // 1. Vérifier que l'élément H1 avec la classe 'titre' n'a PAS été rendu
                    cy.get('@commentDisplay').find('h1.titre').should('not.exist');
                    // 2. Vérifier que la chaîne HTML littérale (ou sa version échappée) est présente dans le HTML du commentaire affiché
                    //    Ceci confirme que le tag n'a pas été simplement supprimé, mais bien traité comme du texte.
                    cy.get('@commentDisplay').invoke('html').should(html => {
                        // Vérifier la présence de la version échappée (la plus courante et sécurisée)
                        expect(html).to.contain('&lt;h1 class=titre&gt;Titre en vert foncé&lt;/h1&gt;');
                        // Vérifier aussi qu'il n'y a pas de balise h1 non échappée
                        expect(html).to.not.match(/<h1[^>]*class=["']?titre["']?[^>]*>/i);
                    });
                }
            }
        ];

        beforeEach(() => {
            // Se connecter via API pour obtenir un token valide
            cy.loginViaApi(userData.email, userData.password).then(token => {
                // Définir le token dans localStorage pour que l'UI reconnaisse l'utilisateur
                // Nettoyage des indicateurs XSS potentiels de tests précédents
                 cy.window().then(win => {
                     win.localStorage.setItem('user', token);
                     delete win.xssPwnedBySmokeTest;
                     delete win.xssImgExecutedBySmokeTest;
                     delete win.xssSvgExecutedBySmokeTest;
                     const el = win.document.getElementById('xssPwnedBySmokeTest');
                     if (el) el.remove();
                 });
            });
            // Visiter la page des avis après configuration du localStorage
            cy.visit('/#/reviews');
            // Attendre que le formulaire soit potentiellement prêt (peut être amélioré avec des attentes plus spécifiques)
            cy.get('[data-cy="review-input-rating-images"]', { timeout: 10000 }).should('be.visible');

            // Remplir les champs obligatoires du formulaire d'avis pour permettre la soumission
            cy.get('[data-cy="review-input-rating-images"] img:nth-child(5)').click(); // Donner une note de 5 étoiles
            cy.get('[data-cy="review-input-title"]').type('Test XSS/HTML Injection');
        });

        xssPayloadsForReview.forEach(payload => {
            it(`Champ Commentaire - "${payload.name}" - (le test doit échouer si vulnérable)`, () => {
                // Taper le payload dans le champ commentaire sans interpréter les séquences spéciales
                cy.get('[data-cy="review-input-comment"]').type(payload.value, { parseSpecialCharSequences: false, delay: 0 });

                // Soumettre le formulaire d'avis
                cy.get('[data-cy="review-submit"]').click();

                // Attendre un peu que l'avis soit posté et affiché (peut être remplacé par une attente d'élément spécifique)
                 // Augmenter le délai si l'affichage de l'avis prend du temps ou utiliser cy.wait('@postReview') si on intercepte la requête POST
                cy.wait(2500);

                payload.check();

                cy.get('[data-cy="review-detail"]').first().find('[data-cy="review-comment"]').invoke('html').should(html => {
                    expect(html.toLowerCase()).to.not.include('<script');
                });
            });
        });
    });
});