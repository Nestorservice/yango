import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { useAuth } from '../../../passenger/src/context/AuthContext';
import { COLORS } from '../../../../shared/constants';
import { formatPrice } from '../../../../shared/utils';

const DriverHistoryScreen = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const unsub = firestore()
      .collection('rides')
      .where('driverId', '==', user.uid)
      .where('status', '==', 'completed')
      .orderBy('createdAt', 'desc')
      .onSnapshot(s => {
        setHistory(s.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      });
    return unsub;
  }, [user]);

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.PRIMARY}/></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mes Gains</Text>
      <FlatList
        data={history}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View>
              <Text style={styles.date}>{item.createdAt?.toDate().toLocaleDateString()}</Text>
              <Text style={styles.rideId}>Course #{item.id.substring(0,6)}</Text>
            </View>
            <Text style={styles.price}>+{formatPrice(item.price)}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Aucune course terminée pour le moment.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F9F9', padding: 25 },
  title: { fontSize: 28, fontWeight: '900', color: '#000', marginBottom: 25 },
  card: { backgroundColor: '#FFF', padding: 20, borderRadius: 20, marginBottom: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 2 },
  date: { fontSize: 15, fontWeight: '700', color: '#333' },
  rideId: { fontSize: 12, color: '#AAA', marginTop: 3 },
  price: { fontSize: 18, fontWeight: '900', color: '#4CAF50' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { textAlign: 'center', color: '#999', marginTop: 50 }
});

export default DriverHistoryScreen;
