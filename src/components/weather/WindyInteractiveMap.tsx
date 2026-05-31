"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Maximize2, Minimize2, MapPin, Layers, Wind,
  Thermometer, Droplets, CloudRain, Gauge, Eye, Sun,
  Loader2, AlertTriangle,
} from "lucide-react";

// Declare global types for Windy Map Forecast API
declare global {
  interface Window {
    L?: {
      map: (el: HTMLElement, opts: { center: [number, number]; zoom: number }) => unknown;
    };
    WindyInit?: (
      options: {
        key: string;
        lat: number;
        lon: number;
        zoom: number;
        verbose?: boolean;
      },
      callback: (api: {
        store: {
          get: (key: string) => unknown;
          set: (key: string, value: unknown) => void;
          on: (key: string, callback: (value: unknown) => void) => void;
        };
        map: unknown;
        picker: {
          open: (opts: { lat: number; lon: number }) => void;
          close: () => void;
          getParams: () => { lat: number; lon: number; values: unknown; overlay: string };
        };
        utils: {
          latLon2str: (opts: { lat: number; lon: number }) => string;
        };
      }) => void
    ) => void;
  }
}

const WINDY_MAP_KEY = "udD1cbOVLTzsQAdjNFNnTCifTgk5titn";

const WEATHER_LAYERS = [
  { key: "wind", label: "Angin", icon: Wind, color: "text-cyan-400" },
  { key: "temp", label: "Suhu", icon: Thermometer, color: "text-orange-400" },
  { key: "rh", label: "Kelembapan", icon: Droplets, color: "text-blue-400" },
  { key: "precip", label: "Curah Hujan", icon: CloudRain, color: "text-indigo-400" },
  { key: "pressure", label: "Tekanan", icon: Gauge, color: "text-green-400" },
  { key: "clouds", label: "Awan", icon: CloudRain, color: "text-gray-400" },
  { key: "radar", label: "Radar", icon: Eye, color: "text-yellow-400" },
  { key: "satellite", label: "Satelit", icon: Sun, color: "text-purple-400" },
];

interface WindyInteractiveMapProps {
  lat: number;
  lon: number;
  cityName?: string;
}

