describe('Functional Tests - Connexion', () => {
    beforeEach(() => {
      // Utiliser les données du fixture
      cy.fixture('user').as('userData');
      // Optionnel: Assurer que l'utilisateur existe via API avant chaque test UI
      // cy.request('POST', '/test/seed/user', { email: '@userData.email', password: '@userData.password' });
    });
  
    it('Should display login page correctly', () => {
      cy.visit('/#/login'); // Utilise le hash routing
      cy.get('[data-cy="login-input-username"]').should('be.visible');
      cy.get('[data-cy="login-input-password"]').should('be.visible');
      cy.get('[data-cy="login-submit"]').should('be.visible');
      cy.contains('Se connecter').should('be.visible');
      cy.contains('S\'inscrire').should('be.visible');
    });
  
    it('Should show error on invalid login', function() { // Utilise function() pour accéder à this.userData
      cy.visit('/#/login');
      cy.get('[data-cy="login-input-username"]').type(this.userData.invalidEmail);
      cy.get('[data-cy="login-input-password"]').type(this.userData.invalidPassword);
      cy.get('[data-cy="login-submit"]').click();
  
      // Vérifier l'affichage de l'erreur
      cy.get('[data-cy="login-errors"]').should('be.visible').and('contain', 'Identifiants incorrects');
      // Vérifier que les champs sont marqués comme invalides (peut dépendre de l'implémentation CSS/JS)
      cy.get('[data-cy="login-input-username"].ng-invalid').should('exist');
      cy.get('[data-cy="login-input-password"].ng-invalid').should('exist');
      // Vérifier qu'on est toujours sur la page de login
      cy.url().should('include', '/login');
      // Vérifier que les boutons de navigation post-connexion ne sont pas là
      cy.get('[data-cy="nav-link-cart"]').should('not.exist');
      cy.get('[data-cy="nav-link-logout"]').should('not.exist');
    });
  
    it('Should login successfully with valid credentials and show cart/logout buttons', function() {
      // Utilise la commande personnalisée UI
      cy.loginViaUi(this.userData.email, this.userData.password);
  
      // Vérifier la redirection (vers la page d'accueil par défaut dans ce cas)
      cy.url().should('not.include', '/login');
      // Vérifier la présence des boutons post-connexion dans la navbar
      cy.get('[data-cy="nav-link-cart"]').should('be.visible');
      cy.get('[data-cy="nav-link-logout"]').should('be.visible');
      // Vérifier l'absence des boutons pré-connexion
      cy.get('[data-cy="nav-link-login"]').should('not.exist');
      cy.get('[data-cy="nav-link-register"]').should('not.exist');
    });
  
  });