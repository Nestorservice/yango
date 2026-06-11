import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import Icon from 'react-native-vector-icons/Ionicons';
import { COLORS, RIDE_STATUS } from '../../../../shared/constants';
import { formatPrice } from '../../../../shared/utils';

const BookingScreen = ({ route, navigation }: any) => {
  const { rideId } = route.params;
  const [rideData, setRideData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);

  useEffect(() => {
    if (!rideId) return;
    const unsub = firestore().collection('rides').doc(rideId).onSnapshot(doc => {
      if (doc.exists) {
        const data = doc.data();
        setRideData(data);
        if (data?.status === RIDE_STATUS.COMPLETED && !showRating) {
          setShowRating(true);
        }
        setLoading(false);
      }
    });
    return unsub;
  }, [rideId]);

  const submitRating = async () => {
    try {
      await firestore().collection('rides').doc(rideId).update({
        passengerRating: rating,
        ratedAt: firestore.FieldValue.serverTimestamp()
      });
      navigation.navigate('Accueil');
    } catch (e) {
      navigation.navigate('Accueil');
    }
  };

  if (loading) return <View style={styles.loaderContainer}><ActivityIndicator size="large" color={COLORS.PRIMARY}/></View>;

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.statusLabel}>
          {rideData?.status === RIDE_STATUS.SEARCHING ? 'RECHERCHE EN COURS...' : 
           rideData?.status === RIDE_STATUS.ACCEPTED ? 'LE CHAUFFEUR ARRIVE' :
           rideData?.status === RIDE_STATUS.IN_PROGRESS ? 'TRAJET EN COURS' : 'COURSE TERMINÉE'}
        </Text>
        
        <View style={styles.mainInfo}>
          <Icon name={rideData?.status === RIDE_STATUS.SEARCHING ? 'search' : 'car-sport'} size={60} color={COLORS.PRIMARY} />
          <Text style={styles.price}>{formatPrice(rideData?.price)}</Text>
        </View>

        {rideData?.status === RIDE_STATUS.SEARCHING && (
          <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelText}>ANNULER LA COMMANDE</Text>
          </TouchableOpacity>
        )}
      </View>

      <Modal visible={showRating} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.ratingCard}>
            <Text style={styles.ratingTitle}>Comment était votre trajet ?</Text>
            <Text style={styles.ratingSub}>Notez votre chauffeur CityGo</Text>
            
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map(s => (
                <TouchableOpacity key={s} onPress={() => setRating(s)}>
                  <Icon name={rating >= s ? 'star' : 'star-outline'} size={40} color={COLORS.PRIMARY} />
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={submitRating}>
              <Text style={styles.submitText}>VALIDER</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 25 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' },
  card: { backgroundColor: '#FFF', padding: 35, borderRadius: 32, alignItems: 'center', elevation: 20 },
  statusLabel: { fontSize: 12, fontWeight: '900', color: COLORS.PRIMARY, letterSpacing: 2, marginBottom: 30 },
  mainInfo: { alignItems: 'center', marginBottom: 40 },
  price: { fontSize: 32, fontWeight: '900', color: '#000', marginTop: 20 },
  cancelBtn: { padding: 15 },
  cancelText: { color: '#999', fontWeight: 'bold', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 25 },
  ratingCard: { backgroundColor: '#FFF', padding: 40, borderRadius: 32, alignItems: 'center' },
  ratingTitle: { fontSize: 22, fontWeight: '900', color: '#000', textAlign: 'center' },
  ratingSub: { fontSize: 14, color: '#999', marginTop: 10, marginBottom: 30 },
  starsRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 40 },
  submitBtn: { backgroundColor: '#000', width: '100%', padding: 20, borderRadius: 16, alignItems: 'center' },
  submitText: { color: '#FFF', fontWeight: '900', letterSpacing: 1 }
});

export default BookingScreen;
