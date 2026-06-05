import { Schema, model, Document } from 'mongoose';

export interface WeatherCacheDoc extends Document {
  lat: number;
  lon: number;
  data: {
    temp: number;
    feelsLike: number;
    humidity: number;
    windSpeed: number;
    description: string;
    visibility: number;
    weatherCode: number;
  };
  fetchedAt: Date;
}

const WeatherCacheSchema = new Schema<WeatherCacheDoc>({
  lat: { type: Number, required: true },
  lon: { type: Number, required: true },
  data: {
    temp: Number,
    feelsLike: Number,
    humidity: Number,
    windSpeed: Number,
    description: String,
    visibility: Number,
    weatherCode: Number,
  },
  fetchedAt: { type: Date, default: Date.now },
});

WeatherCacheSchema.index({ lat: 1, lon: 1 }, { unique: true });

export default model<WeatherCacheDoc>('WeatherCache', WeatherCacheSchema);
