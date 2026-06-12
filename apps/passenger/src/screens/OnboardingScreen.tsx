import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../../../../shared/constants';

const OnboardingScreen = ({ navigation }: any) => {
  const { registerPassenger, loading } = useAuth();
  const [name, setName] = useState('');

  const handleRegister = async () => {
    if (name.trim().length < 3) {
      Alert.alert('Erreur', 'Veuillez entrer votre nom complet (min 3 caractères)');
      return;
    }
    await registerPassenger(name.trim());
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Créer votre profil</Text>
        <Text style={styles.subtitle}>Saisissez votre nom complet pour commencer à voyager.</Text>

        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Nom complet"
            placeholderTextColor="#BBB"
            value={name}
            onChangeText={setName}
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
            <Text style={styles.buttonText}>COMMENCER</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, justifyContent: 'center', padding: 30 },
  title: { fontSize: 32, fontWeight: '900', color: '#000', marginBottom: 10 },
  subtitle: { fontSize: 16, color: '#999', marginBottom: 40, lineHeight: 22 },
  inputWrapper: {
    backgroundColor: '#F8F8F8',
    borderRadius: 16,
    paddingHorizontal: 20,
    height: 64,
    marginBottom: 30,
    justifyContent: 'center',
  },
  input: { fontSize: 18, fontWeight: '600', color: '#000' },
  button: {
    backgroundColor: COLORS.PRIMARY,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
});

export default OnboardingScreen;
