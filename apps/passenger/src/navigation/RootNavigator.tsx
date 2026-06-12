import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { COLORS, USER_ROLES } from '../../../../shared/constants';
import Icon from 'react-native-vector-icons/Ionicons';

import LoginScreen from '../screens/LoginScreen';
import MapScreen from '../screens/MapScreen';
import BookingScreen from '../screens/BookingScreen';
import ChatScreen from '../screens/ChatScreen';
import HistoryScreen from '../screens/HistoryScreen';
import WalletScreen from '../screens/WalletScreen';
import ProfileScreen from '../screens/ProfileScreen';
import RideSummaryScreen from '../screens/RideSummaryScreen';
import DriverHomeScreen from '../../../driver/src/screens/DriverHomeScreen';
import DriverHistoryScreen from '../../../driver/src/screens/DriverHistoryScreen';
import DriverWalletScreen from '../../../driver/src/screens/DriverWalletScreen';
import DashboardPage from '../../../admin/src/pages/DashboardPage';

import { View, ActivityIndicator } from 'react-native';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const PassengerTabs = () => (
  <Tab.Navigator screenOptions={({ route }) => ({
    headerShown: false,
    tabBarActiveTintColor: COLORS.PRIMARY,
    tabBarStyle: { height: 75, paddingBottom: 15, paddingTop: 10 },
    tabBarIcon: ({ color, focused }) => {
      let n = 'map';
      if (route.name === 'Accueil') n = 'map';
      else if (route.name === 'Trajets') n = 'time';
      else if (route.name === 'Wallet') n = 'wallet';
      else if (route.name === 'Profil') n = 'person';
      return <Icon name={focused ? n : `${n}-outline`} size={24} color={color} />;
    }
  })}>
    <Tab.Screen name="Accueil" component={MapScreen} />
    <Tab.Screen name="Trajets" component={HistoryScreen} />
    <Tab.Screen name="Wallet" component={WalletScreen} />
    <Tab.Screen name="Profil" component={ProfileScreen} />
  </Tab.Navigator>
);

const DriverTabs = () => (
  <Tab.Navigator screenOptions={({ route }) => ({
    headerShown: false,
    tabBarActiveTintColor: COLORS.PRIMARY,
    tabBarStyle: { height: 75, paddingBottom: 15, paddingTop: 10 },
    tabBarIcon: ({ color, focused }) => {
      let n = route.name === 'Travail' ? 'car-sport' : route.name === 'Gains' ? 'wallet' : 'person';
      return <Icon name={focused ? n : `${n}-outline`} size={24} color={color} />;
    }
  })}>
    <Tab.Screen name="Travail" component={DriverHomeScreen} />
    <Tab.Screen name="Gains" component={DriverWalletScreen} />
    <Tab.Screen name="Profil" component={ProfileScreen} />
  </Tab.Navigator>
);

const RootNavigator = () => {
  const { user, userData, loading } = useAuth();
  if (loading) return <View style={{ flex: 1, backgroundColor: '#FFF', justifyContent: 'center' }}><ActivityIndicator size="large" color={COLORS.PRIMARY}/></View>;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            {userData?.role === USER_ROLES.DRIVER ? (
              <Stack.Screen name="DriverMain" component={DriverTabs} />
            ) : userData?.role === USER_ROLES.ADMIN ? (
              <Stack.Screen name="AdminHome" component={DashboardPage} />
            ) : (
              <Stack.Screen name="PassengerMain" component={PassengerTabs} />
            )}
            <Stack.Screen name="Booking" component={BookingScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="RideSummary" component={RideSummaryScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;
