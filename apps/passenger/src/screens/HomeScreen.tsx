import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../../../../shared/constants';

const HomeScreen = () => {
  const { userData, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Accueil Passager</Text>
      <Text style={styles.info}>Bienvenue, {userData?.phone || 'Utilisateur'}</Text>
      
      <TouchableOpacity style={styles.button} onPress={signOut}>
        <Text style={styles.buttonText}>Déconnexion</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  info: {
    fontSize: 16,
    color: COLORS.GRAY,
    marginBottom: 40,
  },
  button: {
    backgroundColor: COLORS.DANGER,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default HomeScreen;
