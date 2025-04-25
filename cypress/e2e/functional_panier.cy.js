// cypress/e2e/functional_panier.cy.js

// Tests fonctionnels du panier
describe('Functional Tests - Panier', () => {
    // Variables pour stocker les données du test
    let user;
    let productToAdd;

    // Hook exécuté une fois avant tous les tests
    before(() => {
        // Charger les données utilisateur
        cy.fixture('user').then(userData => {
            user = userData;
            // Se connecter via API pour obtenir le token
            cy.loginViaApi(user.email, user.password).then(token => {
                 Cypress.env('authToken', token);
            });
        });
        // Trouver un produit avec du stock via API
         cy.request('GET', 'http://localhost:8081/products').then((listResponse) => {
             productToAdd = listResponse.body.find(p => p.availableStock > 5);
             expect(productToAdd, 'Need a product with available stock > 5').to.not.be.undefined;
         });
    });

    // Hook exécuté avant chaque test ('it')
    beforeEach(() => {
        // Vider le panier via API pour un état propre
        cy.emptyCartViaApi();
        // Visiter une page pour initialiser l'UI
        cy.visit('/#/products');
        // Préparer la session UI en mettant le token dans localStorage
        const token = Cypress.env('authToken');
         if (token) {
           window.localStorage.setItem('user', token);
         }
         // Re-visiter pour s'assurer que l'état de connexion est pris en compte par Angular
         cy.visit('/#/products');
    });

    // Teste le flux complet: ajout, modification quantité, checkout
    it('Should add a product to cart, update quantity, fill delivery info, and checkout', () => {
        expect(productToAdd).to.not.be.undefined; // Assurer que le produit est chargé

        // 1. Visiter la page produit et l'ajouter au panier
        cy.visit(`/#/products/${productToAdd.id}`);
        cy.get('[data-cy="detail-product-add"]').click();

        // 2. Vérifier le contenu initial du panier
        cy.url().should('include', '/cart');
        cy.get('[data-cy="cart-line"]').should('have.length', 1);
        cy.get('[data-cy="cart-line-quantity"]').first().should('have.value', '1');
        let expectedTotal = parseFloat(productToAdd.price).toFixed(2);
        cy.get('[data-cy="cart-total"]').should('contain', expectedTotal.replace('.', ','));

        // 3. Augmenter la quantité et vérifier la mise à jour
        const newQuantity = 3;
        cy.intercept('PUT', '**/orders/*/change-quantity').as('updateQuantity'); // Intercepter l'appel API
        cy.get('[data-cy="cart-line-quantity"]').first().clear().type(newQuantity.toString());
        cy.wait('@updateQuantity').its('response.statusCode').should('eq', 200); // Attendre la réponse de l'API

        expectedTotal = (parseFloat(productToAdd.price) * newQuantity).toFixed(2);
        cy.get('[data-cy="cart-total"]') // Vérifier le nouveau total
            .should('contain', expectedTotal.replace('.', ','));

        // 4. Remplir le formulaire de livraison
        cy.get('[data-cy="cart-input-lastname"]').type(user.lastname);
        cy.get('[data-cy="cart-input-firstname"]').type(user.firstname);
        cy.get('[data-cy="cart-input-address"]').type(user.address);
        cy.get('[data-cy="cart-input-zipcode"]').type(user.zipCode);
        cy.get('[data-cy="cart-input-city"]').type(user.city);

        // 5. Valider la commande
        cy.get('[data-cy="cart-submit"]').click();

        // 6. Vérifier la page de confirmation
        cy.url().should('include', '/confirmation');
        cy.contains('Merci !').should('be.visible');

        // 7. Vérifier que le panier est vide après la commande
        cy.visit('/#/cart');
        cy.get('[data-cy="cart-empty"]').should('be.visible');
    });

     // Teste la suppression d'un article du panier
     it('Should allow deleting an item from the cart', () => {
         expect(productToAdd).to.not.be.undefined;

         // Setup: Ajouter un produit via l'API
         cy.addProductToCartViaApi(productToAdd.id, 1);

         // Visiter le panier
         cy.visit('/#/cart');
         cy.get('[data-cy="cart-line"]').should('have.length', 1); // Vérifier présence

         // Supprimer l'article
         cy.get('[data-cy="cart-line-delete"]').first().click();

         // Vérifier que le panier est vide
          cy.get('[data-cy="cart-empty"]').should('be.visible');
          cy.get('[data-cy="cart-line"]').should('not.exist');
     });

     // Teste le blocage de la commande si le formulaire de livraison est invalide
     it('Should prevent checkout if delivery form is invalid', () => {
         expect(productToAdd).to.not.be.undefined;

         // Setup: Ajouter un produit via l'API
         cy.addProductToCartViaApi(productToAdd.id, 1);

         // Visiter le panier
         cy.visit('/#/cart');
         cy.get('[data-cy="cart-line"]').should('have.length', 1);

         // Remplir le formulaire invalidement (champs manquants / incorrects)
         cy.get('[data-cy="cart-input-lastname"]').type(user.lastname);
         // Prénom manquant
         cy.get('[data-cy="cart-input-address"]').type(user.address);
         cy.get('[data-cy="cart-input-zipcode"]').type('123'); // Code postal invalide
         cy.get('[data-cy="cart-input-city"]').type(user.city);

         // Tenter de valider la commande
         cy.get('[data-cy="cart-submit"]').click();

         // Vérifier qu'on reste sur la page panier et que la commande n'est pas passée
         cy.url().should('include', '/cart');
         cy.contains('Merci !').should('not.exist'); // Pas de message de confirmation
         cy.get('[data-cy="cart-submit"]').should('be.visible'); // Bouton toujours visible pour réessayer
     });

});