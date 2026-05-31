import { NextResponse } from "next/server";

// Windy.com Point Forecast API v2
const WINDY_KEY = "JPtmBbJ1PxqUEmCryGwpEzUxLUwWrdxf";
const WINDY_URL = "https://api.windy.com/api/point-forecast/v2";

// Cache (5 min TTL)
const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;

function getCached(key: string) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  cache.delete(key);
  return null;
}
function setCache(key: string, data: unknown) {
  cache.set(key, { data, ts: Date.now() });
}

// Convert Kelvin to Celsius
const K2C = (k: number) => k - 273.15;
// Convert m to mm
const M2MM = (m: number) => m * 1000;
// Convert m/s to km/h
const MS2KMH = (ms: number) => ms * 3.6;

function deriveCondition(
  precip: number,
  ptype: number,
  clouds: number,
  cape: number,
  gust: number
): string {
  if (cape > 1000 && gust > 15 && precip > 2) return "thunderstorm";
  if (cape > 2000 && precip > 0) return "thunderstorm";
  if (ptype === 5 || ptype === 7) return "snow";
  if (precip > 5) return "rain";
  if (precip > 1) return "rain";
  if (ptype === 1 && precip > 0) return "drizzle";
  if (precip > 0) return "drizzle";
  if (clouds > 80) return "clouds";
  if (clouds > 40) return "clouds";
  return "clear";
}

// Feels-like temperature (wind chill for cold, heat index for hot)
function feelsLike(tempC: number, windKmh: number, humidity: number): number {
  const v = windKmh;
  const T = tempC;
  // Wind Chill (below 10°C and wind > 4.8 km/h)
  if (T <= 10 && v > 4.8) {
    const wc = 13.12 + 0.6215 * T - 11.37 * Math.pow(v, 0.16) + 0.3965 * T * Math.pow(v, 0.16);
    return Math.round(wc * 10) / 10;
  }
  // Heat Index (above 27°C and humidity > 40%)
  if (T >= 27 && humidity > 40) {
    const hi = -8.785 + 1.611 * T + 2.339 * humidity
      - 0.1461 * T * humidity - 0.01231 * T * T - 0.01642 * humidity * humidity
      + 0.002212 * T * T * humidity + 0.000725 * T * humidity * humidity
      - 0.000003582 * T * T * humidity * humidity;
    return Math.round(hi * 10) / 10;
  }
  return Math.round(T * 10) / 10;
}

// Simple sunrise/sunset estimation (solar calculation)
function sunTimes(lat: number, lon: number, date: Date): { sunrise: number; sunset: number } {
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);
  const dec = -23.45 * Math.cos((2 * Math.PI / 365) * (dayOfYear + 10));
  const decRad = (dec * Math.PI) / 180;
  const latRad = (lat * Math.PI) / 180;
  const cosHA = (-Math.sin(0.833 * Math.PI / 180) + Math.sin(latRad) * Math.sin(decRad)) / (Math.cos(latRad) * Math.cos(decRad));
  if (cosHA > 1) return { sunrise: 6 * 3600, sunset: 18 * 3600 }; // polar night
  if (cosHA < -1) return { sunrise: 0, sunset: 24 * 3600 }; // midnight sun
  const HA = (Math.acos(cosHA) * 180) / Math.PI;
  const solarNoon = 12 - lon / 15;
  const tzOffset = date.getTimezoneOffset() / 60;
  const sunrise = (solarNoon - HA / 15 - tzOffset) * 3600;
  const sunset = (solarNoon + HA / 15 - tzOffset) * 3600;
  return { sunrise, sunset };
}

