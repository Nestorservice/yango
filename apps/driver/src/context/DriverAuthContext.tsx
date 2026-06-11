import React, { createContext, useContext, useState, useEffect } from 'react';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { USER_ROLES } from '../../../../shared/constants';

interface DriverAuthContextType {
  user: FirebaseAuthTypes.User | null;
  driverData: any;
  loading: boolean;
  signInWithPhoneNumber: (phoneNumber: string) => Promise<FirebaseAuthTypes.ConfirmationResult>;
  signOut: () => Promise<void>;
  updateOnlineStatus: (status: boolean) => Promise<void>;
}

const DriverAuthContext = createContext<DriverAuthContextType | undefined>(undefined);

export const DriverAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [driverData, setDriverData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async (user) => {
      setUser(user);
      if (user) {
        const doc = await firestore().collection('drivers').doc(user.uid).get();
        if (doc.exists) {
          setDriverData(doc.data());
        }
      } else {
        setDriverData(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithPhoneNumber = async (phoneNumber: string) => {
    return await auth().signInWithPhoneNumber(phoneNumber);
  };

  const signOut = async () => {
    if (user) {
      await firestore().collection('drivers').doc(user.uid).update({ isOnline: false });
    }
    await auth().signOut();
  };

  const updateOnlineStatus = async (isOnline: boolean) => {
    if (user) {
      await firestore().collection('drivers').doc(user.uid).update({ isOnline });
    }
  };

  return (
    <DriverAuthContext.Provider value={{ user, driverData, loading, signInWithPhoneNumber, signOut, updateOnlineStatus }}>
      {children}
    </DriverAuthContext.Provider>
  );
};

export const useDriverAuth = () => {
  const context = useContext(DriverAuthContext);
  if (context === undefined) {
    throw new Error('useDriverAuth must be used within a DriverAuthProvider');
  }
  return context;
};
