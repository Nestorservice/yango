import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Text, TouchableOpacity, FlatList, Alert } from 'react-native';
import MapView, { Marker, UrlTile } from 'react-native-maps';
import firestore from '@react-native-firebase/firestore';
import Geolocation from '@react-native-community/geolocation';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';
import { COLORS, RIDE_STATUS } from '../../../../shared/constants';
import { formatPrice } from '../../../../shared/utils';

const { width, height } = Dimensions.get('window');

const DriverHomeScreen = () => {
  const { user, userData, updateOnlineStatus } = useAuth();
  const [availableRides, setAvailableRides] = useState<any[]>([]);
  const [activeRide, setActiveRide] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [currentPos, setCurrentPos] = useState<any>(null);

  useEffect(() => {
    let watchId: number;
    if (isOnline && user && !userData?.isBlocked) {
      watchId = Geolocation.watchPosition(
        (pos) => {
          const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
          setCurrentPos(coords);
          firestore().collection('drivers').doc(user.uid).set({
            position: new firestore.GeoPoint(coords.latitude, coords.longitude),
            isOnline: true,
            updatedAt: firestore.FieldValue.serverTimestamp(),
          }, { merge: true });
        },
        (err) => console.error(err),
        { enableHighAccuracy: true, distanceFilter: 10 }
      );
    }
    return () => { if (watchId) Geolocation.clearWatch(watchId); };
  }, [isOnline, user, userData]);

  // Écran de blocage si le chauffeur est banni
  if (userData?.isBlocked) {
    return (
      <View style={styles.blockContainer}>
        <Icon name="lock-closed" size={80} color={COLORS.PRIMARY} />
        <Text style={styles.blockTitle}>Compte Suspendu</Text>
        <Text style={styles.blockText}>Votre accès au réseau CityGo a été suspendu par l'administration. Veuillez contacter le support pour plus d'informations.</Text>
        <TouchableOpacity style={styles.supportBtn} onPress={() => Alert.alert('Aide', 'Contactez le +237 6XX XXX XXX')}>
          <Text style={styles.supportText}>CONTACTER LE SUPPORT</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView style={styles.map} initialRegion={{ latitude: 4.0511, longitude: 9.7679, latitudeDelta: 0.05, longitudeDelta: 0.05 }}>
        <UrlTile urlTemplate="https://a.tile.openstreetmap.org/{z}/{x}/{y}.png" maximumZ={19} />
        {currentPos && (
          <Marker coordinate={currentPos}>
            <View style={styles.myMarker}><Icon name="navigate" size={20} color="#fff" /></View>
          </Marker>
        )}
      </MapView>

      <View style={styles.header}>
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>{isOnline ? 'VOUS ÊTES EN LIGNE' : 'VOUS ÊTES HORS LIGNE'}</Text>
          <TouchableOpacity 
            style={[styles.toggleBtn, { backgroundColor: isOnline ? COLORS.PRIMARY : '#000' }]} 
            onPress={() => { setIsOnline(!isOnline); }}
          >
            <Text style={styles.toggleText}>{isOnline ? 'DECONNEXION' : 'SE METTRE EN LIGNE'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  map: { width, height },
  myMarker: { backgroundColor: COLORS.PRIMARY, padding: 8, borderRadius: 20, elevation: 5, borderWidth: 2, borderColor: '#FFF' },
  header: { position: 'absolute', top: 60, width: '100%', paddingHorizontal: 20 },
  statusCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 24, elevation: 10, alignItems: 'center' },
  statusLabel: { fontSize: 10, fontWeight: '900', color: '#AAA', marginBottom: 15, letterSpacing: 2 },
  toggleBtn: { width: '100%', padding: 18, borderRadius: 16, alignItems: 'center' },
  toggleText: { color: '#FFF', fontWeight: '900', letterSpacing: 1 },
  blockContainer: { flex: 1, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', padding: 40 },
  blockTitle: { fontSize: 24, fontWeight: '900', color: '#000', marginTop: 30 },
  blockText: { fontSize: 14, color: '#666', textAlign: 'center', marginTop: 15, lineHeight: 22 },
  supportBtn: { backgroundColor: '#000', padding: 20, borderRadius: 15, marginTop: 40, width: '100%', alignItems: 'center' },
  supportText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 }
});

export default DriverHomeScreen;
