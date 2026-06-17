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
  ScrollView
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../../../../shared/constants';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

const LoginScreen = ({ navigation }: any) => {
  const [mode, setMode] = useState<'passenger' | 'driver'>('passenger');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { loading, setUser, setDriverData, setUserData } = useAuth();
  const [internalLoading, setInternalLoading] = useState(false);

  const handleLogin = async () => {
    if (mode === 'passenger') {
      if (phone.length < 4) {
        Alert.alert('Erreur', 'Veuillez entrer un numéro valide');
        return;
      }

      setInternalLoading(true);
      try {
        // Nettoyage et formatage du numéro
        let cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
        if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
        const formattedPhone = cleanPhone.startsWith('+') ? cleanPhone : `+237${cleanPhone}`;

        console.log("Connexion simplifiée pour le passager :", formattedPhone);

        // 1. Authentification Firebase (Anonyme pour éviter le SMS)
        const userCred = await auth().signInAnonymously();
        const uid = userCred.user.uid;

        // 2. Vérifier si l'utilisateur existe déjà dans Firestore (par son téléphone)
        const userQuery = await firestore()
          .collection('users')
          .where('phone', '==', formattedPhone)
          .get();

        let profileData;

        if (!userQuery.empty) {
          // Utilisateur existant
          profileData = userQuery.docs[0].data();
          // On met à jour l'UID Firestore pour qu'il corresponde à la session actuelle si besoin
          await firestore().collection('users').doc(uid).set({
            ...profileData,
            uid: uid,
            lastLogin: firestore.FieldValue.serverTimestamp()
          }, { merge: true });
        } else {
          // Nouvel utilisateur
          profileData = {
            uid: uid,
            phone: formattedPhone,
            role: 'passenger',
            createdAt: firestore.FieldValue.serverTimestamp(),
            name: '' // Sera complété dans l'onboarding
          };
          await firestore().collection('users').doc(uid).set(profileData);
        }

        // 3. Mettre à jour le contexte global
        if (setUser) setUser(userCred.user);
        if (setUserData) setUserData(profileData);

      } catch (e: any) {
        console.error("Simplified Login Error:", e);
        Alert.alert('Erreur', 'Impossible de se connecter. Vérifiez votre connexion.');
      } finally {
        setInternalLoading(false);
      }
    } else {
      // Driver Login with Password
      if (!email || !password) {
        Alert.alert('Erreur', 'Veuillez entrer votre email et mot de passe');
        return;
      }

      setInternalLoading(true);
      try {
        // 1. Rechercher le chauffeur dans Firestore par email
        const querySnapshot = await firestore()
          .collection('drivers')
          .where('email', '==', email.toLowerCase().trim())
          .get();

        if (querySnapshot.empty) {
          Alert.alert('Erreur', 'Chauffeur non trouvé avec cet email.');
          setInternalLoading(false);
          return;
        }

        const driverDoc = querySnapshot.docs[0];
        const driverInfo = driverDoc.data();

        // 2. Vérifier le mot de passe
        if (driverInfo.password !== password) {
          Alert.alert('Erreur', 'Mot de passe incorrect.');
          setInternalLoading(false);
          return;
        }

        // 3. Authentification Firebase
        const userCred = await auth().signInAnonymously();
        
        // 4. Mettre à jour le contexte
        const fullDriverData = { ...driverInfo, role: 'driver', uid: userCred.user.uid };
        if (setUser) setUser(userCred.user);
        if (setDriverData) setDriverData(fullDriverData);
        if (setUserData) setUserData(fullDriverData);

        Alert.alert('Succès', `Bienvenue ${driverInfo.name}`);
      } catch (e: any) {
        console.error(e);
        Alert.alert('Erreur', 'Une erreur est survenue lors de la connexion. Vérifiez votre connexion internet.');
      } finally {
        setInternalLoading(false);
      }
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={styles.topSection}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>CITY</Text>
            <Text style={[styles.logoText, { color: COLORS.PRIMARY }]}>GO</Text>
          </View>
          <Text style={styles.title}>Votre ville,{"\n"}à votre rythme.</Text>
        </View>

        <View style={styles.modeSelector}>
          <TouchableOpacity 
            style={[styles.modeBtn, mode === 'passenger' && styles.modeBtnActive]}
            onPress={() => setMode('passenger')}
          >
            <Text style={[styles.modeBtnText, mode === 'passenger' && styles.modeBtnTextActive]}>PASSAGER</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.modeBtn, mode === 'driver' && styles.modeBtnActive]}
            onPress={() => setMode('driver')}
          >
            <Text style={[styles.modeBtnText, mode === 'driver' && styles.modeBtnTextActive]}>CHAUFFEUR</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSection}>
          {mode === 'passenger' ? (
            <>
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
            </>
          ) : (
            <>
              <Text style={styles.label}>Adresse Email</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="chauffeur@exemple.com"
                  placeholderTextColor="#BBB"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              <Text style={styles.label}>Mot de passe</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="******"
                  placeholderTextColor="#BBB"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>
            </>
          )}

          <TouchableOpacity
            style={[styles.button, (loading || internalLoading) && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading || internalLoading}
          >
            {loading || internalLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {mode === 'passenger' ? 'SE CONNECTER' : 'OUVRIR MA SESSION'}
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {mode === 'passenger' ? "Pas encore de compte ? " : "Problème d'accès ? "}
            </Text>
            <Text style={styles.footerLink}>
              {mode === 'passenger' ? "S'inscrire" : "Contacter l'Admin"}
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  topSection: { flex: 1, justifyContent: 'center', paddingHorizontal: 30, paddingTop: 50 },
  logoContainer: { flexDirection: 'row', marginBottom: 15 },
  logoText: { fontSize: 48, fontWeight: '900', color: '#000', letterSpacing: -2 },
  title: { fontSize: 28, fontWeight: '700', color: '#333', lineHeight: 36 },
  modeSelector: { 
    flexDirection: 'row', 
    marginHorizontal: 30, 
    marginBottom: 20,
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    padding: 4
  },
  modeBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10 },
  modeBtnActive: { backgroundColor: '#FFF', elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4 },
  modeBtnText: { fontSize: 13, fontWeight: 'bold', color: '#999' },
  modeBtnTextActive: { color: COLORS.PRIMARY },
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
    marginBottom: 20
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
    elevation: 8,
    marginTop: 10
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 25 },
  footerText: { color: '#999', fontSize: 14 },
  footerLink: { color: COLORS.PRIMARY, fontWeight: 'bold', fontSize: 14 }
});

export default LoginScreen;
