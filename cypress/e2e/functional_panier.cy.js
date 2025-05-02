// cypress/e2e/functional_panier.cy.js

describe('Functional Tests - Panier', () => {
    let user;
    let productToAdd;
    let availableProducts = [];

    before(() => {
        cy.fixture('user').then(userData => {
            user = userData;
            cy.loginViaApi(user.email, user.password).then(token => {
                 Cypress.env('authToken', token);
            });
        });
         cy.request('GET', 'http://localhost:8081/products').then((listResponse) => {
             availableProducts = listResponse.body.filter(p => p.availableStock > 0);
             productToAdd = availableProducts.find(p => p.availableStock > 5);
             expect(productToAdd, 'Need a product with available stock > 5 for main test').to.not.be.undefined;
             expect(availableProducts.length).to.be.greaterThan(0, 'Need at least one product with available stock for iteration test');
         });
    });

    beforeEach(() => {
        cy.emptyCartViaApi();
        const token = Cypress.env('authToken');
         if (token) {
           window.localStorage.setItem('user', token);
         }
         cy.visit('/#/');
    });

    it('Should add a product to cart, update quantity, validate, and checkout', () => {
        expect(productToAdd).to.not.be.undefined;

        cy.visit(`/#/products/${productToAdd.id}`);
        cy.get('[data-cy="detail-product-name"]').should('contain', productToAdd.name);
        cy.get('[data-cy="detail-product-add"]').should('be.visible');
        cy.get('[data-cy="detail-product-quantity"]').should('have.value', '1');
        cy.get('[data-cy="detail-product-add"]').click();

        cy.url().should('include', '/cart');
        cy.get('[data-cy="cart-line"]').should('have.length', 1);
        cy.get('[data-cy="cart-line-name"]').first().should('contain', productToAdd.name);
        cy.get('[data-cy="cart-line-quantity"]').first().should('have.value', '1');
        let expectedTotal = parseFloat(productToAdd.price).toFixed(2);
        cy.get('[data-cy="cart-total"]').should('contain', expectedTotal.replace('.', ','));

        const newQuantity = 3;
        cy.intercept('PUT', '**/orders/*/change-quantity').as('updateQuantity');
        cy.get('[data-cy="cart-line-quantity"]').first().clear().type(newQuantity.toString());
        cy.wait('@updateQuantity').its('response.statusCode').should('eq', 200);

        expectedTotal = (parseFloat(productToAdd.price) * newQuantity).toFixed(2);
        cy.get('[data-cy="cart-total"]')
            .should('contain', expectedTotal.replace('.', ','));

        cy.get('[data-cy="cart-input-lastname"]').type(user.lastname);
        cy.get('[data-cy="cart-input-firstname"]').type(user.firstname);
        cy.get('[data-cy="cart-input-address"]').type(user.address);
        cy.get('[data-cy="cart-input-zipcode"]').type(user.zipCode);
        cy.get('[data-cy="cart-input-city"]').type(user.city);

        cy.get('[data-cy="cart-submit"]').click();

        cy.url().should('include', '/confirmation');
        cy.contains('Merci !').should('be.visible');
        cy.contains('Votre commande est bien validée').should('be.visible');

        cy.visit('/#/cart');
        cy.get('[data-cy="cart-empty"]').should('be.visible');
        cy.contains('Votre panier est vide').should('be.visible');
    });

     it('Should allow deleting an item from the cart', () => {
         expect(productToAdd).to.not.be.undefined;
         cy.addProductToCartViaApi(productToAdd.id, 1);

         cy.visit('/#/cart');
         cy.get('[data-cy="cart-line"]').should('have.length', 1);
         cy.get('[data-cy="cart-line-name"]').first().should('contain', productToAdd.name);

         cy.get('[data-cy="cart-line-delete"]').first().click();

          cy.get('[data-cy="cart-empty"]').should('be.visible');
          cy.contains('Votre panier est vide').should('be.visible');
          cy.get('[data-cy="cart-line"]').should('not.exist');
     });

     it('Should prevent checkout if delivery form is invalid', () => {
         expect(productToAdd).to.not.be.undefined;
         cy.addProductToCartViaApi(productToAdd.id, 1);

         cy.visit('/#/cart');
         cy.get('[data-cy="cart-line"]').should('have.length', 1);

         cy.get('[data-cy="cart-input-lastname"]').type(user.lastname);
         cy.get('[data-cy="cart-input-address"]').type(user.address);
         cy.get('[data-cy="cart-input-zipcode"]').type('123');
         cy.get('[data-cy="cart-input-city"]').type(user.city);

         cy.get('[data-cy="cart-submit"]').click();

         cy.url().should('include', '/cart');
         cy.contains('Merci !').should('not.exist');
         cy.get('[data-cy="cart-submit"]').should('be.visible');
     });

    it('Should successfully add different products to cart from their detail pages', () => {
        const productsToTest = availableProducts.slice(0, 3);
        expect(productsToTest.length).to.be.greaterThan(0);

        productsToTest.forEach((product) => {
            cy.log(`Testing product add to cart: ${product.name} (ID: ${product.id})`);
            // Optionnel: Vider le panier via API si vous voulez tester chaque ajout isolément
            // cy.emptyCartViaApi();

            cy.visit(`/#/products/${product.id}`);
            cy.get('[data-cy="detail-product-add"]').should('be.visible');

            // Intercepter l'appel API attendu après le clic
            cy.intercept('PUT', '**/orders/add').as(`addToCartApi_${product.id}`);

            // Cliquer sur le bouton
            cy.get('[data-cy="detail-product-add"]').click();

            // Attendre que l'appel API se termine avec succès
            cy.wait(`@addToCartApi_${product.id}`).its('response.statusCode').should('eq', 200);

            // MAINTENANT, vérifier l'URL car la navigation doit avoir eu lieu
            cy.url().should('include', '/#/cart');

        });
    });

});