// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

Cypress.Commands.add('loginViaApi', (email, password) => {
    cy.request({
      method: 'POST',
      url: 'http://localhost:8081/login', 
      body: {
        username: email,
        password: password,
      },
      headers: {
        'Content-Type': 'application/json',
      },
    }).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body).to.have.property('token');
      // Stocker le token pour les requêtes suivantes si nécessaire
      Cypress.env('authToken', response.body.token);
      // window.localStorage.setItem('user', response.body.token);
      return response.body.token;
    });
  });
  
  Cypress.Commands.add('loginViaUi', (email, password) => {
    cy.visit('/#/login'); // Utilise le hash routing comme défini dans app-routing.module.ts
    cy.get('[data-cy="login-input-username"]').type(email);
    cy.get('[data-cy="login-input-password"]').type(password);
    cy.get('[data-cy="login-submit"]').click();
  });
  
  // Commande pour ajouter un produit au panier via l'API
  Cypress.Commands.add('addProductToCartViaApi', (productId, quantity) => {
    const token = Cypress.env('authToken');
    expect(token, 'Auth token must be set for this command').to.not.be.undefined;
  
    cy.request({
      method: 'PUT',
      url: `http://localhost:8081/orders/add`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: {
        product: productId,
        quantity: quantity,
      },
    }).then((response) => {
      expect(response.status).to.eq(200);
      // Retourner l'ID de la commande ou les lignes de commande si nécessaire
      return response.body;
    });
  });
  
  // Commande pour récupérer le panier via l'API
  Cypress.Commands.add('getCartViaApi', () => {
    const token = Cypress.env('authToken');
    expect(token, 'Auth token must be set for this command').to.not.be.undefined;
  
    cy.request({
      method: 'GET',
      url: 'http://localhost:8081/orders',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      failOnStatusCode: false // Ne pas échouer si le panier est vide (404)
    }).then((response) => {
      return response; // Retourner la réponse complète pour vérification du statut et du corps
    });
  });
  
  // Commande pour vider le panier via l'API (supprime toutes les lignes une par une)
  Cypress.Commands.add('emptyCartViaApi', () => {
    const token = Cypress.env('authToken');
    if (!token) {
      cy.log('No auth token found, skipping cart emptying.');
      return;
    }
  
    cy.getCartViaApi().then(response => {
      if (response.status === 200 && response.body && response.body.orderLines && response.body.orderLines.length > 0) {
        const lines = response.body.orderLines;
        // Supprimer chaque ligne de manière séquentielle
        const deleteLine = (index) => {
          if (index >= lines.length) {
            return; 
          }
          const lineId = lines[index].id;
          cy.request({
            method: 'DELETE',
            url: `http://localhost:8081/orders/${lineId}/delete`,
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }).then(() => {
            deleteLine(index + 1); // Supprimer la ligne suivante
          });
        };
        deleteLine(0);
      } else if (response.status === 404) {
        cy.log('Cart is already empty.');
      } else if (response.status !== 200) {
         cy.log(`Could not fetch cart to empty it. Status: ${response.status}`);
      }
    });
  });