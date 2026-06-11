import React, { useState, useEffect } from 'react';
import { db } from '../../../../shared/config/firebase';
import { collection, onSnapshot, query, setDoc, doc, serverTimestamp, limit, orderBy, updateDoc, getDoc } from 'firebase/firestore';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Icon from 'react-native-vector-icons/Ionicons';
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
  const [logs, setLogs] = useState<any[]>([{ id: '1', msg: 'Système Live CityGo démarré', time: 'Maintenant' }]);
  const [pricing, setPricing] = useState({ BASE_FARE: 500, PRICE_PER_KM: 200 });
  const [isEditingPrice, setIsEditingPrice] = useState(false);

  useEffect(() => {
    if (!db) return;

    // Listeners Live
    onSnapshot(query(collection(db, 'rides'), limit(10)), (s) => {
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
    
    onSnapshot(collection(db, 'drivers'), (s) => {
      setDrivers(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

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

        {/* CARTE CENTRALE PANORAMIQUE */}
        <View style={styles.mapSection}>
           <MapContainer center={[4.0511, 9.7679]} zoom={13} style={{ height: 450, borderRadius: 30 }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {drivers.filter(d => d.isOnline && d.position).map(d => (
                <Marker key={d.id} position={[d.position.latitude, d.position.longitude]}>
                   <Popup>{d.name} - {d.vehicleModel}</Popup>
                </Marker>
              ))}
           </MapContainer>
        </View>

        <View style={styles.row}>
           {/* Flux de Logs */}
           <View style={styles.col}>
              <Text style={styles.secTitle}>FLUX D'ÉVÉNEMENTS</Text>
              <View style={styles.logBox}>
                 {logs.map(l => (
                   <Text key={l.id} style={styles.logText}><Text style={{color: COLORS.PRIMARY}}>[{l.time}]</Text> {l.msg}</Text>
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
              <Text style={styles.secTitle}>ÉTAT DE LA FLOTTE</Text>
              <View style={styles.list}>
                 {drivers.map(d => (
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
  indicator: { width: 10, height: 10, borderRadius: 5 }
});

export default DashboardPage;
