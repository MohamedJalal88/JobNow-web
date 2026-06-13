/**
 * Dynamically loads the Leaflet SDK or maps interface (placeholder for compatibility).
 * Excludes server-side execution.
 */
export function loadGoogleMaps(): Promise<any> {
  return Promise.resolve(true);
}

/**
 * Interface representing the geocoding coordinates.
 */
export interface GeocodeResult {
  latitude: number;
  longitude: number;
  locationName: string;
  pincode?: string;
}

/**
 * Performs reverse geocoding via OpenStreetMap Nominatim API (Free & Open Source).
 */
export async function googleReverseGeocode(lat: number, lng: number): Promise<GeocodeResult> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`;
  
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "JobNowMobileApp/1.0 (aysha.desktop@jobnow.dailywage.workers.dev)"
      }
    });
    if (!response.ok) throw new Error("Reverse geocoding failed");
    
    const data = await response.json();
    const pincode = data.address?.postcode || "";
    
    // Format a concise and clean address display name
    const addr = data.address || {};
    const road = addr.road || addr.suburb || addr.neighbourhood || addr.village || "";
    const city = addr.city || addr.town || addr.county || "";
    const state = addr.state || "";
    
    const parts = [road, city, state].map(s => s.trim()).filter(Boolean);
    const locationName = parts.length > 0 
      ? parts.join(", ") 
      : (data.display_name ? data.display_name.split(",").slice(0, 3).join(", ").trim() : "Unknown Location");

    return {
      latitude: lat,
      longitude: lng,
      locationName,
      pincode,
    };
  } catch (err) {
    console.error("Nominatim reverse geocode error:", err);
    throw err;
  }
}

/**
 * Searches location by address query via OpenStreetMap Nominatim API (Free & Open Source).
 */
export async function googleGeocodeSearch(query: string): Promise<GeocodeResult> {
  const cleanQuery = query.trim();
  if (!cleanQuery) {
    throw new Error("Empty query");
  }

  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanQuery)}&format=json&limit=1&countrycodes=in&accept-language=en`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "JobNowMobileApp/1.0 (aysha.desktop@jobnow.dailywage.workers.dev)"
      }
    });
    if (!response.ok) throw new Error("Geocoding failed");
    
    const results = await response.json();
    if (!results || results.length === 0) {
      throw new Error("No location found");
    }

    const item = results[0];
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);

    // Get cleaner location details and pincode by calling reverse geocoding on the coordinates
    try {
      return await googleReverseGeocode(lat, lng);
    } catch {
      return {
        latitude: lat,
        longitude: lng,
        locationName: item.display_name.split(",").slice(0, 3).join(", ").trim(),
      };
    }
  } catch (err) {
    console.error("Nominatim geocodesearch error:", err);
    throw err;
  }
}
