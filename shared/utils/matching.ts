import firestore from '@react-native-firebase/firestore';
import { calculateDistance } from './index';

const MAX_SEARCH_RADIUS_KM = 15;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

/**
 * Client-side driver matching — replaces Firebase Cloud Function `findNearestDriver`.
 * Called by the passenger after creating a ride document with status='searching'.
 *
 * How it works:
 * 1. Fetch all online, validated, available drivers from Firestore
 * 2. Calculate distance from the ride pickup to each driver
 * 3. Exclude drivers who already declined this ride
 * 4. Pick the closest driver within 15km radius
 * 5. Assign driverId on the ride document so the driver gets notified via onSnapshot
 * 6. If no driver found, retry up to 3 times with a 5 second delay
 * 7. After all retries, mark ride as 'no_drivers_available'
 */
export const findAndAssignNearestDriver = async (
  rideId: string,
  pickupLatitude: number,
  pickupLongitude: number,
): Promise<{ success: boolean; driverId?: string }> => {
  const rideRef = firestore().collection('rides').doc(rideId);

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    // Re-read ride doc to get fresh declinedDrivers list & current status
    const rideSnap = await rideRef.get();
    if (!rideSnap.exists) return { success: false };

    const rideData = rideSnap.data();
    // If ride was cancelled or already accepted by another flow, stop searching
    if (rideData?.status !== 'searching') {
      return { success: false };
    }

    const declinedDrivers: string[] = rideData?.declinedDrivers || [];

    // Fetch all online, validated drivers
    const driversSnapshot = await firestore()
      .collection('drivers')
      .where('isOnline', '==', true)
      .where('isValidated', '==', true)
      .get();

    let nearestDriverId: string | null = null;
    let minDistance = Infinity;

    driversSnapshot.forEach(doc => {
      // Skip declined drivers
      if (declinedDrivers.includes(doc.id)) return;

      const driverData = doc.data();

      // Skip drivers currently on a ride (not available)
      if (driverData.isAvailable === false) return;

      const pos = driverData.position;
      if (pos && pos.latitude && pos.longitude) {
        const dist = calculateDistance(
          pickupLatitude,
          pickupLongitude,
          pos.latitude,
          pos.longitude,
        );
        if (dist < minDistance && dist <= MAX_SEARCH_RADIUS_KM) {
          minDistance = dist;
          nearestDriverId = doc.id;
        }
      }
    });

    if (nearestDriverId) {
      // Assign driver to ride — driver's onSnapshot listener will pick it up
      await rideRef.update({
        driverId: nearestDriverId,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });
      console.log(
        `[Matching] Assigned driver ${nearestDriverId} to ride ${rideId} (${minDistance.toFixed(1)}km, attempt ${attempt + 1})`,
      );
      return { success: true, driverId: nearestDriverId };
    }

    // No driver found on this attempt — wait before retrying
    if (attempt < MAX_RETRIES - 1) {
      console.log(
        `[Matching] No driver found for ride ${rideId} on attempt ${attempt + 1}, retrying in ${RETRY_DELAY_MS / 1000}s...`,
      );
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }

  // All retries exhausted — mark as no drivers available
  await rideRef.update({
    status: 'no_drivers_available',
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });
  console.log(`[Matching] No drivers available for ride ${rideId} after ${MAX_RETRIES} attempts`);
  return { success: false };
};

/**
 * Re-match after a driver declines. Called from the driver's handleDecline.
 * This replaces the Cloud Function `declineRide` re-matching logic.
 */
export const retryMatchAfterDecline = async (rideId: string): Promise<void> => {
  const rideRef = firestore().collection('rides').doc(rideId);
  const rideSnap = await rideRef.get();
  if (!rideSnap.exists) return;

  const rideData = rideSnap.data();
  if (!rideData || rideData.status !== 'searching') return;

  const pickup = rideData.pickup;
  if (!pickup) return;

  // Reuse the same matching logic
  await findAndAssignNearestDriver(rideId, pickup.latitude, pickup.longitude);
};
