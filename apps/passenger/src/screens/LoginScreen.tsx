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
  Platform
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../../../../shared/constants';

const LoginScreen = () => {
  const [phone, setPhone] = useState('');
  const { loginOrRegister, loading } = useAuth();

  const handleLogin = async () => {
    if (phone.length < 4) {
      Alert.alert('Erreur', 'Veuillez entrer un numéro valide');
      return;
    }
    await loginOrRegister(phone);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.topSection}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>CITY</Text>
          <Text style={[styles.logoText, { color: COLORS.PRIMARY }]}>GO</Text>
        </View>
        <Text style={styles.title}>Votre ville,{"\n"}à votre rythme.</Text>
      </View>

      <View style={styles.bottomSection}>
        <Text style={styles.label}>Numéro de téléphone</Text>
        <View style={styles.inputWrapper}>
          <View style={styles.countryPicker}>
            <Text style={styles.flag}>🇨🇲</Text>
            <Text style={styles.code}>+237</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="6XX XXX XXX"
            placeholderTextColor="#BBB"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>SE CONNECTER</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Pas encore de compte ? </Text>
          <Text style={styles.footerLink}>S'inscrire</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  topSection: { flex: 1, justifyContent: 'center', paddingHorizontal: 30 },
  logoContainer: { flexDirection: 'row', marginBottom: 15 },
  logoText: { fontSize: 48, fontWeight: '900', color: '#000', letterSpacing: -2 },
  title: { fontSize: 28, fontWeight: '700', color: '#333', lineHeight: 36 },
  bottomSection: { 
    padding: 30, 
    paddingBottom: 50 
  },
  label: { fontSize: 13, color: '#999', marginBottom: 10, fontWeight: 'bold', letterSpacing: 1 },
  inputWrapper: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F8F8F8',
    borderRadius: 16,
    paddingHorizontal: 20,
    height: 64,
    marginBottom: 30
  },
  countryPicker: { flexDirection: 'row', alignItems: 'center', marginRight: 15, borderRightWidth: 1, borderRightColor: '#EEE', paddingRight: 15 },
  flag: { fontSize: 20, marginRight: 8 },
  code: { fontSize: 16, fontWeight: 'bold', color: '#000' },
  input: { flex: 1, fontSize: 18, fontWeight: '600', color: '#000' },
  button: { 
    backgroundColor: COLORS.PRIMARY, 
    height: 64, 
    borderRadius: 16, 
    justifyContent: 'center', 
    alignItems: 'center',
    shadowColor: COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 25 },
  footerText: { color: '#999', fontSize: 14 },
  footerLink: { color: COLORS.PRIMARY, fontWeight: 'bold', fontSize: 14 }
});

export default LoginScreen;
