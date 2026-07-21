import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Navigation, Loader2 } from "lucide-react";
import { toast } from "sonner";

let leafletPromise: Promise<any> | null = null;

// Dynamically loads Leaflet CSS & JS from CDN.
export function loadLeaflet(): Promise<any> {
  if (typeof window === "undefined") {
    return Promise.resolve(null);
  }
  if ((window as any).L) {
    return Promise.resolve((window as any).L);
  }
  if (leafletPromise) {
    return leafletPromise;
  }

  // Remove any stale/failed Leaflet tags from the DOM head to avoid interference
  document.querySelectorAll('link[href*="leaflet"], script[src*="leaflet"]').forEach((el) => el.remove());

  leafletPromise = new Promise((resolve, reject) => {
    // 1. Inject Leaflet CSS
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
    document.head.appendChild(link);

    // 2. Inject Leaflet JS
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
    script.async = true;
    script.onload = () => {
      const L = (window as any).L;
      
      // Fix default marker icon issues with CDNs
      const DefaultIcon = L.icon({
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });
      L.Marker.prototype.options.icon = DefaultIcon;

      resolve(L);
    };
    script.onerror = (err) => {
      console.error("Failed to load Leaflet script:", err);
      leafletPromise = null; // Clear promise cache to allow retries
      reject(err);
    };
    document.head.appendChild(script);
  });

  return leafletPromise;
}

interface MapPickerProps {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
  className?: string;
}

