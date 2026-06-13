import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  TextInput, Alert, ActivityIndicator, SafeAreaView, Dimensions
} from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import firestore from '@react-native-firebase/firestore';
import Icon from 'react-native-vector-icons/Ionicons';
import { COLORS } from '../../../../shared/constants';
import { formatPrice } from '../../../../shared/utils';

const { width } = Dimensions.get('window');

const AdminDashboardScreen = () => {
  const [stats, setStats] = useState({ activeRides: 0, onlineDrivers: 0, totalRevenue: 0, totalRides: 0 });
  const [recentRides, setRecentRides] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [emergencyAlerts, setEmergencyAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pricing state
  const [pricing, setPricing] = useState({ BASE_FARE: '500', PRICE_PER_KM: '200' });
  const [isEditingPrice, setIsEditingPrice] = useState(false);

  useEffect(() => {
    // 1. Listeners Live for Rides
    const unsubscribeRides = firestore().collection('rides').limit(50).onSnapshot(
      (s) => {
        if (!s) return;
        const docs = s.docs.map(d => ({ id: d.id, ...d.data() }));
        setRecentRides(docs);
        const completed = docs.filter((d: any) => d.status === 'completed');
        setStats(p => ({ 
          ...p, 
          activeRides: docs.filter((d: any) => d.status !== 'completed' && d.status !== 'cancelled').length,
          totalRides: s.size,
          totalRevenue: completed.reduce((a, d: any) => a + (d.price || 0), 0)
        }));
      },
      (err) => console.error("Error fetching rides:", err)
    );
    
    // 2. Listeners Live for Drivers
    const unsubscribeDrivers = firestore().collection('drivers').onSnapshot(
      (s) => {
        if (!s) return;
        const docs = s.docs.map(d => ({ id: d.id, ...d.data() }));
        setDrivers(docs);
        setStats(p => ({
          ...p,
          onlineDrivers: docs.filter((d: any) => d.isOnline).length
        }));
      },
      (err) => console.error("Error fetching drivers:", err)
    );

    // 3. Listeners Live for SOS Alerts
    const unsubscribeEmergencies = firestore()
      .collection('emergency_alerts')
      .where('status', '==', 'pending')
      .onSnapshot(
        (s) => {
          if (!s) return;
          setEmergencyAlerts(s.docs.map(d => ({ id: d.id, ...d.data() })));
        },
        (err) => console.error("Error fetching SOS alerts:", err)
      );

    // 4. Fetch live pricing configuration
    const unsubscribePricing = firestore()
      .collection('config')
      .doc('pricing')
      .onSnapshot(
        (doc) => {
          if (doc && doc.exists()) {
            const data = doc.data();
            setPricing({
              BASE_FARE: String(data?.BASE_FARE || 500),
              PRICE_PER_KM: String(data?.PRICE_PER_KM || 200),
            });
          }
          setLoading(false);
        },
        (err) => {
          console.error("Error fetching pricing config:", err);
          setLoading(false);
        }
      );

    return () => {
      unsubscribeRides();
      unsubscribeDrivers();
      unsubscribeEmergencies();
      unsubscribePricing();
    };
  }, []);

  const handleValidateDriver = async (driverId: string) => {
    try {
      await firestore().collection('drivers').doc(driverId).update({ isValidated: true });
      await firestore().collection('users').doc(driverId).update({ role: 'driver' }); // ensure matching user role
      Alert.alert('Succès', 'Chauffeur validé.');
    } catch (e) {
      console.error(e);
      Alert.alert('Erreur', 'Impossible de valider le chauffeur.');
    }
  };

  const handleResolveSOS = async (alertId: string) => {
    try {
      await firestore().collection('emergency_alerts').doc(alertId).update({ 
        status: 'resolved', 
        resolvedAt: firestore.FieldValue.serverTimestamp() 
      });
      Alert.alert('Succès', 'Alerte SOS résolue.');
    } catch (e) {
      console.error(e);
      Alert.alert('Erreur', 'Impossible de résoudre l\'alerte.');
    }
  };

  const handleSavePricing = async () => {
    try {
      const base = parseFloat(pricing.BASE_FARE);
      const perKm = parseFloat(pricing.PRICE_PER_KM);
      if (isNaN(base) || isNaN(perKm)) {
        Alert.alert('Erreur', 'Veuillez saisir des nombres valides.');
        return;
      }
      await firestore().collection('config').doc('pricing').set({
        BASE_FARE: base,
        PRICE_PER_KM: perKm,
        updatedAt: firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      setIsEditingPrice(false);
      Alert.alert('Sauvegardé', 'Tarifs mis à jour avec succès.');
    } catch (e) {
      console.error(e);
      Alert.alert('Erreur', 'Impossible de mettre à jour les tarifs.');
    }
  };

  const pendingDrivers = drivers.filter(d => d.isValidated === false);
  const activeDrivers = drivers.filter(d => d.isValidated === true);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        <Text style={styles.loadingText}>Chargement de la console Admin...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.header}>
        <View>
          <Text style={styles.logo}>CITY<Text style={{color: COLORS.PRIMARY}}>GO</Text></Text>
          <Text style={styles.subHeader}>Console de Surveillance Admin</Text>
        </View>
        <View style={styles.liveBadge}>
          <View style={styles.dot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* STATS PANELS */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>REVENUS</Text>
            <Text style={styles.statValue}>{formatPrice(stats.totalRevenue)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>EN LIGNE</Text>
            <Text style={styles.statValue}>{stats.onlineDrivers}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>EN COURS</Text>
            <Text style={styles.statValue}>{stats.activeRides}</Text>
          </View>
        </View>

        {/* SOS ALERTS */}
        {emergencyAlerts.length > 0 && (
          <View style={styles.sosContainer}>
            <Text style={styles.sosTitle}>🚨 SOS ACTIFS ({emergencyAlerts.length})</Text>
            {emergencyAlerts.map(alert => (
              <View key={alert.id} style={styles.sosItem}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.sosText}>Utilisateur: {alert.passengerPhone || alert.userId}</Text>
                  <Text style={styles.sosSubText}>{alert.message || 'Demande d\'aide d\'urgence'}</Text>
                </View>
                <TouchableOpacity style={styles.resolveBtn} onPress={() => handleResolveSOS(alert.id)}>
                  <Text style={styles.resolveBtnText}>RÉSOUDRE</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* MAP */}
        <Text style={styles.secTitle}>SUIVI CARTOGRAPHIQUE</Text>
        <View style={styles.mapSection}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: 4.0511,
              longitude: 9.7679,
              latitudeDelta: 0.1,
              longitudeDelta: 0.1,
            }}
          >
            {activeDrivers.filter(d => d.isOnline && d.position).map(d => (
              <Marker 
                key={d.id} 
                coordinate={{ latitude: d.position.latitude, longitude: d.position.longitude }}
                title={d.name}
                description={`${d.vehicleModel || 'Voiture'} (${d.plateNumber || 'Pas de plaque'})`}
                pinColor={COLORS.PRIMARY}
              />
            ))}
            {recentRides.filter(r => r.status !== 'completed' && r.status !== 'cancelled' && r.pickup).map(r => {
              const lat = r.pickup.latitude || r.pickup._lat;
              const lng = r.pickup.longitude || r.pickup._long;
              if (!lat || !lng) return null;
              return (
                <Marker 
                  key={r.id} 
                  coordinate={{ latitude: lat, longitude: lng }}
                  title={`Trajet: ${r.status}`}
                  description={`Client: ${r.passengerPhone}`}
                  pinColor="red"
                />
              );
            })}
          </MapView>
        </View>

        {/* TARIFFS CONFIG */}
        <Text style={styles.secTitle}>CONFIGURATION DE LA TARIFICATION</Text>
        <View style={styles.card}>
          <View style={styles.pricingRow}>
            <Text style={styles.pricingLabel}>Prise en charge (BASE FARE)</Text>
            {isEditingPrice ? (
              <TextInput 
                style={styles.pricingInput} 
                value={pricing.BASE_FARE} 
                onChangeText={(t) => setPricing({...pricing, BASE_FARE: t})} 
                keyboardType="numeric" 
              />
            ) : (
              <Text style={styles.pricingValue}>{pricing.BASE_FARE} FCFA</Text>
            )}
          </View>
          <View style={styles.pricingRow}>
            <Text style={styles.pricingLabel}>Prix par KM</Text>
            {isEditingPrice ? (
              <TextInput 
                style={styles.pricingInput} 
                value={pricing.PRICE_PER_KM} 
                onChangeText={(t) => setPricing({...pricing, PRICE_PER_KM: t})} 
                keyboardType="numeric" 
              />
            ) : (
              <Text style={styles.pricingValue}>{pricing.PRICE_PER_KM} FCFA</Text>
            )}
          </View>
          <TouchableOpacity 
            style={styles.savePricingBtn} 
            onPress={isEditingPrice ? handleSavePricing : () => setIsEditingPrice(true)}
          >
            <Text style={styles.savePricingBtnText}>
              {isEditingPrice ? 'SAUVEGARDER LES TARIFS' : 'MODIFIER LES TARIFS'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* PENDING DRIVERS */}
        <Text style={styles.secTitle}>CHAUFFEURS EN ATTENTE DE VALIDATION</Text>
        <View style={styles.card}>
          {pendingDrivers.length === 0 ? (
            <Text style={styles.emptyText}>Aucun chauffeur en attente</Text>
          ) : pendingDrivers.map(d => (
            <View key={d.id} style={styles.item}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemMain}>{d.name}</Text>
                <Text style={styles.itemSub}>{d.vehicleModel || 'Modèle inconnu'} - {d.plateNumber || 'Sans plaque'}</Text>
              </View>
              <TouchableOpacity style={styles.validateBtn} onPress={() => handleValidateDriver(d.id)}>
                <Text style={styles.validateBtnText}>VALIDER</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* RECENT RIDES */}
        <Text style={styles.secTitle}>TRAJETS RÉCENTS</Text>
        <View style={styles.card}>
          {recentRides.length === 0 ? (
            <Text style={styles.emptyText}>Aucun trajet enregistré</Text>
          ) : recentRides.slice(0, 10).map(r => (
            <View key={r.id} style={styles.item}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemMain}>{r.passengerPhone || 'Client inconnu'}</Text>
                <Text style={styles.itemSub}>
                  {r.pickupName ? `De: ${r.pickupName.substring(0, 20)}...` : 'Lieu de départ'}
                </Text>
              </View>
              <Text style={[
                styles.statusText, 
                { color: r.status === 'completed' ? '#4CAF50' : r.status === 'cancelled' ? '#F44336' : COLORS.PRIMARY }
              ]}>
                {r.status.toUpperCase()}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: '#F9F9F9' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' },
  loadingText: { marginTop: 10, color: '#666', fontWeight: 'bold' },
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 15,
    backgroundColor: '#000',
    borderBottomWidth: 1,
    borderBottomColor: '#333'
  },
  logo: { fontSize: 24, fontWeight: '900', color: '#FFF' },
  subHeader: { fontSize: 11, color: '#AAA', fontWeight: 'bold' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#333', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 5 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4CAF50', marginRight: 6 },
  liveText: { color: '#FFF', fontSize: 9, fontWeight: 'bold' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  statBox: { width: '31%', backgroundColor: '#000', padding: 15, borderRadius: 15, alignItems: 'center' },
  statLabel: { fontSize: 9, color: '#666', fontWeight: 'bold', letterSpacing: 1 },
  statValue: { fontSize: 14, color: '#FFF', fontWeight: '900', marginTop: 4 },
  sosContainer: { backgroundColor: '#FFEBEE', padding: 15, borderRadius: 15, marginBottom: 20, borderWidth: 1, borderColor: '#F44336' },
  sosTitle: { color: '#D32F2F', fontWeight: 'bold', fontSize: 16, marginBottom: 5 },
  sosItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', padding: 12, borderRadius: 10, marginTop: 8 },
  sosText: { fontWeight: 'bold', color: '#D32F2F', fontSize: 13 },
  sosSubText: { color: '#666', fontSize: 12, marginTop: 2 },
  resolveBtn: { backgroundColor: '#D32F2F', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  resolveBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 11 },
  mapSection: { height: 220, borderRadius: 20, overflow: 'hidden', marginBottom: 20, elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 },
  map: { flex: 1 },
  secTitle: { fontSize: 11, fontWeight: '900', color: '#888', letterSpacing: 1.5, marginBottom: 10, marginTop: 10 },
  card: { backgroundColor: '#FFF', padding: 15, borderRadius: 20, elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, marginBottom: 20 },
  emptyText: { padding: 10, color: '#888', textAlign: 'center', fontSize: 13 },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F8F8F8' },
  itemMain: { fontSize: 14, fontWeight: '700', color: '#000' },
  itemSub: { fontSize: 11, color: '#666', marginTop: 2 },
  validateBtn: { backgroundColor: COLORS.PRIMARY, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  validateBtnText: { color: '#000', fontWeight: 'bold', fontSize: 11 },
  statusText: { fontSize: 11, fontWeight: 'bold' },
  pricingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F8F8F8' },
  pricingLabel: { fontSize: 13, fontWeight: '600', color: '#333' },
  pricingValue: { fontSize: 14, fontWeight: 'bold', color: '#000' },
  pricingInput: { borderWidth: 1, borderColor: '#DDD', borderRadius: 6, paddingVertical: 4, paddingHorizontal: 10, width: 80, textAlign: 'right', fontSize: 13 },
  savePricingBtn: { backgroundColor: '#000', padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 12 },
  savePricingBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 }
});

export default AdminDashboardScreen;
