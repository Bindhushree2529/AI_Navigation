import React, { useEffect, useState, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Marker, Polyline, UrlTile } from "react-native-maps";
import * as Location from "expo-location";
import * as Speech from "expo-speech";
import Constants from "expo-constants";
import { useNavigationStore } from "@/store/navigationStore";
import { api } from "@/services/api";

const ORS_KEY = Constants.expoConfig?.extra?.orsApiKey;

interface Coords { latitude: number; longitude: number }

export default function MapScreen() {
  const [location, setLocation] = useState<Coords | null>(null);
  const [destination, setDestination] = useState("");
  const [searching, setSearching] = useState(false);
  const [routeCoords, setRouteCoords] = useState<Coords[]>([]);
  const mapRef = useRef<MapView>(null);
  const { isNavigating } = useNavigationStore();

  useEffect(() => {
    let sub: Location.LocationSubscription;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const current = await Location.getCurrentPositionAsync({});
      const coords = { latitude: current.coords.latitude, longitude: current.coords.longitude };
      setLocation(coords);

      // Live location updates
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 3000, distanceInterval: 5 },
        (loc) => {
          const c = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
          setLocation(c);
          // Publish to backend for caregiver tracking
          if (isNavigating) {
            api.post("/navigation/location", { lat: c.latitude, lng: c.longitude }).catch(() => {});
          }
        }
      );
    })();

    return () => { sub?.remove(); };
  }, [isNavigating]);

  const [routeCoords, setRouteCoords] = useState<Coords[]>([]);

  async function searchDestination() {
    if (!destination.trim() || !location) return;
    setSearching(true);
    Speech.speak(`Searching for ${destination}`, { language: "en-US" });
    try {
      // Geocode destination via Nominatim (free, no key needed)
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destination)}&format=json&limit=1`,
        { headers: { "User-Agent": "NaviAssist/1.0" } }
      );
      const geoData = await geoRes.json();
      if (!geoData.length) { Speech.speak("Destination not found", { language: "en-US" }); return; }

      const dest = { latitude: parseFloat(geoData[0].lat), longitude: parseFloat(geoData[0].lon) };

      // Get walking route via OpenRouteService (free tier)
      const routeRes = await fetch(
        `https://api.openrouteservice.org/v2/directions/foot-walking?api_key=${ORS_KEY}&start=${location.longitude},${location.latitude}&end=${dest.longitude},${dest.latitude}`
      );
      const routeData = await routeRes.json();
      const coords = routeData.features[0].geometry.coordinates.map(
        ([lng, lat]: [number, number]) => ({ latitude: lat, longitude: lng })
      );
      setRouteCoords(coords);
      mapRef.current?.fitToCoordinates([location, dest], { edgePadding: { top: 80, right: 40, bottom: 80, left: 40 }, animated: true });
      Speech.speak(`Route found. ${Math.round(routeData.features[0].properties.summary.distance)} meters`, { language: "en-US" });
    } catch {
      Speech.speak("Could not get route. Please try again.", { language: "en-US" });
    } finally {
      setSearching(false);
    }
  }

  function centerOnUser() {
    if (!location || !mapRef.current) return;
    mapRef.current.animateToRegion({ ...location, latitudeDelta: 0.005, longitudeDelta: 0.005 }, 500);
    Speech.speak("Centered on your location", { language: "en-US" });
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search destination..."
          placeholderTextColor="#64748b"
          value={destination}
          onChangeText={setDestination}
          onSubmitEditing={searchDestination}
          returnKeyType="search"
          accessibilityLabel="Destination search"
          accessibilityHint="Enter a destination to navigate to"
        />
        <TouchableOpacity
          style={styles.searchBtn}
          onPress={searchDestination}
          disabled={searching}
          accessibilityRole="button"
          accessibilityLabel="Search for destination"
        >
          <Text style={styles.searchBtnText}>{searching ? "..." : "Go"}</Text>
        </TouchableOpacity>
      </View>

      {/* Map */}
      {location ? (
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={{ ...location, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
          showsUserLocation
          showsMyLocationButton={false}
          accessibilityLabel="Navigation map"
        >
          <UrlTile
            urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            maximumZ={19}
            flipY={false}
          />
          <Marker coordinate={location} title="You are here" accessibilityLabel="Your current location" />
          {routeCoords.length > 0 && (
            <Polyline coordinates={routeCoords} strokeColor="#0ea5e9" strokeWidth={4} />
          )}
        </MapView>
      ) : (
        <View style={styles.loading} accessibilityLabel="Loading map, acquiring GPS location">
          <Text style={styles.loadingText}>Acquiring GPS location...</Text>
        </View>
      )}

      {/* Center button */}
      <TouchableOpacity
        style={styles.centerBtn}
        onPress={centerOnUser}
        accessibilityRole="button"
        accessibilityLabel="Center map on my location"
      >
        <Text style={styles.centerBtnText}>📍</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  searchBar: {
    position: "absolute",
    top: 60,
    left: 16,
    right: 16,
    zIndex: 10,
    flexDirection: "row",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.95)",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#f1f5f9",
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#334155",
    minHeight: 48,
  },
  searchBtn: {
    backgroundColor: "#0ea5e9",
    borderRadius: 14,
    paddingHorizontal: 20,
    justifyContent: "center",
    minHeight: 48,
    minWidth: 56,
  },
  searchBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { color: "#94a3b8", fontSize: 15 },
  centerBtn: {
    position: "absolute",
    bottom: 100,
    right: 16,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(15,23,42,0.9)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  centerBtnText: { fontSize: 22 },
});
