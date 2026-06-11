# 🚖 YangoClone - Solution Complète de Transport (Cameroun)

YangoClone est une plateforme de ride-hailing inspirée de Yango, optimisée pour le marché camerounais. Elle comprend une application passager, une application chauffeur et un panel d'administration.

## 🚀 Fonctionnalités Clés
- **Authentification OTP** : Connexion sécurisée via numéro de téléphone (+237).
- **Cartographie Temps Réel** : Suivi des chauffeurs et trajets via Google Maps.
- **Calcul de Prix Dynamique** : Tarification automatique en FCFA basée sur la distance.
- **Matching Instantané** : Connexion temps réel entre passagers et chauffeurs via Firestore.
- **Panel Admin** : Supervision complète des revenus, des courses et des utilisateurs.

## 📁 Structure du Projet
- `apps/passenger/` : Application React Native pour les clients.
- `apps/driver/` : Application React Native pour les conducteurs.
- `apps/admin/` : Interface Web pour la gestion centralisée.
- `firebase/` : Configuration, règles de sécurité et Cloud Functions.
- `shared/` : Code partagé (constantes, utilitaires, config).

## 🛠 Installation et Configuration

### 1. Prérequis
- Node.js (v22+)
- React Native CLI (pas d'Expo)
- Un projet Firebase actif
- Clé API Google Maps

### 2. Configuration Firebase
1. Créez un projet sur la [Console Firebase](https://console.firebase.google.com/).
2. Activez **Phone Authentication**, **Firestore**, **Storage** et **Functions**.
3. Téléchargez et placez les fichiers de configuration :
   - `android/app/google-services.json`
   - `ios/GoogleService-Info.plist`
4. Déployez les règles de sécurité :
   ```bash
   firebase deploy --only firestore:rules
   ```

### 3. Installation des dépendances
```bash
npm install
cd firebase/functions && npm install
```

### 4. Lancement
- **Passager/Chauffeur** :
  ```bash
  npx react-native run-android # ou run-ios
  ```
- **Admin** :
  ```bash
  cd apps/admin && npm start
  ```

## 💰 Tarification (Configuration par défaut)
- **Prise en charge** : 500 FCFA
- **Prix au KM** : 200 FCFA
- **Course Minimum** : 1 000 FCFA

## 🔒 Sécurité
Les règles Firestore sont configurées pour garantir que :
- Un passager ne voit que ses propres courses.
- Seul un chauffeur assigné peut modifier le statut d'une course.
- L'accès au panel admin est restreint aux comptes avec le rôle `admin`.

---
*Développé pour le projet ICT202 - Production Ready.*
