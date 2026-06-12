import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Text, TouchableOpacity, ActivityIndicator, TextInput, Alert } from 'react-native';
import MapView, { Marker, Polyline, UrlTile } from 'react-native-maps';
import firestore from '@react-native-firebase/firestore';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { COLORS, RIDE_STATUS } from '../../../../shared/constants';
import RideSelector from '../components/RideSelector';
import { calculateDistance, getFreeRoute } from '../../../../shared/utils';
import { findAndAssignNearestDriver } from '../../../../shared/utils/matching';

const { width, height } = Dimensions.get('window');

const MapScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const { currentLocation } = useLocation();
  const [pickup, setPickup] = useState(currentLocation);
  const [destination, setDestination] = useState<any>(null);
  const [routeCoords, setRouteCoords] = useState<any[]>([]);
  const [selectedRideId, setSelectedRideId] = useState('economy');
  const [showRideSelector, setShowRideSelector] = useState(false);
  const [rideOptions, setRideOptions] = useState<any[]>([]);
  const [loadingRoute, setLoadingPrice] = useState(false);
  
  // Tarification Dynamique Live
  const [livePricing, setLivePricing] = useState({ BASE_FARE: 500, PRICE_PER_KM: 200 });

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    if (currentLocation && !pickup) setPickup(currentLocation);
    
    // ÉCOUTER LES TARIFS EN TEMPS RÉEL (ADMIN CONFIG)
    const unsubConfig = firestore().collection('config').doc('pricing').onSnapshot(doc => {
      if (doc.exists()) setLivePricing(doc.data() as any);
    });
    return unsubConfig;
  }, [currentLocation]);

  const searchPlaces = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 3) { setSearchResults([]); return; }
    setIsSearching(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}&countrycodes=cm&limit=5`;
      const response = await fetch(url, { headers: { 'User-Agent': 'CityGoApp' } });
      const data = await response.json() as any[];
      setSearchResults(data);
    } catch (e) { console.error(e); } finally { setIsSearching(false); }
  };

  const selectPlace = async (place: any) => {
    const coords = { latitude: parseFloat(place.lat), longitude: parseFloat(place.lon) };
    setDestination(coords);
    setSearchQuery(place.display_name);
    setSearchResults([]);
    setLoadingPrice(true);
    setShowRideSelector(true);

    try {
      const route = await getFreeRoute(pickup, coords);
      setRouteCoords(route);
      const distance = calculateDistance(pickup!.latitude, pickup!.longitude, coords.latitude, coords.longitude);
      
      // Utilisation des tarifs LIVE de l'ADMIN
      const priceEco = livePricing.BASE_FARE + (distance * livePricing.PRICE_PER_KM);
      
      setRideOptions([
        { id: 'economy', title: 'Éco', price: priceEco, time: '3 min', icon: 'car-sport' },
        { id: 'comfort', title: 'Confort', price: priceEco * 1.5, time: '5 min', icon: 'ribbon' },
      ]);

      if (route.length > 0) {
        mapRef.current?.fitToCoordinates(route, { edgePadding: { right: 50, bottom: 350, left: 50, top: 100 } });
      }
    } catch (error) { console.error(error); } finally { setLoadingPrice(false); }
  };

  const handleOrder = async () => {
    if (!pickup || !destination || !user) return;
    try {
      const selected = rideOptions.find(o => o.id === selectedRideId);
      const rideRef = await firestore().collection('rides').add({
        passengerId: user.uid,
        passengerPhone: user.phone,
        status: RIDE_STATUS.SEARCHING,
        pickup: new firestore.GeoPoint(pickup.latitude, pickup.longitude),
        destination: new firestore.GeoPoint(destination.latitude, destination.longitude),
        price: Math.round(selected?.price || 0),
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
        vehicleType: selectedRideId,
      });
      navigation.navigate('Booking', { rideId: rideRef.id });

      // Client-side matching: find nearest driver in background
      findAndAssignNearestDriver(rideRef.id, pickup.latitude, pickup.longitude)
        .catch(err => console.error('[Matching] Error:', err));
    } catch (e) { Alert.alert('Erreur', 'Commande impossible'); }
  };

  return (
    <View style={styles.container}>
      <MapView ref={mapRef} style={styles.map} initialRegion={{ latitude: 4.0511, longitude: 9.7679, latitudeDelta: 0.05, longitudeDelta: 0.05 }}>
        <UrlTile urlTemplate="https://a.tile.openstreetmap.org/{z}/{x}/{y}.png" maximumZ={19} />
        {pickup && <Marker coordinate={pickup} title="Départ"><Icon name="pin" size={32} color={COLORS.PRIMARY}/></Marker>}
        {destination && <Marker coordinate={destination} title="Arrivée"><Icon name="location" size={32} color="#000"/></Marker>}
        {routeCoords.length > 0 && <Polyline coordinates={routeCoords} strokeWidth={6} strokeColor={COLORS.PRIMARY} />}
      </MapView>

      <View style={[styles.searchWrapper, showRideSelector && { top: -200 }]}>
        <View style={styles.searchBar}>
          <Icon name="search" size={22} color="#AAA" style={{ marginRight: 15 }} />
          <TextInput style={styles.input} placeholder="Où allez-vous ?" value={searchQuery} onChangeText={searchPlaces} />
          {isSearching && <ActivityIndicator size="small" color={COLORS.PRIMARY} />}
        </View>
        {searchResults.length > 0 && (
          <View style={styles.resultsList}>
            {searchResults.map((item, index) => (
              <TouchableOpacity key={index} style={styles.resultItem} onPress={() => selectPlace(item)}>
                <Icon name="navigate-circle-outline" size={20} color="#888" style={{ marginRight: 15 }} />
                <Text style={styles.resultText} numberOfLines={1}>{item.display_name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <RideSelector
        options={rideOptions}
        selectedId={selectedRideId}
        onSelect={setSelectedRideId}
        onConfirm={handleOrder}
        isVisible={showRideSelector}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width, height },
  searchWrapper: { position: 'absolute', top: 50, width: '100%', paddingHorizontal: 20, zIndex: 100 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', height: 65, borderRadius: 20, paddingHorizontal: 20, elevation: 15, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12 },
  input: { flex: 1, fontSize: 16, fontWeight: '700', color: '#000' },
  resultsList: { backgroundColor: '#FFF', marginTop: 12, borderRadius: 20, elevation: 10, overflow: 'hidden' },
  resultItem: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F8F8F8' },
  resultText: { fontSize: 14, color: '#333', fontWeight: '500' },
});

export default MapScreen;
