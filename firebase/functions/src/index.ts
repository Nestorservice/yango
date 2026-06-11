import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

const PRICING = {
  BASE_FARE: 500,
  PRICE_PER_KM: 200,
  MINIMUM_FARE: 1000,
};

/**
 * Calcule le prix sécurisé côté serveur
 */
export const calculateRidePrice = functions.https.onCall(async (data, context) => {
  // Vérifier l'authentification
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
  }

  const { distanceInKm, vehicleType } = data;

  if (!distanceInKm || typeof distanceInKm !== 'number') {
    throw new functions.https.HttpsError('invalid-argument', 'Distance is required and must be a number.');
  }

  let total = PRICING.BASE_FARE + distanceInKm * PRICING.PRICE_PER_KM;
  
  // Appliquer des multiplicateurs selon le type de véhicule
  if (vehicleType === 'comfort') {
    total *= 1.5;
  }

  const finalPrice = Math.max(total, PRICING.MINIMUM_FARE);

  return {
    price: Math.round(finalPrice),
    currency: 'FCFA',
    distance: distanceInKm
  };
});

/**
 * Trigger pour notifier le passager quand un chauffeur accepte
 */
export const onRideAccepted = functions.firestore
  .document('rides/{rideId}')
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const oldData = change.before.data();

    if (oldData.status !== 'accepted' && newData.status === 'accepted') {
      const passengerId = newData.passengerId;
      
      // Ici on enverrait une notification Push via FCM
      console.log(`Course ${context.params.rideId} acceptée par le chauffeur ${newData.driverId}`);
      
      // On pourrait aussi mettre à jour un document de notification
    }
    return null;
  });
