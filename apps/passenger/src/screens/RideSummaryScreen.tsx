import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { COLORS } from '../../../../shared/constants';
import { formatPrice } from '../../../../shared/utils';

const RideSummaryScreen = ({ route, navigation }: any) => {
  const { ride } = route.params;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Icon name="checkmark-circle" size={80} color={COLORS.SUCCESS} />
        <Text style={styles.thanks}>Merci d'avoir voyagé avec CityGo !</Text>
        <Text style={styles.price}>{formatPrice(ride?.price)}</Text>
      </View>

      <View style={styles.detailsCard}>
        <Text style={styles.sectionTitle}>DÉTAILS DU TRAJET</Text>
        
        <View style={styles.row}>
          <Icon name="navigate-outline" size={20} color="#AAA" />
          <Text style={styles.rowLabel}>Distance estimée</Text>
          <Text style={styles.rowValue}>4.2 km</Text>
        </View>

        <View style={styles.row}>
          <Icon name="time-outline" size={20} color="#AAA" />
          <Text style={styles.rowLabel}>Durée</Text>
          <Text style={styles.rowValue}>12 min</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <Icon name="person-outline" size={20} color="#AAA" />
          <Text style={styles.rowLabel}>Chauffeur</Text>
          <Text style={styles.rowValue}>{ride?.driverName || 'Partenaire CityGo'}</Text>
        </View>

        <View style={styles.row}>
          <Icon name="card-outline" size={20} color="#AAA" />
          <Text style={styles.rowLabel}>Paiement</Text>
          <Text style={styles.rowValue}>Wallet CityGo</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.doneBtn} onPress={() => navigation.navigate('Accueil')}>
        <Text style={styles.doneBtnText}>RETOUR À L'ACCUEIL</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  content: { padding: 30, alignItems: 'center' },
  header: { alignItems: 'center', marginVertical: 40 },
  thanks: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginTop: 20, color: '#333' },
  price: { fontSize: 48, fontWeight: '900', color: '#000', marginTop: 15 },
  detailsCard: { width: '100%', backgroundColor: '#F9F9F9', padding: 30, borderRadius: 32, marginBottom: 40 },
  sectionTitle: { fontSize: 11, fontWeight: '900', color: '#AAA', letterSpacing: 2, marginBottom: 25 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  rowLabel: { flex: 1, marginLeft: 15, fontSize: 14, color: '#666', fontWeight: '600' },
  rowValue: { fontSize: 15, fontWeight: '800', color: '#000' },
  divider: { height: 1, backgroundColor: '#EEE', marginVertical: 10, marginBottom: 25 },
  doneBtn: { backgroundColor: '#000', width: '100%', padding: 22, borderRadius: 20, alignItems: 'center' },
  doneBtnText: { color: '#FFF', fontWeight: '900', letterSpacing: 1 }
});

export default RideSummaryScreen;
