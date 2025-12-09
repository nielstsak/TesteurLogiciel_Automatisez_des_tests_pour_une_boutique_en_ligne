

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
    git clone <https://github.com/nielstsak/TesteurLogiciel_Automatisez_des_tests_pour_une_boutique_en_ligne.git>
    cd <TesteurLogiciel_Automatisez_des_tests_pour_une_boutique_en_ligne>
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

   **Installer les dépendances Cypress** :
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

