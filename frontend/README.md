# EcoBlissBath

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 13.3.0.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.


# Projet EcoBlissBath - Automatisation des Tests avec Cypress

Ce document détaille la procédure d'installation du projet EcoBlissBath, l'exécution des tests automatisés avec Cypress, la génération des rapports de test, ainsi qu'un résumé des anomalies détectées et des recommandations.

## 1. Description du Projet

EcoBlissBath est une application de boutique en ligne. Ce dépôt contient les scripts de tests automatisés développés avec Cypress pour valider les fonctionnalités clés, la robustesse des champs de saisie et identifier des vulnérabilités potentielles.

## 2. Prérequis

* **Docker et Docker Compose** : Pour exécuter l'application et sa base de données.
* **Node.js et npm** (ou yarn) : Requis si vous souhaitez exécuter les tests Cypress localement, en dehors de l'environnement Docker de l'application. Cypress est inclus en tant que dépendance de développement dans le `package.json` à la racine du projet de test.

## 3. Installation et Exécution du Projet Applicatif

L'application EcoBlissBath (frontend Angular et backend Symfony) est conçue pour être exécutée avec Docker.

1.  **Cloner le dépôt principal de l'application** (si ce n'est pas déjà fait) :
    ```bash
    git clone <URL_DU_DEPOT_ECOBLISSBATH_AVEC_DOCKER-COMPOSE.YML>
    cd <NOM_DU_DOSSIER_DU_PROJET_ECOBLISSBATH>
    ```

