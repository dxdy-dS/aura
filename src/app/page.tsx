"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, CloudOff, RefreshCw, CloudSunRain,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import SearchBar from "@/components/weather/SearchBar";
import CurrentWeather from "@/components/weather/CurrentWeather";
import HourlyForecast from "@/components/weather/HourlyForecast";
import DailyForecast from "@/components/weather/DailyForecast";
import LiveWebcams from "@/components/weather/LiveWebcams";
import WindyMap from "@/components/weather/WindyInteractiveMap";
import WeatherParticles from "@/components/weather/WeatherParticles";
import {
  getWeatherIcon,
  getBackgroundGradient,
  isNightTime,
  parseCondition,
  type WeatherCondition,
} from "@/lib/weather";

interface CurrentWeatherData {
  dt: number;
  temp: number;
  feelsLike: number;
  tempMin: number;
  tempMax: number;
  dewpoint: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDeg: number;
  gust: number;
  precip: number;
  snow: number;
  ptype: number;
  clouds: number;
  condition: string;
  cape: number;
  visibility: number;
}

interface HourlyData {
  dt: number;
  temp: number;
  dewpoint: number;
  windSpeed: number;
  windDeg: number;
  gust: number;
  precip: number;
  snow: number;
  ptype: number;
  clouds: number;
  humidity: number;
  pressure: number;
  cape: number;
  condition: string;
}

interface DailyData {
  dt: number;
  date: string;
  tempMin: number;
  tempMax: number;
  windSpeed: number;
  windDeg: number;
  gust: number;
  precip: number;
  snow: number;
  ptype: number;
  clouds: number;
  humidity: number;
  pressure: number;
  cape: number;
  condition: string;
  pop: number;
}

