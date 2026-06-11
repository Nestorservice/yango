import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../../../../shared/constants';

interface Message {
  id: string;
  text: string;
  senderId: string;
  createdAt: any;
}

const ChatScreen = ({ route }: any) => {
  const { rideId, otherPartyName } = route.params;
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    const unsubscribe = firestore()
      .collection('rides')
      .doc(rideId)
      .collection('messages')
      .orderBy('createdAt', 'desc')
      .onSnapshot((querySnapshot) => {
        const msgs = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Message[];
        setMessages(msgs);
        setLoading(false);
      });

    return () => unsubscribe();
  }, [rideId]);

  const sendMessage = async () => {
    if (inputText.trim() === '' || !user) return;

    const textToSend = inputText;
    setInputText('');

    try {
      await firestore()
        .collection('rides')
        .doc(rideId)
        .collection('messages')
        .add({
          text: textToSend,
          senderId: user.uid,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const renderItem = ({ item }: { item: Message }) => {
    const isMine = item.senderId === user?.uid;
    return (
      <View style={[styles.messageBubble, isMine ? styles.myMessage : styles.theirMessage]}>
        <Text style={[styles.messageText, isMine ? styles.myMessageText : styles.theirMessageText]}>
          {item.text}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{otherPartyName || 'Chat'}</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color={COLORS.PRIMARY} />
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          inverted
          contentContainerStyle={styles.listContent}
        />
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Tapez un message..."
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Text style={styles.sendButtonText}>Envoyer</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.SECONDARY },
  listContent: { padding: 16 },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.PRIMARY,
    borderBottomRightRadius: 4,
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    elevation: 1,
  },
  messageText: { fontSize: 16 },
  myMessageText: { color: COLORS.SECONDARY },
  theirMessageText: { color: COLORS.SECONDARY },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  input: {
    flex: 1,
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  sendButtonText: { fontWeight: 'bold', color: COLORS.SECONDARY },
});

export default ChatScreen;
