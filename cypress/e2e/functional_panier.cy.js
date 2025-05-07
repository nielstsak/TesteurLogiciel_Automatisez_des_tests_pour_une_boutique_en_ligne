// cypress/e2e/functional_panier.cy.js

describe('Functional Tests - Panier & Checkout Flow', () => {
    let user;
    let productWithStock;
    let allAvailableProducts = [];
    let currentAuthToken;

    before(() => {
        cy.fixture('user').then(userData => {
            user = userData;
            cy.request({
                method: 'POST', url: 'http://localhost:8081/login',
                body: { username: user.email, password: user.password },
                failOnStatusCode: false
            }).then(response => {
                if (response.status === 200 && response.body.token) {
                    Cypress.env('authToken', response.body.token);
                } else {
                    cy.request({
                        method: 'POST', url: 'http://localhost:8081/register',
                        body: { email: user.email, plainPassword: { first: user.password, second: user.password }, firstname: user.firstname, lastname: user.lastname },
                        failOnStatusCode: false
                    }).then(() => {
                        cy.loginViaApi(user.email, user.password).then(token => Cypress.env('authToken', token));
                    });
                }
            });
        });

        cy.request('GET', 'http://localhost:8081/products').then((listResponse) => {
            expect(listResponse.status).to.eq(200);
            allAvailableProducts = listResponse.body.filter(p => p.availableStock > 0);
            productWithStock = allAvailableProducts.find(p => p.availableStock > 1);
            expect(productWithStock, 'Need a product with stock > 1 for tests').to.not.be.undefined;
            expect(allAvailableProducts.length).to.be.greaterThan(0, 'Need at least one available product');
        });

         cy.wrap(null).should(() => {
             expect(Cypress.env('authToken')).to.not.be.undefined;
             currentAuthToken = Cypress.env('authToken');
         });
    });

    beforeEach(() => {
        cy.emptyCartViaApi();
        if (currentAuthToken) {
            localStorage.setItem('user', currentAuthToken);
        } else {
            throw new Error("Auth token is not set for tests");
        }
         cy.visit('/#/');
    });

    it('Should add a product to cart from product page', () => {
        cy.visit(`/#/products/${productWithStock.id}`);
        // Attendre que le bouton soit visible ET activé AVANT de cliquer
        cy.get('[data-cy="detail-product-add"]')
            .should('be.visible')
            .and('not.be.disabled');

        cy.intercept('PUT', '**/orders/add').as('addToCart');
        cy.wait(1000); // Ajout du temps d'attente
        cy.get('[data-cy="detail-product-add"]').click(); // Clique
        cy.wait('@addToCart').its('response.statusCode').should('eq', 200);
        cy.url().should('include', '/#/cart');
        cy.get('[data-cy="cart-line"]').should('have.length', 1);
        cy.get('[data-cy="cart-line-name"]').first().should('contain', productWithStock.name);
        cy.get('[data-cy="cart-line-quantity"]').first().should('have.value', '1');
    });

    it('Should reflect quantity changes (made via API) and update total', () => {
        cy.addProductToCartViaApi(productWithStock.id, 1).then(orderData => {
            const lineId = orderData.orderLines.find(l => l.product.id === productWithStock.id)?.id;
            expect(lineId).to.not.be.undefined;
            const newQuantity = 3;
            cy.request({
                method: 'PUT',
                url: `http://localhost:8081/orders/${lineId}/change-quantity`,
                headers: { 'Authorization': `Bearer ${currentAuthToken}`, 'Content-Type': 'application/json' },
                body: { quantity: newQuantity }
            }).its('status').should('eq', 200);
            cy.visit('/#/cart');
            // Attendre que l'input quantité soit visible et ait la bonne valeur
            cy.get('[data-cy="cart-line-quantity"]').first()
                .should('be.visible') // S'assurer qu'il est rendu
                .should('have.value', newQuantity.toString()); // Vérifier la valeur
            const expectedTotal = (parseFloat(productWithStock.price) * newQuantity).toFixed(2);
            cy.get('[data-cy="cart-total"]').should('contain', expectedTotal.replace('.', ','));
        });
    });

    it('Should allow deleting an item from the cart', () => {
         cy.addProductToCartViaApi(productWithStock.id, 1);
         cy.visit('/#/cart');
         cy.get('[data-cy="cart-line"]').should('have.length', 1);
         cy.intercept('DELETE', '**/orders/*/delete').as('deleteItem');
         cy.wait(1000); // Ajout du temps d'attente
         cy.get('[data-cy="cart-line-delete"]').first().click();
         cy.wait('@deleteItem').its('response.statusCode').should('eq', 200);
         cy.get('[data-cy="cart-empty"]').should('be.visible');
         cy.get('[data-cy="cart-line"]').should('not.exist');
    });

    it('Should validate delivery info and complete checkout', () => {
        cy.addProductToCartViaApi(productWithStock.id, 1);
        cy.visit('/#/cart');
        cy.get('[data-cy="cart-line"]').should('have.length', 1);
        cy.get('[data-cy="cart-input-lastname"]').type(user.lastname);
        cy.get('[data-cy="cart-input-firstname"]').type(user.firstname);
        cy.get('[data-cy="cart-input-address"]').type(user.address);
        cy.get('[data-cy="cart-input-zipcode"]').type(user.zipCode);
        cy.get('[data-cy="cart-input-city"]').type(user.city);
        cy.intercept('POST', '**/orders').as('validateOrder');
        cy.wait(1000); // Ajout du temps d'attente
        cy.get('[data-cy="cart-submit"]').click();
        cy.wait('@validateOrder').its('response.statusCode').should('eq', 200);
        cy.url().should('include', '/confirmation');
        cy.contains('Merci !').should('be.visible');
    });

    it('Should prevent checkout if delivery form is invalid', () => {
         cy.addProductToCartViaApi(productWithStock.id, 1);
         cy.visit('/#/cart');
         cy.get('[data-cy="cart-line"]').should('have.length', 1);
         cy.get('[data-cy="cart-input-lastname"]').type(user.lastname);
         cy.get('[data-cy="cart-input-address"]').type(user.address);
         cy.get('[data-cy="cart-input-zipcode"]').type('abc'); // Invalid Zip Code
         cy.get('[data-cy="cart-input-city"]').type(user.city);
         cy.wait(1000); // Ajout du temps d'attente
         cy.get('[data-cy="cart-submit"]').click();
         cy.url().should('include', '/#/cart'); // Should stay on cart page
         cy.contains('Merci !').should('not.exist');
         cy.get('[data-cy="cart-submit"]').should('be.visible'); // Submit button should still be visible
    });

    // Test itératif simplifié pour vérifier la présence du bouton
    it('Should display interactable Add to Cart button on multiple product pages', () => {
        const productsToTest = allAvailableProducts.slice(0, 3);
        expect(productsToTest.length).to.be.greaterThan(0);

        productsToTest.forEach((product) => {
            cy.log(`Checking product page for: ${product.name} (ID: ${product.id})`);
            cy.visit(`/#/products/${product.id}`);
            // Vérifier que le bouton est présent, visible et activé AVANT toute interaction
            cy.get('[data-cy="detail-product-add"]')
                .should('be.visible')
                .and('not.be.disabled');
            // Pas de clic ni de wait ici pour ce test simplifié
        });
    });
});