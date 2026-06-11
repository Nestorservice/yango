import React from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { COLORS } from '../shared/constants';

const SplashScreen = () => {
  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Text style={styles.logoText}>CITY</Text>
        <Text style={[styles.logoText, { color: COLORS.PRIMARY }]}>GO</Text>
      </View>
      <Text style={styles.slogan}>Allez partout, simplement.</Text>
      
      <View style={styles.footer}>
        <ActivityIndicator color={COLORS.PRIMARY} size="small" />
        <Text style={styles.loading}>Chargement sécurisé...</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
  logoContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  logoText: { fontSize: 56, fontWeight: '900', color: '#000', letterSpacing: -3 },
  slogan: { fontSize: 14, fontWeight: '600', color: '#AAA', letterSpacing: 1 },
  footer: { position: 'absolute', bottom: 60, alignItems: 'center' },
  loading: { fontSize: 10, fontWeight: 'bold', color: '#CCC', marginTop: 10, letterSpacing: 2 },
});

export default SplashScreen;
