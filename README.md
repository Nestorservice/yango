# 🚖 CityGo (YangoClone) - Solution de Transport Premium (Cameroun)

CityGo est une plateforme de ride-hailing complète et professionnelle inspirée de Yango, optimisée pour le marché camerounais. Elle offre une expérience fluide pour les passagers, les chauffeurs et les administrateurs.

## 🚀 Fonctionnalités Clés

### 👤 Application Passager
- **Authentification OTP Intelligente** : Connexion sécurisée via numéro de téléphone (+237) avec formatage automatique.
- **Cartographie Temps Réel** : Suivi des chauffeurs et trajets via Google Maps.
- **Système SOS Avancé** : Bouton d'urgence avec envoi de position GPS et **preuves photos** en temps réel.

### 🚖 Application Chauffeur
- **Mode Travail Immersif** : Interface "Radar" premium pour la réception des courses avec chronomètre dynamique.
- **Connexion Sécurisée** : Accès via Email/Mot de passe (identifiants créés par l'Admin).
- **Gestion des Gains** : Portefeuille intégré affichant le solde en FCFA et l'historique des courses.

### 🛡️ Console Administration (v1.1.0)
- **Gestion de Flotte** : Création manuelle de comptes chauffeurs par l'admin (Nom, Tel, Voiture, Plaque).
- **Surveillance Live** : Carte interactive affichant tous les chauffeurs et courses actives.
- **Centre de Crise SOS** : Alertes visuelles clignotantes sur la carte, consultation des preuves photos et archivage des incidents.
- **Configuration des Tarifs** : Modification dynamique des frais de prise en charge et prix au kilomètre.

## 📂 Structure du Projet
- `apps/passenger/` : App React Native pour les clients.
- `apps/driver/` : App React Native pour les conducteurs.
- `apps/admin/` : Interface Web (Vite + React) pour la gestion centralisée.
- `firebase/` : Configuration, règles de sécurité Firestore et Cloud Functions.
- `shared/` : Code partagé (constantes, utilitaires, config Firebase).

## 🛠 Installation et Configuration

### 1. Prérequis
- Node.js (v22+)
- React Native CLI
- Projet Firebase (Blaze plan recommandé pour les Functions)

### 2. Configuration Firebase
1. Activez **Phone Auth**, **Firestore**, **Storage** et **Functions**.
2. **IMPORTANT** : Ajoutez vos empreintes **SHA-1** et **SHA-256** (Keystore) dans la console Firebase pour le fonctionnement du SMS.
3. Déployez les règles de sécurité :
   ```bash
   firebase deploy --only firestore:rules
   ```

### 3. Variables d'Environnement (Admin Web)
Créez un fichier `apps/admin/.env` avec vos clés Firebase :
```env
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_PROJECT_ID=xxx
...
```

## 🤖 Automatisation (CI/CD)
Le projet inclut une **GitHub Action** qui génère automatiquement un APK de release à chaque `push` sur la branche `main`.
- **Récupération de l'APK** : Onglet "Actions" sur GitHub > Choisissez le dernier build > Artifacts.

## 💰 Tarification par Défaut
- **Prise en charge** : 500 FCFA
- **Prix au KM** : 200 FCFA
- **Course Minimum** : 1 000 FCFA

---
*Développé pour le projet ICT202 - Sécurisé, Rapide et Scalable.*
