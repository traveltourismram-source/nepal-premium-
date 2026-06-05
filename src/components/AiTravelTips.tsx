import { useState } from "react";
import { Sparkles, Loader2, RefreshCw, Copy, Check, MapPin, Utensils, Shield, Clock, Backpack, Landmark, DollarSign, Train } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  origin: string;
  destination: string;
  mode: "private" | "tourist-bus" | "flight";
  distanceKm: number;
  durationMin: number;
};

type Tip = {
  category: string;
  tip: string;
  icon: any;
};

// ── Nepal travel knowledge base ─────────────────────────────────────────────

const ROUTE_TIPS: Record<string, { summary: string; tips: Omit<Tip,"icon">[] }> = {
  "kathmandu-pokhara": {
    summary: "The Kathmandu–Pokhara corridor is Nepal's most popular tourist route, winding through the Prithvi Highway with jaw-dropping river gorges and Himalayan foothills. Budget around 6–7 hours by tourist bus or just 25 minutes by SAFA Air's Yeti/Buddha Airlines domestic hop.",
    tips: [
      { category: "Transport",  tip: "Book tourist buses from Kantipath (Kathmandu) or Lakeside (Pokhara). Greenline and Tourist Bus offer AC coaches; arrive 20 min early. Avoid local night buses — they're slower and rougher." },
      { category: "Scenery",   tip: "Sit on the left side of the bus heading to Pokhara for best views of the Trishuli River gorge and glimpses of Manaslu. The stretch between Mugling and Damauli is especially stunning." },
      { category: "Food",      tip: "Stop at Mugling for fresh fish curry — it's famous across Nepal. The small roadside dhabas serve grilled mahaseer (river fish) that's a genuine highlight of the journey." },
      { category: "Timing",    tip: "Depart Kathmandu by 7 AM to reach Pokhara before dark. Evening arrivals in the rainy season (Jun–Aug) can face landslide delays on the highway." },
      { category: "Budget",    tip: "Tourist buses cost NPR 800–1,200. Greenline (AC, breakfast included) costs NPR 2,000 but arrives faster. Flights are NPR 5,500–9,000 and cut travel to 25 min." },
      { category: "Packing",   tip: "Keep a light daypack accessible during the bus ride: snacks, water, motion-sickness tablets, and a jacket. The AC buses get very cold even in summer." },
    ],
  },
  "pokhara-kathmandu": {
    summary: "The return journey from lakeside Pokhara to the buzzing capital is equally scenic. Many travellers combine it with an early morning stop at Sarangkot for the Annapurna sunrise before boarding the bus.",
    tips: [
      { category: "Timing",    tip: "Wake at 4:30 AM for Sarangkot sunrise if staying near Lakeside, then take a 9–10 AM tourist bus to Kathmandu to arrive by 4–5 PM comfortably." },
      { category: "Transport",  tip: "Lakeside's tourist strip (Baidam) has many booking agents for buses and flights. Compare prices — they vary by NPR 200–500 for the same departures." },
      { category: "Food",      tip: "Buy Pokhara's famous Sel Roti (ring-shaped rice donuts) and Gundruk chips as snacks for the road — they're a lovely local takeaway treat." },
      { category: "Safety",    tip: "Keep valuables in your daypack, not in the overhead luggage compartment. Tighten the bag under your seat on the bus." },
      { category: "Scenery",   tip: "The Marsyangdi river valley section (near Bimalnagar) offers dramatic rapids and cliffs — best viewed from the right side going east." },
      { category: "Budget",    tip: "Buddha Air / Yeti Airlines Pokhara–Kathmandu flights frequently go on sale for NPR 4,500. Check their apps 2–3 weeks ahead for best fares." },
    ],
  },
  "kathmandu-chitwan": {
    summary: "The Kathmandu–Chitwan route drops from Himalayan foothills to the subtropical Terai plains — a world apart in just 5 hours. Chitwan National Park is a UNESCO World Heritage Site and one of Asia's best wildlife reserves.",
    tips: [
      { category: "Transport",  tip: "Tourist buses depart Kathmandu's Kantipath area and arrive at Sauraha junction, where jeeps or hotel pickups take you into the park zone. Book buses with pickup included." },
      { category: "Safety",    tip: "Book jungle safaris only through licensed operators. Don't enter dense vegetation on foot alone — rhinos are unpredictable and the park has tigers and leopards." },
      { category: "Timing",    tip: "Visit Oct–Mar for the best wildlife sightings (dry season, tall grass cut after January). Jun–Aug is monsoon season — roads can flood and elephants are rested." },
      { category: "Packing",   tip: "Pack neutral-coloured clothing (khaki, olive, brown). Avoid white and bright colours on safaris. Bring DEET insect repellent — the Terai has mosquitoes year-round." },
      { category: "Culture",   tip: "The Tharu people are indigenous to Chitwan. Catch a traditional Tharu stick dance performance in the evenings — it's free at many lodges and genuinely exciting." },
      { category: "Food",      tip: "Try local Tharu food: dhikri (steamed rice cakes), tama curry (bamboo shoot with black-eyed peas), and fresh curd. Most lodge restaurants serve Tharu set meals." },
    ],
  },
  "chitwan-kathmandu": {
    summary: "Heading back to Kathmandu from the jungle plains, you'll climb from 150m back to the Valley's 1,400m elevation. Many travellers extend the journey with a brief stop at Bharatpur or Devghat temple at the Narayani-Trishuli confluence.",
    tips: [
      { category: "Timing",    tip: "Depart Sauraha early (6–7 AM) to reach Kathmandu by 12–1 PM, avoiding traffic entering the Valley in late afternoon." },
      { category: "Scenery",   tip: "The Narayani River suspension bridge crossing near Bharatpur offers dramatic views. Ask your driver to slow down briefly — worth a quick photo." },
      { category: "Culture",   tip: "Devghat, where two rivers meet, is a sacred Hindu site. If passing through, a 10-minute stop is possible and deeply atmospheric." },
      { category: "Food",      tip: "Mugling, the highway junction town, is the best mid-journey stop. Try fresh mango lassi and thukpa (Tibetan noodle soup) at the small restaurants." },
      { category: "Safety",    tip: "Secure all items before departure — tourist buses sometimes have overhead storage with loose latches. Use locks on zippers on your bag." },
      { category: "Budget",    tip: "NPR 700–1,000 for tourist buses from Sauraha. Some lodges include free drop to the bus stop with package deals — ask before paying for a separate taxi." },
    ],
  },
  "kathmandu-lumbini": {
    summary: "Lumbini, the birthplace of Buddha, is a deeply peaceful UNESCO World Heritage Site in Nepal's southern Terai. The 300km journey from Kathmandu takes around 7–8 hours by tourist bus, passing through Butwal and the sacred Kapilvastu district.",
    tips: [
      { category: "Culture",   tip: "The Sacred Garden contains the Mayadevi Temple (Buddha's exact birthplace), the Ashoka Pillar (249 BC), and a sacred pool. Remove shoes at the temple — this is one of Buddhism's holiest sites." },
      { category: "Timing",    tip: "Arrive a day before major Buddhist events (Vesak / Buddha Jayanti in May) for special ceremonies. Early morning visits to the Sacred Garden are serene with few crowds." },
      { category: "Transport",  tip: "Buses depart Kathmandu's New Bus Park (Gongabu). The journey goes via Butwal — get off at Bhairahawa for the short local bus/auto to Lumbini (22 km)." },
      { category: "Food",      tip: "Try Terai rice-pulse cuisine — mustard-infused lentils, fried fish from Rani Tal pond, and local jaggery sweets. The area produces Nepal's best mustard oil." },
      { category: "Packing",   tip: "Light cotton clothes are essential — the Terai is hot (40°C in summer). A modest shawl or scarf is needed for entering monasteries." },
      { category: "Scenery",   tip: "The monastic zone contains over 30 international monasteries (Thai, Japanese, Korean, German, Vietnamese). A morning bicycle ride through this zone is magical." },
    ],
  },
  "kathmandu-lukla": {
    summary: "Lukla is the gateway to the Everest region — the Tenzing-Hillary Airport (2,860m) is famous as one of the world's most dramatic mountain airstrips. Almost all Everest Base Camp trekkers fly from Kathmandu to Lukla; the 35-minute flight is an adventure in itself.",
    tips: [
      { category: "Transport",  tip: "Flights from Kathmandu (Manthali Airport in Ramechhap) start from NPR 9,000 one-way. In peak season (Oct–Nov, Mar–May), book 2–3 months ahead. Tara Air and Summit Air operate twin-otters." },
      { category: "Timing",    tip: "Flights depart very early (5–8 AM) before valley fog and afternoon winds develop. Prepare for weather cancellations — always have 1–2 buffer days in your schedule." },
      { category: "Safety",    tip: "Altitude sickness is real above 3,000m. Ascend slowly from Lukla (2,860m), take at least 2 days to Namche Bazaar (3,440m), and follow 'climb high, sleep low' principles." },
      { category: "Packing",   tip: "Pack down jacket, waterproof shell, -10°C sleeping bag, trekking poles, high-SPF sunscreen, lip balm, and blister plasters. Weight limit on Lukla flights is 15kg (10kg checked + 5kg carry-on)." },
      { category: "Budget",    tip: "EBC trek costs NPR 15,000–25,000 per week in lodge accommodation and food (teahouses). Permits needed: Sagarmatha National Park (NPR 3,000) + TIMS card (USD 20)." },
      { category: "Culture",   tip: "Sherpa culture is rich around Lukla and Namche. Visit the Khunde Hospital (Sir Edmund Hillary's legacy), attend a puja at Tengboche Monastery, and respect local customs (walk clockwise around mani walls)." },
    ],
  },
  "pokhara-jomsom": {
    summary: "The Pokhara–Jomsom flight is Nepal's most scenic 20-minute hop, threading through the Kali Gandaki gorge — the world's deepest valley — with Dhaulagiri and Annapurna towering overhead. Many Mustang trekkers take this route.",
    tips: [
      { category: "Transport",  tip: "Tara Air operates twin-otters Pokhara→Jomsom departing 6–7 AM. Flights are weather-dependent and often delayed or cancelled in afternoon winds. Afternoon flights are rare and not recommended." },
      { category: "Packing",   tip: "Jomsom is at 2,750m and can be bitterly cold and very windy (the Kali Gandaki valley creates extreme wind tunnel effects). Down jacket, windproof shell, and warm layers are essential." },
      { category: "Culture",   tip: "The Mustang region was a restricted-area kingdom until 2008. Lomanthang (Upper Mustang) retains Tibetan Buddhist culture remarkably intact — a rare living museum. Upper Mustang requires a USD 500/10-day permit." },
      { category: "Scenery",   tip: "The Kali Gandaki gorge between Tatopani and Marpha is geologically extraordinary — ammonite fossils (shaligrams, sacred to Hindus) are found in the riverbed near Kagbeni." },
      { category: "Food",      tip: "Marpha is the 'apple capital' of Nepal — try apple brandy, apple pie, and dried apples sold in local shops. The Thakali thali (buckwheat bread, lentil soup, game meat stew) is a local specialty." },
      { category: "Safety",    tip: "ACAP permit (NPR 3,000) and TIMS card are required for the Annapurna circuit. Above Muktinath (3,760m), altitude precautions apply. Carry diamox if ascending quickly." },
    ],
  },
  "pokhara-chitwan": {
    summary: "This beautiful cross-Terai route connects Nepal's two most popular tourist destinations. The 4–5 hour bus ride passes through Narayanghat and drops you into the wildlife heartland of the country.",
    tips: [
      { category: "Transport",  tip: "Direct tourist buses run Pokhara (Lakeside) → Sauraha/Chitwan. Alternatively, take a local bus to Narayanghat (3 hrs) and connect to Sauraha (45 min) for more flexibility and lower cost." },
      { category: "Food",      tip: "The Narayanghat junction area has excellent Newari and Tharu restaurants. The dal bhat at small family-run restaurants near the bus park is exceptional and costs only NPR 150–200." },
      { category: "Scenery",   tip: "The descent from the Pokhara Valley through Naudanda offers brilliant Annapurna and Machhapuchhare (Fishtail Peak) views on a clear morning — sit on the right side of the bus." },
      { category: "Timing",    tip: "Depart by 7–8 AM to arrive in Sauraha by noon, giving you time to book an afternoon jungle safari and settle in." },
      { category: "Packing",   tip: "Switch from your Pokhara trekking gear to lighter cotton for the hot Terai. Store heavy gear at your Pokhara hotel if returning, or ship it ahead." },
      { category: "Safety",    tip: "Confirm your jungle safari operator is licensed by the Department of National Parks. Avoid unlicensed guides offering cut-price wildlife walks — safety standards vary widely." },
    ],
  },
};

