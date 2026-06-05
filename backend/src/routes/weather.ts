import { Router, Request, Response } from 'express';
import axios from 'axios';
import WeatherCache from '../models/WeatherCache';

const router = Router();

// Cache TTL (30 minutes)
const CACHE_TTL_MS = 30 * 60 * 1000;

router.get('/', async (req: Request, res: Response) => {
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);

  if (isNaN(lat) || isNaN(lon)) {
    return res.status(400).json({ error: 'Invalid or missing lat/lon query parameters' });
  }

  try {
    // Check cache
    const cached = await WeatherCache.findOne({ lat, lon });
    const now = Date.now();
    if (cached && now - cached.fetchedAt.getTime() < CACHE_TTL_MS) {
      return res.json({ source: 'cache', ...cached.data });
    }

    // Fetch from Open-Meteo
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,visibility&wind_speed_unit=kmh`;
    const { data } = await axios.get(url);
    const c = data.current;
    const wmoDesc: Record<number, string> = {
      0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
      45: 'Fog', 48: 'Icy fog', 51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle',
      61: 'Slight rain', 63: 'Rain', 65: 'Heavy rain', 71: 'Slight snow',
      73: 'Snow', 75: 'Heavy snow', 80: 'Rain showers', 81: 'Showers', 82: 'Violent showers',
      95: 'Thunderstorm', 96: 'Thunderstorm with hail', 99: 'Severe thunderstorm',
    };
    const weatherData = {
      temp: Math.round(c.temperature_2m),
      feelsLike: Math.round(c.apparent_temperature),
      humidity: c.relative_humidity_2m,
      windSpeed: Math.round(c.wind_speed_10m),
      description: wmoDesc[c.weather_code] ?? 'Unknown',
      visibility: Math.round((c.visibility ?? 10000) / 1000),
      weatherCode: c.weather_code,
    };

    // Upsert cache entry
    await WeatherCache.findOneAndUpdate(
      { lat, lon },
      { data: weatherData, fetchedAt: new Date() },
      { upsert: true, new: true }
    );

    return res.json({ source: 'api', ...weatherData });
  } catch (err) {
    console.error('Weather route error:', err);
    return res.status(500).json({ error: 'Failed to fetch weather data' });
  }
});

export default router;
