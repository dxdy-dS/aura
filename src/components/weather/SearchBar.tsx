"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MapPin, Loader2, Clock, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SearchBarProps {
  onSearch: (city: string) => void;
  onGeolocate: (lat: number, lon: number) => void;
  isLoading?: boolean;
}

interface GeoResult {
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  countryName: string;
  admin1: string;
  timezone: string;
}

// Indonesian cities prioritized
const POPULAR_CITIES = [
  "Jakarta", "Surabaya", "Bandung", "Medan", "Semarang",
  "Makassar", "Palembang", "Denpasar", "Yogyakarta", "Balikpapan",
  "Malang", "Solo", "Manado", "Pontianak", "Banjarmasin",
  "Padang", "Pekanbaru", "Batam", "Lombok", "Bali",
  "Tokyo", "New York", "London", "Paris", "Dubai",
  "Singapore", "Bangkok", "Sydney", "Seoul", "Shanghai",
];

const STORAGE_KEY = "cuaca-search-history";
const MAX_HISTORY = 6;

function getSearchHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSearchHistory(city: string) {
  if (typeof window === "undefined") return;
  try {
    const history = getSearchHistory().filter((c) => c !== city);
    history.unshift(city);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
  } catch {
    // ignore storage errors
  }
}

function clearSearchHistory() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export default function SearchBar({
  onSearch,
  onGeolocate,
  isLoading = false,
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setHistory(getSearchHistory());
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    const popularMatches = POPULAR_CITIES.filter((c) =>
      c.toLowerCase().includes(query.toLowerCase())
    );

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/geocode?q=${encodeURIComponent(query)}&limit=5`
        );
        if (res.ok) {
          const data = await res.json();
          const geoResults: GeoResult[] = data.results || [];
          const existingNames = new Set(
            geoResults.map((r: GeoResult) => r.name.toLowerCase())
          );
          popularMatches.forEach((name) => {
            if (!existingNames.has(name.toLowerCase())) {
              geoResults.unshift({
                name, latitude: 0, longitude: 0,
                country: "", countryName: "", admin1: "", timezone: "",
              });
            }
          });
          setSuggestions(geoResults.slice(0, 6));
          setShowSuggestions(true);
        }
      } catch {
        setSuggestions(
          popularMatches.slice(0, 6).map((name) => ({
            name, latitude: 0, longitude: 0,
            country: "", countryName: "", admin1: "", timezone: "",
          }))
        );
        setShowSuggestions(true);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim()) {
        onSearch(query.trim());
        saveSearchHistory(query.trim());
        setHistory(getSearchHistory());
        setShowSuggestions(false);
      }
    },
    [query, onSearch]
  );

  const handleSuggestionClick = useCallback(
    (result: GeoResult) => {
      setQuery(result.name);
      setShowSuggestions(false);
      saveSearchHistory(result.name);
      setHistory(getSearchHistory());
      if (result.latitude && result.longitude) {
        onGeolocate(result.latitude, result.longitude);
      } else {
        onSearch(result.name);
      }
    },
    [onSearch, onGeolocate]
  );

  const handleHistoryClick = useCallback(
    (city: string) => {
      setQuery(city);
      setShowSuggestions(false);
      onSearch(city);
    },
    [onSearch]
  );

  const handleClearHistory = useCallback(() => {
    clearSearchHistory();
    setHistory([]);
  }, []);

  const handleGeolocate = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => onGeolocate(pos.coords.latitude, pos.coords.longitude),
        () => console.error("Geolokasi gagal")
      );
    }
  }, [onGeolocate]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== document.querySelector("input")) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") {
        setShowSuggestions(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const hasResults = suggestions.length > 0;
  const showHistory = showSuggestions && !query && history.length > 0 && !searching;
  const showSuggestionsList = showSuggestions && query && (hasResults || searching);

  return (
    <div className="w-full max-w-lg mx-auto relative">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Cari kota... (tekan /)"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="pl-10 pr-10 h-12 bg-white/10 backdrop-blur-md border-white/20 text-white placeholder:text-white/40 rounded-xl focus:ring-2 focus:ring-white/30 focus:border-transparent transition-all"
            />
            {query && (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setQuery("");
                  inputRef.current?.focus();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 animate-spin" />
            )}
          </div>
          <Button
            type="button" size="icon" variant="ghost"
            onClick={handleGeolocate}
            className="h-12 w-12 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl hover:bg-white/20 transition-all text-white/70 hover:text-white"
            title="Gunakan lokasi saya"
          >
            <MapPin className="h-4 w-4" />
          </Button>
          <Button type="submit" size="icon" disabled={isLoading || !query.trim()}
            className="h-12 w-12 bg-white/20 backdrop-blur-md rounded-xl hover:bg-white/30 transition-all text-white disabled:opacity-40"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>
      </form>

      <AnimatePresence>
        {/* Search History Dropdown */}
        {showHistory && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-full mt-2 w-full bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden z-50"
          >
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
              <span className="text-xs text-white/30 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Pencarian Terakhir
              </span>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); handleClearHistory(); }}
                className="text-[10px] text-white/20 hover:text-white/50 transition-colors"
              >
                Hapus
              </button>
            </div>
            {history.map((city) => (
              <button key={city} type="button"
                onMouseDown={() => handleHistoryClick(city)}
                className="w-full px-4 py-3 text-left text-white/80 hover:bg-white/10 hover:text-white transition-colors flex items-center gap-2"
              >
                <Clock className="h-3 w-3 text-white/30 shrink-0" />
                <span className="flex-1">{city}</span>
              </button>
            ))}
            <div className="px-4 py-2 border-t border-white/5">
              <span className="text-[10px] text-white/15">Kota Populer</span>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {POPULAR_CITIES.slice(0, 8).map((city) => (
                  <button
                    key={city}
                    type="button"
                    onMouseDown={() => handleHistoryClick(city)}
                    className="text-[10px] text-white/40 bg-white/5 hover:bg-white/10 hover:text-white/70 px-2 py-1 rounded-full transition-colors"
                  >
                    {city}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Search Suggestions Dropdown */}
        {showSuggestionsList && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-full mt-2 w-full bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden z-50"
          >
            {suggestions.map((item) => (
              <button key={`${item.name}-${item.country}`} type="button"
                onMouseDown={() => handleSuggestionClick(item)}
                className="w-full px-4 py-3 text-left text-white/80 hover:bg-white/10 hover:text-white transition-colors flex items-center gap-2"
              >
                <MapPin className="h-3 w-3 text-white/40 shrink-0" />
                <span className="flex-1">{item.name}</span>
                {(item.country || item.countryName) && (
                  <span className="text-xs text-white/30">{item.countryName || item.country}</span>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
