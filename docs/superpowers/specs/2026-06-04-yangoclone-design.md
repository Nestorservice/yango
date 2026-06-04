# YangoClone — Design Spec
Date: 2026-06-04

## Contexte

Application de transport à la demande (ride-hailing) pour le marché camerounais. Inspirée de Yango. Monnaie : FCFA. Paiement : Cash, Orange Money, MTN MoMo. Auth : OTP téléphone (+237).

## Contraintes techniques

- React Native CLI pur (pas d'Expo), RN 0.85.3, React 19.2.3
- Android uniquement
- Un seul projet RN, un seul `node_modules`
- Secrets via `.env` + `react-native-config` (jamais de clés en dur)
- `google-services.json` dans `android/app/` (gitignored)
- Aucun emoji dans l'interface, uniquement des icônes `react-native-vector-icons`

## Architecture générale

### Structure du projet

```
yango/
├── .env                          # secrets (gitignored)
├── src/
│   ├── config/
│   │   └── firebase.ts
│   ├── constants/
│   │   ├── colors.ts
│   │   ├── statuses.ts
│   │   └── pricing.ts
│   ├── utils/
│   │   ├── priceCalculator.ts
│   │   ├── distanceCalculator.ts
│   │   └── formatters.ts
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   └── useLocation.ts
│   ├── navigation/
│   │   ├── RootNavigator.tsx
│   │   ├── AuthStack.tsx
│   │   ├── PassengerStack.tsx
│   │   ├── DriverStack.tsx
│   │   └── AdminStack.tsx
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── PhoneScreen.tsx
│   │   │   ├── OTPScreen.tsx
│   │   │   ├── OnboardingScreen.tsx        # passager : nom + photo
│   │   │   └── DriverOnboardingScreen.tsx  # chauffeur : véhicule + plaque
│   │   ├── shared/
│   │   │   └── ProfileScreen.tsx           # réutilisé par passenger + driver tabs
│   │   ├── passenger/
│   │   │   ├── HomeScreen.tsx
│   │   │   ├── SearchDestinationScreen.tsx
│   │   │   ├── RideEstimationScreen.tsx
│   │   │   ├── WaitingScreen.tsx
│   │   │   ├── RideAcceptedScreen.tsx
│   │   │   ├── OngoingRideScreen.tsx
│   │   │   ├── EmergencyScreen.tsx
│   │   │   ├── RideCompletedScreen.tsx
│   │   │   └── HistoryScreen.tsx
│   │   ├── driver/
│   │   │   ├── PendingValidationScreen.tsx # en attente validation admin
│   │   │   ├── DriverHomeScreen.tsx
│   │   │   ├── RideRequestModal.tsx
│   │   │   ├── DriverEnRouteScreen.tsx
│   │   │   ├── OngoingRideDriverScreen.tsx
│   │   │   ├── RideCompletedDriverScreen.tsx
│   │   │   └── DriverHistoryScreen.tsx
│   │   └── admin/
│   │       ├── AdminDashboardScreen.tsx
│   │       ├── RidesManagementScreen.tsx
│   │       ├── DriversManagementScreen.tsx
│   │       ├── PassengersManagementScreen.tsx
│   │       ├── EmergencyCenterScreen.tsx
│   │       ├── PricingScreen.tsx
│   │       └── NotificationsScreen.tsx
│   └── components/
│       ├── PrimaryButton.tsx
│       ├── SecondaryButton.tsx
│       ├── DangerButton.tsx
│       ├── DriverCard.tsx
│       ├── RideCard.tsx
│       ├── OTPInput.tsx
│       ├── BottomSheet.tsx
│       ├── LoadingOverlay.tsx
│       └── EmptyState.tsx
├── firebase/
│   ├── functions/index.js
│   └── firestore.rules
└── android/
```

## Navigation

### RootNavigator — logique de démarrage

```
SplashScreen (2s)
  ├── Auth state = null → AuthStack
  └── Auth state = user
        ├── role = 'passenger' → PassengerStack
        ├── role = 'driver'
        │     ├── isValidated = true → DriverStack
        │     └── isValidated = false → PendingValidationScreen
        └── role = 'admin' → AdminStack
```

### AuthStack (partagé)
```
PhoneScreen → OTPScreen → OnboardingScreen (role = passenger)
                        → DriverOnboardingScreen (role = driver)
```
`OnboardingScreen` demande : nom + photo profil → crée doc Firestore `users/{uid}` avec `role='passenger'`.  
`DriverOnboardingScreen` demande : modèle véhicule + couleur + plaque + photo véhicule → crée `users/{uid}` avec `role='driver'`, `isValidated=false`.

### PassengerStack
- Stack principal : HomeScreen → SearchDestinationScreen → RideEstimationScreen → WaitingScreen → RideAcceptedScreen → OngoingRideScreen → RideCompletedScreen
- Bottom tabs : Accueil | Historique | Profil
- Modal : EmergencyScreen (accessible depuis OngoingRideScreen)

### DriverStack
- DriverHomeScreen (toggle online/offline)
- Modal plein écran : RideRequestModal (auto-dismiss 30s)
- Stack course : DriverEnRouteScreen → OngoingRideDriverScreen → RideCompletedDriverScreen
- Bottom tabs : Accueil | Historique | Profil

### AdminStack
- Bottom tabs : Dashboard | Courses | Chauffeurs | Passagers | Urgences
- Modals additionnels : PricingScreen | NotificationsScreen

## Dépendances

```json
{
  "@react-native-firebase/app": "^21",
  "@react-native-firebase/auth": "^21",
  "@react-native-firebase/firestore": "^21",
  "@react-native-firebase/messaging": "^21",
  "@react-native-firebase/storage": "^21",
  "@react-navigation/native": "^7",
  "@react-navigation/stack": "^7",
  "@react-navigation/bottom-tabs": "^7",
  "react-native-screens": "^4",
  "react-native-maps": "^1.18",
  "@react-native-community/geolocation": "^3",
  "react-native-config": "^1.5",
  "react-native-vector-icons": "^10",
  "react-native-gesture-handler": "^2",
  "react-native-reanimated": "^3",
  "react-native-bottom-sheet": "^5"
}
```

Pas de `moment`, pas d'`axios` — utilisation de `Intl` et `fetch` natifs JS.

## Permissions Android (AndroidManifest.xml)

- `INTERNET`
- `ACCESS_FINE_LOCATION` + `ACCESS_COARSE_LOCATION`
- `ACCESS_BACKGROUND_LOCATION`
- `FOREGROUND_SERVICE` + `FOREGROUND_SERVICE_LOCATION`
- `CAMERA`
- `READ_MEDIA_IMAGES` + `READ_MEDIA_VIDEO` (Android 13+)
- `READ_EXTERNAL_STORAGE` + `WRITE_EXTERNAL_STORAGE` (Android < 13)
- `VIBRATE`
- `POST_NOTIFICATIONS` (Android 13+)
- `RECEIVE_BOOT_COMPLETED`
- `CALL_PHONE`

Toutes les permissions runtime gérées avec `PermissionsAndroid` au moment opportun dans chaque écran.

## Cloud Functions (Node.js 18)

### `findNearestDriver` — Firestore trigger rides/{rideId} onCreate
1. Récupère tous les drivers `isOnline=true`, `isAvailable=true`
2. Calcule distance haversine vers `origin` du ride
3. Trie, prend le plus proche
4. Écrit `driverId` dans le ride, status → `'accepted'`
5. Envoie FCM au chauffeur
6. Si aucun chauffeur → status → `'no_driver_available'`
7. Retry max 3 tentatives si chauffeur refuse

### `calculateRidePrice` — HTTPS callable
- Input: `{ origin: {lat, lng}, destination: {lat, lng} }`
- Calcul haversine (pas Google Distance Matrix → zéro coût API)
- `prix = Math.max(distance_km × price_per_km + base_fare, minimum_fare) × surge_multiplier`
- Output: `{ distance_km, duration_min, price_fcfa }`

### `onRideCompleted` — Firestore trigger rides/{rideId} onUpdate
- Incrémente `drivers/{driverId}.totalRides`
- Recalcule `rating` (moyenne de tous les `driverRating`)
- Remet `isAvailable = true`, `currentRideId = null`
- Envoie FCM "Course terminée" au passager

### `sendEmergencyAlert` — Firestore trigger emergency/{requestId} onCreate
- FCM à tous les users `role='admin'`
- Notifie le chauffeur en ligne le plus proche

### `driverTimeout` — HTTPS callable
- Appelée côté client après 30s sans réponse du chauffeur
- Marque le ride comme refusé pour ce driver
- Relance `findNearestDriver` avec exclusion du driver ayant timeout

## Variables d'environnement (.env)

```
FIREBASE_API_KEY=
FIREBASE_AUTH_DOMAIN=
FIREBASE_PROJECT_ID=
FIREBASE_STORAGE_BUCKET=
FIREBASE_MESSAGING_SENDER_ID=
FIREBASE_APP_ID=
GOOGLE_MAPS_API_KEY=
```

## Sécurité Firestore

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Admin : accès total
    match /{document=**} {
      allow read, write: if get(/databases/$(database)/documents/users/$(request.auth.uid))
        .data.role == 'admin';
    }
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    match /drivers/{driverId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == driverId;
    }
    match /rides/{rideId} {
      allow read, write: if request.auth != null &&
        (resource.data.passengerId == request.auth.uid ||
         resource.data.driverId == request.auth.uid);
      allow create: if request.auth != null;
    }
    match /pricing/{doc} {
      allow read: if request.auth != null;
    }
    match /emergency/{requestId} {
      allow create: if request.auth != null;
    }
  }
}
```

## Charte graphique

```typescript
export const COLORS = {
  primary: '#F5A623',
  primaryDark: '#E09415',
  secondary: '#1A1A2E',
  success: '#27AE60',
  danger: '#E74C3C',
  warning: '#F39C12',
  white: '#FFFFFF',
  lightGray: '#F5F5F5',
  mediumGray: '#BDBDBD',
  darkGray: '#424242',
  text: '#212121',
  textLight: '#757575',
};
```

Typographie : `react-native-vector-icons/MaterialIcons` + `react-native-vector-icons/Ionicons`. Aucun emoji.

## Structure Firestore

Collections : `users`, `drivers`, `rides`, `pricing`, `emergency`, `notifications`  
(schéma complet défini dans le prompt original)

## Règles de développement

1. Jamais de données mockées — toujours Firebase
2. Chaque `onSnapshot` a son `return unsubscribe` dans le cleanup `useEffect`
3. Chaque écran a un état loading + un état empty
4. Toutes les erreurs Firebase catchées et affichées à l'utilisateur
5. Format prix : toujours `"1 250 FCFA"` (espace comme séparateur de milliers)
6. Indicatif téléphone : `+237` fixe, non modifiable

## Décomposition en sous-projets

1. **Phase 1** : Firebase setup + shared utils + navigation skeleton
2. **Phase 2** : App Passager (AuthStack + PassengerStack complet)
3. **Phase 3** : App Chauffeur (DriverStack complet)
4. **Phase 4** : App Admin (AdminStack complet)
5. **Phase 5** : Cloud Functions + intégrations Firebase complètes
6. **Phase 6** : Polish, permissions runtime, tests flux complet