// ── Generic tip templates for unknown routes ───────────────────────────────

function buildGenericTips(origin: string, destination: string, mode: string, distanceKm: number, durationMin: number): { summary: string; tips: Omit<Tip,"icon">[] } {
  const h = Math.floor(durationMin / 60);
  const m = Math.round(durationMin % 60);
  const durationStr = h > 0 ? `${h}h ${m}min` : `${m} min`;
  const modeLabel = mode === "tourist-bus" ? "tourist bus" : mode === "flight" ? "domestic flight" : "private vehicle";

  return {
    summary: `Your ${distanceKm.toFixed(0)}km journey from ${origin} to ${destination} by ${modeLabel} takes approximately ${durationStr}. Nepal's diverse landscapes guarantee this route will offer memorable views, whether through mountain passes, river valleys, or forested hills.`,
    tips: [
      { category: "Safety",    tip: `Keep photocopies of your passport, visa, and trekking permits in a separate bag from the originals. Nepal's mountain and highway routes can be remote — share your itinerary with someone back home.` },
      { category: "Food",      tip: `Dal bhat (lentil soup with rice, vegetables and pickles) is Nepal's staple meal and is available everywhere. It's nutritious, cheap (NPR 150–300), and often comes with free refills — ideal for long travel days.` },
      { category: "Timing",    tip: `Start early — Nepal's mountain weather clears by 6–9 AM then clouds build by afternoon. Mountain flights and high-altitude passes are best in morning hours. Avoid travelling at night on mountain highways.` },
      { category: "Packing",   tip: `Pack a reusable water bottle with a filter (LifeStraw or Sawyer Squeeze) — Nepal has excellent filtered water stations in trekking towns at NPR 30–50 per fill, reducing plastic waste.` },
      { category: "Culture",   tip: `Greet Nepalis with "Namaste" (hands together, slight bow) — it's warmly received everywhere. Remove shoes before entering temples and homes. Ask permission before photographing people.` },
      { category: "Budget",    tip: `Nepal uses NPR (Nepalese Rupees). Keep small bills handy — change is often scarce. ATMs are common in Kathmandu and Pokhara but rare in remote areas. Carry sufficient cash for multi-day treks.` },
      { category: "Transport",  tip: `Tourist buses are the safest option on major routes. For remote areas, hiring a private jeep (NPR 5,000–12,000/day) offers the most flexibility. Domestic flights with Yeti/Buddha/Tara Air are reliable on clear days.` },
      { category: "Scenery",   tip: `Carry a lightweight compact camera or ensure your phone is charged. Nepal's light at golden hour (6–8 AM and 4–6 PM) is extraordinary — mountain reflections, terraced fields, and river gorges reward patient photographers.` },
    ],
  };
}

