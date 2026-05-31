"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import {
  Droplets,
  Wind,
  Eye,
  Gauge,
  Thermometer,
  Cloud,
  CloudRain,
  Sunrise,
  Sunset,
  Sun,
  Zap,
  CloudFog,
} from "lucide-react";
import {
  formatTemp,
  getWindDirection,
  getVisibilityLabel,
  getConditionLabel,
  getCloudCoverLabel,
} from "@/lib/weather";

interface ThunderAlertData {
  level: string;
  label: string;
}

interface CurrentWeatherProps {
  city: string;
  temp: number;
  feelsLike: number;
  tempMin: number;
  tempMax: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDeg: number;
  gust: number;
  precip: number;
  clouds: number;
  condition: string;
  visibility: number;
  weatherIcon: string;
  dewpoint?: number;
  cape?: number;
  snow?: number;
  sunrise?: number;
  sunset?: number;
  uvIndexMax?: number;
  thunderAlert?: ThunderAlertData;
}

export default function CurrentWeather({
  city,
  temp,
  feelsLike,
  tempMin,
  tempMax,
  humidity,
  pressure,
  windSpeed,
  windDeg,
  gust,
  precip,
  clouds,
  condition,
  visibility,
  weatherIcon,
  dewpoint,
  cape,
  snow,
  sunrise,
  sunset,
  thunderAlert,
}: CurrentWeatherProps) {
  const conditionLabel = getConditionLabel(condition);

  const sunriseTime = sunrise
    ? new Date(sunrise * 1000).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "--:--";

  const sunsetTime = sunset
    ? new Date(sunset * 1000).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "--:--";

  // Determine alert color for CAPE
  const capeAlertColor =
    thunderAlert?.level === "extreme"
      ? "text-red-400 bg-red-500/15"
      : thunderAlert?.level === "high"
        ? "text-orange-400 bg-orange-500/15"
        : thunderAlert?.level === "moderate"
          ? "text-yellow-400 bg-yellow-500/15"
          : "text-white/50 bg-white/5";

  const details = [
    {
      icon: <Wind className="h-4 w-4" />,
      label: "Angin",
      value: `${windSpeed.toFixed(0)} km/j ${getWindDirection(windDeg)}`,
      sub: gust > 0 ? `Gust ${gust.toFixed(0)}` : undefined,
    },
    {
      icon: <Droplets className="h-4 w-4" />,
      label: "Kelembapan",
      value: `${Math.round(humidity)}%`,
      sub: dewpoint !== undefined ? `Titik Embun ${Math.round(dewpoint)}°` : undefined,
    },
    {
      icon: <Eye className="h-4 w-4" />,
      label: "Jarak Pandang",
      value: getVisibilityLabel(visibility),
    },
    {
      icon: <Gauge className="h-4 w-4" />,
      label: "Tekanan",
      value: `${Math.round(pressure)} hPa`,
    },
    {
      icon: <Thermometer className="h-4 w-4" />,
      label: "Terasa Seperti",
      value: formatTemp(feelsLike),
      sub: feelsLike !== temp ? `${feelsLike > temp ? "Lebih panas" : "Lebih dingin"}` : "Sama",
    },
    {
      icon: <Cloud className="h-4 w-4" />,
      label: "Awan",
      value: `${Math.round(clouds)}%`,
      sub: getCloudCoverLabel(clouds),
    },
    {
      icon: <CloudRain className="h-4 w-4" />,
      label: "Curah Hujan",
      value: `${precip.toFixed(1)} mm`,
      sub: snow !== undefined && snow > 0 ? `Salju ${snow.toFixed(1)} mm` : undefined,
    },
    {
      icon: <Sunrise className="h-4 w-4" />,
      label: "Matahari",
      value: `${sunriseTime} / ${sunsetTime}`,
      sub: thunderAlert?.label ? (
        <span className={`text-[10px] px-1 py-0.5 rounded-full ${capeAlertColor}`}>
          {thunderAlert.label}
        </span>
      ) : cape !== undefined && cape > 0 ? `CAPE ${cape}` : undefined,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="w-full max-w-lg mx-auto"
    >
      {/* Thunderstorm Alert Banner */}
      {thunderAlert && thunderAlert.level !== "none" && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`mb-4 mx-1 flex items-center gap-2 px-4 py-2.5 rounded-xl backdrop-blur-sm border ${
            thunderAlert.level === "extreme"
              ? "bg-red-500/20 border-red-500/30"
              : thunderAlert.level === "high"
                ? "bg-orange-500/15 border-orange-500/25"
                : "bg-yellow-500/10 border-yellow-500/20"
          }`}
        >
          <Zap
            className={`h-4 w-4 shrink-0 ${
              thunderAlert.level === "extreme"
                ? "text-red-400"
                : thunderAlert.level === "high"
                  ? "text-orange-400"
                  : "text-yellow-400"
            }`}
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white/80">{thunderAlert.label}</p>
            <p className="text-[10px] text-white/50">
              CAPE {cape} J/kg — Potensi konveksi signifikan
            </p>
          </div>
        </motion.div>
      )}

      {/* Main Temperature Display */}
      <div className="text-center mb-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="inline-block mb-2"
        >
          <span className="text-7xl sm:text-8xl drop-shadow-lg">
            {weatherIcon}
          </span>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-2xl font-semibold text-white/90 mb-1">{city}</h2>
          <p className="text-lg text-white/60">{conditionLabel}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, type: "spring" }}
          className="mt-4"
        >
          <span className="text-8xl sm:text-9xl font-extralight text-white drop-shadow-2xl tracking-tighter">
            {formatTemp(temp)}
          </span>
          <div className="flex items-center justify-center gap-3 mt-2 text-white/50 text-sm">
            <span>T: {formatTemp(tempMax)}</span>
            <span>&bull;</span>
            <span>R: {formatTemp(tempMin)}</span>
            <span>&bull;</span>
            <span>Terasa {formatTemp(feelsLike)}</span>
          </div>
        </motion.div>
      </div>

      {/* Weather Details Grid */}
      <Card className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {details.map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.04 }}
                className="flex flex-col items-center p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              >
                <span className="text-white/40 mb-1">{item.icon}</span>
                <span className="text-xs text-white/40 mb-0.5">{item.label}</span>
                <span className="text-sm font-medium text-white/80 text-center">
                  {item.value}
                </span>
                {item.sub && (
                  <span className="text-[10px] text-white/30 mt-0.5">
                    {item.sub}
                  </span>
                )}
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
