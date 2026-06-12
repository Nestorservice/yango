import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Text, TouchableOpacity, Alert, Modal } from 'react-native';
import MapView, { Marker, UrlTile } from 'react-native-maps';
import firestore from '@react-native-firebase/firestore';
import Geolocation from '@react-native-community/geolocation';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../../passenger/src/context/AuthContext';
import { COLORS, RIDE_STATUS } from '../../../../shared/constants';
import { formatPrice } from '../../../../shared/utils';

const { width, height } = Dimensions.get('window');

const DriverHomeScreen = ({ navigation }: any) => {
  const { user, userData, updateOnlineStatus } = useAuth();
  const [isOnline, setIsOnline] = useState(false);
  const [currentPos, setCurrentPos] = useState<any>(null);

  // Match / Booking States
  const [requestedRide, setRequestedRide] = useState<any>(null);
  const [countdown, setCountdown] = useState(30);

  // Update offline status when leaving
  useEffect(() => {
    return () => {
      if (user) {
        updateOnlineStatus(false);
      }
    };
  }, [user]);

  // Position Watcher
  useEffect(() => {
    let watchId: number;
    if (isOnline && user && !userData?.isBlocked) {
      updateOnlineStatus(true);
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
    } else {
      updateOnlineStatus(false);
    }
    return () => { if (watchId) Geolocation.clearWatch(watchId); };
  }, [isOnline, user, userData]);

  // Listen to incoming rides assigned to this driver
  useEffect(() => {
    if (!user || !isOnline) {
      setRequestedRide(null);
      return;
    }

    const unsubscribe = firestore()
      .collection('rides')
      .where('driverId', '==', user.uid)
      .where('status', '==', RIDE_STATUS.SEARCHING)
      .limit(1)
      .onSnapshot(snapshot => {
        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          setRequestedRide({ id: doc.id, ...doc.data() });
          setCountdown(30);
        } else {
          setRequestedRide(null);
        }
      });

    return unsubscribe;
  }, [user, isOnline]);

  // Timer loop for ride request
  useEffect(() => {
    let timer: any;
    if (requestedRide && countdown > 0) {
      timer = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    } else if (requestedRide && countdown === 0) {
      handleDecline();
    }
    return () => clearInterval(timer);
  }, [requestedRide, countdown]);

  const handleDecline = async () => {
    if (!requestedRide) return;
    const rideId = requestedRide.id;
    setRequestedRide(null);
    try {
      await firestore().collection('rides').doc(rideId).update({
        driverId: firestore.FieldValue.delete(),
        declinedDrivers: firestore.FieldValue.arrayUnion(user.uid),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error("Failed to decline ride:", error);
    }
  };

  const handleAccept = async () => {
    if (!requestedRide || !user) return;
    const rideId = requestedRide.id;
    const rideRef = firestore().collection('rides').doc(rideId);
    
    try {
      const driverDoc = await firestore().collection('drivers').doc(user.uid).get();
      const drData = driverDoc.data() || {};

      await firestore().runTransaction(async (transaction) => {
        transaction.update(rideRef, {
          status: RIDE_STATUS.ACCEPTED,
          driverName: drData.name || 'Partenaire CityGo',
          driverPhone: drData.phone || '',
          driverPlate: drData.plateNumber || '',
          driverModel: drData.vehicleModel || '',
          driverColor: drData.vehicleColor || '',
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
        
        transaction.update(firestore().collection('drivers').doc(user.uid), {
          isAvailable: false,
        });
      });

      setRequestedRide(null);
      navigation.navigate('DriverRideActive', { rideId });
    } catch (error) {
      console.error("Failed to accept ride:", error);
      Alert.alert("Erreur", "La course n'est plus disponible ou a été annulée.");
    }
  };

  // Block screen if account banned
  if (userData?.isBlocked) {
    return (
      <View style={styles.blockContainer}>
        <Icon name="lock-closed" size={80} color={COLORS.PRIMARY} />
        <Text style={styles.blockTitle}>Compte Suspendu</Text>
        <Text style={styles.blockText}>Votre accès au réseau CityGo a été suspendu par l'administration. Veuillez contacter le support pour plus d'informations.</Text>
        <TouchableOpacity style={styles.supportBtn} onPress={() => Alert.alert('Aide', 'Contactez le +237 600 00 00 00')}>
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

      {/* Ride Request Fullscreen Modal */}
      <Modal visible={!!requestedRide} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.timerCircle}>
              <Text style={styles.timerText}>{countdown}</Text>
            </View>
            
            <Text style={styles.modalTitle}>NOUVELLE COURSE !</Text>
            <Text style={styles.modalPrice}>{formatPrice(requestedRide?.price || 0)}</Text>
            
            <View style={styles.divider} />
            
            <View style={styles.locationRow}>
              <Icon name="pin" size={24} color={COLORS.PRIMARY} />
              <View style={{ marginLeft: 15 }}>
                <Text style={styles.locationLabel}>DÉPART (PICKUP)</Text>
                <Text style={styles.locationText}>Douala, Cameroun</Text>
              </View>
            </View>

            <View style={[styles.locationRow, { marginTop: 20 }]}>
              <Icon name="flag" size={24} color="#000" />
              <View style={{ marginLeft: 15 }}>
                <Text style={styles.locationLabel}>ARRIVÉE (DESTINATION)</Text>
                <Text style={styles.locationText}>Douala, Cameroun</Text>
              </View>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity style={styles.declineBtn} onPress={handleDecline}>
                <Text style={styles.declineText}>REFUSER</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.acceptBtn} onPress={handleAccept}>
                <Text style={styles.acceptText}>ACCEPTER</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  supportText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  
  // Modal request styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 35, alignItems: 'center' },
  timerCircle: { width: 70, height: 70, borderRadius: 35, borderWidth: 4, borderColor: COLORS.PRIMARY, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  timerText: { fontSize: 24, fontWeight: '900', color: '#000' },
  modalTitle: { fontSize: 13, fontWeight: '900', color: '#AAA', letterSpacing: 2, marginBottom: 10 },
  modalPrice: { fontSize: 36, fontWeight: '900', color: '#000', marginBottom: 25 },
  divider: { width: '100%', height: 1, backgroundColor: '#EEE', marginBottom: 25 },
  locationRow: { flexDirection: 'row', width: '100%', alignItems: 'center' },
  locationLabel: { fontSize: 10, fontWeight: '900', color: '#AAA', letterSpacing: 1 },
  locationText: { fontSize: 16, fontWeight: '700', color: '#333', marginTop: 2 },
  actions: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', marginTop: 35 },
  declineBtn: { flex: 0.47, height: 60, borderRadius: 16, backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#EEE', justifyContent: 'center', alignItems: 'center' },
  declineText: { fontSize: 15, fontWeight: '900', color: COLORS.GRAY, letterSpacing: 1 },
  acceptBtn: { flex: 0.47, height: 60, borderRadius: 16, backgroundColor: COLORS.PRIMARY, justifyContent: 'center', alignItems: 'center' },
  acceptText: { fontSize: 15, fontWeight: '900', color: '#FFF', letterSpacing: 1 }
});

export default DriverHomeScreen;
