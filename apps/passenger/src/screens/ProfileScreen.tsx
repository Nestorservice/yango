import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../../../../shared/constants';

const ProfileScreen = () => {
  const { user, userData, signOut, t, language, setLanguage } = useAuth();
  const [name, setName] = useState(userData?.name || '');
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = async () => {
    try {
      await firestore().collection('users').doc(user.uid).update({ name });
      setIsEditing(false);
      Alert.alert('OK', 'Profile updated');
    } catch (e) { Alert.alert('Error', 'Failed to save'); }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}><Icon name="person" size={50} color="#FFF" /></View>
        <Text style={styles.phone}>{userData?.phone}</Text>
        <Text style={styles.role}>{userData?.role?.toUpperCase()}</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.label}>{t('name')}</Text>
          {isEditing ? (
            <TextInput style={styles.input} value={name} onChangeText={setName} autoFocus />
          ) : (
            <Text style={styles.value}>{userData?.name || '---'}</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{t('language')}</Text>
          <View style={styles.langRow}>
            <TouchableOpacity 
              style={[styles.langBtn, language === 'fr' && styles.activeLang]} 
              onPress={() => setLanguage('fr')}
            >
              <Text style={[styles.langText, language === 'fr' && styles.activeLangText]}>Français</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.langBtn, language === 'en' && styles.activeLang]} 
              onPress={() => setLanguage('en')}
            >
              <Text style={[styles.langText, language === 'en' && styles.activeLangText]}>English</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.mainBtn, { backgroundColor: isEditing ? COLORS.SUCCESS : '#000' }]} 
          onPress={() => isEditing ? handleSave() : setIsEditing(true)}
        >
          <Text style={styles.mainBtnText}>{isEditing ? t('save') : t('edit')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={signOut}>
          <Text style={styles.logoutText}>{t('logout')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { backgroundColor: '#000', padding: 40, alignItems: 'center', borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  avatarContainer: { width: 90, height: 100, borderRadius: 45, backgroundColor: COLORS.PRIMARY, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  phone: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  role: { color: COLORS.PRIMARY, fontSize: 11, fontWeight: '900', marginTop: 5, letterSpacing: 2 },
  content: { padding: 30 },
  section: { marginBottom: 25, backgroundColor: '#F9F9F9', padding: 20, borderRadius: 24 },
  label: { fontSize: 10, fontWeight: '900', color: '#AAA', marginBottom: 10, letterSpacing: 1 },
  value: { fontSize: 17, fontWeight: '700', color: '#333' },
  input: { fontSize: 17, fontWeight: '700', color: '#000', borderBottomWidth: 2, borderBottomColor: COLORS.PRIMARY },
  langRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  langBtn: { flex: 0.48, padding: 12, borderRadius: 12, backgroundColor: '#EEE', alignItems: 'center' },
  activeLang: { backgroundColor: COLORS.PRIMARY },
  langText: { fontSize: 14, fontWeight: 'bold', color: '#666' },
  activeLangText: { color: '#FFF' },
  mainBtn: { padding: 22, borderRadius: 20, alignItems: 'center', marginBottom: 20 },
  mainBtnText: { color: '#FFF', fontWeight: '900', letterSpacing: 1 },
  logoutBtn: { padding: 15, alignItems: 'center' },
  logoutText: { color: COLORS.PRIMARY, fontWeight: 'bold' }
});

export default ProfileScreen;
