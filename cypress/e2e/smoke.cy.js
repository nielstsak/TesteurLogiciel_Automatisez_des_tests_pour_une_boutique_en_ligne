describe('Smoke Tests Eco Bliss Bath', () => {

    beforeEach(() => {
        // Se connecter via API pour les tests nécessitant authentification
        cy.fixture('user').then(user => {
           cy.loginViaApi(user.email, user.password).then(token => {
              // Sauvegarde dans localStorage 
              localStorage.setItem('user', token);
           });
        });
        cy.visit('/'); // Utilise baseUrl 
    });
  
    it('Homepage - Should load essential elements', () => {
      cy.get('[data-cy="nav-link-home-logo"]').should('be.visible'); 
      cy.get('[data-cy="nav-link-home"]').should('be.visible'); 
      cy.get('[data-cy="nav-link-products"]').should('be.visible'); 
      cy.contains('Il y en a pour tous les gouts').should('be.visible');
      cy.get('[data-cy="product-home"]').should('have.length.at.least', 1); 
      cy.get('[data-cy="product-home-img"]').first().should('be.visible');
      cy.get('[data-cy="product-home-name"]').first().should('not.be.empty');
      cy.get('[data-cy="product-home-price"]').first().should('contain', '€');
      cy.get('[data-cy="product-home-link"]').first().should('be.visible');
    });
  
    it('Product List Page - Should load and display products', () => {
      cy.get('[data-cy="nav-link-products"]').click();
      cy.url().should('include', '/products');
      cy.contains('Nos produits').should('be.visible');
      cy.get('[data-cy="product"]').should('have.length.at.least', 1); // Au moins un produit affiché
      cy.get('[data-cy="product-picture"]').first().should('be.visible');
      cy.get('[data-cy="product-name"]').first().should('not.be.empty');
      cy.get('[data-cy="product-ingredients"]').first().should('not.be.empty');
      cy.get('[data-cy="product-price"]').first().should('contain', '€');
      cy.get('[data-cy="product-link"]').first().should('be.visible');
    });
  
    it('Product Detail Page - Should display product details', () => {
       // Aller à la page produits et cliquer sur le premier
       cy.visit('/#/products');
       cy.get('[data-cy="product-link"]').first().click();
  
       cy.url().should('match', /\/#\/products\/\d+/); // Vérifie que l'URL contient /products/ suivi d'un ID
       cy.get('[data-cy="detail-product-img"]').should('be.visible');
       cy.get('[data-cy="detail-product-name"]').should('not.be.empty');
       cy.get('[data-cy="detail-product-description"]').should('not.be.empty');
       cy.get('[data-cy="detail-product-skin"]').should('not.be.empty');
       cy.get('[data-cy="detail-product-aromas"]').should('not.be.empty');
       cy.get('[data-cy="detail-product-ingredients"]').should('not.be.empty');
       cy.get('[data-cy="detail-product-price"]').should('contain', '€');
       cy.get('[data-cy="detail-product-stock"]').should('contain', 'en stock'); // Vérifie la présence du texte "en stock" 
       cy.get('[data-cy="detail-product-quantity"]').should('be.visible');
       cy.get('[data-cy="detail-product-add"]').should('be.visible'); // Bouton ajout panier présent car connecté 
    });
  
    it('Login Page - Should display login form elements', () => {
      // Se déconnecter d'abord (si la session persiste)
      window.localStorage.removeItem('user');
      cy.visit('/#/login');
      cy.get('[data-cy="login-input-username"]').should('be.visible'); // Champ email 
      cy.get('[data-cy="login-input-password"]').should('be.visible'); // Champ mot de passe 
      cy.get('[data-cy="login-submit"]').should('be.visible'); // Bouton connexion 
    });
  
    it('Cart Page (when logged in and empty) - Should display empty message', () => {
      // Assurer la connexion (déjà fait dans beforeEach)
      // Vider le panier via API pour garantir l'état vide
      cy.emptyCartViaApi();
      cy.visit('/#/cart');
      cy.get('[data-cy="cart-empty"]').should('be.visible');
      cy.contains('Votre panier est vide').should('be.visible');
    });
  
    it('Reviews Page - Should display reviews elements', () => {
        cy.visit('/#/reviews');
        cy.contains('Votre avis').should('be.visible');
        // Vérifier la présence du formulaire si connecté
        cy.get('[data-cy="review-form"]').should('be.visible');
        cy.get('[data-cy="review-input-rating"]').should('exist'); // Input caché mais présent
        cy.get('[data-cy="review-input-title"]').should('be.visible');
        cy.get('[data-cy="review-input-comment"]').should('be.visible');
        cy.get('[data-cy="review-submit"]').should('be.visible');
        // Vérifier la section des avis existants
        cy.get('[data-cy="reviews-average"]').should('be.visible');
        cy.get('[data-cy="reviews-number"]').should('be.visible');
        cy.get('[data-cy="review-detail"]').should('have.length.at.least', 1); // Au moins 1 avis affiché 
    });
  
  });