export default function WindyInteractiveMap({
  lat,
  lon,
  cityName,
}: WindyInteractiveMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<ReturnType<typeof window.WindyInit> | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeLayer, setActiveLayer] = useState("wind");
  const [pickerValue, setPickerValue] = useState<string>("");

  const loadWindyMap = useCallback(() => {
    if (!containerRef.current) return;

    // Check if already loaded
    if (window.WindyInit && window.L) {
      initMap();
      return;
    }

    // Load Leaflet first
    const leafletScript = document.createElement("script");
    leafletScript.src = "https://unpkg.com/leaflet@1.4.0/dist/leaflet.js";
    leafletScript.async = true;

    leafletScript.onload = () => {
      // Load Windy API
      const windyScript = document.createElement("script");
      windyScript.src =
        "https://api.windy.com/assets/map-forecast/libBoot.js";
      windyScript.async = true;

      windyScript.onload = () => {
        initMap();
      };

      windyScript.onerror = () => {
        setError("Gagal memuat peta Windy");
      };

      document.head.appendChild(windyScript);
    };

    leafletScript.onerror = () => {
      setError("Gagal memuat Leaflet");
    };

    document.head.appendChild(leafletScript);
  }, [lat, lon]);

  const initMap = useCallback(() => {
    if (!containerRef.current || !window.WindyInit) return;

    // Clear existing map
    const existingMap = containerRef.current.querySelector(".leaflet-container");
    if (existingMap) {
      existingMap.remove();
    }

    try {
      window.WindyInit(
        {
          key: WINDY_MAP_KEY,
          lat,
          lon,
          zoom: 10,
          verbose: false,
        },
        (windyAPI) => {
          mapRef.current = windyAPI;

          // Set initial layer
          windyAPI.store.set("overlay", activeLayer);

          // Listen for picker changes
          windyAPI.store.on("pickerChanged", () => {
            try {
              const params = windyAPI.picker.getParams();
              setPickerValue(JSON.stringify(params.values, null, 2));
            } catch {
              // ignore picker errors
            }
          });

          setLoaded(true);
          setError(null);
        }
      );
    } catch (err) {
      setError("Gagal menginisialisasi peta");
    }
  }, [lat, lon, activeLayer]);

  const changeLayer = useCallback(
    (layerKey: string) => {
      setActiveLayer(layerKey);
      if (mapRef.current) {
        try {
          (mapRef.current as { store: { set: (k: string, v: string) => void } }).store.set(
            "overlay",
            layerKey
          );
        } catch {
          // ignore layer change errors
        }
      }
    },
    []
  );

  useEffect(() => {
    loadWindyMap();
    return () => {
      // Cleanup
      if (containerRef.current) {
        const leaflet = containerRef.current.querySelector(".leaflet-container");
        if (leaflet) leaflet.remove();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lon]);

  // Fallback to iframe if the API fails to load
  const fallbackUrl = `https://embed.windy.com/embed.html?type=map&gradient=temperature&radar=1&satellite=1&pressure=1&wind=1&temp=1&rh=1&clouds=1&zoom=11&lat=${lat}&lon=${lon}&level=surface&metric=ca&calendar=gregorian&location=coordinates&lang=id`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.5 }}
      className={`w-full mx-auto ${expanded ? "max-w-5xl" : "max-w-2xl"}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-sm font-medium text-white/50 flex items-center gap-2">
          <Layers className="h-3.5 w-3.5" />
          PETA CUACA INTERAKTIF
          {loaded && (
            <span className="text-[10px] text-green-400/60 bg-green-400/10 px-1.5 py-0.5 rounded-full">
              LIVE
            </span>
          )}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="text-white/30 hover:text-white/60 h-6 px-2"
        >
          {expanded ? (
            <Minimize2 className="h-3 w-3" />
          ) : (
            <Maximize2 className="h-3 w-3" />
          )}
        </Button>
      </div>

      <Card className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
        <CardContent className="p-0">
          {/* Layer Selector */}
          {loaded && (
            <div className="flex gap-1 p-2 overflow-x-auto border-b border-white/5">
              {WEATHER_LAYERS.map((layer) => (
                <button
                  key={layer.key}
                  onClick={() => changeLayer(layer.key)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] whitespace-nowrap transition-all ${
                    activeLayer === layer.key
                      ? "bg-white/15 text-white"
                      : "text-white/40 hover:text-white/60 hover:bg-white/5"
                  }`}
                >
                  <layer.icon className={`h-3 w-3 ${layer.color}`} />
                  {layer.label}
                </button>
              ))}
            </div>
          )}

          {/* Map Container */}
          <div
            className={`relative w-full bg-black/30 overflow-hidden transition-all duration-300 ${
              expanded ? "aspect-video" : "aspect-[16/10]"
            }`}
          >
            {/* Loading State */}
            {!loaded && !error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                <Loader2 className="h-8 w-8 text-white/30 animate-spin" />
                <p className="text-white/30 text-sm mt-3">
                  Memuat peta cuaca interaktif...
                </p>
              </div>
            )}

            {/* Error State — fallback to iframe */}
            {error && (
              <iframe
                src={fallbackUrl}
                className="w-full h-full border-0"
                allowFullScreen
                loading="lazy"
                title={`Peta cuaca ${cityName || "Windy"}`}
              />
            )}

            {/* Windy Map Container */}
            <div
              ref={containerRef}
              className="w-full h-full"
              style={{ display: loaded ? "block" : "none" }}
            />

            {/* Error overlay */}
            {error && (
              <div className="absolute top-2 right-2 flex items-center gap-1 bg-yellow-500/20 backdrop-blur-sm text-yellow-300 text-[10px] px-2 py-1 rounded-full">
                <AlertTriangle className="h-3 w-3" />
                Mode fallback — iframe
              </div>
            )}
          </div>

          {/* Picker Value Display */}
          {loaded && pickerValue && (
            <div className="px-4 py-2 bg-white/3 border-t border-white/5">
              <p className="text-[10px] text-white/30 font-mono">
                {pickerValue}
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between">
            <p className="text-xs text-white/30 flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {cityName || `${lat.toFixed(2)}, ${lon.toFixed(2)}`}
            </p>
            <p className="text-[10px] text-white/20">
              Windy Map Forecast API &bull; GFS Model
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