// ── Category icons mapping ────────────────────────────────────────────────

const CATEGORY_META: Record<string, { icon: any; color: string }> = {
  Food:      { icon: Utensils, color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300" },
  Safety:    { icon: Shield,   color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
  Timing:    { icon: Clock,    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  Packing:   { icon: Backpack, color: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300" },
  Culture:   { icon: Landmark, color: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300" },
  Budget:    { icon: DollarSign, color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" },
  Scenery:   { icon: MapPin,   color: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300" },
  Transport: { icon: Train,    color: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300" },
};

function routeKey(o: string, d: string): string {
  const clean = (s: string) =>
    s.toLowerCase()
      .replace(/[^a-z]/g, " ")
      .trim()
      .split(/\s+/)[0];
  return `${clean(o)}-${clean(d)}`;
}

// ── Component ───────────────────────────────────────────────────────────────

export default function AiTravelTips({ origin, destination, mode, distanceKm, durationMin }: Props) {
  const [tips, setTips]         = useState<Omit<Tip,"icon">[]>([]);
  const [summary, setSummary]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [copied, setCopied]     = useState(false);
  const [generated, setGenerated] = useState(false);
  const [variant, setVariant]   = useState(0); // for regenerate variation

  function generate() {
    setLoading(true);
    setTips([]);
    setSummary("");

    // First try real backend AI tips
    fetch(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:4000"}/api/tips/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ origin, destination, mode, distanceKm, durationMin }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("AI tips unavailable");
        return res.json();
      })
      .then((data) => {
        // Map tips to include icons later
        const serverTips = data.tips.map((t: any) => ({ category: t.category, tip: t.tip }));
        setTips(serverTips.slice(0, 6));
        setSummary(data.summary);
        setGenerated(true);
        setLoading(false);
      })
      .catch(() => {
        // Fallback to static tips after a short delay to simulate thinking
        setTimeout(() => {
          const key = routeKey(origin, destination);
          const data = ROUTE_TIPS[key] ?? buildGenericTips(origin, destination, mode, distanceKm, durationMin);
          const allTips = data.tips;
          const rotated = variant % 2 === 0 ? allTips : [...allTips.slice(2), ...allTips.slice(0, 2)];
          const selected = rotated.slice(0, 6);
          setTips(selected);
          setSummary(data.summary);
          setGenerated(true);
          setLoading(false);
          setVariant((v) => v + 1);
        }, 800);
      });
  }

  async function copyAll() {
    const text = [summary, "", ...tips.map(t => `[${t.category}] ${t.tip}`)].join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Tips copied to clipboard");
  }

  return (
    <div className="grid gap-4">
      {/* Prompt state */}
      {!generated && !loading && (
        <div className="rounded-2xl border border-dashed border-border bg-secondary/30 p-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10">
              <Sparkles className="h-7 w-7 text-primary" />
            </div>
          </div>
          <div className="font-semibold text-base">AI-powered tips for your journey</div>
          <div className="mt-1.5 text-sm text-muted-foreground max-w-sm mx-auto">
            Get tailored advice on food, safety, culture, packing and more for{" "}
            <strong>{origin}</strong> → <strong>{destination}</strong>.
          </div>
          <Button className="mt-5 gap-2 rounded-2xl h-11 px-6" onClick={generate}>
            <Sparkles className="h-4 w-4" />
            Generate travel tips
          </Button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 animate-pulse">
              <div className="h-6 w-20 rounded-full bg-secondary shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-full rounded bg-secondary" />
                <div className="h-3.5 w-4/5 rounded bg-secondary" />
              </div>
            </div>
          ))}
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating Nepal travel intelligence…
          </div>
        </div>
      )}

      {/* Results */}
      <AnimatePresence>
        {generated && !loading && (
          <motion.div
            key={`tips-${variant}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="grid gap-4"
          >
            {/* Summary */}
            {summary && (
              <div className="rounded-2xl bg-primary/8 border border-primary/20 px-5 py-4 text-sm leading-relaxed text-foreground">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary">AI Summary</span>
                </div>
                {summary}
              </div>
            )}

            {/* Tips grid */}
            <div className="grid gap-2.5 sm:grid-cols-2">
              {tips.map((t, i) => {
                const meta = CATEGORY_META[t.category] ?? { icon: Sparkles, color: "bg-secondary text-foreground" };
                const Icon = meta.icon;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.06 }}
                    className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 hover:border-primary/30 transition-colors"
                  >
                    <div className={`shrink-0 mt-0.5 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${meta.color}`}>
                      <Icon className="h-3 w-3" />
                      {t.category}
                    </div>
                    <div className="text-sm leading-relaxed text-foreground">{t.tip}</div>
                  </motion.div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2 rounded-2xl flex-1 h-10" onClick={generate}>
                <RefreshCw className="h-4 w-4" /> Regenerate
              </Button>
              <Button variant="outline" className="gap-2 rounded-2xl flex-1 h-10" onClick={copyAll}>
                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied!" : "Copy all"}
              </Button>
            </div>

            <p className="text-center text-[10px] text-muted-foreground">
              AI tips are curated from Nepal tourism data. Always verify permits & prices locally.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
