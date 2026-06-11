import React, { createContext, useContext, useState } from 'react';
import firestore from '@react-native-firebase/firestore';
import { Alert } from 'react-native';
import { USER_ROLES } from '../../../../shared/constants';
import { translations } from '../../../../shared/constants/translations';

interface AuthContextType {
  user: any | null;
  userData: any;
  loading: boolean;
  language: 'fr' | 'en';
  t: (key: string) => string;
  setLanguage: (lang: 'fr' | 'en') => void;
  loginOrRegister: (phone: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [language, setLanguageState] = useState<'fr' | 'en'>('fr');

  const t = (key: string) => {
    return translations[language][key] || key;
  };

  const setLanguage = (lang: 'fr' | 'en') => {
    setLanguageState(lang);
  };

  const loginOrRegister = async (phone: string) => {
    setLoading(true);
    try {
      const snapshot = await firestore().collection('users').where('phone', '==', phone).limit(1).get();
      if (snapshot.empty) {
        const newUser = { uid: `user_${Date.now()}`, phone, role: USER_ROLES.PASSENGER, createdAt: firestore.FieldValue.serverTimestamp(), walletBalance: 0 };
        await firestore().collection('users').doc(newUser.uid).set(newUser);
        setUser({ uid: newUser.uid, phone: newUser.phone });
        setUserData(newUser);
      } else {
        const data = snapshot.docs[0].data();
        setUser({ uid: data.uid, phone: data.phone });
        setUserData(data);
      }
      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setUser(null);
    setUserData(null);
  };

  return (
    <AuthContext.Provider value={{ user, userData, loading, language, t, setLanguage, loginOrRegister, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
