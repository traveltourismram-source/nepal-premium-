import { useEffect, useState } from "react";
import axios from "axios";
import { Cloud, CloudRain, Sun, Wind, Thermometer, Droplets, Eye } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

type WeatherData = {
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  description: string;
  visibility: number;
  weatherCode: number;
};

function getWeatherIcon(code: number) {
  if (code >= 200 && code < 300) return CloudRain;
  if (code >= 300 && code < 400) return CloudRain;
  if (code >= 500 && code < 600) return CloudRain;
  if (code >= 600 && code < 700) return Cloud;
  if (code >= 700 && code < 800) return Cloud;
  if (code === 800) return Sun;
  return Cloud;
}

function getBestTravelSeason(month: number): { label: string; color: string } {
  // Oct-Nov and March-May are ideal trekking seasons in Nepal
  if ([3, 4, 5, 10, 11].includes(month)) return { label: "Prime season", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" };
  if ([12, 1, 2].includes(month)) return { label: "Cool & clear", color: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300" };
  return { label: "Monsoon season", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" };
}

// Returns Tailwind classes for temperature color coding
function getTempColor(tempC: number): string {
  if (tempC < 10) return "bg-blue-200 text-blue-800";
  if (tempC < 25) return "bg-amber-200 text-amber-800";
  return "bg-red-200 text-red-800";
}

export default function WeatherWidget({ lat, lon, placeName }: { lat: number; lon: number; placeName: string }) {
  // If coordinates are missing or invalid, don't render the widget
  if (lat == null || lon == null || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null;
  }
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Guard: ensure we have valid numeric coordinates before fetching
    if (lat == null || lon == null || !Number.isFinite(lat) || !Number.isFinite(lon)) return;

    setLoading(true);
    setError(false);
    setWeather(null);

    // Open-Meteo — free, no API key needed
    console.log('Fetching weather for', lat, lon);
    const url = `/api/weather?lat=${lat}&lon=${lon}`;

    axios.get(url)
  .then(({ data }) => {
    setWeather({
      temp: data.temp,
      feelsLike: data.feelsLike,
      humidity: data.humidity,
      windSpeed: data.windSpeed,
      description: data.description,
      visibility: data.visibility,
      weatherCode: data.weatherCode,
    });
  })
  .catch(() => setError(true))
  .finally(() => setLoading(false));
  }, [lat, lon]);

  const month = new Date().getMonth() + 1;
  const season = getBestTravelSeason(month);

  if (loading) return (
    <div className="grid gap-3">
      <Skeleton className="h-16 w-full" />
      <div className="grid grid-cols-3 gap-2">
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
      </div>
    </div>
  );

  if (error) {
    return (
      <div className="rounded-2xl border border-border bg-secondary/50 p-4 text-sm text-red-500">
        Weather data unavailable for this location. (Error loading)
      </div>
    );
  }

  if (!weather) return null;

  const WeatherIcon = getWeatherIcon(weather.weatherCode);

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10">
            <WeatherIcon className="h-7 w-7 text-primary" />
          </div>
          <div>
            {/* Temperature with dynamic color and Fahrenheit */}
            <div className={`text-3xl font-semibold px-2 py-1 rounded-lg ${getTempColor(weather.temp)}`} >{weather.temp}°C ({Math.round(weather.temp * 9/5 + 32)}°F)</div>
            <div className="text-sm text-muted-foreground">{weather.description}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">Feels like</div>
          <div className="font-semibold">{weather.feelsLike}°C</div>
          <Badge className={`mt-1 text-xs ${season.color}`} variant="secondary">
            {season.label}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-secondary px-3 py-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Droplets className="h-3 w-3" /> Humidity
          </div>
          <div className="mt-1 font-semibold">{weather.humidity}%</div>
        </div>
        <div className="rounded-xl bg-secondary px-3 py-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Wind className="h-3 w-3" /> Wind
          </div>
          <div className="mt-1 font-semibold">{weather.windSpeed} km/h</div>
        </div>
        <div className="rounded-xl bg-secondary px-3 py-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Eye className="h-3 w-3" /> Visibility
          </div>
          <div className="mt-1 font-semibold">{weather.visibility} km</div>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        Current conditions at {placeName}. Data from Open-Meteo.
      </div>
    </div>
  );
}
