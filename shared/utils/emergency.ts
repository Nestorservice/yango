import { Alert, Platform, PermissionsAndroid } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import Geolocation from '@react-native-community/geolocation';

// NOTE: Pour utiliser les vraies photos, installez 'react-native-image-picker'
// et décommentez la partie correspondante.

const requestEmergencyPermissions = async () => {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.CAMERA,
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);
      return (
        granted['android.permission.CAMERA'] === PermissionsAndroid.RESULTS.GRANTED &&
        granted['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED
      );
    } catch (err) {
      console.warn(err);
      return false;
    }
  }
  return true;
};

export const triggerSOS = async (userId: string, userRole: string, rideId?: string) => {
  const hasPermissions = await requestEmergencyPermissions();
  if (!hasPermissions) {
    Alert.alert("Permissions manquantes", "L'application a besoin de la caméra et de la position pour le SOS.");
  }

  const confirmSOS = () => {
    return new Promise((resolve) => {
      Alert.alert(
        '🚨 URGENCE SOS',
        'Voulez-vous vraiment envoyer une alerte de sécurité ?',
        [
          { text: 'Annuler', onPress: () => resolve({ proceed: false }), style: 'cancel' },
          { text: 'SOS + PHOTO', onPress: () => resolve({ proceed: true, withPhoto: true }), style: 'destructive' },
          { text: 'SOS UNIQUEMENT', onPress: () => resolve({ proceed: true, withPhoto: false }), style: 'destructive' },
        ]
      );
    });
  };

  const decision: any = await confirmSOS();
  if (!decision.proceed) return;

  let photoUrls: string[] = [];

  // Simulation d'upload de photo si 'withPhoto' est choisi
  // En situation réelle, on utiliserait ImagePicker ici
  if (decision.withPhoto) {
    Alert.alert("Photo SOS", "Prenez une photo de la situation si possible. (Simulation: Upload d'une photo témoin)");
    // Mock URL pour le test
    photoUrls.push("https://firebasestorage.googleapis.com/v0/b/yango-ecfa9.appspot.com/o/emergency_proofs%2Fsample_alert.jpg?alt=media");
  }

  // Demander la position précise pour le SOS
  Geolocation.getCurrentPosition(
    async (position) => {
      try {
        const alertId = `sos_${Date.now()}`;
        await firestore().collection('emergency_alerts').doc(alertId).set({
          userId,
          userRole,
          rideId: rideId || 'no_active_ride',
          location: new firestore.GeoPoint(position.coords.latitude, position.coords.longitude),
          status: 'pending',
          photoUrls: photoUrls,
          createdAt: firestore.FieldValue.serverTimestamp(),
          message: decision.withPhoto ? 'Alerte avec preuve photo jointe' : 'Alerte déclenchée manuellement',
        });
        
        Alert.alert(
          'ALERTE ENVOYÉE',
          'Votre position et vos preuves ont été partagées. L\'assistance arrive.'
        );
      } catch (error) {
        console.error('Error triggering SOS:', error);
        Alert.alert('Erreur', 'Impossible d\'envoyer l\'alerte. Appelez le 17.');
      }
    },
    (error) => {
      console.error('Geolocation error during SOS:', error);
      Alert.alert('Erreur', 'Localisation impossible. Appelez les secours.');
    },
    { enableHighAccuracy: true, timeout: 5000 }
  );
};
