import { PRICING } from '../constants';

/**
 * Calcule la distance entre deux points (Haversine)
 */
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Récupère l'itinéraire réel via OSRM (GRATUIT - SANS CARTE BANCAIRE)
 */
export const getFreeRoute = async (start: any, end: any) => {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?overview=full&geometries=geojson`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.routes && data.routes.length > 0) {
      // Transformer le GeoJSON en format compatible react-native-maps
      return data.routes[0].geometry.coordinates.map((coord: any) => ({
        latitude: coord[1],
        longitude: coord[0],
      }));
    }
    return [];
  } catch (error) {
    console.error("OSRM Routing Error:", error);
    return [];
  }
};

export const calculatePrice = (distanceInKm: number): number => {
  const total = PRICING.BASE_FARE + distanceInKm * PRICING.PRICE_PER_KM;
  return Math.max(total, PRICING.MINIMUM_FARE);
};

export const formatPrice = (amount: number): string => {
  return `${Math.round(amount).toLocaleString('fr-FR')} FCFA`;
};
