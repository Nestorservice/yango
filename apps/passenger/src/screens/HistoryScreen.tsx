import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../../../../shared/constants';
import { formatPrice } from '../../../../shared/utils';

const HistoryScreen = () => {
  const { user } = useAuth();
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const unsub = firestore()
      .collection('rides')
      .where('passengerId', '==', user.uid)
      .orderBy('createdAt', 'desc')
      .onSnapshot(s => {
        setRides(s.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      });
    return unsub;
  }, [user]);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'completed': return { bg: '#E8F5E9', text: '#2E7D32' };
      case 'cancelled': return { bg: '#FFEBEE', text: '#C62828' };
      default: return { bg: '#FFF3E0', text: '#EF6C00' };
    }
  };

  if (loading) return <ActivityIndicator style={{flex:1}} color={COLORS.PRIMARY}/>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mes Trajets</Text>
      <FlatList
        data={rides}
        keyExtractor={item => item.id}
        renderItem={({ item }) => {
          const style = getStatusStyle(item.status);
          return (
            <TouchableOpacity style={styles.rideCard}>
              <View style={styles.rideHeader}>
                <Text style={styles.date}>{item.createdAt?.toDate().toLocaleDateString('fr-FR')}</Text>
                <View style={[styles.statusBadge, { backgroundColor: style.bg }]}>
                  <Text style={[styles.statusText, { color: style.text }]}>
                    {item.status === 'completed' ? 'Terminé' : item.status === 'cancelled' ? 'Annulé' : 'En cours'}
                  </Text>
                </View>
              </View>
              <Text style={styles.price}>{formatPrice(item.price)}</Text>
              <View style={styles.locationContainer}>
                <View style={styles.dot} />
                <Text style={styles.location} numberOfLines={1}>Point de départ</Text>
              </View>
              <View style={styles.locationContainer}>
                <View style={[styles.dot, { backgroundColor: '#000' }]} />
                <Text style={styles.location} numberOfLines={1}>Destination</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>Aucun trajet effectué pour le moment.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#000', marginBottom: 20 },
  rideCard: { backgroundColor: '#fff', padding: 20, borderRadius: 20, marginBottom: 15, elevation: 2 },
  rideHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  date: { color: '#888', fontSize: 14 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: 'bold' },
  price: { fontSize: 22, fontWeight: 'bold', color: '#000', marginBottom: 15 },
  locationContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.PRIMARY, marginRight: 10 },
  location: { color: '#444', fontSize: 14, flex: 1 },
  empty: { textAlign: 'center', color: '#999', marginTop: 50 }
});

export default HistoryScreen;
