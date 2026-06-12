"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.completeRide = exports.declineRide = exports.findNearestDriver = exports.onRideAccepted = exports.calculateRidePrice = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
const PRICING = {
    BASE_FARE: 500,
    PRICE_PER_KM: 200,
    MINIMUM_FARE: 1000,
};
// --- Utils ---
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
// --- Pricing ---
/**
 * Calcule le prix sécurisé côté serveur
 */
exports.calculateRidePrice = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
    }
    const { distanceInKm, vehicleType } = data;
    if (!distanceInKm || typeof distanceInKm !== 'number') {
        throw new functions.https.HttpsError('invalid-argument', 'Distance is required and must be a number.');
    }
    let total = PRICING.BASE_FARE + distanceInKm * PRICING.PRICE_PER_KM;
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
exports.onRideAccepted = functions.firestore
    .document('rides/{rideId}')
    .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const oldData = change.before.data();
    if (oldData.status !== 'accepted' && newData.status === 'accepted') {
        const passengerId = newData.passengerId;
        console.log(`Course ${context.params.rideId} acceptée par le chauffeur ${newData.driverId}`);
    }
    return null;
});
// --- Matching Logic ---
/**
 * Trigger quand une course est créée: Trouve le chauffeur le plus proche
 */
exports.findNearestDriver = functions.firestore
    .document('rides/{rideId}')
    .onCreate(async (snap, context) => {
    const rideData = snap.data();
    const rideId = context.params.rideId;
    if (rideData.status !== 'searching')
        return null;
    const { latitude, longitude } = rideData.origin;
    // Fetch all active, validated drivers
    const driversSnapshot = await admin.firestore()
        .collection('drivers')
        .where('isOnline', '==', true)
        .where('isValidated', '==', true)
        .get();
    if (driversSnapshot.empty) {
        await snap.ref.update({ status: 'no_drivers_available' });
        return null;
    }
    let nearestDriverId = null;
    let minDistance = Infinity;
    const declinedBy = rideData.declinedBy || [];
    driversSnapshot.forEach(doc => {
        if (declinedBy.includes(doc.id))
            return; // Skip drivers who declined
        const driverData = doc.data();
        if (driverData.location && driverData.location.latitude && driverData.location.longitude) {
            const dist = getDistance(latitude, longitude, driverData.location.latitude, driverData.location.longitude);
            if (dist < minDistance && dist <= 15) { // max 15km
                minDistance = dist;
                nearestDriverId = doc.id;
            }
        }
    });
    if (nearestDriverId) {
        await snap.ref.update({
            driverId: nearestDriverId,
            status: 'searching' // keep searching but targeted to a driver
        });
        console.log(`Matched ride ${rideId} to driver ${nearestDriverId} at ${minDistance}km`);
    }
    else {
        await snap.ref.update({ status: 'no_drivers_available' });
    }
    return null;
});
/**
 * Callable quand un chauffeur refuse une course
 */
exports.declineRide = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
    }
    const { rideId } = data;
    const driverId = context.auth.uid;
    if (!rideId) {
        throw new functions.https.HttpsError('invalid-argument', 'Ride ID is required.');
    }
    const db = admin.firestore();
    const rideRef = db.collection('rides').doc(rideId);
    await db.runTransaction(async (transaction) => {
        const rideDoc = await transaction.get(rideRef);
        if (!rideDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Ride not found.');
        }
        const rideData = rideDoc.data();
        if (rideData.driverId !== driverId) {
            throw new functions.https.HttpsError('permission-denied', 'You were not assigned this ride.');
        }
        const declinedBy = rideData.declinedBy || [];
        declinedBy.push(driverId);
        // Unassign driver so that onUpdate or a retry mechanism can pick the next one
        // For simplicity, we just trigger another search by updating dummy field or resetting driverId
        transaction.update(rideRef, {
            driverId: admin.firestore.FieldValue.delete(),
            declinedBy: declinedBy,
            status: 'searching'
        });
    });
    // Since we updated the ride to have no driverId and status='searching',
    // we need another function to re-trigger findNearestDriver, but onCreate won't run.
    // Instead, let's explicitly run the find logic here to save complex triggers.
    const rideSnap = await rideRef.get();
    const rideData = rideSnap.data();
    const driversSnapshot = await db.collection('drivers')
        .where('isOnline', '==', true)
        .where('isValidated', '==', true)
        .get();
    let nearestDriverId = null;
    let minDistance = Infinity;
    const { latitude, longitude } = rideData.origin;
    const declinedBy = rideData.declinedBy || [];
    driversSnapshot.forEach(doc => {
        if (declinedBy.includes(doc.id))
            return;
        const dData = doc.data();
        if (dData.location) {
            const dist = getDistance(latitude, longitude, dData.location.latitude, dData.location.longitude);
            if (dist < minDistance && dist <= 15) {
                minDistance = dist;
                nearestDriverId = doc.id;
            }
        }
    });
    if (nearestDriverId) {
        await rideRef.update({ driverId: nearestDriverId });
    }
    else {
        await rideRef.update({ status: 'no_drivers_available' });
    }
    return { success: true };
});
/**
 * Callable pour terminer une course et traiter le paiement
 */
exports.completeRide = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
    }
    const { rideId } = data;
    const driverId = context.auth.uid;
    const db = admin.firestore();
    const rideRef = db.collection('rides').doc(rideId);
    const driverRef = db.collection('drivers').doc(driverId);
    await db.runTransaction(async (transaction) => {
        const rideDoc = await transaction.get(rideRef);
        if (!rideDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Ride not found.');
        }
        const rideData = rideDoc.data();
        if (rideData.driverId !== driverId) {
            throw new functions.https.HttpsError('permission-denied', 'You are not the driver for this ride.');
        }
        if (rideData.status === 'completed') {
            throw new functions.https.HttpsError('failed-precondition', 'Ride is already completed.');
        }
        const price = rideData.price || 0;
        transaction.update(rideRef, {
            status: 'completed',
            completedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        transaction.set(driverRef, {
            balance: admin.firestore.FieldValue.increment(price),
            totalRides: admin.firestore.FieldValue.increment(1)
        }, { merge: true });
    });
    return { success: true };
});
//# sourceMappingURL=index.js.map