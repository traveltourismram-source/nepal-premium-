import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import session from "express-session";
import passport from "passport";
import "./lib/passport";


import { initSchema } from "./db/schema";
import authRouter    from "./routes/auth";
import tripsRouter   from "./routes/trips";
import tipsRouter    from "./routes/tips";
import contactRouter from "./routes/contact";
import itineraryRouter from "./routes/itinerary";
import weatherRouter from "./routes/weather";

dotenv.config();

// ─── Init database ────────────────────────────────────────────────────
initSchema();

const app = express();

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || "default_secret",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true, maxAge: 24 * 60 * 60 * 1000 },
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Security
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// CORS
const allowedOrigins = (process.env.CORS_ORIGINS ?? "http://localhost:5173")
  .split(",")
  .map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: ${origin} not allowed`));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 900_000), // 15 min
  max: Number(process.env.RATE_LIMIT_MAX ?? 200),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please slow down." },
});
app.use(limiter);

// Auth endpoints: stricter limit
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many auth attempts. Try again in 15 minutes." },
});

// Body parsing
app.use(express.json({ limit: "64kb" }));
app.use(compression());

// Logging
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// Health check
app.get("/health", (_req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV, ts: new Date().toISOString() });
});

// Routes
app.use("/api/auth", authLimiter, authRouter);
app.use("/api/trips", tripsRouter);
app.use("/api/tips", tipsRouter);
app.use("/api/contact", contactRouter);
app.use("/api/itinerary", itineraryRouter);
app.use("/api/weather", weatherRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  const status = err.status ?? 500;
  const message = process.env.NODE_ENV !== "production" ? err.message : "Internal server error";
  res.status(status).json({ error: message });
});

const PORT = Number(process.env.PORT ?? 4000);
app.listen(PORT, () => {
  console.log(`\n🏔️  Nepal Route API running at http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log(`   Environment: ${process.env.NODE_ENV ?? "development"}\n`);
});

export default app;
