import { Alert, Platform, PermissionsAndroid } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import Geolocation from '@react-native-community/geolocation';

export const triggerSOS = async (userId: string, userRole: string, rideId?: string) => {
  const confirmSOS = () => {
    return new Promise((resolve) => {
      Alert.alert(
        '🚨 URGENCE SOS',
        'Voulez-vous vraiment envoyer une alerte de sécurité ? Les autorités et le centre de contrôle seront informés.',
        [
          { text: 'Annuler', onPress: () => resolve(false), style: 'cancel' },
          { text: 'ENVOYER L\'ALERTE', onPress: () => resolve(true), style: 'destructive' },
        ]
      );
    });
  };

  const proceed = await confirmSOS();
  if (!proceed) return;

  // Demander la position précise pour le SOS
  Geolocation.getCurrentPosition(
    async (position) => {
      try {
        await firestore().collection('emergency_alerts').add({
          userId,
          userRole,
          rideId: rideId || 'no_active_ride',
          location: new firestore.GeoPoint(position.coords.latitude, position.coords.longitude),
          status: 'pending',
          createdAt: firestore.FieldValue.serverTimestamp(),
          message: 'Alerte déclenchée manuellement via le bouton SOS',
        });
        
        Alert.alert(
          'ALERTE ENVOYÉE',
          'Votre position a été partagée. Restez calme, l\'assistance est en route.'
        );
      } catch (error) {
        console.error('Error triggering SOS:', error);
        Alert.alert('Erreur', 'Impossible d\'envoyer l\'alerte. Appelez le 17 (Police).');
      }
    },
    (error) => {
      console.error('Geolocation error during SOS:', error);
      Alert.alert('Erreur', 'Localisation impossible. Appelez immédiatement les secours.');
    },
    { enableHighAccuracy: true, timeout: 5000 }
  );
};
