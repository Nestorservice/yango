import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, Modal, TextInput } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../../../../shared/constants';
import { formatPrice } from '../../../../shared/utils';

const WalletScreen = () => {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [history, setHistory] = useState<any[]>([]);
  const [showTopUp, setShowTopUp] = useState(false);
  const [amount, setAmount] = useState('');
  const [provider, setProvider] = useState<'orange' | 'mtn'>('orange');

  useEffect(() => {
    if (!user) return;

    const unsubscribe = firestore()
      .collection('users')
      .doc(user.uid)
      .onSnapshot(doc => {
        if (doc.exists) {
          setBalance(doc.data()?.walletBalance || 0);
        }
      });

    const unsubscribeHistory = firestore()
      .collection('users')
      .doc(user.uid)
      .collection('transactions')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .onSnapshot(snap => {
        setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });

    return () => {
      unsubscribe();
      unsubscribeHistory();
    };
  }, [user]);

  const handleTopUp = async () => {
    const numAmount = parseInt(amount);
    if (isNaN(numAmount) || numAmount < 100) {
      Alert.alert('Erreur', 'Montant invalide (min 100 FCFA)');
      return;
    }

    try {
      Alert.alert(
        'Paiement en cours',
        `Veuillez valider le retrait de ${amount} FCFA sur votre téléphone ${provider.toUpperCase()}.`,
        [
          {
            text: 'OK',
            onPress: async () => {
              const userRef = firestore().collection('users').doc(user!.uid);
              await firestore().runTransaction(async (transaction) => {
                const userDoc = await transaction.get(userRef);
                const currentBalance = userDoc.data()?.walletBalance || 0;
                transaction.update(userRef, { walletBalance: currentBalance + numAmount });
                
                const transRef = userRef.collection('transactions').doc();
                transaction.set(transRef, {
                  amount: numAmount,
                  type: 'topup',
                  provider,
                  createdAt: firestore.FieldValue.serverTimestamp(),
                  status: 'completed'
                });
              });
              setShowTopUp(false);
              setAmount('');
              Alert.alert('Succès', 'Votre compte a été rechargé !');
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Erreur', 'Échec de la transaction');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Solde actuel</Text>
        <Text style={styles.balanceValue}>{formatPrice(balance)}</Text>
        <TouchableOpacity style={styles.topUpBtn} onPress={() => setShowTopUp(true)}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Icon name="add-circle-outline" size={20} color={COLORS.SECONDARY} style={{ marginRight: 5 }} />
            <Text style={styles.topUpText}>RECHARGER</Text>
          </View>
        </TouchableOpacity>
      </View>

      <Text style={styles.historyTitle}>Dernières transactions</Text>
      <FlatList
        data={history}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.transItem}>
            <View style={styles.transIcon}>
              <Icon 
                name={item.type === 'topup' ? 'arrow-down-circle' : 'car-outline'} 
                size={24} 
                color={item.type === 'topup' ? COLORS.SUCCESS : COLORS.PRIMARY} 
              />
            </View>
            <View style={{ flex: 1, marginLeft: 15 }}>
              <Text style={styles.transType}>{item.type === 'topup' ? 'Rechargement' : 'Course'}</Text>
              <Text style={styles.transDate}>MoMo {item.provider?.toUpperCase()}</Text>
            </View>
            <Text style={[styles.transAmount, { color: item.type === 'topup' ? COLORS.SUCCESS : COLORS.DANGER }]}>
              {item.type === 'topup' ? '+' : '-'}{formatPrice(item.amount)}
            </Text>
          </View>
        )}
      />

      <Modal visible={showTopUp} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Recharger mon compte</Text>
            
            <View style={styles.providerSelect}>
              <TouchableOpacity 
                style={[styles.providerBtn, provider === 'orange' && { borderColor: '#FF6600', borderWidth: 2 }]}
                onPress={() => setProvider('orange')}
              >
                <Icon name="phone-portrait-outline" size={24} color="#FF6600" />
                <Text style={{ marginTop: 5, fontSize: 12, fontWeight: 'bold' }}>Orange</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.providerBtn, provider === 'mtn' && { borderColor: '#FFCC00', borderWidth: 2 }]}
                onPress={() => setProvider('mtn')}
              >
                <Icon name="phone-portrait-outline" size={24} color="#FFCC00" />
                <Text style={{ marginTop: 5, fontSize: 12, fontWeight: 'bold' }}>MTN MoMo</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Montant (FCFA)"
              keyboardType="number-pad"
              value={amount}
              onChangeText={setAmount}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowTopUp(false)}>
                <Text style={styles.cancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleTopUp}>
                <Text style={styles.confirmBtnText}>Valider</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  balanceCard: {
    backgroundColor: COLORS.SECONDARY,
    padding: 30,
    borderRadius: 24,
    alignItems: 'center',
    marginBottom: 30,
    elevation: 5
  },
  balanceLabel: { color: '#ccc', fontSize: 14, fontWeight: '600', letterSpacing: 1 },
  balanceValue: { color: '#fff', fontSize: 36, fontWeight: '900', marginVertical: 10 },
  topUpBtn: { backgroundColor: COLORS.PRIMARY, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  topUpText: { fontWeight: 'bold', color: COLORS.SECONDARY, fontSize: 14 },
  historyTitle: { fontSize: 18, fontWeight: '800', marginBottom: 20, color: '#333' },
  transItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  transIcon: { width: 45, height: 45, backgroundColor: '#F8F8F8', borderRadius: 22.5, justifyContent: 'center', alignItems: 'center' },
  transType: { fontWeight: '700', fontSize: 16, color: '#333' },
  transDate: { color: COLORS.GRAY, fontSize: 12, marginTop: 2 },
  transAmount: { fontWeight: '800', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 28, padding: 30 },
  modalTitle: { fontSize: 22, fontWeight: '800', marginBottom: 25, textAlign: 'center' },
  providerSelect: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  providerBtn: { flex: 0.48, padding: 20, borderRadius: 16, backgroundColor: '#F8F8F8', alignItems: 'center' },
  input: { borderBottomWidth: 2, borderBottomColor: '#000', fontSize: 28, paddingVertical: 10, marginBottom: 40, fontWeight: 'bold', textAlign: 'center' },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cancelText: { color: COLORS.DANGER, fontWeight: 'bold', fontSize: 16 },
  confirmBtn: { backgroundColor: COLORS.PRIMARY, paddingHorizontal: 40, paddingVertical: 18, borderRadius: 16, elevation: 4 },
  confirmBtnText: { fontWeight: 'bold', color: '#FFF', fontSize: 16 }
});

export default WalletScreen;