export default function Home() {
  const [weather, setWeather] = useState<CurrentWeatherData | null>(null);
  const [hourly, setHourly] = useState<HourlyData[] | null>(null);
  const [daily, setDaily] = useState<DailyData[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCity, setLastCity] = useState<string>("");
  const [locationName, setLocationName] = useState<string>("");
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [bgCondition, setBgCondition] = useState<WeatherCondition>("clear");
  const [showMap, setShowMap] = useState(false);

  const fetchWeather = useCallback(
    async (cityOrCoords: string | { lat: number; lon: number }) => {
      setLoading(true);
      setError(null);

      try {
        let lat: number, lon: number, cityName: string;

        if (typeof cityOrCoords === "string") {
          const geoRes = await fetch(
            `/api/geocode?q=${encodeURIComponent(cityOrCoords)}&limit=1`
          );
          if (!geoRes.ok) throw new Error("Kota tidak ditemukan");
          const geoData = await geoRes.json();
          if (!geoData.results || geoData.results.length === 0) {
            throw new Error("Kota tidak ditemukan");
          }
          const r = geoData.results[0];
          lat = r.latitude; lon = r.longitude;
          cityName = `${r.name}, ${r.country || ""}`.trim();
          setLastCity(cityOrCoords);
        } else {
          lat = cityOrCoords.lat; lon = cityOrCoords.lon;
          try {
            const geoRes = await fetch(`/api/geocode?lat=${lat}&lon=${lon}`);
            if (geoRes.ok) {
              const gd = await geoRes.json();
              cityName = `${gd.name}, ${gd.country || ""}`.trim();
            } else cityName = `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
          } catch { cityName = `${lat.toFixed(2)}, ${lon.toFixed(2)}`; }
          setLastCity(`${lat},${lon}`);
        }

        setLocationName(cityName);
        setCoords({ lat, lon });

        // Single API call — Windy Point Forecast (GFS model)
        const weatherRes = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
        if (!weatherRes.ok) {
          const errData = await weatherRes.json();
          throw new Error(errData.error || "Data cuaca tidak tersedia");
        }

        const data = await weatherRes.json();
        const current = data.current;
        setWeather(current);
        setHourly(data.hourly || []);
        setDaily(data.daily || []);

        const condition = parseCondition(current.condition);
        setBgCondition(condition);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const handleSearch = useCallback((city: string) => fetchWeather(city), [fetchWeather]);
  const handleGeolocate = useCallback((lat: number, lon: number) => fetchWeather({ lat, lon }), [fetchWeather]);

  const night = isNightTime();
  const bgGradient = getBackgroundGradient(bgCondition, night);

  return (
    <div className={`min-h-screen relative overflow-hidden bg-gradient-to-br ${bgGradient} transition-all duration-1000`}>
      <WeatherParticles condition={bgCondition} intensity="medium" />

      {/* Floating ambient orbs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <motion.div animate={{ x: [0, 30, -20, 0], y: [0, -40, 20, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
        <motion.div animate={{ x: [0, -40, 20, 0], y: [0, 30, -30, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
        <motion.div animate={{ x: [0, 20, -30, 0], y: [0, -20, 40, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-white/3 blur-3xl" />
      </div>

      {/* Main Content */}
      <main className="relative z-10 flex flex-col items-center min-h-screen px-4 py-8 sm:py-12">
        {/* Logo */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }} className="text-center mb-8"
        >
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight flex items-center gap-2 justify-center">
            <CloudSunRain className="h-8 w-8 text-white/70" />
            <span className="bg-gradient-to-r from-white via-white/90 to-white/60 bg-clip-text text-transparent">
              Cuaca
            </span>
          </h1>
          <p className="text-sm text-white/40 mt-1">
            Prakiraan cuaca real-time &amp; webcam langsung
          </p>
        </motion.div>

        {/* Search */}
        <SearchBar onSearch={handleSearch} onGeolocate={handleGeolocate} isLoading={loading} />

        {/* Content */}
        <div className="w-full mt-8 space-y-6">
          <AnimatePresence mode="wait">
            {loading && (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* Loading Skeleton */}
                <div className="w-full max-w-lg mx-auto space-y-4">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="w-20 h-20 rounded-full bg-white/5 animate-pulse" />
                    <div className="h-6 w-32 bg-white/5 rounded animate-pulse" />
                    <div className="h-14 w-24 bg-white/5 rounded animate-pulse" />
                    <div className="flex gap-3">
                      <div className="h-5 w-16 bg-white/5 rounded animate-pulse" />
                      <div className="h-5 w-16 bg-white/5 rounded animate-pulse" />
                      <div className="h-5 w-20 bg-white/5 rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
                    <div className="grid grid-cols-4 gap-3">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="flex flex-col items-center space-y-2 p-3 rounded-xl bg-white/5">
                          <div className="w-4 h-4 rounded bg-white/10 animate-pulse" />
                          <div className="h-3 w-10 bg-white/10 rounded animate-pulse" />
                          <div className="h-4 w-12 bg-white/10 rounded animate-pulse" />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="max-w-2xl mx-auto space-y-2">
                    <div className="h-4 w-28 bg-white/5 rounded animate-pulse" />
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
                      <div className="flex gap-2 overflow-hidden">
                        {Array.from({ length: 8 }).map((_, i) => (
                          <div key={i} className="flex flex-col items-center min-w-[72px] p-3 rounded-xl bg-white/5 space-y-2">
                            <div className="h-3 w-8 bg-white/10 rounded animate-pulse" />
                            <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse" />
                            <div className="h-4 w-8 bg-white/10 rounded animate-pulse" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {error && !loading && (
              <motion.div key="error" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-20"
              >
                <CloudOff className="h-12 w-12 text-white/20" />
                <p className="text-white/50 mt-4 text-sm">{error}</p>
                <Button variant="ghost" size="sm" onClick={() => lastCity && fetchWeather(lastCity)}
                  className="mt-4 text-white/40 hover:text-white/70"
                >
                  <RefreshCw className="h-3 w-3 mr-1" /> Coba Lagi
                </Button>
              </motion.div>
            )}

            {weather && !loading && !error && (
              <motion.div key="weather" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <CurrentWeather
                  city={locationName || "Tidak Diketahui"}
                  temp={weather.temp}
                  feelsLike={weather.feelsLike}
                  tempMin={weather.tempMin}
                  tempMax={weather.tempMax}
                  humidity={weather.humidity}
                  pressure={weather.pressure}
                  windSpeed={weather.windSpeed}
                  windDeg={weather.windDeg}
                  gust={weather.gust}
                  precip={weather.precip}
                  clouds={weather.clouds}
                  condition={weather.condition}
                  visibility={weather.visibility}
                  weatherIcon={getWeatherIcon(parseCondition(weather.condition), night)}
                  dewpoint={weather.dewpoint}
                  cape={weather.cape}
                  snow={weather.snow}
                  sunrise={weather.sunrise}
                  sunset={weather.sunset}
                  thunderAlert={weather.thunderAlert}
                />

                {hourly && hourly.length > 0 && <HourlyForecast list={hourly} />}
                {daily && daily.length > 0 && <DailyForecast list={daily} />}

                {/* Tab: Map / Webcams */}
                {coords && (
                  <div className="w-full max-w-2xl mx-auto">
                    <div className="flex gap-2 mb-3 px-1">
                      <Button variant={showMap ? "ghost" : "default"} size="sm"
                        onClick={() => setShowMap(false)}
                        className={`text-xs ${!showMap ? "bg-white/20 text-white" : "text-white/40 hover:text-white/70"}`}
                      >
                        Webcam Langsung
                      </Button>
                      <Button variant={showMap ? "default" : "ghost"} size="sm"
                        onClick={() => setShowMap(true)}
                        className={`text-xs ${showMap ? "bg-white/20 text-white" : "text-white/40 hover:text-white/70"}`}
                      >
                        Peta Cuaca Interaktif
                      </Button>
                    </div>
                    {showMap ? (
                      <WindyMap lat={coords.lat} lon={coords.lon} cityName={locationName} />
                    ) : (
                      <LiveWebcams lat={coords.lat} lon={coords.lon} />
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {!weather && !loading && !error && (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-20 text-center"
              >
                <motion.div animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="text-6xl mb-4"
                >
                  {getWeatherIcon(bgCondition, night)}
                </motion.div>
                <p className="text-white/40 text-sm max-w-xs">
                  Cari nama kota atau gunakan lokasi Anda untuk melihat
                  prakiraan cuaca, webcam langsung, dan peta interaktif dari Windy.com
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <motion.footer initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
          className="mt-auto pt-12 text-center"
        >
          <p className="text-xs text-white/20">
            Data cuaca dari Windy GFS &bull; Webcam dari Windy &bull;
            <span className="text-white/30"> Cuaca</span> &bull; Next.js 16
          </p>
        </motion.footer>
      </main>
    </div>
  );
}
