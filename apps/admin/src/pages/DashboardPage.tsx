import React, { useState, useEffect } from 'react';
import { db, firebaseConfig } from '../../../../shared/config/firebase';
import { collection, onSnapshot, query, setDoc, doc, serverTimestamp, limit, orderBy, updateDoc, getDoc, where } from 'firebase/firestore';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
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
  const [activeTab, setActiveTab] = useState('overview'); // overview, fleet, pricing, create-driver
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Create Driver Form State
  const [newDriver, setNewDriver] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    vehicleModel: '',
    licensePlate: '',
    vehicleType: 'standard'
  });

  // Pricing state
  const [pricing, setPricing] = useState({ BASE_FARE: '500', PRICE_PER_KM: '200' });
  const [isEditingPrice, setIsEditingPrice] = useState(false);

  useEffect(() => {
    if (!db) return undefined;

    const unsubscribeRides = onSnapshot(query(collection(db, 'rides'), limit(100)), (s) => {
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

  const handleCreateDriver = async () => {
    console.log("Tentative de création du chauffeur...", newDriver);

    if (!db) {
      console.error("Erreur: L'instance Firestore (db) n'est pas initialisée. Vérifiez vos variables d'environnement.");
      alert("Erreur: La base de données n'est pas connectée. Vérifiez votre configuration Firebase (Clé API).");
      return;
    }

    if (!newDriver.name || !newDriver.phone || !newDriver.password || !newDriver.licensePlate) {
      alert('Erreur: Veuillez remplir tous les champs obligatoires (Nom, Téléphone, Mot de passe, Immatriculation).');
      return;
    }

    setIsSubmitting(true);
    try {
      const driverId = `driver_${Date.now()}`;
      console.log(`Tentative d'écriture sur le projet : ${firebaseConfig.projectId}`);
      console.log("Enregistrement dans la collection 'drivers' avec ID:", driverId);
      
      await setDoc(doc(db, 'drivers', driverId), {
        ...newDriver,
        isValidated: true,
        isOnline: false,
        balance: 0,
        totalRides: 0,
        createdAt: serverTimestamp(),
        role: 'driver'
      });

      console.log("Chauffeur créé avec succès !");
      alert('Succès: Chauffeur créé et activé avec succès.');
      
      setNewDriver({
        name: '', phone: '', email: '', password: '',
        vehicleModel: '', licensePlate: '', vehicleType: 'standard'
      });
      setActiveTab('fleet');
    } catch (e: any) {
      console.error("Erreur détaillée lors de la création:", e);
      alert('Erreur: Impossible de créer le chauffeur. ' + (e.message || ''));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleValidateDriver = async (driverId: string) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'drivers', driverId), { isValidated: true });
      alert('Succès: Chauffeur validé.');
    } catch (e) {
      console.error(e);
      alert('Erreur: Impossible de valider le chauffeur.');
    }
  };

  const handleResolveSOS = async (alertId: string) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'emergency_alerts', alertId), { status: 'resolved', resolvedAt: serverTimestamp() });
      alert('Succès: Alerte SOS résolue.');
    } catch (e) {
      console.error(e);
      alert('Erreur: Impossible de résoudre l\'alerte.');
    }
  };

  const pendingDrivers = drivers.filter(d => d.isValidated === false);
  const activeDrivers = drivers.filter(d => d.isValidated === true);

  return (
    <View style={styles.masterContainer}>
      {/* Barre Latérale Stats Rapides */}
      <View style={styles.sidebar}>
         <Text style={styles.logo}>CITY<Text style={{color: COLORS.PRIMARY}}>GO</Text></Text>
         
         <TouchableOpacity 
            style={[styles.navItem, activeTab === 'overview' && styles.navItemActive]} 
            onPress={() => setActiveTab('overview')}
         >
           <Text style={[styles.navText, activeTab === 'overview' && styles.navTextActive]}>Tableau de bord</Text>
         </TouchableOpacity>

         <TouchableOpacity 
            style={[styles.navItem, activeTab === 'fleet' && styles.navItemActive]} 
            onPress={() => setActiveTab('fleet')}
         >
           <Text style={[styles.navText, activeTab === 'fleet' && styles.navTextActive]}>Gestion Flotte</Text>
         </TouchableOpacity>

         <TouchableOpacity 
            style={[styles.navItem, activeTab === 'create-driver' && styles.navItemActive]} 
            onPress={() => setActiveTab('create-driver')}
         >
           <Text style={[styles.navText, activeTab === 'create-driver' && styles.navTextActive]}>+ Nouveau Chauffeur</Text>
         </TouchableOpacity>

         <TouchableOpacity 
            style={[styles.navItem, activeTab === 'pricing' && styles.navItemActive]} 
            onPress={() => setActiveTab('pricing')}
         >
           <Text style={[styles.navText, activeTab === 'pricing' && styles.navTextActive]}>Tarification</Text>
         </TouchableOpacity>

         <View style={{flex: 1}} />
         
         <View style={styles.miniStat}><Text style={styles.miniLabel}>REVENUS</Text><Text style={styles.miniValue}>{formatPrice(stats.totalRevenue)}</Text></View>
         <View style={styles.miniStat}><Text style={styles.miniLabel}>ACTIFS</Text><Text style={styles.miniValue}>{drivers.filter(d => d.isOnline).length}</Text></View>
         
         <View style={styles.version}><Text style={styles.versionText}>v1.1.0 Premium</Text></View>
      </View>

      <ScrollView style={styles.mainScroll} contentContainerStyle={styles.content}>
        <View style={styles.header}>
           <Text style={styles.title}>
             {activeTab === 'overview' && "Console de Surveillance"}
             {activeTab === 'fleet' && "Gestion de la Flotte"}
             {activeTab === 'create-driver' && "Enregistrement Chauffeur"}
             {activeTab === 'pricing' && "Paramètres de Tarification"}
           </Text>
           <View style={styles.liveBadge}><View style={styles.dot} /><Text style={styles.liveText}>TEMPS RÉEL</Text></View>
        </View>

        {activeTab === 'overview' && (
          <>
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

            <View style={styles.mapSection}>
               {/* @ts-ignore */}
               <MapContainer center={[4.0511, 9.7679]} zoom={13} style={{ height: 450, borderRadius: 30 }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  {activeDrivers.filter(d => d.isOnline && d.position).map(d => (
                    <Marker key={d.id} position={[d.position.latitude, d.position.longitude]}>
                       <Popup>🚖 {d.name} - {d.vehicleModel}</Popup>
                    </Marker>
                  ))}
                  {recentRides.filter(r => r.status !== 'completed' && r.pickup).map(r => {
                    const lat = r.pickup.latitude || r.pickup._lat;
                    const lng = r.pickup.longitude || r.pickup._long;
                    if (!lat || !lng) return null;
                    return (
                      <CircleMarker key={r.id} center={[lat, lng]} radius={8} color="#FF5722" fillColor="#FF5722" fillOpacity={1}>
                        <Popup>👤 Passager: {r.passengerPhone} ({r.status})</Popup>
                      </CircleMarker>
                    );
                  })}
               </MapContainer>
            </View>

            <View style={styles.row}>
               <View style={styles.col}>
                  <Text style={styles.secTitle}>CHAUFFEURS EN ATTENTE</Text>
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
               </View>

               <View style={styles.col}>
                  <Text style={styles.secTitle}>DERNIERS TRAJETS</Text>
                  <View style={styles.list}>
                     {recentRides.slice(0, 8).map(r => (
                       <View key={r.id} style={styles.item}>
                          <View style={{flex: 1}}>
                            <Text style={styles.itemMain}>{r.passengerPhone}</Text>
                            <Text style={styles.itemSub}>{formatPrice(r.price || 0)}</Text>
                          </View>
                          <Text style={[styles.itemStatus, {color: r.status === 'completed' ? '#4CAF50' : COLORS.PRIMARY}]}>
                            {r.status.toUpperCase()}
                          </Text>
                       </View>
                     ))}
                  </View>
               </View>
            </View>
          </>
        )}

        {activeTab === 'create-driver' && (
          <View style={styles.formContainer}>
            <Text style={styles.formSectionTitle}>Informations Personnelles</Text>
            <View style={styles.formRow}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Nom Complet</Text>
                <TextInput 
                  style={styles.formInput} 
                  placeholder="Ex: Jean Dupont" 
                  value={newDriver.name}
                  onChangeText={t => setNewDriver({...newDriver, name: t})}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Téléphone</Text>
                <TextInput 
                  style={styles.formInput} 
                  placeholder="6XXXXXXXX" 
                  value={newDriver.phone}
                  onChangeText={t => setNewDriver({...newDriver, phone: t})}
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Email</Text>
                <TextInput 
                  style={styles.formInput} 
                  placeholder="email@exemple.com" 
                  value={newDriver.email}
                  onChangeText={t => setNewDriver({...newDriver, email: t})}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Mot de Passe Temporaire</Text>
                <TextInput 
                  style={styles.formInput} 
                  placeholder="******" 
                  secureTextEntry
                  value={newDriver.password}
                  onChangeText={t => setNewDriver({...newDriver, password: t})}
                />
              </View>
            </View>

            <Text style={[styles.formSectionTitle, {marginTop: 30}]}>Détails du Véhicule</Text>
            <View style={styles.formRow}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Modèle du Véhicule</Text>
                <TextInput 
                  style={styles.formInput} 
                  placeholder="Ex: Toyota Yaris 2022" 
                  value={newDriver.vehicleModel}
                  onChangeText={t => setNewDriver({...newDriver, vehicleModel: t})}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Numéro d'immatriculation</Text>
                <TextInput 
                  style={styles.formInput} 
                  placeholder="LT 123 AA" 
                  value={newDriver.licensePlate}
                  onChangeText={t => setNewDriver({...newDriver, licensePlate: t})}
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Type de Service</Text>
                <View style={styles.typeSelector}>
                  {['standard', 'comfort', 'moto'].map(type => (
                    <TouchableOpacity 
                      key={type}
                      style={[styles.typeBtn, newDriver.vehicleType === type && styles.typeBtnActive]}
                      onPress={() => setNewDriver({...newDriver, vehicleType: type})}
                    >
                      <Text style={[styles.typeBtnText, newDriver.vehicleType === type && styles.typeBtnTextActive]}>
                        {type.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={handleCreateDriver}>
              <Text style={styles.submitBtnText}>CRÉER LE COMPTE CHAUFFEUR</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'fleet' && (
          <View style={styles.list}>
             <View style={styles.tableHeader}>
               <Text style={[styles.tableHead, {flex: 2}]}>CHAUFFEUR</Text>
               <Text style={styles.tableHead}>VÉHICULE</Text>
               <Text style={styles.tableHead}>IMMATRICULATION</Text>
               <Text style={styles.tableHead}>STATUT</Text>
               <Text style={styles.tableHead}>SOLDE</Text>
             </View>
             {drivers.map(d => (
               <View key={d.id} style={styles.tableRow}>
                  <View style={{flex: 2}}>
                    <Text style={styles.itemMain}>{d.name}</Text>
                    <Text style={styles.itemSub}>{d.phone}</Text>
                  </View>
                  <Text style={[styles.tableCell, {flex: 1}]}>{d.vehicleModel}</Text>
                  <Text style={[styles.tableCell, {flex: 1}]}>{d.licensePlate}</Text>
                  <View style={[styles.statusBadge, {backgroundColor: d.isOnline ? '#E8F5E9' : '#F5F5F5'}]}>
                    <Text style={{color: d.isOnline ? '#2E7D32' : '#9E9E9E', fontSize: 10, fontWeight: 'bold'}}>
                      {d.isOnline ? 'EN LIGNE' : 'HORS LIGNE'}
                    </Text>
                  </View>
                  <Text style={[styles.tableCell, {fontWeight: 'bold'}]}>{formatPrice(d.balance || 0)}</Text>
               </View>
             ))}
          </View>
        )}

        {activeTab === 'pricing' && (
          <View style={[styles.list, {maxWidth: 600}]}>
            <View style={styles.pricingRow}>
              <View>
                <Text style={styles.pricingLabel}>Prise en charge (BASE FARE)</Text>
                <Text style={styles.pricingDesc}>Frais fixes appliqués au début de chaque course.</Text>
              </View>
              {isEditingPrice ? (
                <TextInput style={styles.pricingInput} value={pricing.BASE_FARE} onChangeText={(t) => setPricing({...pricing, BASE_FARE: t})} keyboardType="numeric" />
              ) : (
                <Text style={styles.pricingValue}>{pricing.BASE_FARE} FCFA</Text>
              )}
            </View>
            <View style={styles.pricingRow}>
              <View>
                <Text style={styles.pricingLabel}>Prix par Kilomètre</Text>
                <Text style={styles.pricingDesc}>Calculé sur la distance estimée du trajet.</Text>
              </View>
              {isEditingPrice ? (
                <TextInput style={styles.pricingInput} value={pricing.PRICE_PER_KM} onChangeText={(t) => setPricing({...pricing, PRICE_PER_KM: t})} keyboardType="numeric" />
              ) : (
                <Text style={styles.pricingValue}>{pricing.PRICE_PER_KM} FCFA</Text>
              )}
            </View>
            <TouchableOpacity 
              style={[styles.savePricingBtn, {backgroundColor: isEditingPrice ? '#4CAF50' : '#000'}]} 
              onPress={() => {
                if (isEditingPrice) {
                  Alert.alert('Succès', 'Les nouveaux tarifs ont été appliqués à l\'ensemble du réseau.');
                }
                setIsEditingPrice(!isEditingPrice);
              }}
            >
              <Text style={styles.savePricingBtnText}>{isEditingPrice ? 'VALIDER LES TARIFS' : 'MODIFIER LES TARIFS'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  masterContainer: { flex: 1, flexDirection: 'row', backgroundColor: '#FFF' },
  sidebar: { width: 280, backgroundColor: '#000', padding: 30, borderRightWidth: 1, borderRightColor: '#EEE' },
  logo: { fontSize: 32, fontWeight: '900', color: '#FFF', marginBottom: 50 },
  navItem: { paddingVertical: 12, paddingHorizontal: 15, borderRadius: 10, marginBottom: 10 },
  navItemActive: { backgroundColor: '#333' },
  navText: { color: '#666', fontWeight: 'bold', fontSize: 14 },
  navTextActive: { color: COLORS.PRIMARY },
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
  list: { backgroundColor: '#FFF', padding: 15, borderRadius: 25, elevation: 5 },
  item: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#F8F8F8' },
  itemMain: { fontSize: 15, fontWeight: '700' },
  itemSub: { fontSize: 11, color: '#999', marginTop: 2 },
  itemStatus: { fontSize: 10, fontWeight: 'bold' },
  validateBtn: { backgroundColor: COLORS.PRIMARY, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 5 },
  validateBtnText: { color: '#000', fontWeight: 'bold', fontSize: 12 },
  
  // FORM STYLES
  formContainer: { backgroundColor: '#FFF', padding: 40, borderRadius: 30, elevation: 5 },
  formSectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#000', marginBottom: 20 },
  formRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  formGroup: { flex: 1, marginHorizontal: 10 },
  formLabel: { fontSize: 12, fontWeight: 'bold', color: '#666', marginBottom: 8 },
  formInput: { backgroundColor: '#F9F9F9', borderWidth: 1, borderColor: '#EEE', borderRadius: 10, padding: 15, fontSize: 14 },
  typeSelector: { flexDirection: 'row', gap: 10 },
  typeBtn: { flex: 1, padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#EEE', alignItems: 'center' },
  typeBtnActive: { backgroundColor: '#000', borderColor: '#000' },
  typeBtnText: { fontSize: 12, fontWeight: 'bold', color: '#666' },
  typeBtnTextActive: { color: '#FFF' },
  submitBtn: { backgroundColor: COLORS.PRIMARY, padding: 20, borderRadius: 15, alignItems: 'center', marginTop: 30 },
  submitBtnText: { fontWeight: 'bold', fontSize: 16 },

  // TABLE STYLES
  tableHeader: { flexDirection: 'row', padding: 20, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  tableHead: { flex: 1, fontSize: 11, fontWeight: '900', color: '#AAA' },
  tableRow: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F8F8F8' },
  tableCell: { flex: 1, fontSize: 14, color: '#333' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, flex: 1, alignItems: 'center' },

  pricingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  pricingLabel: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  pricingDesc: { fontSize: 12, color: '#999', marginTop: 4 },
  pricingValue: { fontSize: 18, fontWeight: '900', color: COLORS.PRIMARY },
  pricingInput: { borderWidth: 1, borderColor: '#DDD', borderRadius: 10, padding: 10, width: 120, textAlign: 'right', fontSize: 16, fontWeight: 'bold' },
  savePricingBtn: { padding: 20, borderRadius: 15, alignItems: 'center', marginTop: 30 },
  savePricingBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});

export default DashboardPage;
