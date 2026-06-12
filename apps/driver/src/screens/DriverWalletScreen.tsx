import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../../passenger/src/context/AuthContext';
import { COLORS } from '../../../../shared/constants';
import { formatPrice } from '../../../../shared/utils';

const DriverWalletScreen = () => {
  const { user, userData } = useAuth();
  const [balance, setBalance] = useState(0);
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    // Écouter le profil chauffeur pour le solde
    const unsubProfile = firestore().collection('drivers').doc(user.uid).onSnapshot(doc => {
      if (doc.exists) setBalance(doc.data()?.balance || 0);
    });

    // Écouter les courses payées
    const unsubRides = firestore()
      .collection('rides')
      .where('driverId', '==', user.uid)
      .where('status', '==', 'completed')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .onSnapshot(s => {
        setRides(s.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      });

    return () => { unsubProfile(); unsubRides(); };
  }, [user]);

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.PRIMARY}/></View>;

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.label}>SOLDE DISPONIBLE</Text>
        <Text style={styles.balance}>{formatPrice(balance)}</Text>
        <TouchableOpacity style={styles.withdrawBtn}>
           <Text style={styles.withdrawText}>DEMANDER UN RETRAIT</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>HISTORIQUE DES GAINS</Text>
      <FlatList
        data={rides}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.rideItem}>
            <View style={styles.iconBox}><Icon name="car" size={20} color={COLORS.PRIMARY}/></View>
            <View style={{ flex: 1, marginLeft: 15 }}>
              <Text style={styles.rideDate}>{item.createdAt?.toDate().toLocaleDateString()}</Text>
              <Text style={styles.rideId}>Course CityGo</Text>
            </View>
            <Text style={styles.ridePrice}>+{formatPrice(item.price)}</Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF', padding: 25 },
  card: { backgroundColor: '#000', padding: 35, borderRadius: 32, alignItems: 'center', marginBottom: 40, elevation: 10 },
  label: { color: '#AAA', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  balance: { color: '#FFF', fontSize: 36, fontWeight: '900', marginVertical: 15 },
  withdrawBtn: { backgroundColor: COLORS.PRIMARY, paddingHorizontal: 25, paddingVertical: 12, borderRadius: 12 },
  withdrawText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '900', color: '#CCC', marginBottom: 25, letterSpacing: 1 },
  rideItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  iconBox: { width: 45, height: 45, backgroundColor: '#F9F9F9', borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  rideDate: { fontSize: 15, fontWeight: '700', color: '#333' },
  rideId: { fontSize: 11, color: '#AAA', marginTop: 3, fontWeight: 'bold' },
  ridePrice: { fontSize: 18, fontWeight: '900', color: '#4CAF50' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

export default DriverWalletScreen;