2.  **Construire et lancer les conteneurs Docker** :
    À la racine du projet applicatif (où se trouve le fichier `docker-compose.yml`), exécutez :
    ```bash
    sudo docker-compose up --build -d
    ```
    *(Sous Windows, `sudo` n'est généralement pas nécessaire si Docker Desktop est correctement configuré).*
    Le `-d` permet de lancer les conteneurs en mode détaché (en arrière-plan).

3.  **Accéder à l'application** :
    * Frontend (Angular) : [http://localhost:8088](http://localhost:8088)
    * Backend (Symfony API) : [http://localhost:8081](http://localhost:8081)

## 4. Tests Automatisés avec Cypress

Les scripts de test Cypress sont contenus dans ce dépôt.

### 4.1. Installation des Dépendances de Test

1.  **Cloner ce dépôt de test** (si ce n'est pas déjà fait) :
    ```bash
    git clone <URL_DE_CE_DEPOT_DE_TESTS_CYPRESS>
    cd <NOM_DU_DOSSIER_DE_CE_DEPOT_DE_TESTS>
    ```
2.  **Installer les dépendances Cypress** :
    À la racine de ce dépôt de tests (où se trouve le `package.json` listant Cypress), exécutez :
    ```bash
    npm install
    ```
    ou si vous utilisez yarn :
    ```bash
    yarn install
    ```

### 4.2. Lancement des Tests Cypress

Assurez-vous que l'application EcoBlissBath (frontend et backend) est en cours d'exécution (via Docker comme décrit à la section 3) avant de lancer les tests.

#### 4.2.1. Mode Interactif (Cypress Test Runner)

Pour ouvrir l'interface graphique de Cypress, qui permet de sélectionner et d'exécuter les tests individuellement et de voir leur exécution en direct dans un navigateur :
```bash
npx cypress open
4.2.2. Mode Headless (Ligne de Commande)
Pour exécuter tous les tests en mode headless (sans interface graphique, typiquement pour l'intégration continue ou une exécution complète) :

Bash

npx cypress run
Pour exécuter un fichier de spécification particulier (par exemple, smoke.cy.js) :

Bash

npx cypress run --spec "cypress/e2e/smoke.cy.js"
4.3. Génération des Rapports de Test
Cypress génère nativement :

Vidéos : Des enregistrements vidéo de chaque exécution de test en mode cypress run. Par défaut, elles sont sauvegardées dans cypress/videos/.
Captures d'écran : Des captures d'écran sont automatiquement prises en cas d'échec de test lors d'une exécution avec cypress run. Par défaut, elles sont sauvegardées dans cypress/screenshots/.
Pour des rapports HTML plus élaborés (non configuré par défaut dans ce projet mais une pratique courante) :
L'intégration d'un reporter comme mochawesome est recommandée. Cela impliquerait :

Ajouter les dépendances nécessaires (ex: mochawesome, mochawesome-merge, mochawesome-report-generator).
Configurer Cypress (dans cypress.config.js ou les fichiers de support) pour utiliser ce reporter.
Après l'exécution des tests, utiliser des commandes pour fusionner les résultats JSON et générer le rapport HTML. Par exemple :
Bash

# Exemple de commandes (nécessite installation et configuration préalables)
# npx mochawesome-merge cypress/results/mochawesome*.json > mochawesome-report/mochawesome.json
# npx marge mochawesome-report/mochawesome.json -f report -o mochawesome-report
Veuillez consulter la documentation du reporter choisi pour les instructions d'installation et de configuration précises.
5. Anomalies Détectées et Recommandations
Les tests ont révélé plusieurs anomalies et points d'attention.

5.1. Vulnérabilité XSS (Cross-Site Scripting) - Critique
Description : Une faille XSS stockée a été confirmée dans le champ "Commentaire" du formulaire d'avis. L'application n'encode ni ne neutralise adéquatement les entrées HTML/JavaScript, qui sont ensuite rendues via [innerHTML] dans le composant Angular. Cela permet l'exécution de scripts côté client pour les utilisateurs consultant les avis.
Reproduction :
Se connecter à l'application.
Naviguer vers la page des avis (/#/reviews).
Soumettre un avis avec un payload XSS dans le champ "Commentaire", par exemple :
HTML

<img src=x onerror="document.body.setAttribute('data-xss-test', 'failed')">
Observer : Le script s'exécute. Dans l'exemple ci-dessus, l'attribut data-xss-test serait ajouté à l'élément <body> de la page. Les tests Cypress dans smoke.cy.js (section "Tests de Vulnérabilité XSS Ciblés") sont conçus pour que leurs assertions échouent si de tels scripts s'exécutent, confirmant ainsi la vulnérabilité.
Impact Potentiel : Vol de cookies de session, redirection vers des sites malveillants, défiguration du site, exécution d'actions au nom de l'utilisateur.
Recommandations pour Correction :
Backend : Impérativement valider et neutraliser (encoder les caractères HTML : <, >, &, ", ') toutes les données utilisateur avant leur stockage. Utiliser les mécanismes de protection fournis par Symfony/Twig.
Frontend (Angular) :
Éviter [innerHTML] pour afficher du contenu utilisateur. Privilégier l'interpolation {{ }}.
Si [innerHTML] est indispensable, utiliser DomSanitizer d'Angular pour nettoyer et valider le HTML, en s'assurant qu'il est configuré pour éliminer les scripts et gestionnaires d'événements dangereux. L'utilisation de bypassSecurityTrustHtml doit être strictement limitée à du contenu HTML entièrement maîtrisé et sécurisé.
5.2. Stabilité Initiale des Pages et Sélecteurs
Description : Les premières versions des tests de disponibilité ont montré des instabilités dues à des éléments non encore chargés (dépendance aux appels API) ou des sélecteurs data-cy qui n'étaient pas présents ou optimaux. La page panier nécessitait également une gestion explicite de la connexion.
Impact Potentiel : Tests non fiables (faux négatifs), masquage potentiel de régressions.
Recommandations pour Correction (appliquées dans les scripts de test actuels) :
Utilisation systématique de cy.intercept() et cy.wait() pour synchroniser les tests avec les réponses API.
Vérification et utilisation de sélecteurs data-cy robustes et uniques.
Gestion proactive de l'état d'authentification (ex: cy.loginViaApi()) avant d'accéder aux pages protégées.
5.3. Validation des Limites de Caractères
Description :
Le champ "Code Postal" (formulaire de livraison) semble correctement contraint par des validateurs côté client (longueur de 5 chiffres).
Pour les champs de texte libre (ex: commentaire d'avis, nom de ville), il n'y a pas de limite de longueur maximale apparente côté client. Des chaînes très longues sont acceptées par le frontend.
Reproduction :
Saisir plus de 5 chiffres dans le champ "Code Postal" : la validation Angular devrait l'empêcher ou le marquer comme invalide.
Saisir une chaîne de >500 caractères dans un champ comme "Commentaire" : le formulaire est soumis sans erreur frontend.
Impact Potentiel : Risque de troncature de données ou d'erreurs backend si les limites ne sont pas alignées. Faible risque de déni de service si des entrées excessivement volumineuses sont traitées sans précaution.
Recommandations pour Correction :
Définir et appliquer des limites de caractères cohérentes (frontend et backend) pour tous les champs texte.
Fournir un retour visuel à l'utilisateur sur les limites (ex: compteur, message d'erreur).
S'assurer que le backend valide également la longueur et retourne des erreurs explicites.
6. Structure des Tests
Les tests automatisés sont organisés comme suit :

cypress/e2e/smoke.cy.js : Tests de fumée vérifiant la disponibilité des pages principales, la validation de base des champs (caractères spéciaux, limites) et des tests XSS ciblés.
cypress/e2e/functional_*.cy.js : (Fichiers existants dans le projet) Tests fonctionnels plus approfondis pour des parcours utilisateurs spécifiques (ex: panier, connexion).
cypress/e2e/api.cy.js : (Fichier existant dans le projet) Tests ciblant directement les endpoints de l'API.
cypress/fixtures/ : Contient les jeux de données de test (ex: user.json).
cypress/support/commands.js : Définit les commandes Cypress personnalisées réutilisables (ex: cy.loginViaApi()).
7. Confiance dans l'Application
(Cette section est à compléter par l'étudiant pour le rapport de testing final, en se basant sur l'ensemble des résultats des tests et son analyse.)

Suite à l'exécution de cette campagne de tests automatisés, le niveau de confiance dans l'application EcoBlissBath est [À COMPLÉTER PAR L'ÉTUDIANT : ex: Modéré en raison des failles critiques, Élevé sous réserve de corrections, etc.].

Points Forts Observés :

[Exemple : Les principaux parcours utilisateurs (navigation, ajout au panier, processus de commande basique) sont fonctionnels.]
[Exemple : L'API répond de manière cohérente pour les endpoints couverts par les tests.]
[Exemple : Les mécanismes de validation de base (format email, champs requis) sont présents sur les formulaires.]
Principaux Points de Risque et d'Amélioration Requise :

Priorité Haute : La vulnérabilité XSS stockée identifiée dans la section des commentaires d'avis représente un risque de sécurité significatif et doit être corrigée immédiatement.
Validation des Entrées : Bien que des validations de base existent, la gestion des limites de longueur pour les champs de texte libre et la neutralisation plus robuste des caractères spéciaux sur tous les points d'entrée utilisateur doivent être améliorées pour renforcer la sécurité et la robustesse.
Gestion d'État Frontend : Assurer une gestion cohérente de l'état de session utilisateur et des indicateurs de chargement pour améliorer la stabilité perçue et la fiabilité des interactions.
Recommandations Générales Supplémentaires :

Mettre en œuvre une Content Security Policy (CSP) stricte pour atténuer les risques d'attaques XSS.
Procéder à une revue de sécurité approfondie du code source backend, avec un accent particulier sur la validation des entrées et la prévention des injections (SQL, XSS, etc.).
Intégrer ces tests automatisés dans un pipeline d'intégration continue (CI/CD) pour une détection précoce des régressions.
Étendre la couverture des tests fonctionnels pour inclure davantage de cas d'usage et de scénarios alternatifs.