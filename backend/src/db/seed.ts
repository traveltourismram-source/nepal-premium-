/**
 * Seed script – run with:  npm run db:reset
 * Creates the schema and inserts a demo user.
 */
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
import { User, SavedTrip } from "./models";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ ERROR: MONGODB_URI is not set in backend/.env");
  process.exit(1);
}

async function runSeed() {
  try {
    console.log("🔌 Connecting to MongoDB for seeding...");
    await mongoose.connect(MONGODB_URI!);
    console.log("🔌 Connected.");

    // Remove existing seed data
    console.log("🧹 Cleaning collections...");
    await User.deleteMany({});
    await SavedTrip.deleteMany({});

    console.log("🌱 Seeding database...");
    const demoId = uuidv4();
    const hash = bcrypt.hashSync("Demo1234!", 10);

    const demoUser = new User({
      _id: demoId,
      first_name: "Aarav",
      last_name: "Sharma",
      email: "demo@nepalroute.com",
      password_hash: hash,
      role: "solo-trekker",
      avatar_seed: "Aarav Sharma",
      newsletter: 1,
    });
    await demoUser.save();

    const trips = [
      { o: "Kathmandu", d: "Pokhara",  label: "Kathmandu → Pokhara",  mode: "tourist-bus", km: 200, min: 390 },
      { o: "Pokhara",   d: "Chitwan",  label: "Pokhara → Chitwan",    mode: "private",     km: 148, min: 210 },
      { o: "Kathmandu", d: "Lumbini",  label: "Kathmandu → Lumbini",  mode: "tourist-bus", km: 280, min: 480 },
    ];

    for (const t of trips) {
      const newTrip = new SavedTrip({
        _id: uuidv4(),
        user_id: demoId,
        origin: t.o,
        destination: t.d,
        label: t.label,
        mode: t.mode,
        distance_km: t.km,
        duration_min: t.min,
      });
      await newTrip.save();
    }

    console.log("✅  Seed complete.");
    console.log("   Demo user:  demo@nepalroute.com  /  Demo1234!");
  } catch (err) {
    console.error("❌  Seed failed:", err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runSeed();
