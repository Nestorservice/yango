import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import Icon from 'react-native-vector-icons/Ionicons';
import { COLORS, RIDE_STATUS } from '../../../../shared/constants';
import { formatPrice } from '../../../../shared/utils';
import { useAuth } from '../context/AuthContext';
import { triggerSOS } from '../../../../shared/utils/emergency';

const BookingScreen = ({ route, navigation }: any) => {
  const { rideId } = route.params;
  const { user } = useAuth();
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

        {rideData?.status !== RIDE_STATUS.SEARCHING && (
          <View style={styles.driverInfoContainer}>
            <View style={styles.divider} />
            <Text style={styles.driverSectionTitle}>VOTRE CHAUFFEUR</Text>
            
            <View style={styles.driverDetailsRow}>
              <Icon name="person-circle" size={50} color={COLORS.PRIMARY} />
              <View style={{ marginLeft: 15, flex: 1 }}>
                <Text style={styles.driverName}>{rideData?.driverName || 'Partenaire CityGo'}</Text>
                <Text style={styles.vehicleText}>
                  {rideData?.driverModel} • {rideData?.driverColor}
                </Text>
                <Text style={styles.plateText}>{rideData?.driverPlate}</Text>
              </View>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity 
                style={styles.chatBtn} 
                onPress={() => navigation.navigate('Chat', { rideId, otherPartyName: 'Chauffeur' })}
              >
                <Icon name="chatbubble-ellipses" size={20} color="#000" />
                <Text style={styles.actionBtnText}>CHAT</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.sosBtn} 
                onPress={() => triggerSOS(user.uid, 'passenger', rideId)}
              >
                <Icon name="warning" size={20} color="#fff" />
                <Text style={[styles.actionBtnText, { color: '#fff' }]}>SOS</Text>
              </TouchableOpacity>
            </View>
          </View>
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
  submitText: { color: '#FFF', fontWeight: '900', letterSpacing: 1 },
  driverInfoContainer: { width: '100%', alignItems: 'center', marginTop: 10 },
  divider: { width: '100%', height: 1, backgroundColor: '#EEE', marginVertical: 20 },
  driverSectionTitle: { fontSize: 10, fontWeight: '900', color: '#AAA', letterSpacing: 2, marginBottom: 15 },
  driverDetailsRow: { flexDirection: 'row', alignItems: 'center', width: '100%', paddingHorizontal: 10 },
  driverName: { fontSize: 18, fontWeight: '900', color: '#000' },
  vehicleText: { fontSize: 13, color: '#666', marginTop: 3, fontWeight: '600' },
  plateText: { fontSize: 11, fontWeight: '900', color: COLORS.PRIMARY, marginTop: 3, letterSpacing: 1 },
  actionRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', marginTop: 25 },
  chatBtn: { flex: 0.47, height: 50, borderRadius: 12, backgroundColor: '#F0F0F0', flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  sosBtn: { flex: 0.47, height: 50, borderRadius: 12, backgroundColor: COLORS.DANGER, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  actionBtnText: { marginLeft: 8, fontWeight: 'bold', fontSize: 13, color: '#000' }
});

export default BookingScreen;
