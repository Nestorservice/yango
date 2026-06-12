import React, { useState, useEffect } from 'react';
import { db } from '../../../../shared/config/firebase';
import { collection, onSnapshot, query, setDoc, doc, serverTimestamp, limit, orderBy, updateDoc, getDoc, where } from 'firebase/firestore';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { COLORS } from '../../../../shared/constants';
import { formatPrice } from '../../../../shared/utils';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  TextInput, Alert
} from 'react-native';

const DashboardPage = () => {
  const [stats, setStats] = useState({ activeRides: 0, onlineDrivers: 0, totalRevenue: 0, totalRides: 0 });
  const [recentRides, setRecentRides] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [emergencyAlerts, setEmergencyAlerts] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([{ id: '1', msg: 'Système Live CityGo démarré', time: 'Maintenant' }]);
  
  // Pricing state (would typically be stored in a 'settings' collection)
  const [pricing, setPricing] = useState({ BASE_FARE: '500', PRICE_PER_KM: '200' });
  const [isEditingPrice, setIsEditingPrice] = useState(false);

  useEffect(() => {
    if (!db) return undefined;

    // Listeners Live
    const unsubscribeRides = onSnapshot(query(collection(db, 'rides'), limit(10)), (s) => {
      const docs = s.docs.map(d => ({ id: d.id, ...d.data() }));
      setRecentRides(docs);
      const completed = docs.filter((d: any) => d.status === 'completed');
      setStats(p => ({ 
        ...p, 
        activeRides: docs.filter((d: any) => d.status !== 'completed').length,
        totalRides: s.size,
        totalRevenue: completed.reduce((a, d: any) => a + (d.price || 0), 0)
      }));
    });
    
    const unsubscribeDrivers = onSnapshot(collection(db, 'drivers'), (s) => {
      setDrivers(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubscribeEmergencies = onSnapshot(query(collection(db, 'emergency_alerts'), where('status', '==', 'pending')), (s) => {
      setEmergencyAlerts(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubscribeRides();
      unsubscribeDrivers();
      unsubscribeEmergencies();
    };
  }, []);

  const handleValidateDriver = async (driverId: string) => {
    try {
      await updateDoc(doc(db, 'drivers', driverId), { isValidated: true });
      Alert.alert('Succès', 'Chauffeur validé.');
    } catch (e) {
      console.error(e);
      Alert.alert('Erreur', 'Impossible de valider le chauffeur.');
    }
  };

  const handleResolveSOS = async (alertId: string) => {
    try {
      await updateDoc(doc(db, 'emergency_alerts', alertId), { status: 'resolved', resolvedAt: serverTimestamp() });
      Alert.alert('Succès', 'Alerte SOS résolue.');
    } catch (e) {
      console.error(e);
      Alert.alert('Erreur', 'Impossible de résoudre l\'alerte.');
    }
  };

  const pendingDrivers = drivers.filter(d => d.isValidated === false);
  const activeDrivers = drivers.filter(d => d.isValidated === true);

  return (
    <View style={styles.masterContainer}>
      {/* Barre Latérale Stats Rapides */}
      <View style={styles.sidebar}>
         <Text style={styles.logo}>CITY<Text style={{color: COLORS.PRIMARY}}>GO</Text></Text>
         <View style={styles.miniStat}><Text style={styles.miniLabel}>REVENUS</Text><Text style={styles.miniValue}>{formatPrice(stats.totalRevenue)}</Text></View>
         <View style={styles.miniStat}><Text style={styles.miniLabel}>ACTIFS</Text><Text style={styles.miniValue}>{drivers.filter(d => d.isOnline).length}</Text></View>
         <View style={styles.miniStat}><Text style={styles.miniLabel}>EN COURS</Text><Text style={styles.miniValue}>{stats.activeRides}</Text></View>
         <View style={{flex: 1}} />
         <View style={styles.version}><Text style={styles.versionText}>v1.0.0 Stable</Text></View>
      </View>

      <ScrollView style={styles.mainScroll} contentContainerStyle={styles.content}>
        <View style={styles.header}>
           <Text style={styles.title}>Console de Surveillance</Text>
           <View style={styles.liveBadge}><View style={styles.dot} /><Text style={styles.liveText}>TEMPS RÉEL</Text></View>
        </View>

        {emergencyAlerts.length > 0 && (
          <View style={styles.sosContainer}>
            <Text style={styles.sosTitle}>🚨 ALERTES SOS ACTIVES ({emergencyAlerts.length})</Text>
            {emergencyAlerts.map(alert => (
              <View key={alert.id} style={styles.sosItem}>
                <View>
                  <Text style={styles.sosText}>Rôle: {alert.userRole} | ID: {alert.userId}</Text>
                  <Text style={styles.sosSubText}>Message: {alert.message}</Text>
                </View>
                <TouchableOpacity style={styles.resolveBtn} onPress={() => handleResolveSOS(alert.id)}>
                  <Text style={styles.resolveBtnText}>MARQUER COMME RÉSOLU</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* CARTE CENTRALE PANORAMIQUE */}
        <View style={styles.mapSection}>
           {/* @ts-ignore */}
           <MapContainer center={[4.0511, 9.7679]} zoom={13} style={{ height: 450, borderRadius: 30 }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {activeDrivers.filter(d => d.isOnline && d.position).map(d => (
                <Marker key={d.id} position={[d.position.latitude, d.position.longitude]}>
                   <Popup>{d.name} - {d.vehicleModel}</Popup>
                </Marker>
              ))}
              {emergencyAlerts.map(a => {
                if (a.location && a.location.latitude) {
                  return (
                    <Marker key={a.id} position={[a.location.latitude, a.location.longitude]}>
                       <Popup>🚨 URGENCE SOS 🚨</Popup>
                    </Marker>
                  )
                }
                return null;
              })}
           </MapContainer>
        </View>

        <View style={styles.row}>
           <View style={styles.col}>
              <Text style={styles.secTitle}>CHAUFFEURS EN ATTENTE DE VALIDATION</Text>
              <View style={styles.list}>
                 {pendingDrivers.length === 0 ? (
                   <Text style={{padding: 15, color: '#666'}}>Aucun chauffeur en attente</Text>
                 ) : pendingDrivers.map(d => (
                   <View key={d.id} style={styles.item}>
                      <View style={{flex: 1}}>
                         <Text style={styles.itemMain}>{d.name}</Text>
                         <Text style={styles.itemSub}>{d.vehicleModel} - {d.licensePlate}</Text>
                      </View>
                      <TouchableOpacity style={styles.validateBtn} onPress={() => handleValidateDriver(d.id)}>
                        <Text style={styles.validateBtnText}>VALIDER</Text>
                      </TouchableOpacity>
                   </View>
                 ))}
              </View>

              <Text style={[styles.secTitle, {marginTop: 30}]}>TRAJETS RÉCENTS</Text>
              <View style={styles.list}>
                 {recentRides.map(r => (
                   <View key={r.id} style={styles.item}>
                      <Text style={styles.itemMain}>{r.passengerPhone}</Text>
                      <Text style={[styles.itemSub, {color: r.status === 'completed' ? '#4CAF50' : COLORS.PRIMARY}]}>{r.status.toUpperCase()}</Text>
                   </View>
                 ))}
              </View>
           </View>

           {/* Gestion Flotte */}
           <View style={styles.col}>
              <Text style={styles.secTitle}>CONFIGURATION DES TARIFS</Text>
              <View style={[styles.list, {marginBottom: 30}]}>
                <View style={styles.pricingRow}>
                  <Text style={styles.pricingLabel}>Prise en charge (BASE FARE)</Text>
                  {isEditingPrice ? (
                    <TextInput style={styles.pricingInput} value={pricing.BASE_FARE} onChangeText={(t) => setPricing({...pricing, BASE_FARE: t})} keyboardType="numeric" />
                  ) : (
                    <Text style={styles.pricingValue}>{pricing.BASE_FARE} FCFA</Text>
                  )}
                </View>
                <View style={styles.pricingRow}>
                  <Text style={styles.pricingLabel}>Prix par KM</Text>
                  {isEditingPrice ? (
                    <TextInput style={styles.pricingInput} value={pricing.PRICE_PER_KM} onChangeText={(t) => setPricing({...pricing, PRICE_PER_KM: t})} keyboardType="numeric" />
                  ) : (
                    <Text style={styles.pricingValue}>{pricing.PRICE_PER_KM} FCFA</Text>
                  )}
                </View>
                <TouchableOpacity 
                  style={styles.savePricingBtn} 
                  onPress={() => {
                    if (isEditingPrice) {
                      // Save to DB in real world
                      Alert.alert('Sauvegardé', 'Tarifs mis à jour (simulation)');
                    }
                    setIsEditingPrice(!isEditingPrice);
                  }}
                >
                  <Text style={styles.savePricingBtnText}>{isEditingPrice ? 'SAUVEGARDER' : 'MODIFIER'}</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.secTitle}>ÉTAT DE LA FLOTTE</Text>
              <View style={styles.list}>
                 {activeDrivers.map(d => (
                   <View key={d.id} style={styles.item}>
                      <View style={{flex: 1}}>
                         <Text style={styles.itemMain}>{d.name}</Text>
                         <Text style={styles.itemSub}>{d.vehicleModel}</Text>
                      </View>
                      <View style={[styles.indicator, {backgroundColor: d.isOnline ? '#4CAF50' : '#EEE'}]} />
                   </View>
                 ))}
              </View>
           </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  masterContainer: { flex: 1, flexDirection: 'row', backgroundColor: '#FFF' },
  sidebar: { width: 250, backgroundColor: '#000', padding: 30, borderRightWidth: 1, borderRightColor: '#EEE' },
  logo: { fontSize: 32, fontWeight: '900', color: '#FFF', marginBottom: 50 },
  miniStat: { marginBottom: 30 },
  miniLabel: { fontSize: 10, color: '#666', fontWeight: 'bold', letterSpacing: 2 },
  miniValue: { fontSize: 18, color: '#FFF', fontWeight: '900', marginTop: 5 },
  version: { opacity: 0.3 },
  versionText: { color: '#FFF', fontSize: 10 },
  mainScroll: { flex: 1, backgroundColor: '#F9F9F9' },
  content: { padding: 50 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 },
  title: { fontSize: 32, fontWeight: '900', color: '#000' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#000', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4CAF50', marginRight: 10 },
  liveText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  sosContainer: { backgroundColor: '#FFEBEE', padding: 20, borderRadius: 15, marginBottom: 30, borderWidth: 2, borderColor: '#F44336' },
  sosTitle: { color: '#D32F2F', fontWeight: 'bold', fontSize: 18, marginBottom: 10 },
  sosItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', padding: 15, borderRadius: 10, marginTop: 10 },
  sosText: { fontWeight: 'bold', color: '#D32F2F' },
  sosSubText: { color: '#666', marginTop: 5 },
  resolveBtn: { backgroundColor: '#D32F2F', padding: 10, borderRadius: 5 },
  resolveBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  mapSection: { marginBottom: 50, elevation: 20, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  col: { width: '48%' },
  secTitle: { fontSize: 11, fontWeight: '900', color: '#AAA', letterSpacing: 2, marginBottom: 20 },
  logBox: { backgroundColor: '#000', padding: 25, borderRadius: 25, minHeight: 150 },
  logText: { color: '#FFF', fontSize: 11, marginBottom: 8, fontFamily: 'monospace' },
  list: { backgroundColor: '#FFF', padding: 15, borderRadius: 25, elevation: 5 },
  item: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#F8F8F8' },
  itemMain: { fontSize: 15, fontWeight: '700', flex: 1 },
  itemSub: { fontSize: 10, fontWeight: 'bold' },
  indicator: { width: 10, height: 10, borderRadius: 5 },
  validateBtn: { backgroundColor: COLORS.PRIMARY, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 5 },
  validateBtnText: { color: '#000', fontWeight: 'bold', fontSize: 12 },
  pricingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  pricingLabel: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  pricingValue: { fontSize: 16, fontWeight: 'bold', color: COLORS.PRIMARY },
  pricingInput: { borderWidth: 1, borderColor: '#DDD', borderRadius: 5, padding: 5, width: 100, textAlign: 'right' },
  savePricingBtn: { backgroundColor: '#000', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 15 },
  savePricingBtnText: { color: '#FFF', fontWeight: 'bold' }
});

export default DashboardPage;
