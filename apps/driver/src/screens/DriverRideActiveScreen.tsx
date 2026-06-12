import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import MapView, { Marker, Polyline, UrlTile } from 'react-native-maps';
import firestore from '@react-native-firebase/firestore';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../../passenger/src/context/AuthContext';
import { COLORS, RIDE_STATUS } from '../../../../shared/constants';
import { formatPrice, calculateDistance, getFreeRoute } from '../../../../shared/utils';
import { triggerSOS } from '../../../../shared/utils/emergency';

const { width, height } = Dimensions.get('window');

const DriverRideActiveScreen = ({ route, navigation }: any) => {
  const { rideId } = route.params;
  const { user } = useAuth();
  const [rideData, setRideData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [routeCoords, setRouteCoords] = useState<any[]>([]);
  const mapRef = useRef<MapView>(null);

  // Listen to ride details
  useEffect(() => {
    if (!rideId) return;
    const unsub = firestore().collection('rides').doc(rideId).onSnapshot(doc => {
      if (doc.exists()) {
        const data = doc.data();
        setRideData(data);
        setLoading(false);
      } else {
        Alert.alert("Erreur", "Course introuvable");
        navigation.navigate('Travail');
      }
    });
    return unsub;
  }, [rideId]);

  // Fetch route coordinates
  useEffect(() => {
    if (!rideData) return;
    const fetchRoute = async () => {
      const start = { latitude: rideData.pickup.latitude, longitude: rideData.pickup.longitude };
      const end = { latitude: rideData.destination.latitude, longitude: rideData.destination.longitude };
      const route = await getFreeRoute(start, end);
      setRouteCoords(route);
      if (route.length > 0) {
        setTimeout(() => {
          mapRef.current?.fitToCoordinates(route, { edgePadding: { right: 50, bottom: 250, left: 50, top: 100 } });
        }, 500);
      }
    };
    fetchRoute();
  }, [rideData]);

  const transitionStatus = async () => {
    if (!rideData || !user) return;
    const rideRef = firestore().collection('rides').doc(rideId);
    let nextStatus = '';

    if (rideData.status === RIDE_STATUS.ACCEPTED) {
      nextStatus = RIDE_STATUS.ARRIVED;
    } else if (rideData.status === RIDE_STATUS.ARRIVED) {
      nextStatus = RIDE_STATUS.IN_PROGRESS;
    } else if (rideData.status === RIDE_STATUS.IN_PROGRESS) {
      nextStatus = RIDE_STATUS.COMPLETED;
    }

    if (!nextStatus) return;

    try {
      if (nextStatus === RIDE_STATUS.COMPLETED) {
        // Run safe transaction to complete payment
        const passengerRef = firestore().collection('users').doc(rideData.passengerId);
        const driverRef = firestore().collection('drivers').doc(user.uid);

        await firestore().runTransaction(async (transaction) => {
          const passDoc = await transaction.get(passengerRef);
          const drivDoc = await transaction.get(driverRef);

          const passBalance = passDoc.data()?.walletBalance || 0;
          const drivBalance = drivDoc.data()?.balance || 0;
          const ridePrice = rideData.price || 0;

          // Deduct from passenger and add to driver
          transaction.update(passengerRef, {
            walletBalance: Math.max(0, passBalance - ridePrice),
          });

          transaction.update(driverRef, {
            balance: drivBalance + ridePrice,
            isAvailable: true,
            totalRides: firestore.FieldValue.increment(1),
          });

          transaction.update(rideRef, {
            status: RIDE_STATUS.COMPLETED,
            updatedAt: firestore.FieldValue.serverTimestamp(),
          });

          // Create passenger debit transaction doc
          const passTransRef = passengerRef.collection('transactions').doc();
          transaction.set(passTransRef, {
            amount: ridePrice,
            type: 'ride_payment',
            rideId: rideId,
            createdAt: firestore.FieldValue.serverTimestamp(),
            status: 'completed',
          });
        });

        Alert.alert("Course terminée", "Paiement reçu avec succès !");
        navigation.navigate('Travail');
      } else {
        // Just update status for other transitions
        await rideRef.update({
          status: nextStatus,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
      }
    } catch (error) {
      console.error("Ride state transition error:", error);
      Alert.alert("Erreur", "Impossible de mettre à jour le statut.");
    }
  };

  const handleSOS = () => {
    if (user && rideData) {
      triggerSOS(user.uid, 'driver', rideId);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.PRIMARY}/></View>;

  const getButtonText = () => {
    if (rideData?.status === RIDE_STATUS.ACCEPTED) return "JE SUIS ARRIVÉ";
    if (rideData?.status === RIDE_STATUS.ARRIVED) return "DÉMARRER LA COURSE";
    if (rideData?.status === RIDE_STATUS.IN_PROGRESS) return "TERMINER LA COURSE";
    return "";
  };

  return (
    <View style={styles.container}>
      {/* Map View */}
      <MapView ref={mapRef} style={styles.map} initialRegion={{ latitude: 4.0511, longitude: 9.7679, latitudeDelta: 0.05, longitudeDelta: 0.05 }}>
        <UrlTile urlTemplate="https://a.tile.openstreetmap.org/{z}/{x}/{y}.png" maximumZ={19} />
        {rideData && (
          <>
            <Marker coordinate={{ latitude: rideData.pickup.latitude, longitude: rideData.pickup.longitude }} title="Départ">
              <Icon name="pin" size={30} color={COLORS.PRIMARY} />
            </Marker>
            <Marker coordinate={{ latitude: rideData.destination.latitude, longitude: rideData.destination.longitude }} title="Arrivée">
              <Icon name="flag" size={30} color="#000" />
            </Marker>
          </>
        )}
        {routeCoords.length > 0 && <Polyline coordinates={routeCoords} strokeWidth={6} strokeColor={COLORS.PRIMARY} />}
      </MapView>

      {/* Floating Emergency SOS Button */}
      <TouchableOpacity style={styles.sosButton} onPress={handleSOS}>
        <Text style={styles.sosText}>SOS</Text>
      </TouchableOpacity>

      {/* Bottom Interface Control Panel */}
      <View style={styles.panel}>
        <View style={styles.header}>
          <Icon name="person" size={24} color="#666" />
          <Text style={styles.passengerPhone}>{rideData?.passengerPhone}</Text>
          <View style={{ flex: 1 }} />
          <TouchableOpacity 
            style={styles.chatButton} 
            onPress={() => navigation.navigate('Chat', { rideId, otherPartyName: 'Passager' })}
          >
            <Icon name="chatbubble-ellipses" size={22} color={COLORS.PRIMARY} />
            <Text style={styles.chatText}>CHAT</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Montant à percevoir :</Text>
          <Text style={styles.priceValue}>{formatPrice(rideData?.price)}</Text>
        </View>

        <TouchableOpacity style={styles.actionBtn} onPress={transitionStatus}>
          <Text style={styles.actionBtnText}>{getButtonText()}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  map: { width, height: height - 250 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sosButton: { 
    position: 'absolute', 
    top: 50, 
    right: 20, 
    backgroundColor: COLORS.DANGER, 
    width: 60, 
    height: 60, 
    borderRadius: 30, 
    justifyContent: 'center', 
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 }
  },
  sosText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  panel: { 
    position: 'absolute', 
    bottom: 0, 
    width: '100%', 
    height: 270, 
    backgroundColor: '#FFF', 
    borderTopLeftRadius: 32, 
    borderTopRightRadius: 32, 
    padding: 30,
    elevation: 20
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
  passengerPhone: { fontSize: 16, fontWeight: '700', marginLeft: 10, color: '#000' },
  chatButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#EEE' },
  chatText: { marginLeft: 8, fontWeight: '900', color: '#000', fontSize: 11 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  priceLabel: { fontSize: 13, color: '#AAA', fontWeight: 'bold', letterSpacing: 1 },
  priceValue: { fontSize: 24, fontWeight: '900', color: '#000' },
  actionBtn: { backgroundColor: '#000', height: 60, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  actionBtnText: { color: '#FFF', fontWeight: '900', letterSpacing: 1, fontSize: 15 }
});

export default DriverRideActiveScreen;
