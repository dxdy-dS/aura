"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Camera, ExternalLink, ChevronLeft, ChevronRight,
  RefreshCw, MapPin, Eye, Loader2, X, Grid3X3, Play,
  ArrowRight,
} from "lucide-react";

interface WebcamData {
  id: string;
  status: string;
  title: string;
  city: string;
  region: string;
  country: string;
  countryCode: string;
  lat: number;
  lng: number;
  viewCount: number;
  distance?: number;
  imageIcon: string;
  imageThumbnail: string;
  imagePreview: string;
  imageDaylightPreview: string;
  playerLive: string;
  playerDay: string;
  playerMonth: string;
  playerYear: string;
  playerLifetime: string;
}

interface LiveWebcamsProps {
  lat: number;
  lon: number;
}

type ViewMode = "carousel" | "grid";

export default function LiveWebcams({ lat, lon }: LiveWebcamsProps) {
  const [webcams, setWebcams] = useState<WebcamData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showEmbed, setShowEmbed] = useState(false);
  const [embedUrl, setEmbedUrl] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("carousel");
  const [refreshing, setRefreshing] = useState(false);

  const fetchWebcams = async () => {
    setLoading(true);
    setError(null);
    setImageLoaded(false);

    try {
      const res = await fetch(
        `/api/webcams?lat=${lat}&lon=${lon}&radius=50&limit=8`
      );
      if (!res.ok) throw new Error("Gagal mengambil data webcam");
      const data = await res.json();

      if (data.webcams && data.webcams.length > 0) {
        // Calculate distance for each webcam
        const cams: WebcamData[] = data.webcams.map((cam: Record<string, unknown>) => {
          const cLat = cam.lat as number;
          const cLng = cam.lng as number;
          // Haversine distance in km
          const R = 6371;
          const dLat = ((cLat - lat) * Math.PI) / 180;
          const dLng = ((cLng - lon) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lat * Math.PI) / 180) *
              Math.cos((cLat * Math.PI) / 180) *
              Math.sin(dLng / 2) *
              Math.sin(dLng / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

          return {
            ...cam,
            distance: Math.round(R * c * 10) / 10,
          };
        });

        setWebcams(cams);
        setCurrentIndex(0);
        setShowEmbed(false);
      } else {
        setError("Tidak ada webcam di sekitar lokasi");
      }
    } catch {
      setError("Tidak dapat memuat webcam");
    } finally {
      setLoading(false);
    }
  };

  const refreshImages = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(
        `/api/webcams?lat=${lat}&lon=${lon}&radius=50&limit=8`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.webcams) {
          setWebcams(prev =>
            prev.map((cam, i) => {
              const updated = data.webcams[i];
              if (updated) {
                return {
                  ...cam,
                  imagePreview: updated.imagePreview || cam.imagePreview,
                  imageDaylightPreview: updated.imageDaylightPreview || cam.imageDaylightPreview,
                  imageThumbnail: updated.imageThumbnail || cam.imageThumbnail,
                };
              }
              return cam;
            })
          );
        }
      }
    } catch {
      // ignore refresh errors
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWebcams();
    const interval = setInterval(() => {
      if (webcams.length > 0) refreshImages();
    }, 3 * 60 * 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lon]);

  const current = webcams[currentIndex];

  const goNext = () => {
    if (webcams.length > 0) {
      setCurrentIndex((prev) => (prev + 1) % webcams.length);
      setImageLoaded(false);
      setShowEmbed(false);
    }
  };

  const goPrev = () => {
    if (webcams.length > 0) {
      setCurrentIndex((prev) => (prev - 1 + webcams.length) % webcams.length);
      setImageLoaded(false);
      setShowEmbed(false);
    }
  };

  const openEmbed = (url: string) => {
    setEmbedUrl(url);
    setShowEmbed(true);
  };

  if (loading && webcams.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }} className="w-full max-w-2xl mx-auto"
      >
        <h3 className="text-sm font-medium text-white/50 mb-3 px-1">
          WEBCAM LANGSUNG
        </h3>
        <Card className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
          <CardContent className="p-8 flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 text-white/30 animate-spin" />
            <p className="text-white/40 mt-3 text-sm">Mencari webcam terdekat...</p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (error && webcams.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }} className="w-full max-w-2xl mx-auto"
      >
        <h3 className="text-sm font-medium text-white/50 mb-3 px-1">WEBCAM LANGSUNG</h3>
        <Card className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
          <CardContent className="p-8 flex flex-col items-center justify-center">
            <Camera className="h-8 w-8 text-white/15" />
            <p className="text-white/40 mt-3 text-sm">{error}</p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.5 }}
      className={`w-full mx-auto ${viewMode === "grid" ? "max-w-4xl" : "max-w-2xl"}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-sm font-medium text-white/50 flex items-center gap-2">
          <Camera className="h-3.5 w-3.5" />
          WEBCAM LANGSUNG
          <span className="text-white/25">({webcams.length} ditemukan)</span>
          {webcams.reduce((a, b) => a + b.viewCount, 0) > 0 && (
            <span className="text-white/15 text-[10px]">
              {webcams.reduce((a, b) => a + b.viewCount, 0).toLocaleString()} total views
            </span>
          )}
        </h3>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setViewMode(viewMode === "carousel" ? "grid" : "carousel")}
            className="text-white/30 hover:text-white/60 h-6 px-2" title={viewMode === "carousel" ? "Tampilan Grid" : "Tampilan Carousel"}
          >
            {viewMode === "carousel" ? <Grid3X3 className="h-3 w-3" /> : <Play className="h-3 w-3" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={refreshImages}
            className="text-white/30 hover:text-white/60 h-6 px-2" disabled={refreshing}
          >
            <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === "grid" && (
        <Card className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
          <CardContent className="p-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {webcams.map((cam, i) => (
                <motion.div
                  key={cam.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="group relative rounded-xl overflow-hidden bg-black/30 cursor-pointer"
                  onClick={() => {
                    setCurrentIndex(i);
                    setViewMode("carousel");
                    setImageLoaded(false);
                    setShowEmbed(false);
                  }}
                >
                  <div className="relative aspect-video">
                    <img
                      src={cam.imagePreview || cam.imageDaylightPreview || cam.imageIcon}
                      alt={cam.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    {/* Distance badge */}
                    {cam.distance !== undefined && (
                      <span className="absolute top-1.5 right-1.5 text-[9px] bg-black/50 backdrop-blur-sm text-white/70 px-1.5 py-0.5 rounded-full">
                        {cam.distance} km
                      </span>
                    )}
                    {/* Status */}
                    <span className={`absolute top-1.5 left-1.5 w-1.5 h-1.5 rounded-full ${
                      cam.status === "active" ? "bg-green-400 animate-pulse" : "bg-white/30"
                    }`} />
                  </div>
                  <div className="px-2 py-1.5 bg-white/3">
                    <p className="text-[11px] text-white/70 truncate">{cam.title}</p>
                    <p className="text-[9px] text-white/30 truncate flex items-center gap-0.5">
                      <MapPin className="h-2 w-2" />
                      {[cam.city, cam.country].filter(Boolean).join(", ")}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Carousel View */}
      {viewMode === "carousel" && (
        <Card className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
          <CardContent className="p-0">
            <AnimatePresence mode="wait">
              {current && (
                <motion.div key={current.id}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                >
                  {/* Embed Modal */}
                  {showEmbed && embedUrl && (
                    <div className="relative w-full aspect-video bg-black">
                      <Button variant="ghost" size="icon" onClick={() => setShowEmbed(false)}
                        className="absolute top-2 right-2 z-10 h-8 w-8 bg-black/50 rounded-full hover:bg-black/70 text-white"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <iframe src={embedUrl} className="w-full h-full" allowFullScreen
                        allow="autoplay; encrypted-media" title={current.title}
                      />
                    </div>
                  )}

                  {!showEmbed && (
                    <div className="relative w-full aspect-video bg-black/30 overflow-hidden">
                      <img
                        src={current.imagePreview || current.imageDaylightPreview || current.imageIcon}
                        alt={current.title}
                        className={`w-full h-full object-cover transition-opacity duration-500 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
                        onLoad={() => setImageLoaded(true)}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = current.imageIcon || "";
                          setImageLoaded(true);
                        }}
                      />
                      {!imageLoaded && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Loader2 className="h-6 w-6 text-white/20 animate-spin" />
                        </div>
                      )}

                      {/* Status badge */}
                      <div className="absolute top-3 left-3 flex items-center gap-2">
                        {current.status === "active" ? (
                          <span className="flex items-center gap-1 bg-green-500/20 backdrop-blur-sm text-green-300 text-[10px] px-2 py-1 rounded-full">
                            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" /> LANGSUNG
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 bg-white/10 backdrop-blur-sm text-white/50 text-[10px] px-2 py-1 rounded-full">
                            <span className="w-1.5 h-1.5 bg-white/30 rounded-full" /> OFFLINE
                          </span>
                        )}
                        {current.distance !== undefined && (
                          <span className="bg-white/10 backdrop-blur-sm text-white/60 text-[10px] px-2 py-1 rounded-full">
                            {current.distance} km
                          </span>
                        )}
                      </div>

                      {/* Nav */}
                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                        <Button variant="ghost" size="icon" onClick={goPrev}
                          className="h-8 w-8 bg-black/30 backdrop-blur-sm rounded-full hover:bg-black/50 text-white/80"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="flex items-center gap-2">
                          {current.playerLive && (
                            <Button variant="ghost" size="sm" onClick={() => openEmbed(current.playerLive)}
                              className="h-7 bg-red-500/20 backdrop-blur-sm rounded-full hover:bg-red-500/30 text-red-300 text-xs gap-1 px-3"
                            >
                              <Eye className="h-3 w-3" /> Live
                            </Button>
                          )}
                          {current.playerDay && (
                            <Button variant="ghost" size="sm" onClick={() => openEmbed(current.playerDay)}
                              className="h-7 bg-black/30 backdrop-blur-sm rounded-full hover:bg-black/50 text-white/80 text-xs gap-1 px-3"
                            >
                              <ExternalLink className="h-3 w-3" /> Hari Ini
                            </Button>
                          )}
                          {current.playerLifetime && (
                            <Button variant="ghost" size="sm" onClick={() => openEmbed(current.playerLifetime)}
                              className="h-7 bg-black/30 backdrop-blur-sm rounded-full hover:bg-black/50 text-white/80 text-xs gap-1 px-3"
                            >
                              <ExternalLink className="h-3 w-3" /> Time-lapse
                            </Button>
                          )}
                        </div>
                        <Button variant="ghost" size="icon" onClick={goNext}
                          className="h-8 w-8 bg-black/30 backdrop-blur-sm rounded-full hover:bg-black/50 text-white/80"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Info bar */}
                  <div className="px-4 py-3 border-t border-white/5">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-medium text-white/80 truncate">{current.title}</h4>
                        <p className="text-xs text-white/40 flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {[current.city, current.region, current.country].filter(Boolean).join(", ") || "Lokasi tidak diketahui"}
                        </p>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <span className="text-[10px] text-white/20 block">
                          {(current.viewCount || 0).toLocaleString()} views
                        </span>
                        {current.distance !== undefined && (
                          <span className="text-[10px] text-white/30">
                            {current.distance} km
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Dots */}
                  {webcams.length > 1 && (
                    <div className="flex justify-center pb-3 gap-1">
                      {webcams.map((cam, i) => (
                        <button key={i} onClick={() => { setCurrentIndex(i); setImageLoaded(false); setShowEmbed(false); }}
                          className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentIndex ? "bg-white/60 w-4" : "bg-white/15 hover:bg-white/30"}`}
                        />
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
