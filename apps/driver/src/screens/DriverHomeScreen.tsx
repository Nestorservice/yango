import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Text, TouchableOpacity, Alert, Modal } from 'react-native';
import MapView, { Marker, UrlTile } from 'react-native-maps';
import firestore from '@react-native-firebase/firestore';
import Geolocation from '@react-native-community/geolocation';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../../passenger/src/context/AuthContext';
import { COLORS, RIDE_STATUS } from '../../../../shared/constants';
import { formatPrice } from '../../../../shared/utils';
import { retryMatchAfterDecline } from '../../../../shared/utils/matching';

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
      // Client-side re-matching: find next nearest driver
      retryMatchAfterDecline(rideId)
        .catch(err => console.error('[Matching] Re-match error:', err));
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

      {/* Ride Request Immersive Radar Modal */}
      <Modal visible={!!requestedRide} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.radarContainer}>
            {/* Radar Animation Effect (Decorative) */}
            <View style={styles.radarWave} />
            <View style={[styles.radarWave, { transform: [{ scale: 1.5 }], opacity: 0.1 }]}>
               <View style={styles.radarDot} />
            </View>
            
            <View style={styles.modalContent}>
              <View style={styles.timerContainer}>
                <View style={[styles.timerCircle, { borderColor: countdown < 10 ? '#F44336' : COLORS.PRIMARY }]}>
                  <Text style={[styles.timerText, { color: countdown < 10 ? '#F44336' : '#000' }]}>{countdown}</Text>
                </View>
                <View style={styles.pulseBadge}>
                  <Text style={styles.pulseText}>EN DIRECT</Text>
                </View>
              </View>
              
              <Text style={styles.modalSubTitle}>VOUS AVEZ UNE OFFRE DE COURSE</Text>
              <Text style={styles.modalPrice}>{formatPrice(requestedRide?.price || 0)}</Text>
              
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Icon name="navigate-circle" size={20} color={COLORS.PRIMARY} />
                  <Text style={styles.statValue}>{requestedRide?.distance?.toFixed(1) || '2.4'} km</Text>
                  <Text style={styles.statLabel}>Distance</Text>
                </View>
                <View style={styles.dividerVertical} />
                <View style={styles.statItem}>
                  <Icon name="time" size={20} color={COLORS.PRIMARY} />
                  <Text style={styles.statValue}>~ {Math.round(requestedRide?.distance * 3) || '8'} min</Text>
                  <Text style={styles.statLabel}>Arrivée</Text>
                </View>
                <View style={styles.dividerVertical} />
                <View style={styles.statItem}>
                  <Icon name="star" size={20} color={COLORS.PRIMARY} />
                  <Text style={styles.statValue}>4.9</Text>
                  <Text style={styles.statLabel}>Note</Text>
                </View>
              </View>

              <View style={styles.locationBox}>
                <View style={styles.locationPoint}>
                  <View style={styles.dotStart} />
                  <View style={styles.lineConnector} />
                  <View style={styles.dotEnd} />
                </View>
                <View style={styles.locationLabels}>
                  <View>
                    <Text style={styles.locLabelMini}>DÉPART</Text>
                    <Text style={styles.locMainText} numberOfLines={1}>{requestedRide?.pickupAddress || 'Position Actuelle'}</Text>
                  </View>
                  <View style={{ marginTop: 25 }}>
                    <Text style={styles.locLabelMini}>DESTINATION</Text>
                    <Text style={styles.locMainText} numberOfLines={1}>{requestedRide?.destinationAddress || 'Centre Ville'}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.actions}>
                <TouchableOpacity style={styles.declineBtn} onPress={handleDecline}>
                  <Text style={styles.declineText}>IGNORER</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.acceptBtn} onPress={handleAccept}>
                  <Text style={styles.acceptText}>ACCEPTER L'OFFRE</Text>
                  <Icon name="chevron-forward" size={20} color="#FFF" style={{ marginLeft: 10 }} />
                </TouchableOpacity>
              </View>
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
  
  // Immersive Modal request styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  radarContainer: { width: '100%', height: '85%', justifyContent: 'flex-end', alignItems: 'center' },
  radarWave: { position: 'absolute', bottom: height * 0.3, width: width * 1.5, height: width * 1.5, borderRadius: width * 0.75, borderWidth: 2, borderColor: COLORS.PRIMARY, opacity: 0.2 },
  radarDot: { position: 'absolute', top: 50, left: 100, width: 15, height: 15, borderRadius: 8, backgroundColor: COLORS.PRIMARY, shadowColor: COLORS.PRIMARY, shadowOpacity: 1, shadowRadius: 10, elevation: 20 },
  
  modalContent: { backgroundColor: '#FFF', width: '100%', borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 30, paddingBottom: 50, elevation: 25 },
  timerContainer: { position: 'absolute', top: -45, alignSelf: 'center', alignItems: 'center' },
  timerCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#FFF', borderWidth: 5, justifyContent: 'center', alignItems: 'center', elevation: 15, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10 },
  timerText: { fontSize: 32, fontWeight: '900' },
  pulseBadge: { backgroundColor: '#F44336', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: -15, elevation: 16 },
  pulseText: { color: '#FFF', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  
  modalSubTitle: { fontSize: 11, fontWeight: '900', color: '#AAA', letterSpacing: 2, textAlign: 'center', marginTop: 45 },
  modalPrice: { fontSize: 48, fontWeight: '900', color: '#000', textAlign: 'center', marginVertical: 10 },
  
  statsRow: { flexDirection: 'row', backgroundColor: '#F8F8F8', borderRadius: 20, padding: 20, marginVertical: 25, justifyContent: 'space-around', alignItems: 'center' },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: '900', color: '#000', marginTop: 5 },
  statLabel: { fontSize: 10, fontWeight: '700', color: '#AAA', marginTop: 2 },
  dividerVertical: { width: 1, height: 30, backgroundColor: '#DDD' },

  locationBox: { flexDirection: 'row', paddingHorizontal: 10, marginBottom: 30 },
  locationPoint: { width: 20, alignItems: 'center', paddingVertical: 5 },
  dotStart: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.PRIMARY },
  lineConnector: { width: 2, flex: 1, backgroundColor: '#EEE', marginVertical: 4 },
  dotEnd: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: '#000', backgroundColor: '#FFF' },
  locationLabels: { flex: 1, marginLeft: 20 },
  locLabelMini: { fontSize: 9, fontWeight: '900', color: '#AAA', letterSpacing: 1 },
  locMainText: { fontSize: 16, fontWeight: '700', color: '#333', marginTop: 4 },

  actions: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
  declineBtn: { flex: 0.35, height: 70, borderRadius: 20, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  declineText: { fontSize: 14, fontWeight: '900', color: '#999', letterSpacing: 1 },
  acceptBtn: { flex: 0.6, height: 70, borderRadius: 20, backgroundColor: COLORS.PRIMARY, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', elevation: 10, shadowColor: COLORS.PRIMARY, shadowOpacity: 0.3, shadowRadius: 10 },
  acceptText: { fontSize: 16, fontWeight: '900', color: '#FFF', letterSpacing: 1 }
});

export default DriverHomeScreen;
