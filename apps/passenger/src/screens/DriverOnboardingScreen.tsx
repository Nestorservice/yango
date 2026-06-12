import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../../../../shared/constants';

const DriverOnboardingScreen = () => {
  const { registerDriver, loading } = useAuth();
  const [name, setName] = useState('');
  const [model, setModel] = useState('');
  const [plate, setPlate] = useState('');
  const [color, setColor] = useState('');

  const handleRegister = async () => {
    if (name.trim().length < 3) {
      Alert.alert('Erreur', 'Veuillez entrer votre nom complet');
      return;
    }
    if (model.trim().length < 2) {
      Alert.alert('Erreur', 'Veuillez entrer le modèle du véhicule (ex: Toyota Yaris)');
      return;
    }
    if (plate.trim().length < 3) {
      Alert.alert('Erreur', 'Veuillez entrer la plaque d\'immatriculation');
      return;
    }
    if (color.trim().length < 2) {
      Alert.alert('Erreur', 'Veuillez entrer la couleur du véhicule');
      return;
    }

    await registerDriver(name.trim(), model.trim(), plate.trim(), color.trim());
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Devenir Chauffeur</Text>
        <Text style={styles.subtitle}>Enregistrez votre véhicule pour rejoindre notre réseau de partenaires.</Text>

        <Text style={styles.label}>Nom complet</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Jean Dupont"
            placeholderTextColor="#BBB"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
        </View>

        <Text style={styles.label}>Modèle du véhicule</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Toyota Yaris, Suzuki Alto..."
            placeholderTextColor="#BBB"
            value={model}
            onChangeText={setModel}
            autoCapitalize="words"
          />
        </View>

        <Text style={styles.label}>Plaque d'immatriculation</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="LT 123 AA"
            placeholderTextColor="#BBB"
            value={plate}
            onChangeText={setPlate}
            autoCapitalize="characters"
          />
        </View>

        <Text style={styles.label}>Couleur du véhicule</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Jaune, Blanc, Noir..."
            placeholderTextColor="#BBB"
            value={color}
            onChangeText={setColor}
            autoCapitalize="words"
          />
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>SOUMETTRE MON DOSSIER</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { padding: 30, paddingTop: 60, paddingBottom: 50 },
  title: { fontSize: 32, fontWeight: '900', color: '#000', marginBottom: 10 },
  subtitle: { fontSize: 16, color: '#999', marginBottom: 40, lineHeight: 22 },
  label: { fontSize: 11, color: '#999', fontWeight: '900', letterSpacing: 1, marginBottom: 8 },
  inputWrapper: {
    backgroundColor: '#F8F8F8',
    borderRadius: 16,
    paddingHorizontal: 20,
    height: 60,
    marginBottom: 20,
    justifyContent: 'center',
  },
  input: { fontSize: 16, fontWeight: '600', color: '#000' },
  button: {
    backgroundColor: COLORS.PRIMARY,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
});

export default DriverOnboardingScreen;
