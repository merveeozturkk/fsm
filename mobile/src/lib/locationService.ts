import * as Location from 'expo-location';
import { Platform } from 'react-native';

export interface LocationResult {
  latitude: number;
  longitude: number;
  district?: string;
  city?: string;
  formattedAddress?: string;
}

export async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.warn('Location permission error:', error);
    return false;
  }
}

export async function getCurrentGPSLocation(): Promise<LocationResult | null> {
  try {
    const hasPerm = await requestLocationPermission();
    if (!hasPerm) return null;

    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const result: LocationResult = {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
    };

    // Ters Geocoding (İlçe ve Adres Çözümleme)
    try {
      const places = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      if (places && places.length > 0) {
        const p = places[0];
        result.district = p.district || p.subregion || p.city || undefined;
        result.city = p.city || p.region || undefined;
        result.formattedAddress = `${p.street || ''} ${p.streetNumber || ''} ${p.district || ''}`.trim();
      }
    } catch (e) {
      // Geocoding başarısız olsa bile koordinatları döner
    }

    return result;
  } catch (error) {
    console.warn('Get location error:', error);
    return null;
  }
}
