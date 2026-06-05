import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import { LatLngBounds } from "leaflet";
import { format } from "date-fns";

import heroImg from "@/assets/nepal-hero.jpg";
import lakeImg from "@/assets/nepal-lake.jpg";
import everestImg from "@/assets/everest.jpg";
import everestRangeImg from "@/assets/everest-range.jpg";
import lumbiniImg from "@/assets/lumbini.jpg";
import chitwanImg from "@/assets/chitwan.jpg";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

import TopBar from "@/components/TopBar";
import WeatherWidget from "@/components/WeatherWidget";
import TrekkingPermits from "@/components/TrekkingPermits";
import AiTravelTips from "@/components/AiTravelTips";
import ItineraryPlanner from "@/components/ItineraryPlanner";
import SiteFooter from "@/components/SiteFooter";
import { useAuth } from "@/contexts/AuthContext";

import {
  ArrowLeftRight, ArrowRight, Bookmark, Bus, CalendarDays,
  Clock, CloudSun, Compass, Hotel, Landmark, Link2, Loader2,
  MapPinned, Navigation, Plane, Route, ShieldCheck, Sparkles,
  Users, Wallet, CheckCircle2,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────
type Place = { label: string; lat: number; lon: number };
type RouteResult = { distanceKm: number; durationMin: number; geometry: [number, number][] };
type HotelHit = { id: string; name: string; lat: number; lon: number; stars?: string; phone?: string; website?: string; source: "Overpass" };

// ── Helpers ────────────────────────────────────────────────────
function formatMins(m: number) {
  if (!isFinite(m)) return "–";
  const h = Math.floor(m / 60), mm = Math.round(m % 60);
  return h > 0 ? `${h}h ${mm}m` : `${mm} min`;
}

function FitBounds({ bounds }: { bounds: LatLngBounds | null }) {
  const map = useMap();
  useEffect(() => { if (bounds) map.fitBounds(bounds, { padding: [28, 28] }); }, [bounds, map]);
  return null;
}

async function photonGeocode(q: string): Promise<Place[]> {
  const { data } = await axios.get("https://photon.komoot.io/api/", { params: { q, limit: 6, lang: "en" } });
  return ((data?.features ?? []) as any[]).map((f: any) => {
    const [lon, lat] = f.geometry?.coordinates ?? [];
    const p = f.properties ?? {};
    return { label: [p.name, p.city, p.state, p.country].filter(Boolean).join(", ").trim() || q, lat: Number(lat), lon: Number(lon) };
  }).filter((x: Place) => isFinite(x.lat) && isFinite(x.lon));
}

async function osrmRoute(origin: Place, dest: Place): Promise<RouteResult> {
  const { data } = await axios.get(
    `https://router.project-osrm.org/route/v1/driving/${origin.lon},${origin.lat};${dest.lon},${dest.lat}`,
    { params: { overview: "full", geometries: "geojson", alternatives: false } }
  );
  const r = data?.routes?.[0];
  if (!r) throw new Error("No route found");
  return {
    distanceKm: (Number(r.distance) || 0) / 1000,
    durationMin: (Number(r.duration) || 0) / 60,
    geometry: (r.geometry?.coordinates ?? []).map(([lon, lat]: [number, number]) => [lat, lon] as [number, number]),
  };
}

async function overpassHotels(center: Place, radiusM: number): Promise<HotelHit[]> {
  const q = `[out:json][timeout:25];\n(\n  nwr["tourism"="hotel"](around:${radiusM},${center.lat},${center.lon});\n  nwr["amenity"="hotel"](around:${radiusM},${center.lat},${center.lon});\n);\nout center 24;\n`;
  const { data } = await axios.post("https://overpass-api.de/api/interpreter", q, { headers: { "Content-Type": "text/plain" } });
  const seen = new Set<string>();
  return ((data?.elements ?? []) as any[]).map((x: any) => {
    const lat = x.lat ?? x.center?.lat, lon = x.lon ?? x.center?.lon, t = x.tags ?? {};
    return { id: String(x.id), name: t.name || t["name:en"] || "Hotel", lat: Number(lat), lon: Number(lon), stars: t.stars ? String(t.stars) : undefined, phone: t.phone || t["contact:phone"], website: t.website || t["contact:website"], source: "Overpass" as const };
  }).filter((h: HotelHit) => {
    if (!isFinite(h.lat) || !isFinite(h.lon)) return false;
    const k = `${h.name}|${h.lat.toFixed(4)}|${h.lon.toFixed(4)}`;
    return seen.has(k) ? false : (seen.add(k), true);
  });
}

function estimateCost(km: number, mode: "private" | "tourist-bus" | "flight", pax = 1) {
  if (!isFinite(km)) return 0;
  if (mode === "flight") return Math.round(Math.max(5000, Math.min(18000, km * 22 + 3000)) * pax);
  const base = mode === "private" ? 75 : 32, min = mode === "private" ? 1200 : 350;
  return Math.round(Math.max(min, km * base) * (mode === "private" ? 1 : pax));
}

// ── Section heading ────────────────────────────────────────────
function SectionHead({ eye, title, sub }: { eye: string; title: string; sub?: string }) {
  return (
    <div className="mb-8">
      <p className="overline mb-2">{eye}</p>
      <h2 className="font-display text-3xl text-foreground">{title}</h2>
      {sub && <p className="mt-2 text-sm text-muted-foreground max-w-lg">{sub}</p>}
      <div className="gold-rule mt-3 w-10" />
    </div>
  );
}

// ── Stat pill ──────────────────────────────────────────────────
function StatPill({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-l-2 border-white/20 pl-3">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/38">
        <Icon className="h-3 w-3" />{label}
      </div>
      <div className="text-sm font-bold text-white/80">{value}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
export default function Home({ targetSection }: { targetSection?: string }) {
  const rafRef = useRef<number | null>(null);
  const [heroShift, setHeroShift] = useState(0);

  // ── FIX 1: Destructure user from useAuth ──────────────────
  const { user } = useAuth();

  // ── FIX 2: saveTrip stub (replace with real persistence) ──
  const saveTrip = (o: string, d: string) => {
    // TODO: implement backend persistence (e.g. Supabase, Firebase)
    console.log("Saving trip:", o, "→", d);
  };

  // Planner state
  const [originText, setOriginText] = useState("Kathmandu");
  const [destText, setDestText] = useState("Pokhara");
  const [originSug, setOriginSug] = useState<Place[]>([]);
  const [destSug, setDestSug] = useState<Place[]>([]);
  const [focusField, setFocusField] = useState<"origin" | "dest" | null>(null);
  const [recentTrips, setRecentTrips] = useState<{ o: string; d: string; t: number }[]>([]);
  const [topicText, setTopicText] = useState("");
  const [topicSug, setTopicSug] = useState<Place[]>([]);
  const [focusTopic, setFocusTopic] = useState<"topic" | null>(null);

  // Results state
  const [isLoading, setIsLoading] = useState(false);
  const [origin, setOrigin] = useState<Place | null>(null);
  const [dest, setDest] = useState<Place | null>(null);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [hotels, setHotels] = useState<HotelHit[]>([]);
  const [hotelLoading, setHotelLoading] = useState(false);

  // Additional state for travel mode, passenger count, and date
  const [mode, setMode] = useState<'tourist-bus' | 'private' | 'flight'>('tourist-bus');
  const [passengers, setPassengers] = useState(1);
  const [travelDate, setTravelDate] = useState<Date | null>(null);

  // Parallax
  useEffect(() => {
    const fn = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() =>
        setHeroShift(Math.max(-20, Math.min(25, (window.scrollY || 0) * 0.055)))
      );
    };
    fn();
    window.addEventListener("scroll", fn, { passive: true });
    return () => { window.removeEventListener("scroll", fn); if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  // URL params + recent trips
  useEffect(() => {
    const h = window.location.hash || "";
    const qi = h.indexOf("?");
    if (qi >= 0) {
      const p = new URLSearchParams(h.slice(qi + 1));
      if (p.get("o")) setOriginText(decodeURIComponent(p.get("o")!));
      if (p.get("d")) setDestText(decodeURIComponent(p.get("d")!));
    }
    try { const a = JSON.parse(localStorage.getItem("nr_recent") || "[]"); if (Array.isArray(a)) setRecentTrips(a.slice(0, 6)); } catch { }
  }, []);

  // Autocomplete — origin
  useEffect(() => {
    if (focusField !== "origin") return;
    const q = originText.trim(); if (q.length < 3) { setOriginSug([]); return; }
    const t = setTimeout(async () => { try { setOriginSug((await photonGeocode(q)).slice(0, 6)); } catch { setOriginSug([]); } }, 260);
    return () => clearTimeout(t);
  }, [originText, focusField]);

  // ── FIX 3: Autocomplete — destination (was missing) ───────
  useEffect(() => {
    if (focusField !== "dest") return;
    const q = destText.trim(); if (q.length < 3) { setDestSug([]); return; }
    const t = setTimeout(async () => { try { setDestSug((await photonGeocode(q)).slice(0, 6)); } catch { setDestSug([]); } }, 260);
    return () => clearTimeout(t);
  }, [destText, focusField]);

  // Autocomplete — topic
  useEffect(() => {
    if (focusTopic !== "topic") return;
    const q = topicText.trim(); if (q.length < 3) { setTopicSug([]); return; }
    const t = setTimeout(async () => { try { setTopicSug((await photonGeocode(q)).slice(0, 6)); } catch { setTopicSug([]); } }, 260);
    return () => clearTimeout(t);
  }, [topicText, focusTopic]);

  useEffect(() => {
    if (targetSection) document.getElementById(targetSection)?.scrollIntoView({ behavior: "smooth" });
  }, [targetSection]);

  const mapBounds = useMemo(() => {
    if (!route?.geometry?.length) return null;
    const b = new LatLngBounds([]);
    route.geometry.forEach(([lat, lon]) => b.extend([lat, lon]));
    return b;
  }, [route]);

  const costNpr = useMemo(() => estimateCost(route?.distanceKm ?? 0, mode, passengers), [route?.distanceKm, mode, passengers]);

  function parseCoords(s: string): Place | null {
    const m = s.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
    if (!m) return null;
    const lat = Number(m[1]), lon = Number(m[2]);
    return (isFinite(lat) && isFinite(lon)) ? { label: s.trim(), lat, lon } : null;
  }

  async function planTrip() {
    const o = originText.trim(), d = destText.trim();
    if (!o || !d) { toast.error("Enter both locations."); return; }
    setIsLoading(true); setHotels([]);
    try {
      const [oHits, dHits] = await Promise.all([
        parseCoords(o) ? Promise.resolve([parseCoords(o)!]) : photonGeocode(o),
        parseCoords(d) ? Promise.resolve([parseCoords(d)!]) : photonGeocode(d),
      ]);
      const ob = oHits[0], db = dHits[0];
      if (!ob || !db) throw new Error("Could not find those locations");
      setOrigin(ob); setDest(db);
      const r = await osrmRoute(ob, db);
      setRoute(r);
      setHotelLoading(true);
      const mid = { label: "mid", lat: (ob.lat + db.lat) / 2, lon: (ob.lon + db.lon) / 2 };
      const [hMid, hDest] = await Promise.all([overpassHotels(mid, 4500), overpassHotels(db, 6000)]);
      setHotels([...hDest.slice(0, 6), ...hMid.slice(0, 4)].slice(0, 8));
      try {
        const next = [{ o, d, t: Date.now() }, ...recentTrips].filter((x, i, a) => a.findIndex(y => y.o === x.o && y.d === x.d) === i).slice(0, 6);
        setRecentTrips(next); localStorage.setItem("nr_recent", JSON.stringify(next));
      } catch { }
      toast.success("Route ready!");
      setTimeout(() => document.getElementById("results")?.scrollIntoView({ behavior: "smooth" }), 60);
    } catch (e: any) { toast.error(e?.message || "Something went wrong."); }
    finally { setIsLoading(false); setHotelLoading(false); }
  }

  function useMyLocation() {
    if (!navigator.geolocation) { toast.error("Geolocation not supported."); return; }
    navigator.geolocation.getCurrentPosition(
      p => { setOriginText(`${p.coords.latitude.toFixed(5)}, ${p.coords.longitude.toFixed(5)}`); toast.success("Location added."); },
      () => toast.error("Permission denied."),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  // ─────────────────────────── RENDER ─────────────────────────
  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ═══ HERO ══════════════════════════════════════════════════ */}
      <section id="top" className="relative noise overflow-hidden" style={{
        backgroundImage: `url(${heroImg})`,
        backgroundSize: "cover",
        backgroundPosition: `center calc(50% + ${heroShift}px)`,
        minHeight: "100vh",
      }}>
        {/* Gradient overlay — strong left fade, transparent right */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(110deg, rgba(8,11,26,0.97) 0%, rgba(8,11,26,0.80) 42%, rgba(8,11,26,0.22) 100%)" }} aria-hidden />
        {/* Saffron hairline accent top */}
        <div className="absolute inset-x-0 top-0 h-px" style={{ background: "linear-gradient(90deg, var(--saffron,#c9640e) 0%, transparent 55%)" }} aria-hidden />

        <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-6 sm:px-6">
          <TopBar nav={[
            { label: "Planner", href: "/#/planner" },
            { label: "Gallery", href: "/#/gallery" },
            { label: "Insights", href: "/#/insights" },
            { label: "Contact", href: "/#/contact" },
            { label: "About", href: "/#/about" },
          ]} />

          {/* ── Two-column hero content ── */}
          <div className="mt-14 grid gap-10 lg:grid-cols-[1.1fr_420px] lg:items-start">

            {/* Left column — headline, badges, destination carousel */}
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.75, ease: "easeOut" }}>

              {/* Eyebrow */}
              <div className="mb-5 flex items-center gap-3">
                <div className="h-px w-7 bg-amber-400/70" />
                <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-amber-400/75">Nepal Tourism · Free Tool</span>
              </div>

              {/* Headline */}
              <h1 className="leading-[1.02] text-white" style={{
                fontFamily: "'Playfair Display', serif",
                fontWeight: 800,
                fontSize: "clamp(2.6rem, 5.5vw, 4.8rem)",
                letterSpacing: "-0.02em",
              }}>
                Plan your Nepal<br />
                <em className="not-italic" style={{ color: "var(--saffron-light, #d4865a)" }}>journey.</em>
              </h1>

              <p className="mt-5 max-w-120 text-base leading-relaxed text-white/60">
                Real routing, live weather, permit guides, AI travel tips, and hotel discovery — all free, no sign-in needed.
              </p>

              {/* Badges */}
              <div className="mt-6 flex flex-wrap gap-2">
                {["Made for Nepal tourism", "Hotel ad slots ready", "Mobile-first", "No sign-in"].map(b => (
                  <span key={b} className="rounded-full border border-white/12 bg-white/6 px-3 py-1 text-[11px] font-medium text-white/55">{b}</span>
                ))}
              </div>

              {/* Tech stats */}
              <div className="mt-8 flex flex-wrap gap-6">
                <StatPill icon={Route} label="Routing" value="OSRM" />
                <StatPill icon={Compass} label="Geocoding" value="Photon" />
                <StatPill icon={Hotel} label="Hotels" value="Overpass" />
                <StatPill icon={Sparkles} label="AI" value="Claude" />
              </div>

            </motion.div>

            {/* Right column — planner card */}
            <motion.div id="planner" className="scroll-mt-20"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.08, ease: "easeOut" }}>
              <div className="glass rounded-2xl p-6">

                {/* TOPIC */}
                <div className="mb-5">
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] text-white/38">Topic</label>
                  <div className="relative">
                    <Input className="planner-input h-10 text-sm" value={topicText}
                      onChange={e => { setTopicText(e.target.value); setFocusTopic("topic"); }}
                      onFocus={() => setFocusTopic("topic")}
                      onBlur={() => setTimeout(() => setFocusTopic(f => f === "topic" ? null : f), 150)}
                      placeholder="Enter a travel topic" />
                    {focusTopic === "topic" && topicSug.length > 0 && (
                      <div className="dark-dropdown absolute z-30 mt-1 w-full shadow-float">
                        {topicSug.map(p => (
                          <button key={p.label + p.lat} type="button" className="block w-full px-3 py-2 text-left text-sm transition-colors"
                            onMouseDown={e => e.preventDefault()}
                            onClick={() => { setTopicText(p.label); setTopicSug([]); setFocusTopic(null); }}>
                            {p.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card header */}
                <div className="flex items-center justify-between gap-3 mb-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <Navigation className="h-4 w-4 text-amber-400" />
                      <span className="font-bold text-white" style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.2rem" }}>Route Planner</span>
                    </div>
                    <p className="mt-1 text-xs text-white/40">City names or GPS coordinates</p>
                  </div>
                  <button onClick={useMyLocation} type="button"
                    className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/7 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white/45 transition-colors hover:border-amber-400/40 hover:text-amber-400/80">
                    <MapPinned className="h-3 w-3" /> GPS
                  </button>
                </div>
                <div className="mb-5 h-px bg-white/8" />

                <div className="grid gap-4">
                  {/* FROM */}
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] text-white/38">From</label>
                    <div className="relative">
                      <Input className="planner-input h-10 text-sm" value={originText}
                        onChange={e => { setOriginText(e.target.value); setFocusField("origin"); }}
                        onFocus={() => setFocusField("origin")}
                        onBlur={() => setTimeout(() => setFocusField(f => f === "origin" ? null : f), 150)}
                        placeholder="Kathmandu or 27.7172, 85.3240" />
                      {focusField === "origin" && originSug.length > 0 && (
                        <div className="dark-dropdown absolute z-30 mt-1 w-full shadow-float">
                          {originSug.map(p => (
                            <button key={p.label + p.lat} type="button" className="block w-full px-3 py-2 text-left text-sm transition-colors"
                              onMouseDown={e => e.preventDefault()}
                              onClick={() => { setOriginText(p.label); setOriginSug([]); setFocusField(null); }}>
                              {p.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {["Kathmandu", "Pokhara", "Bhaktapur"].map(x => (
                        <button key={x} type="button" onClick={() => setOriginText(x)}
                          className="rounded-md border border-white/10 bg-white/6 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/38 transition-colors hover:border-amber-400/38 hover:text-amber-400/75">
                          {x}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* TO */}
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] text-white/38">To</label>
                    <div className="relative">
                      <Input className="planner-input h-10 text-sm" value={destText}
                        onChange={e => { setDestText(e.target.value); setFocusField("dest"); }}
                        onFocus={() => setFocusField("dest")}
                        onBlur={() => setTimeout(() => setFocusField(f => f === "dest" ? null : f), 150)}
                        placeholder="Pokhara or Lumbini" />
                      {focusField === "dest" && destSug.length > 0 && (
                        <div className="dark-dropdown absolute z-30 mt-1 w-full shadow-float">
                          {destSug.map(p => (
                            <button key={p.label + p.lat} type="button" className="block w-full px-3 py-2 text-left text-sm transition-colors"
                              onMouseDown={e => e.preventDefault()}
                              onClick={() => { setDestText(p.label); setDestSug([]); setFocusField(null); }}>
                              {p.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {["Pokhara", "Chitwan", "Lumbini"].map(x => (
                        <button key={x} type="button" onClick={() => setDestText(x)}
                          className="rounded-md border border-white/10 bg-white/6 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/38 transition-colors hover:border-amber-400/38 hover:text-amber-400/75">
                          {x}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* MODE */}
                  <div>
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-white/38">Travel Mode</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {([
                        { k: "tourist-bus", icon: Bus, label: "Bus" },
                        { k: "private", icon: Wallet, label: "Private" },
                        { k: "flight", icon: Plane, label: "Flight" },
                      ] as const).map(({ k, icon: Icon, label }) => (
                        <button key={k} type="button" onClick={() => setMode(k)}
                          className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-bold uppercase tracking-wider transition-all ${mode === k
                            ? "border-amber-400/60 bg-amber-400/16 text-amber-300"
                            : "border-white/10 bg-white/5 text-white/36 hover:border-white/20 hover:text-white/60"
                            }`}>
                          <Icon className="h-3 w-3" />{label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* DATE + PAX */}
                  <div className="flex gap-2.5">
                    <div className="flex flex-1 items-center gap-2 rounded-lg border border-white/10 bg-white/6 px-3 py-2">
                      <CalendarDays className="h-3.5 w-3.5 shrink-0 text-white/35" />
                      <input type="date" className="w-full bg-transparent text-xs text-white/65 outline-none"
                        value={travelDate ? format(travelDate, "yyyy-MM-dd") : ""}
                        onChange={e => setTravelDate(e.target.value ? new Date(e.target.value) : null)} />
                    </div>
                    <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/6 px-3 py-2">
                      <Users className="h-3.5 w-3.5 shrink-0 text-white/35" />
                      <button type="button" onClick={() => setPassengers(p => Math.max(1, p - 1))} className="w-5 text-center font-bold text-white/40 hover:text-white">−</button>
                      <span className="w-4 text-center text-xs font-bold text-white/75">{passengers}</span>
                      <button type="button" onClick={() => setPassengers(p => Math.min(50, p + 1))} className="w-5 text-center font-bold text-white/40 hover:text-white">+</button>
                    </div>
                  </div>

                  {/* CTA */}
                  <button onClick={planTrip} disabled={isLoading} type="button"
                    className="group mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-xl font-bold uppercase tracking-[0.08em] text-sm transition-all disabled:opacity-60"
                    style={{ background: "var(--saffron, #c9640e)", color: "white" }}>
                    {isLoading
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Planning…</>
                      : <><span>Plan Route</span><ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></>
                    }
                  </button>

                  {/* Secondary actions */}
                  <div className="flex flex-wrap gap-2">
                    {[
                      { icon: ArrowLeftRight, label: "Swap", fn: () => { const t = originText; setOriginText(destText); setDestText(t); } },
                      { icon: Link2, label: "Share", fn: () => { const u = `${location.origin}${location.pathname}#/?o=${encodeURIComponent(originText)}&d=${encodeURIComponent(destText)}`; navigator.clipboard.writeText(u).then(() => toast.success("Link copied!")); } },
                      { icon: Landmark, label: "Demo", fn: () => { setOriginText("Kathmandu"); setDestText("Pokhara"); toast.success("Demo loaded."); } },
                    ].map(({ icon: Icon, label, fn }) => (
                      <button key={label} type="button" onClick={fn}
                        className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/6 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white/38 transition-colors hover:border-white/20 hover:text-white/65">
                        <Icon className="h-3 w-3" />{label}
                      </button>
                    ))}
                    {route && (
                      <button type="button"
                        onClick={() => {
                          if (!user) { toast.error("Sign in to save."); return; }
                          saveTrip(originText, destText);
                          toast.success("Saved!");
                        }}
                        className="flex items-center gap-1.5 rounded-lg border border-amber-400/28 bg-amber-400/8 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-400/65 transition-colors hover:border-amber-400/50 hover:text-amber-400">
                        <Bookmark className="h-3 w-3" />Save
                      </button>
                    )}
                  </div>

                  {recentTrips.length > 0 && (
                    <div className="text-[10px] text-white/28">
                      <span className="uppercase tracking-wider">Recent:</span>{" "}
                      {recentTrips.slice(0, 2).map(x => (
                        <button key={x.t} type="button" className="ml-2 underline decoration-dotted text-white/42 transition-colors hover:text-white/70"
                          onClick={() => { setOriginText(x.o); setDestText(x.d); }}>
                          {x.o} → {x.d}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 pt-1 text-[10px] text-white/22">
                    <ShieldCheck className="h-3 w-3" />No sign-in needed · OpenStreetMap data
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Angled cut into light section */}
        <div className="h-20 bg-background" style={{ clipPath: "polygon(0 50%, 100% 0, 100% 100%, 0 100%)", marginTop: "-5rem" }} />
      </section>

      {/* ═══ RESULTS ══════════════════════════════════════════════ */}
      <section id="results" className="section pb-16">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">

          {/* Trip summary card */}
          <div className="rounded-2xl border border-border bg-card p-7 shadow-lift">
            <div className="flex items-center gap-2 mb-1">
              <Route className="h-4 w-4 text-primary" />
              <p className="overline">Trip Summary</p>
            </div>
            <h3 className="font-display text-2xl mt-1">Your Route</h3>
            <div className="gold-rule mt-3 w-10 mb-7" />

            {!route ? (
              <div className="grid gap-3">
                <Skeleton className="h-5 w-2/3 rounded-lg" />
                <Skeleton className="h-5 w-1/2 rounded-lg" />
                <Skeleton className="h-20 w-full rounded-xl" />
                <p className="text-sm text-muted-foreground mt-1">Plan a route above to see details here.</p>
              </div>
            ) : (
              <div className="grid gap-5">
                <div>
                  <p className="overline mb-1">From</p>
                  <p className="font-semibold">{origin?.label}</p>
                </div>
                <div>
                  <p className="overline mb-1">To</p>
                  <p className="font-semibold">{dest?.label}</p>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: Clock, label: "Duration", value: formatMins(route.durationMin) },
                    { icon: Compass, label: "Distance", value: `${route.distanceKm.toFixed(1)} km` },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="rounded-xl bg-secondary p-4">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2"><Icon className="h-3.5 w-3.5" />{label}</div>
                      <div className="text-2xl font-bold">{value}</div>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl border border-border p-4 accent-border">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-semibold mb-0.5"><Wallet className="h-4 w-4 text-primary" />Estimated Cost</div>
                      <div className="text-xs text-muted-foreground">
                        {mode === "private" ? "Private vehicle" : mode === "flight" ? "Domestic flight" : "Tourist bus"}
                        {" "}· {passengers} pax{travelDate ? ` · ${format(travelDate, "dd MMM")}` : ""}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">NPR {costNpr.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">Approximate</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Map + hotels */}
          <div className="rounded-2xl border border-border bg-card shadow-lift overflow-hidden">
            <div className="relative h-100">
              <MapContainer center={[27.7172, 85.324]} zoom={7} scrollWheelZoom={false} className="h-full w-full">
                <TileLayer attribution="© OpenStreetMap contributors" url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                <FitBounds bounds={mapBounds} />
                {route?.geometry?.length && (
                  <Polyline positions={route.geometry} pathOptions={{ color: "#c9640e", weight: 5, opacity: 0.95 }} />
                )}
                {origin && <Marker position={[origin.lat, origin.lon]}><Popup><div className="font-medium text-xs">Start · {origin.label}</div></Popup></Marker>}
                {dest && <Marker position={[dest.lat, dest.lon]}><Popup><div className="font-medium text-xs">End · {dest.label}</div></Popup></Marker>}
                {hotels.map(h => (
                  <Marker key={h.id} position={[h.lat, h.lon]}>
                    <Popup><div className="font-medium text-xs">{h.name}</div>{h.website && <a className="text-[10px] text-blue-600 underline" href={h.website} target="_blank" rel="noreferrer">Website</a>}</Popup>
                  </Marker>
                ))}
              </MapContainer>
              {!route && (
                <div className="absolute inset-0 grid place-items-center bg-black/55 backdrop-blur-[2px]">
                  <div className="rounded-xl border border-white/18 bg-black/65 px-5 py-4 text-center">
                    <MapPinned className="mx-auto mb-2 h-5 w-5 text-amber-400" />
                    <div className="font-semibold text-white text-sm">Map Preview</div>
                    <div className="mt-1 text-xs text-white/50">Plan a route to draw it here.</div>
                  </div>
                </div>
              )}
            </div>

            {/* Hotels */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2"><Hotel className="h-4 w-4 text-primary" /><p className="overline">Accommodation</p></div>
                <span className="tag-gold">Ad slots ready</span>
              </div>
              <h3 className="font-display text-xl mb-5">Hotels on the Way</h3>

              {hotelLoading ? (
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
                </div>
              ) : hotels.length ? (
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {hotels.map(h => (
                    <div key={h.id} className="rounded-xl border border-border p-3.5 transition-colors hover:border-primary/35">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold text-sm leading-snug">{h.name}</div>
                          <div className="mt-0.5 text-xs text-muted-foreground">{h.stars ? `${h.stars}★ · ` : ""}OSM</div>
                        </div>
                        <button onClick={() => toast("Ad slot: connect booking link later")}
                          className="shrink-0 rounded-md border border-primary/25 bg-primary/6 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary transition-colors hover:bg-primary/12">
                          Promote
                        </button>
                      </div>
                      {h.website && (
                        <a className="mt-2 block truncate text-xs text-blue-600 hover:underline" href={h.website} target="_blank" rel="noreferrer">
                          {h.website.replace(/^https?:\/\//, "").slice(0, 36)}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Plan a route to fetch hotels from OpenStreetMap.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ GALLERY ══════════════════════════════════════════════ */}
      <section id="gallery" className="section pb-16 scroll-mt-20">
        <SectionHead eye="Gallery" title="Real Views of Nepal" sub="Use these visuals across landing pages and future ad creatives." />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { title: "Pokhara · Phewa Lake", img: heroImg },
            { title: "Nepal Lake Horizon", img: lakeImg },
            { title: "Everest Range", img: everestRangeImg },
            { title: "Mount Everest", img: everestImg },
            { title: "Lumbini", img: lumbiniImg },
            { title: "Chitwan", img: chitwanImg },
          ].map(x => (
            <div key={x.title} className="group overflow-hidden rounded-xl border border-border bg-card shadow-lift">
              <div className="h-44 w-full transition-transform duration-700 group-hover:scale-105"
                style={{ backgroundImage: `url(${x.img})`, backgroundSize: "cover", backgroundPosition: "center" }} />
              <div className="p-4">
                <div className="font-semibold text-sm">{x.title}</div>
                <div className="overline mt-0.5">High-resolution</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ CONTACT ══════════════════════════════════════════════ */}
      <section id="contact" className="section pb-16 scroll-mt-20">
        <div className="dhaka-bg rounded-2xl border border-border bg-card p-8 shadow-lift accent-border">
          <div className="grid gap-8 md:grid-cols-[1.6fr_1fr]">
            <div>
              <p className="overline mb-2">Partner With Us</p>
              <h3 className="font-display text-3xl mb-3">List Your Hotel</h3>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
                Want your hotel featured prominently? Share your location, photos, and booking link. We'll add sponsored slots and click tracking.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {[
                  { t: "For hotels", d: "Send your Google Maps pin + photos + price range." },
                  { t: "For agencies", d: "We can add trekking routes, permits, and guides." },
                  { t: "For ads", d: "Sponsored slots + click tracking will be enabled." },
                ].map(item => (
                  <div key={item.t} className="border-t border-border pt-3">
                    <div className="text-xs font-bold mb-1">{item.t}</div>
                    <div className="text-xs text-muted-foreground">{item.d}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2.5 justify-center">
              <a href="mailto:info@yourdomain.com?subject=Hotel%20Partnership%20-%20Nepal%20Route%20Planner">
                <Button className="w-full h-11 rounded-xl font-bold uppercase tracking-wider">Email Us</Button>
              </a>
              <a href="tel:+9779800000000">
                <Button variant="outline" className="w-full h-11 rounded-xl font-semibold uppercase tracking-wider">Call</Button>
              </a>
              <a href="https://wa.me/9779800000000" target="_blank" rel="noreferrer">
                <Button variant="outline" className="w-full h-11 rounded-xl font-semibold uppercase tracking-wider">WhatsApp</Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ AD SPOTS + FEATURES ══════════════════════════════════ */}
      <section id="ads" className="section pb-16">
        <div className="grid gap-6 lg:grid-cols-2">

          {/* Sponsored hotel cards */}
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-7 shadow-lift"
            style={{ backgroundImage: `url(${everestImg})`, backgroundSize: "cover", backgroundPosition: "center" }}>
            <div className="absolute inset-0 rounded-2xl bg-background/88" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4 text-primary" />
                <p className="overline">Sponsored Slots</p>
              </div>
              <h3 className="font-display text-2xl mb-5">Featured Hotels</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { title: "Featured Hotel #1", tag: "Top pick" },
                  { title: "Featured Hotel #2", tag: "Best value" },
                  { title: "Featured Hotel #3", tag: "Lake view" },
                  { title: "Featured Hotel #4", tag: "Family" },
                ].map(x => (
                  <div key={x.title} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <div className="font-semibold text-sm">{x.title}</div>
                        <div className="text-xs text-muted-foreground">Placeholder ad card</div>
                      </div>
                      <span className="tag-gold">{x.tag}</span>
                    </div>
                    <Button className="w-full h-9 rounded-lg text-xs font-bold uppercase tracking-wider"
                      onClick={() => toast("Connect ad click tracking later")}>
                      View deal
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Features list */}
          <div className="rounded-2xl border border-border bg-card p-7 shadow-lift">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <p className="overline">Platform</p>
            </div>
            <h3 className="font-display text-2xl mb-6">Built for Real Traffic</h3>
            <div className="grid gap-1">
              {[
                { icon: Navigation, title: "Instant route preview", desc: "Live map + summary after one click." },
                { icon: Wallet, title: "Cost estimate", desc: "Bus, private vehicle, or domestic flight." },
                { icon: Hotel, title: "Hotel discovery", desc: "OpenStreetMap Overpass API." },
                { icon: CloudSun, title: "Live weather", desc: "Open-Meteo — free, no key needed." },
                { icon: ShieldCheck, title: "Trekking permits", desc: "Region-aware permit database." },
                { icon: Sparkles, title: "AI travel tips", desc: "Claude by Anthropic, context-aware." },
                { icon: CalendarDays, title: "Itinerary builder", desc: "Editable day-by-day planner." },
              ].map(f => (
                <div key={f.title} className="flex items-start gap-3 border-b border-border py-3 last:border-0">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/8 border border-primary/15">
                    <f.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{f.title}</div>
                    <div className="text-xs text-muted-foreground">{f.desc}</div>
                  </div>
                  <CheckCircle2 className="ml-auto mt-0.5 h-4 w-4 shrink-0 text-emerald-500/70" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ INSIGHTS (after route) ═══════════════════════════════ */}
      {route && dest && origin && (
        <section id="insights" className="section pb-16 scroll-mt-20">
          <SectionHead eye="Insights" title="Travel Intelligence" sub="Live data and AI-powered advice for your specific route." />
          <div className="grid gap-6 lg:grid-cols-2">

            <div className="rounded-2xl border border-border bg-card p-7 shadow-lift">
              <div className="flex items-center gap-2 mb-1"><CloudSun className="h-4 w-4 text-primary" /><p className="overline">Live Weather</p></div>
              <h4 className="font-display text-xl mb-5">At Destination</h4>
              <WeatherWidget lat={dest.lat} lon={dest.lon} placeName={dest.label.split(",")[0]} />
            </div>

            <div className="rounded-2xl border border-border bg-card p-7 shadow-lift">
              <div className="flex items-center gap-2 mb-1"><ShieldCheck className="h-4 w-4 text-primary" /><p className="overline">Documents</p></div>
              <h4 className="font-display text-xl mb-5">Trekking Permits</h4>
              <TrekkingPermits destination={dest.label} />
            </div>

            <div className="rounded-2xl border border-border bg-card p-7 shadow-lift lg:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /><p className="overline">AI-Powered</p></div>
                <span className="tag-gold">Claude by Anthropic</span>
              </div>
              <h4 className="font-display text-xl mb-5">Travel Tips</h4>
              <AiTravelTips origin={origin.label.split(",")[0]} destination={dest.label.split(",")[0]} mode={mode} distanceKm={route.distanceKm} durationMin={route.durationMin} />
            </div>

            <div className="rounded-2xl border border-border bg-card p-7 shadow-lift lg:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" /><p className="overline">Planning</p></div>
                <span className="text-xs text-muted-foreground">Editable day-by-day</span>
              </div>
              <h4 className="font-display text-xl mb-5">Trip Itinerary</h4>
              <ItineraryPlanner origin={origin.label.split(",")[0]} destination={dest.label.split(",")[0]} />
            </div>
          </div>
        </section>
      )}

      {/* ═══ ABOUT ════════════════════════════════════════════════ */}
      <section id="about" className="section pb-12 scroll-mt-20">
        <div className="rounded-2xl border border-border bg-card p-7 shadow-lift">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="overline mb-2">About</p>
              <h3 className="font-display text-2xl mb-3">About This App</h3>
              <p className="text-sm text-muted-foreground max-w-lg leading-relaxed">
                A production-ready Nepal tourism route planner with real routing, weather, AI tips, permit info, and a day-by-day itinerary builder. Next steps: hotel booking affiliate links, analytics, and sponsored placements.
              </p>
            </div>
            <Button variant="outline" className="rounded-xl"
              onClick={() => document.getElementById("planner")?.scrollIntoView({ behavior: "smooth" })}>
              ↑ Back to Planner
            </Button>
          </div>
          <Separator className="my-6" />
          <div className="grid gap-4 text-xs text-muted-foreground md:grid-cols-4">
            {[
              { t: "Routing & Maps", d: "OpenStreetMap, OSRM, Photon geocoder." },
              { t: "Weather", d: "Open-Meteo API — free, no key needed." },
              { t: "AI Tips", d: "Claude by Anthropic — context-aware advice." },
              { t: "Disclaimer", d: "Estimates only. Verify permits & costs locally." },
            ].map(item => (
              <div key={item.t} className="border-t border-border pt-3">
                <div className="font-bold text-foreground mb-1">{item.t}</div>
                <div>{item.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />

      {/* Mobile sticky bar */}
      <div className="fixed bottom-4 left-1/2 z-50 w-[min(480px,calc(100vw-2rem))] -translate-x-1/2 md:hidden">
        <div className="glass flex items-center gap-2 rounded-2xl p-2">
          {[
            { label: "Planner", target: "planner" },
            { label: "Insights", target: "insights" },
          ].map(({ label, target }) => (
            <button key={label}
              className="flex-1 rounded-xl border border-white/12 bg-white/7 py-2 text-xs font-bold uppercase tracking-wider text-white/55 transition-colors hover:text-white"
              onClick={() => document.getElementById(target)?.scrollIntoView({ behavior: "smooth" })}>
              {label}
            </button>
          ))}
          <button
            className="flex-1 rounded-xl py-2 text-xs font-bold uppercase tracking-wider text-white transition-all disabled:opacity-60"
            style={{ background: "var(--saffron, #c9640e)" }}
            onClick={planTrip} disabled={isLoading}>
            {isLoading ? <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin" /> : "Plan"}
          </button>
        </div>
      </div>
    </div>
  );
}