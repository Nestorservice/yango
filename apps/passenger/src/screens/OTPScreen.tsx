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
import firestore from '@react-native-firebase/firestore';
import { COLORS, USER_ROLES } from '../../../../shared/constants';

const OTPScreen = ({ route, navigation }: any) => {
  const { confirmation, phone } = route.params;
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (code.length !== 6) {
      Alert.alert('Erreur', 'Le code doit comporter 6 chiffres');
      return;
    }

    setLoading(true);
    try {
      const result = await confirmation.confirm(code);
      const user = result.user;

      // Vérifier si l'utilisateur existe déjà
      const userDoc = await firestore().collection('users').doc(user.uid).get();
      
      if (!userDoc.exists) {
        // Créer l'utilisateur s'il est nouveau
        await firestore().collection('users').doc(user.uid).set({
          uid: user.uid,
          phone: phone,
          role: USER_ROLES.PASSENGER,
          createdAt: firestore.FieldValue.serverTimestamp(),
          name: '', // Sera complété plus tard
        });
      }
      
      // Le AuthContext détectera le changement d'état et naviguera vers Home
    } catch (error: any) {
      console.error(error);
      Alert.alert('Erreur', 'Code invalide. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.inner}>
        <Text style={styles.title}>Vérification</Text>
        <Text style={styles.subtitle}>Entrez le code envoyé au {phone}</Text>

        <TextInput
          style={styles.input}
          placeholder="000000"
          keyboardType="number-pad"
          value={code}
          onChangeText={setCode}
          maxLength={6}
          autoFocus
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleVerify}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.buttonText}>Vérifier</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  inner: {
    padding: 24,
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.SECONDARY,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.GRAY,
    marginBottom: 32,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 24,
    height: 56,
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 8,
    color: COLORS.SECONDARY,
  },
  button: {
    backgroundColor: COLORS.PRIMARY,
    height: 56,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.SECONDARY,
  },
});

export default OTPScreen;
