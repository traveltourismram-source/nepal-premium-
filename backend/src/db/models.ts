import mongoose, { Schema } from "mongoose";

// ─── User Schema ──────────────────────────────────────────────────────
const UserSchema = new Schema({
  _id: { type: String, required: true },
  first_name: { type: String, required: true },
  last_name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password_hash: { type: String, required: true },
  role: { type: String, required: true, default: "solo-trekker" },
  avatar_seed: { type: String, required: true },
  google_id: { type: String, required: false },
  facebook_id: { type: String, required: false },
  newsletter: { type: Number, default: 1 },
  created_at: { type: Number, default: () => Math.floor(Date.now() / 1000) },
  updated_at: { type: Number, default: () => Math.floor(Date.now() / 1000) },
});

export const User = mongoose.model("User", UserSchema);

// ─── RefreshToken Schema ───────────────────────────────────────────────
const RefreshTokenSchema = new Schema({
  _id: { type: String, required: true },
  user_id: { type: String, required: true, ref: "User" },
  token_hash: { type: String, required: true, unique: true },
  expires_at: { type: Number, required: true },
  created_at: { type: Number, default: () => Math.floor(Date.now() / 1000) },
});

export const RefreshToken = mongoose.model("RefreshToken", RefreshTokenSchema);

// ─── SavedTrip Schema ──────────────────────────────────────────────────
const SavedTripSchema = new Schema({
  _id: { type: String, required: true },
  user_id: { type: String, required: true, ref: "User" },
  origin: { type: String, required: true },
  destination: { type: String, required: true },
  label: { type: String, required: true },
  mode: { type: String, required: true, default: "tourist-bus" },
  distance_km: { type: Number, default: null },
  duration_min: { type: Number, default: null },
  notes: { type: String, default: null },
  created_at: { type: Number, default: () => Math.floor(Date.now() / 1000) },
});

export const SavedTrip = mongoose.model("SavedTrip", SavedTripSchema);

// ─── TipCache Schema ───────────────────────────────────────────────────
const TipCacheSchema = new Schema({
  _id: { type: String, required: true },
  cache_key: { type: String, required: true, unique: true },
  summary: { type: String, required: true },
  tips_json: { type: String, required: true },
  created_at: { type: Number, default: () => Math.floor(Date.now() / 1000) },
  expires_at: { type: Number, required: true },
});

export const TipCache = mongoose.model("TipCache", TipCacheSchema);

// ─── ItineraryCache Schema ────────────────────────────────────────────────
const ItineraryCacheSchema = new Schema({
  _id: { type: String, required: true },
  cache_key: { type: String, required: true, unique: true },
  itinerary_json: { type: String, required: true }, // stored as JSON string
  created_at: { type: Number, default: () => Math.floor(Date.now() / 1000) },
  expires_at: { type: Number, required: true },
});

export const ItineraryCache = mongoose.model("ItineraryCache", ItineraryCacheSchema);

// ─── ContactRequest Schema ─────────────────────────────────────────────
const ContactRequestSchema = new Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  type: { type: String, required: true, default: "general" },
  message: { type: String, required: true },
  created_at: { type: Number, default: () => Math.floor(Date.now() / 1000) },
});

export const ContactRequest = mongoose.model("ContactRequest", ContactRequestSchema);

// ─── UserLog Schema (For tracking user signups, logins, and actions) ────
const UserLogSchema = new Schema({
  _id: { type: String, required: true },
  user_id: { type: String, required: true, ref: "User" },
  action: { type: String, required: true }, // "register", "login", "logout"
  details: { type: String, default: null },
  ip_address: { type: String, default: null },
  created_at: { type: Number, default: () => Math.floor(Date.now() / 1000) },
});

export const UserLog = mongoose.model("UserLog", UserLogSchema);

