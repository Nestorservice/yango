import React, { createContext, useContext, useState, useEffect } from 'react';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { Alert } from 'react-native';
import { USER_ROLES } from '../../../../shared/constants';
import { translations } from '../../../../shared/constants/translations';

interface AuthContextType {
  user: FirebaseAuthTypes.User | { uid: string; phone: string } | null;
  userData: any;
  driverData: any;
  loading: boolean;
  language: 'fr' | 'en';
  t: (key: string) => string;
  setLanguage: (lang: 'fr' | 'en') => void;
  sendSMSCode: (phone: string) => Promise<any>;
  verifySMSCode: (confirmation: any, code: string, phone: string) => Promise<boolean>;
  registerPassenger: (name: string, avatarUrl?: string) => Promise<void>;
  registerDriver: (name: string, vehicleModel: string, plateNumber: string, vehicleColor: string, vehiclePhotoUrl?: string) => Promise<void>;
  updateOnlineStatus: (isOnline: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<any>>;
  setUserData: React.Dispatch<React.SetStateAction<any>>;
  setDriverData: React.Dispatch<React.SetStateAction<any>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [driverData, setDriverData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguageState] = useState<'fr' | 'en'>('fr');

  const t = (key: string) => {
    return translations[language][key] || key;
  };

  const setLanguage = (lang: 'fr' | 'en') => {
    setLanguageState(lang);
  };

  // Listen for Auth changes
  useEffect(() => {
    const unsubscribeAuth = auth().onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        
        // Listen to User data (real-time to catch role updates, driver validations, block status)
        const unsubUser = firestore()
          .collection('users')
          .doc(firebaseUser.uid)
          .onSnapshot(async (doc) => {
            if (doc.exists()) {
              const data = doc.data();
              setUserData(data);

              // If driver, also listen to driver-specific details (validation status, balance)
              if (data?.role === USER_ROLES.DRIVER) {
                firestore()
                  .collection('drivers')
                  .doc(firebaseUser.uid)
                  .get()
                  .then((driverDoc) => {
                    if (driverDoc.exists()) {
                      setDriverData(driverDoc.data());
                    }
                  });
              } else {
                setDriverData(null);
              }
            } else {
              setUserData(null);
              setDriverData(null);
            }
            setLoading(false);
          }, (err) => {
            console.error("User document listen error:", err);
            setLoading(false);
          });

        return () => unsubUser();
      } else {
        setUser(null);
        setUserData(null);
        setDriverData(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Send SMS verification code
  const sendSMSCode = async (phone: string) => {
    setLoading(true);
    
    // Nettoyage du numéro : suppression des espaces et tirets
    let cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    
    // Gestion du zéro initial (souvent présent dans les saisies utilisateur)
    if (cleanPhone.startsWith('0')) {
      cleanPhone = cleanPhone.substring(1);
    }
    
    // Standardisation au format international (+237 pour le Cameroun par défaut)
    const formattedPhone = cleanPhone.startsWith('+') ? cleanPhone : `+237${cleanPhone}`;

    console.log("Tentative d'envoi SMS à :", formattedPhone);

    // Mock bypass for testing numbers (starting with +237600)
    if (formattedPhone.startsWith('+237600')) {
      setLoading(false);
      console.log("Utilisation du mode mock pour le numéro de test");
      return { mock: true, phone: formattedPhone };
    }

    try {
      const confirmation = await auth().signInWithPhoneNumber(formattedPhone);
      setLoading(false);
      return confirmation;
    } catch (error: any) {
      setLoading(false);
      console.error("SMS sending failed details:", {
        code: error.code,
        message: error.message,
        phone: formattedPhone
      });
      
      let errorMessage = "Impossible d'envoyer le code SMS. Veuillez vérifier votre connexion ou le numéro saisi.";
      
      if (error.code === 'auth/invalid-phone-number') {
        errorMessage = "Le numéro de téléphone n'est pas valide.";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Trop de tentatives. Veuillez réessayer plus tard.";
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = "Erreur réseau. Vérifiez votre connexion internet.";
      }
      
      Alert.alert("Erreur d'authentification", errorMessage);
      throw error;
    }
  };

  // Verify SMS Code
  const verifySMSCode = async (confirmation: any, code: string, phone: string) => {
    setLoading(true);
    try {
      let firebaseUser: FirebaseAuthTypes.User | null = null;

      if (confirmation.mock) {
        if (code === '123456') {
          // Create/sign-in a mock Firebase User for testing
          // Since we are running in simulator or test environment, we sign in with custom/anonymous auth, or simulate it.
          // Let's sign in anonymously or use an existing credentials, but to keep firestore uid stable we can sign in anonymously
          // and store the phone number in custom document.
          let credentialResult = await auth().signInAnonymously();
          firebaseUser = credentialResult.user;
        } else {
          Alert.alert("Erreur", "Code de test invalide (entrez 123456)");
          setLoading(false);
          return false;
        }
      } else {
        const result = await confirmation.confirm(code);
        firebaseUser = result.user;
      }

      if (firebaseUser) {
        // Check if user document already exists
        const userDoc = await firestore().collection('users').doc(firebaseUser.uid).get();
        if (!userDoc.exists()) {
          const newUserData = {
            uid: firebaseUser.uid,
            phone: phone.startsWith('+') ? phone : `+237${phone}`,
            role: '', // empty to trigger onboarding selection
            walletBalance: 0,
            createdAt: firestore.FieldValue.serverTimestamp(),
          };
          await firestore().collection('users').doc(firebaseUser.uid).set(newUserData);
          setUserData(newUserData);
        } else {
          setUserData(userDoc.data());
        }
        setLoading(false);
        return true;
      }
      setLoading(false);
      return false;
    } catch (error: any) {
      setLoading(false);
      console.error("SMS Code Verification failed:", error);
      Alert.alert("Erreur", "Code SMS incorrect ou expiré.");
      return false;
    }
  };

  // Passenger profile onboarding
  const registerPassenger = async (name: string, avatarUrl: string = '') => {
    if (!user) return;
    setLoading(true);
    try {
      const updatedUser = {
        name,
        avatarUrl,
        role: USER_ROLES.PASSENGER,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };
      await firestore().collection('users').doc(user.uid).update(updatedUser);
      setUserData((prev: any) => ({ ...prev, ...updatedUser }));
      setLoading(false);
    } catch (error) {
      setLoading(false);
      console.error("Passenger onboarding failed:", error);
      Alert.alert("Erreur", "Impossible d'enregistrer le profil passager");
    }
  };

  // Driver profile onboarding
  const registerDriver = async (
    name: string,
    vehicleModel: string,
    plateNumber: string,
    vehicleColor: string,
    vehiclePhotoUrl: string = ''
  ) => {
    if (!user) return;
    setLoading(true);
    try {
      const updatedUser = {
        name,
        role: USER_ROLES.DRIVER,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };

      const driverDetails = {
        uid: user.uid,
        name,
        phone: userData?.phone || user.phone || '',
        vehicleModel,
        plateNumber,
        vehicleColor,
        vehiclePhotoUrl,
        isOnline: false,
        isAvailable: true,
        isValidated: false, // Must be validated by admin
        balance: 0,
        rating: 5.0,
        totalRides: 0,
        createdAt: firestore.FieldValue.serverTimestamp(),
      };

      const batch = firestore().batch();
      batch.update(firestore().collection('users').doc(user.uid), updatedUser);
      batch.set(firestore().collection('drivers').doc(user.uid), driverDetails);
      await batch.commit();

      setUserData((prev: any) => ({ ...prev, ...updatedUser }));
      setDriverData(driverDetails);
      setLoading(false);
    } catch (error) {
      setLoading(false);
      console.error("Driver onboarding failed:", error);
      Alert.alert("Erreur", "Impossible d'enregistrer le profil chauffeur");
    }
  };

  // Update Online Status
  const updateOnlineStatus = async (isOnline: boolean) => {
    if (!user) return;
    try {
      await firestore().collection('drivers').doc(user.uid).update({
        isOnline,
        isAvailable: isOnline,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });
      setDriverData((prev: any) => ({ ...prev, isOnline, isAvailable: isOnline }));
    } catch (error) {
      console.error("Failed to update online status:", error);
    }
  };

  // Sign out
  const signOut = async () => {
    setLoading(true);
    try {
      if (user && userData?.role === USER_ROLES.DRIVER) {
        await updateOnlineStatus(false);
      }
      await auth().signOut();
      setUser(null);
      setUserData(null);
      setDriverData(null);
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userData,
        driverData,
        loading,
        language,
        t,
        setLanguage,
        sendSMSCode,
        verifySMSCode,
        registerPassenger,
        registerDriver,
        updateOnlineStatus,
        signOut,
        setUser,
        setUserData,
        setDriverData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