// Thunderstorm alert level based on CAPE
function thunderAlert(cape: number): { level: string; label: string } {
  if (cape > 4000) return { level: "extreme", label: "Badai Ekstrem" };
  if (cape > 2500) return { level: "high", label: "Badai Berat" };
  if (cape > 1000) return { level: "moderate", label: "Badai Ringan" };
  if (cape > 500) return { level: "low", label: "Konveksi" };
  return { level: "none", label: null };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  if (!lat || !lon) {
    return NextResponse.json(
      { error: "Berikan koordinat (lat, lon)" },
      { status: 400 }
    );
  }

  const cacheKey = `windy-weather-${lat}-${lon}`;
  const cached = getCached(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    const body = {
      lat: parseFloat(lat),
      lon: parseFloat(lon),
      model: "gfs",
      parameters: [
        "temp", "dewpoint", "wind", "windGust", "precip",
        "convPrecip", "snowPrecip", "ptype", "lclouds",
        "mclouds", "hclouds", "rh", "pressure", "cape",
      ],
      levels: ["surface"],
      key: WINDY_KEY,
    };

    const res = await fetch(WINDY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: `Windy API: ${errText}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    const ts: number[] = data.ts || [];

    if (ts.length === 0) {
      return NextResponse.json({ error: "Tidak ada data" }, { status: 404 });
    }

    // Extract arrays (values in K, m, Pa, m/s — need conversion)
    const temps = (data["temp-surface"] || []).map(K2C);
    const dewpoints = (data["dewpoint-surface"] || []).map(K2C);
    const windU = data["wind_u-surface"] || [];
    const windV = data["wind_v-surface"] || [];
    const gusts = data["gust-surface"] || [];
    const precip = (data["past3hprecip-surface"] || []).map(M2MM);
    const snowPrecip = (data["past3hsnowprecip-surface"] || []).map(M2MM);
    const ptype = data["ptype-surface"] || [];
    const lclouds = data["lclouds-surface"] || [];
    const mclouds = data["mclouds-surface"] || [];
    const hclouds = data["hclouds-surface"] || [];
    const humidity = data["rh-surface"] || [];
    const pressure = (data["pressure-surface"] || []).map((p: number) => p / 100);
    const cape = data["cape-surface"] || [];

    // Helper: wind speed + direction from U/V components
    const calcWind = (u: number, v: number) => {
      const speed = Math.sqrt(u * u + v * v);
      const deg = ((Math.atan2(v, u) * 180) / Math.PI + 360) % 360;
      return { speed: MS2KMH(speed), deg };
    };

    // Build current weather from first point
    const { speed: cWindSpeed, deg: cWindDeg } = calcWind(windU[0] || 0, windV[0] || 0);
    const currentClouds = Math.max(lclouds[0] || 0, mclouds[0] || 0, hclouds[0] || 0);
    const currentCondition = deriveCondition(precip[0] || 0, ptype[0] || 0, currentClouds, cape[0] || 0, gusts[0] || 0);
    const fl = feelsLike(temps[0], cWindSpeed, humidity[0] || 0);
    const storm = thunderAlert(cape[0] || 0);
    const sun = sunTimes(parseFloat(lat), parseFloat(lon), new Date(ts[0]));

    const current = {
      dt: ts[0] / 1000,
      temp: Math.round(temps[0] * 10) / 10,
      feelsLike: fl,
      tempMin: Math.round(temps[0] * 10) / 10,
      tempMax: Math.round(temps[0] * 10) / 10,
      dewpoint: Math.round(dewpoints[0] * 10) / 10,
      humidity: humidity[0] || 0,
      pressure: Math.round(pressure[0]),
      windSpeed: Math.round(cWindSpeed * 10) / 10,
      windDeg: Math.round(cWindDeg),
      gust: Math.round(MS2KMH(gusts[0] || 0) * 10) / 10,
      precip: Math.round(precip[0] * 100) / 100,
      snow: Math.round(snowPrecip[0] * 100) / 100,
      ptype: ptype[0] || 0,
      clouds: Math.round(currentClouds),
      condition: currentCondition,
      cape: Math.round(cape[0] || 0),
      visibility: 20000, // not directly available from Windy
      sunrise: sun.sunrise,
      sunset: sun.sunset,
      thunderAlert: storm,
    };

    // Build hourly forecast (up to 48 hours)
    const hourly = ts.slice(0, 48).map((t, i) => {
      const { speed: hWind, deg: hDeg } = calcWind(windU[i] || 0, windV[i] || 0);
      const hClouds = Math.max(lclouds[i] || 0, mclouds[i] || 0, hclouds[i] || 0);
      return {
        dt: t / 1000,
        temp: Math.round(temps[i] * 10) / 10,
        dewpoint: Math.round(dewpoints[i] * 10) / 10,
        windSpeed: Math.round(hWind * 10) / 10,
        windDeg: Math.round(hDeg),
        gust: Math.round(MS2KMH(gusts[i] || 0) * 10) / 10,
        precip: Math.round(precip[i] * 100) / 100,
        snow: Math.round(snowPrecip[i] * 100) / 100,
        ptype: ptype[i] || 0,
        clouds: Math.round(hClouds),
        humidity: humidity[i] || 0,
        pressure: Math.round(pressure[i]),
        cape: Math.round(cape[i] || 0),
        condition: deriveCondition(precip[i] || 0, ptype[i] || 0, hClouds, cape[i] || 0, gusts[i] || 0),
      };
    });

    // Build daily forecast (group by day, up to 7 days)
    const dayMap = new Map<string, {
      date: Date;
      temps: number[];
      dewpoints: number[];
      windSpeeds: number[];
      windDegs: number[];
      gusts: number[];
      precips: number[];
      snows: number[];
      ptypes: number[];
      cloudValues: number[];
      humidities: number[];
      pressures: number[];
      capes: number[];
    }>();

    ts.forEach((t, i) => {
      const d = new Date(t);
      const dayKey = d.toISOString().split("T")[0];
      if (!dayMap.has(dayKey)) {
        dayMap.set(dayKey, {
          date: d, temps: [], dewpoints: [], windSpeeds: [], windDegs: [],
          gusts: [], precips: [], snows: [], ptypes: [], cloudValues: [],
          humidities: [], pressures: [], capes: [],
        });
      }
      const day = dayMap.get(dayKey)!;
      day.temps.push(temps[i]);
      day.dewpoints.push(dewpoints[i]);
      const { speed, deg } = calcWind(windU[i] || 0, windV[i] || 0);
      day.windSpeeds.push(speed);
      day.windDegs.push(deg);
      day.gusts.push(gusts[i] || 0);
      day.precips.push(precip[i]);
      day.snows.push(snowPrecip[i]);
      if (ptype[i] > 0) day.ptypes.push(ptype[i]);
      day.cloudValues.push(Math.max(lclouds[i] || 0, mclouds[i] || 0, hclouds[i] || 0));
      day.humidities.push(humidity[i] || 0);
      day.pressures.push(pressure[i]);
      day.capes.push(cape[i] || 0);
    });

    const daily = Array.from(dayMap.values()).slice(0, 7).map(day => {
      const tempMin = Math.min(...day.temps);
      const tempMax = Math.max(...day.temps);
      const avgWind = day.windSpeeds.reduce((a, b) => a + b, 0) / day.windSpeeds.length;
      const avgWindDeg = day.windDegs[Math.floor(day.windDegs.length / 2)];
      const maxGust = Math.max(...day.gusts.map(MS2KMH));
      const totalPrecip = day.precips.reduce((a, b) => a + b, 0);
      const totalSnow = day.snows.reduce((a, b) => a + b, 0);
      const avgClouds = day.cloudValues.reduce((a, b) => a + b, 0) / day.cloudValues.length;
      const avgHumidity = day.humidities.reduce((a, b) => a + b, 0) / day.humidities.length;
      const avgPressure = day.pressures.reduce((a, b) => a + b, 0) / day.pressures.length;
      const maxCape = Math.max(...day.capes);

      // Dominant ptype
      const ptypeCounts = new Map<number, number>();
      day.ptypes.forEach(p => ptypeCounts.set(p, (ptypeCounts.get(p) || 0) + 1));
      const domPtype = ptypeCounts.size > 0
        ? [...ptypeCounts.entries()].sort((a, b) => b[1] - a[1])[0][0] : 0;

      const condition = deriveCondition(totalPrecip, domPtype, avgClouds, maxCape, maxGust);
      const precipProb = totalPrecip > 0 ? Math.min(100, Math.round(totalPrecip * 8)) : 0;

      return {
        dt: day.date.getTime() / 1000,
        date: day.date.toISOString().split("T")[0],
        tempMin: Math.round(tempMin * 10) / 10,
        tempMax: Math.round(tempMax * 10) / 10,
        windSpeed: Math.round(avgWind * 10) / 10,
        windDeg: Math.round(avgWindDeg),
        gust: Math.round(maxGust * 10) / 10,
        precip: Math.round(totalPrecip * 10) / 10,
        snow: Math.round(totalSnow * 10) / 10,
        ptype: domPtype,
        clouds: Math.round(avgClouds),
        humidity: Math.round(avgHumidity),
        pressure: Math.round(avgPressure),
        cape: Math.round(maxCape),
        condition,
        pop: precipProb,
      };
    });

    // Update current min/max from daily
    if (daily.length > 0) {
      current.tempMin = daily[0].tempMin;
      current.tempMax = daily[0].tempMax;
    }

    // Add feelsLike and thunderAlert to hourly
    const hourlyWithFeel = hourly.map(h => ({
      ...h,
      feelsLike: feelsLike(h.temp, h.windSpeed, h.humidity),
    }));

    const result = {
      current,
      hourly: hourlyWithFeel,
      daily,
      meta: {
        model: "gfs",
        source: "windy",
        generatedAt: Date.now(),
      },
    };

    setCache(cacheKey, result);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: `Gagal: ${err instanceof Error ? err.message : "Kesalahan"}` },
      { status: 500 }
    );
  }
}
