import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './apps/passenger/src/context/AuthContext';
import { LocationProvider } from './apps/passenger/src/context/LocationContext';
import RootNavigator from './apps/passenger/src/navigation/RootNavigator';
import SplashScreen from './apps/passenger/src/screens/SplashScreen';

const AppContent = () => {
  const { loading } = useAuth();

  // On affiche le Splash Screen pendant que Firebase vérifie la session
  if (loading) return <SplashScreen />;

  return <RootNavigator />;
};

function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <LocationProvider>
          <AppContent />
        </LocationProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

export default App;
