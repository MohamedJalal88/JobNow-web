import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// Dynamically loads Leaflet CSS & JS from CDN.
export function loadLeaflet(): Promise<any> {
  if (typeof window === "undefined") {
    return Promise.resolve(null);
  }
  if ((window as any).L) {
    return Promise.resolve((window as any).L);
  }

  // Check if loader is already active
  const existingScript = document.querySelector('script[src*="leaflet.js"]');
  if (existingScript) {
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        if ((window as any).L) {
          clearInterval(interval);
          resolve((window as any).L);
        }
      }, 100);
    });
  }

  return new Promise((resolve, reject) => {
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
      reject(err);
    };
    document.head.appendChild(script);
  });
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
    <div className={cn("relative", className)}>
      <div ref={containerRef} className="h-full w-full" />
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
  const [loaded, setLoaded] = useState(false);

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
      }
    };
  }, [lat, lng]);

  return (
    <div className={cn("relative", className)}>
      <div ref={containerRef} className="h-full w-full" />
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

  return (
    <div className={cn("relative", className)}>
      <div ref={containerRef} className="h-full w-full" />
      {!loaded && (
        <div className="absolute inset-0 bg-muted/40 rounded-2xl flex items-center justify-center text-sm text-muted-foreground">
          Loading OpenStreetMap…
        </div>
      )}
    </div>
  );
}
