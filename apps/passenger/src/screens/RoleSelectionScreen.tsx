import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { COLORS } from '../../../../shared/constants';

const RoleSelectionScreen = ({ navigation }: any) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Qui êtes-vous ?</Text>
      <Text style={styles.subtitle}>Choisissez votre mode d'utilisation de CityGo.</Text>

      <TouchableOpacity 
        style={styles.card} 
        onPress={() => navigation.navigate('Onboarding')}
      >
        <View style={styles.iconBox}><Icon name="people" size={40} color={COLORS.PRIMARY} /></View>
        <View style={{ flex: 1, marginLeft: 20 }}>
          <Text style={styles.cardTitle}>Voyager (Passager)</Text>
          <Text style={styles.cardDesc}>Commandez des courses et déplacez-vous rapidement dans toute la ville.</Text>
        </View>
        <Icon name="arrow-forward" size={24} color="#000" />
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.card, { marginTop: 20 }]} 
        onPress={() => navigation.navigate('DriverOnboarding')}
      >
        <View style={styles.iconBox}><Icon name="car" size={40} color={COLORS.PRIMARY} /></View>
        <View style={{ flex: 1, marginLeft: 20 }}>
          <Text style={styles.cardTitle}>Conduire (Chauffeur)</Text>
          <Text style={styles.cardDesc}>Acceptez des courses, aidez des passagers et gagnez de l'argent.</Text>
        </View>
        <Icon name="arrow-forward" size={24} color="#000" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF', justifyContent: 'center', padding: 25 },
  title: { fontSize: 32, fontWeight: '900', color: '#000', marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#999', marginBottom: 50, textAlign: 'center', lineHeight: 22 },
  card: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F9F9F9', 
    padding: 25, 
    borderRadius: 28, 
    elevation: 2,
    borderWidth: 1,
    borderColor: '#EEE'
  },
  iconBox: { width: 70, height: 70, backgroundColor: '#FFF', borderRadius: 20, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  cardTitle: { fontSize: 18, fontWeight: '900', color: '#000' },
  cardDesc: { fontSize: 13, color: '#666', marginTop: 5, lineHeight: 18 },
});

export default RoleSelectionScreen;