export function MapPicker({ lat, lng, onChange, className = "h-64 w-full rounded-2xl" }: MapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [loaded, setLoaded] = useState(false);
  const [isTracking, setIsTracking] = useState(false);

  const handleTrackLiveLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    setIsTracking(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const liveLat = pos.coords.latitude;
        const liveLng = pos.coords.longitude;
        if (mapRef.current && markerRef.current) {
          markerRef.current.setLatLng([liveLat, liveLng]);
          mapRef.current.setView([liveLat, liveLng], 15);
        }
        onChange(liveLat, liveLng);
        setIsTracking(false);
        toast.success("🎯 Live GPS Location Tracked!");
      },
      (err) => {
        console.error("Location tracking failed:", err);
        setIsTracking(false);
        toast.error("Unable to fetch live GPS location. Please allow location access.");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  useEffect(() => {
    loadLeaflet().then((L) => {
      if (!L || !containerRef.current) return;
      setLoaded(true);

      // Create map instance if it doesn't exist
      if (!mapRef.current) {
        const map = L.map(containerRef.current, {
          center: [lat, lng],
          zoom: 13,
          zoomControl: true,
          attributionControl: false,
        });

        // Add OpenStreetMap tiles
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
        }).addTo(map);

        // Add a draggable marker
        const marker = L.marker([lat, lng], { draggable: true }).addTo(map);

        marker.on("dragend", () => {
          const pos = marker.getLatLng();
          if (pos) {
            onChange(pos.lat, pos.lng);
          }
        });

        map.on("click", (e: any) => {
          const { lat: clickLat, lng: clickLng } = e.latlng;
          marker.setLatLng([clickLat, clickLng]);
          onChange(clickLat, clickLng);
        });

        mapRef.current = map;
        markerRef.current = marker;
      }
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  // Update map and marker if external lat/lng change
  useEffect(() => {
    if (mapRef.current && markerRef.current) {
      const currentLatLng = markerRef.current.getLatLng();
      if (currentLatLng.lat !== lat || currentLatLng.lng !== lng) {
        markerRef.current.setLatLng([lat, lng]);
        mapRef.current.setView([lat, lng], mapRef.current.getZoom());
      }
    }
  }, [lat, lng]);

  return (
    <div className={cn("relative overflow-hidden rounded-2xl border border-border shadow-soft", className)}>
      <div ref={containerRef} className="h-full w-full" />
      
      {/* Live Location Button Overlay */}
      <button
        type="button"
        onClick={handleTrackLiveLocation}
        disabled={isTracking || !loaded}
        className="absolute top-3 right-3 z-[400] bg-background/90 hover:bg-background backdrop-blur-md text-foreground px-3 py-1.5 rounded-full text-xs font-bold shadow-md border border-border flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 disabled:opacity-60"
      >
        {isTracking ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
        ) : (
          <Navigation className="h-3.5 w-3.5 text-primary fill-primary/20" />
        )}
        <span>{isTracking ? "Locating…" : "Track Live Location"}</span>
      </button>

      {!loaded && (
        <div className="absolute inset-0 bg-muted/40 rounded-2xl flex items-center justify-center text-sm text-muted-foreground">
          Loading OpenStreetMap…
        </div>
      )}
    </div>
  );
}

interface MapDisplayProps {
  lat: number;
  lng: number;
  title?: string;
  className?: string;
}

export function MapDisplay({ lat, lng, title = "Location", className = "h-64 w-full rounded-2xl" }: MapDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const liveMarkerRef = useRef<any>(null);
  const [loaded, setLoaded] = useState(false);
  const [isTracking, setIsTracking] = useState(false);

  const handleTrackLiveLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    setIsTracking(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const L = (window as any).L;
        const liveLat = pos.coords.latitude;
        const liveLng = pos.coords.longitude;

        if (mapRef.current && L) {
          if (!liveMarkerRef.current) {
            const circle = L.circleMarker([liveLat, liveLng], {
              radius: 9,
              color: "#2563eb",
              fillColor: "#3b82f6",
              fillOpacity: 0.85,
              weight: 3,
            }).addTo(mapRef.current).bindPopup("Your Live Position").openPopup();
            liveMarkerRef.current = circle;
          } else {
            liveMarkerRef.current.setLatLng([liveLat, liveLng]);
          }
          mapRef.current.setView([liveLat, liveLng], 15);
        }
        setIsTracking(false);
        toast.success("🎯 Live GPS Location Tracked!");
      },
      (err) => {
        console.error("Live tracking failed:", err);
        setIsTracking(false);
        toast.error("Unable to fetch live location");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  useEffect(() => {
    loadLeaflet().then((L) => {
      if (!L || !containerRef.current) return;
      setLoaded(true);

      if (!mapRef.current) {
        const map = L.map(containerRef.current, {
          center: [lat, lng],
          zoom: 14,
          zoomControl: true,
          attributionControl: false,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
        }).addTo(map);

        L.marker([lat, lng]).addTo(map).bindPopup(title).openPopup();

        mapRef.current = map;
      }
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        liveMarkerRef.current = null;
      }
    };
  }, [lat, lng]);

  return (
    <div className={cn("relative overflow-hidden rounded-2xl border border-border shadow-soft", className)}>
      <div ref={containerRef} className="h-full w-full" />
      
      {/* Live Location Button Overlay */}
      <button
        type="button"
        onClick={handleTrackLiveLocation}
        disabled={isTracking || !loaded}
        className="absolute top-3 right-3 z-[400] bg-background/90 hover:bg-background backdrop-blur-md text-foreground px-3 py-1.5 rounded-full text-xs font-bold shadow-md border border-border flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 disabled:opacity-60"
      >
        {isTracking ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
        ) : (
          <Navigation className="h-3.5 w-3.5 text-primary fill-primary/20" />
        )}
        <span>{isTracking ? "Locating…" : "Track Live Location"}</span>
      </button>

      {!loaded && (
        <div className="absolute inset-0 bg-muted/40 rounded-2xl flex items-center justify-center text-sm text-muted-foreground">
          Loading OpenStreetMap…
        </div>
      )}
    </div>
  );
}

interface MapNearbyProps {
  centerLat: number;
  centerLng: number;
  radiusKm?: number;
  items: Array<{
    id: string;
    lat: number;
    lng: number;
    title: string;
    subtitle?: string;
    onClick?: () => void;
  }>;
  className?: string;
}

export function MapNearby({
  centerLat,
  centerLng,
  radiusKm = 10,
  items,
  className = "h-96 w-full rounded-2xl",
}: MapNearbyProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layerGroupRef = useRef<any>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadLeaflet().then((L) => {
      if (!L || !containerRef.current) return;
      setLoaded(true);

      if (!mapRef.current) {
        const map = L.map(containerRef.current, {
          center: [centerLat, centerLng],
          zoom: 12,
          zoomControl: true,
          attributionControl: false,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
        }).addTo(map);

        // Center location marker
        L.circle([centerLat, centerLng], {
          color: "#2563eb",
          fillColor: "#3b82f6",
          fillOpacity: 0.15,
          radius: radiusKm * 1000,
        }).addTo(map);

        // Standard worker center marker
        const centerIcon = L.icon({
          iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
        });
        L.marker([centerLat, centerLng], { icon: centerIcon }).addTo(map).bindPopup("You are here (Home)");

        layerGroupRef.current = L.layerGroup().addTo(map);
        mapRef.current = map;
      }
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        layerGroupRef.current = null;
      }
    };
  }, [centerLat, centerLng]);

  // Update items/markers layer when items array changes
  useEffect(() => {
    loadLeaflet().then((L) => {
      if (!L || !mapRef.current || !layerGroupRef.current) return;

      // Clear existing item markers
      layerGroupRef.current.clearLayers();

      // Custom marker icon for jobs
      const jobIcon = L.icon({
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        iconSize: [22, 35],
        iconAnchor: [11, 35],
        popupAnchor: [1, -30],
        className: "leaflet-marker-red", // Custom styling via CSS if needed
      });

      items.forEach((item) => {
        if (!item.lat || !item.lng) return;
        const marker = L.marker([item.lat, item.lng], { icon: jobIcon })
          .addTo(layerGroupRef.current)
          .bindPopup(`<b>${item.title}</b>${item.subtitle ? `<br/>${item.subtitle}` : ""}`);

        if (item.onClick) {
          marker.on("click", () => {
            item.onClick?.();
          });
        }
      });
    });
  }, [items]);

  const liveMarkerRef = useRef<any>(null);
  const [isTracking, setIsTracking] = useState(false);

  const handleTrackLiveLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    setIsTracking(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const L = (window as any).L;
        const liveLat = pos.coords.latitude;
        const liveLng = pos.coords.longitude;

        if (mapRef.current && L) {
          if (!liveMarkerRef.current) {
            const circle = L.circleMarker([liveLat, liveLng], {
              radius: 9,
              color: "#2563eb",
              fillColor: "#3b82f6",
              fillOpacity: 0.85,
              weight: 3,
            }).addTo(mapRef.current).bindPopup("Your Live Position").openPopup();
            liveMarkerRef.current = circle;
          } else {
            liveMarkerRef.current.setLatLng([liveLat, liveLng]);
          }
          mapRef.current.setView([liveLat, liveLng], 14);
        }
        setIsTracking(false);
        toast.success("🎯 Live GPS Location Tracked!");
      },
      (err) => {
        console.error("Live tracking failed:", err);
        setIsTracking(false);
        toast.error("Unable to fetch live location");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div className={cn("relative overflow-hidden rounded-2xl border border-border shadow-soft", className)}>
      <div ref={containerRef} className="h-full w-full" />

      {/* Live Location Button Overlay */}
      <button
        type="button"
        onClick={handleTrackLiveLocation}
        disabled={isTracking || !loaded}
        className="absolute top-3 right-3 z-[400] bg-background/90 hover:bg-background backdrop-blur-md text-foreground px-3 py-1.5 rounded-full text-xs font-bold shadow-md border border-border flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 disabled:opacity-60"
      >
        {isTracking ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
        ) : (
          <Navigation className="h-3.5 w-3.5 text-primary fill-primary/20" />
        )}
        <span>{isTracking ? "Locating…" : "Track Live Location"}</span>
      </button>

      {!loaded && (
        <div className="absolute inset-0 bg-muted/40 rounded-2xl flex items-center justify-center text-sm text-muted-foreground">
          Loading OpenStreetMap…
        </div>
      )}
    </div>
  );
}
