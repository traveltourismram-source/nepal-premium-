import { useState, useEffect } from "react";
import { CalendarDays, ChevronDown, ChevronUp, Clock, Hotel, MapPin, Mountain, Utensils, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";

type DayActivity = {
  id: string;
  time: string;
  type: "travel" | "stay" | "sightseeing" | "food" | "trek";
  description: string;
};

type Day = {
  id: string;
  label: string;
  location: string;
  activities: DayActivity[];
  collapsed: boolean;
};

const ACTIVITY_ICONS = {
  travel: MapPin,
  stay: Hotel,
  sightseeing: Mountain,
  food: Utensils,
  trek: Mountain,
};

const ACTIVITY_COLORS: Record<string, string> = {
  travel: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  stay: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  sightseeing: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  food: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  trek: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
};

const DEFAULT_ITINERARIES: Record<string, Day[]> = {
  "Kathmandu-Pokhara": [
    {
      id: "d1", label: "Day 1", location: "Kathmandu", collapsed: false,
      activities: [
        { id: "a1", time: "08:00", type: "sightseeing", description: "Visit Pashupatinath Temple & Boudhanath Stupa" },
        { id: "a2", time: "12:00", type: "food", description: "Lunch at Thamel – try dal bhat" },
        { id: "a3", time: "15:00", type: "sightseeing", description: "Swayambhunath (Monkey Temple) sunset" },
        { id: "a4", time: "19:00", type: "stay", description: "Overnight Kathmandu" },
      ]
    },
    {
      id: "d2", label: "Day 2", location: "Kathmandu → Pokhara", collapsed: false,
      activities: [
        { id: "a5", time: "07:00", type: "food", description: "Early breakfast; pack for journey" },
        { id: "a6", time: "08:00", type: "travel", description: "Tourist bus to Pokhara (~6–7 hrs via Prithvi Hwy)" },
        { id: "a7", time: "15:00", type: "sightseeing", description: "Arrive Pokhara; Phewa Lake boat ride" },
        { id: "a8", time: "18:30", type: "food", description: "Lakeside dinner with Annapurna views" },
        { id: "a9", time: "20:00", type: "stay", description: "Hotel Lakeside, Pokhara" },
      ]
    },
    {
      id: "d3", label: "Day 3", location: "Pokhara", collapsed: true,
      activities: [
        { id: "a10", time: "05:00", type: "trek", description: "Sarangkot sunrise viewpoint hike" },
        { id: "a11", time: "09:00", type: "sightseeing", description: "Davis Falls & Gupteshwar Cave" },
        { id: "a12", time: "13:00", type: "food", description: "Local momo lunch near Barahi Temple" },
        { id: "a13", time: "15:00", type: "sightseeing", description: "International Mountain Museum" },
      ]
    }
  ]
};

function uid() { return Math.random().toString(36).slice(2, 8); }

export default function ItineraryPlanner({ origin, destination, initialDays }: { origin: string; destination: string; initialDays?: Day[] }) {
  const routeKey = `${origin.split(",")[0]}-${destination.split(",")[0]}`;
  const [days, setDays] = useState<Day[]>(initialDays ?? DEFAULT_ITINERARIES[routeKey] ?? []);

  function toggleDay(id: string) {
  setDays(d => d.map(day => day.id === id ? { ...day, collapsed: !day.collapsed } : day));
}

// Add a new day manually
function addDay() {
  const num = days.length + 1;
  setDays(d => [...d, {
    id: uid(),
    label: `Day ${num}`,
    location: "",
    collapsed: false,
    activities: [],
  }]);
}

// Automatically generate itinerary when component mounts or when origin/destination change
useEffect(() => {
  generateItinerary();
}, [origin, destination]);



  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generateItinerary() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/itinerary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          origin,
          destination,
          mode: 'tourist-bus',
          distanceKm: 0,
          durationMin: 0,
        }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to generate itinerary');
      }
      const data = await response.json();
      const itinerary = data.itinerary;
      // Map API response to internal Day structure
      const mappedDays: Day[] = itinerary.days.map((d: any) => ({
        id: uid(),
        label: d.label,
        location: d.location,
        collapsed: false,
        activities: d.activities.map((a: any) => ({
          id: uid(),
          time: a.time,
          type: a.type,
          description: a.description,
        })),
      }));
      setDays(mappedDays);
    } catch (e: any) {
      console.error(e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // Add button in UI (will be placed later in render)

  function removeDay(id: string) {
    setDays(d => d.filter(day => day.id !== id));
  }

  function addActivity(dayId: string) {
    setDays(d => d.map(day => day.id === dayId ? {
      ...day,
      activities: [...day.activities, { id: uid(), time: "12:00", type: "sightseeing", description: "New activity" }]
    } : day));
  }

  function updateActivity(dayId: string, actId: string, field: keyof DayActivity, value: string) {
    setDays(d => d.map(day => day.id === dayId ? {
      ...day,
      activities: day.activities.map(a => a.id === actId ? { ...a, [field]: value } : a)
    } : day));
  }

  function removeActivity(dayId: string, actId: string) {
    setDays(d => d.map(day => day.id === dayId ? {
      ...day,
      activities: day.activities.filter(a => a.id !== actId)
    } : day));
  }

  function updateDayLocation(dayId: string, location: string) {
    setDays(d => d.map(day => day.id === dayId ? { ...day, location } : day));
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{days.length} day{days.length !== 1 ? "s" : ""} planned</div>
        <div className="flex gap-2">
          <Button variant="default" size="sm" className="gap-2 rounded-xl" onClick={generateItinerary} disabled={loading}>
            {loading ? "Generating..." : "Generate Itinerary"}
          </Button>
          <Button variant="outline" size="sm" className="gap-2 rounded-xl" onClick={addDay}>
            <Plus className="h-3.5 w-3.5" /> Add day
          </Button>
        </div>
        {error && (
          <div className="mt-2 text-sm text-red-500">{error}</div>
        )}
      </div>

      {days.map((day, idx) => {
        return (
          <Card key={day.id} className="rounded-2xl overflow-hidden">
            {/* Day header */}
            <div
              className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer hover:bg-secondary/50 transition-colors"
              onClick={() => toggleDay(day.id)}
            >
              <div className="flex items-center gap-3">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">
                  <CalendarDays className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-semibold text-sm">{day.label}</div>
                  {day.location && <div className="text-xs text-muted-foreground">{day.location}</div>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">{day.activities.length} activities</Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive"
                  onClick={(e) => { e.stopPropagation(); removeDay(day.id); }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
                {day.collapsed ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronUp className="h-4 w-4 text-muted-foreground" />}
              </div>
            </div>

            {!day.collapsed && (
              <div className="px-4 pb-4">
                <Separator className="mb-4" />

                {/* Location input */}
                <div className="mb-3">
                  <Input
                    className="rounded-xl text-sm h-8"
                    placeholder="Location for this day..."
                    value={day.location}
                    onChange={(e) => updateDayLocation(day.id, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                {/* Activities */}
                <div className="grid gap-2">
                  {day.activities.map((act) => {
                    const Icon = ACTIVITY_ICONS[act.type] ?? MapPin;
                    return (
                      <div key={act.id} className="flex items-start gap-2 group">
                        <Input
                          className="w-20 shrink-0 rounded-xl text-xs h-8 font-mono"
                          value={act.time}
                          onChange={(e) => updateActivity(day.id, act.id, "time", e.target.value)}
                        />
                        <select
                          className="rounded-xl border border-border bg-secondary text-xs px-2 py-1.5 h-8 shrink-0 text-foreground"
                          value={act.type}
                          onChange={(e) => updateActivity(day.id, act.id, "type", e.target.value as DayActivity["type"])}
                        >
                          <option value="travel">🚌 Travel</option>
                          <option value="stay">🏨 Stay</option>
                          <option value="sightseeing">🏔️ Sightseeing</option>
                          <option value="food">🍜 Food</option>
                          <option value="trek">🥾 Trek</option>
                        </select>
                        <Input
                          className="flex-1 rounded-xl text-xs h-8"
                          value={act.description}
                          onChange={(e) => updateActivity(day.id, act.id, "description", e.target.value)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 rounded-xl opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                          onClick={() => removeActivity(day.id, act.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3 gap-2 rounded-xl text-xs text-muted-foreground"
                  onClick={() => addActivity(day.id)}
                >
                  <Plus className="h-3.5 w-3.5" /> Add activity
                </Button>
              </div>
            )}
          </Card>
        );
      })}

      <div className="text-xs text-muted-foreground text-center">
        Itinerary auto-fills for popular Nepal routes. Edit freely — all changes stay local.
      </div>
    </div>
  );
}
