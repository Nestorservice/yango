import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../../../passenger/src/context/AuthContext';
import Icon from 'react-native-vector-icons/Ionicons';
import { COLORS } from '../../../../shared/constants';

const PendingValidationScreen = () => {
  const { userData, driverData, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Icon name="time" size={80} color={COLORS.PRIMARY} />
        <Text style={styles.title}>Dossier en Cours de Validation</Text>
        <Text style={styles.subtitle}>
          Merci, {userData?.name || 'Partenaire Chauffeur'}.
        </Text>
        <Text style={styles.text}>
          Votre véhicule {driverData?.vehicleModel || ''} ({driverData?.plateNumber || ''}) est en attente d'approbation par le centre de contrôle CityGo.
        </Text>
        <Text style={styles.text}>
          Cette validation prend généralement moins de 24h. Vous recevrez une notification lorsque votre compte sera activé.
        </Text>

        <TouchableOpacity 
          style={styles.supportBtn} 
          onPress={() => Alert.alert('Aide', 'Contactez le support au +237 600 00 00 00')}
        >
          <Icon name="call" size={18} color="#fff" style={{ marginRight: 10 }} />
          <Text style={styles.supportText}>CONTACTER LE SUPPORT</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={signOut}>
          <Text style={styles.logoutText}>SE DÉCONNECTER</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F9F9', justifyContent: 'center', padding: 25 },
  card: { backgroundColor: '#FFF', padding: 35, borderRadius: 32, alignItems: 'center', elevation: 15 },
  title: { fontSize: 22, fontWeight: '900', color: '#000', textAlign: 'center', marginTop: 25, marginBottom: 10 },
  subtitle: { fontSize: 16, fontWeight: '700', color: COLORS.PRIMARY, marginBottom: 20 },
  text: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 22, marginBottom: 15 },
  supportBtn: { 
    flexDirection: 'row',
    backgroundColor: '#000', 
    paddingVertical: 18, 
    paddingHorizontal: 25, 
    borderRadius: 16, 
    marginTop: 25, 
    width: '100%', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  supportText: { color: '#FFF', fontWeight: 'bold', fontSize: 14, letterSpacing: 1 },
  logoutBtn: { padding: 15, marginTop: 15 },
  logoutText: { color: COLORS.GRAY, fontWeight: 'bold', fontSize: 13 },
});

export default PendingValidationScreen;
