import { Router, Response } from "express";
import { body, validationResult } from "express-validator";
import { v4 as uuidv4 } from "uuid";
import { SavedTrip } from "../db/models";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

// All trip routes require auth
router.use(requireAuth);

// ─── Helper ──────────────────────────────────────────────────────────
function formatTrip(row: any) {
  return {
    id: row.id || row._id,
    origin: row.origin,
    destination: row.destination,
    label: row.label,
    mode: row.mode,
    distanceKm: row.distance_km,
    durationMin: row.duration_min,
    notes: row.notes,
    createdAt: row.created_at * 1000,
  };
}

// ─── GET /api/trips ──────────────────────────────────────────────────
router.get("/", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const trips = await SavedTrip.find({ user_id: req.userId })
      .sort({ created_at: -1 })
      .limit(50);

    res.json({ trips: trips.map(formatTrip) });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch trips." });
  }
});

// ─── POST /api/trips ─────────────────────────────────────────────────
router.post(
  "/",
  [
    body("origin").trim().notEmpty().withMessage("origin is required"),
    body("destination").trim().notEmpty().withMessage("destination is required"),
    body("mode").optional().isString(),
    body("distanceKm").optional().isFloat({ min: 0 }),
    body("durationMin").optional().isFloat({ min: 0 }),
    body("notes").optional().isString().isLength({ max: 2000 }),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: errors.array()[0].msg });
      return;
    }

    const { origin, destination, mode = "tourist-bus", distanceKm, durationMin, notes } = req.body;
    const label = `${origin} → ${destination}`;
    const id = uuidv4();

    try {
      const newTrip = new SavedTrip({
        _id: id,
        user_id: req.userId,
        origin,
        destination,
        label,
        mode,
        distance_km: distanceKm ?? null,
        duration_min: durationMin ?? null,
        notes: notes ?? null,
      });
      await newTrip.save();

      res.status(201).json({ trip: formatTrip(newTrip) });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to save trip." });
    }
  }
);

// ─── GET /api/trips/:id ──────────────────────────────────────────────
router.get("/:id", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const trip = await SavedTrip.findOne({ _id: req.params.id, user_id: req.userId });
    if (!trip) {
      res.status(404).json({ error: "Trip not found" });
      return;
    }
    res.json({ trip: formatTrip(trip) });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch trip." });
  }
});

// ─── PATCH /api/trips/:id ────────────────────────────────────────────
router.patch(
  "/:id",
  [
    body("notes").optional().isString().isLength({ max: 2000 }),
    body("label").optional().trim().notEmpty(),
    body("mode").optional().isString(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: errors.array()[0].msg });
      return;
    }

    const { notes, label, mode } = req.body;

    try {
      const trip = await SavedTrip.findOne({ _id: req.params.id, user_id: req.userId });
      if (!trip) {
        res.status(404).json({ error: "Trip not found" });
        return;
      }

      if (notes !== undefined) trip.notes = notes;
      if (label !== undefined) trip.label = label;
      if (mode !== undefined)  trip.mode = mode;

      await trip.save();
      res.json({ trip: formatTrip(trip) });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to update trip." });
    }
  }
);

// ─── DELETE /api/trips/:id ───────────────────────────────────────────
router.delete("/:id", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await SavedTrip.deleteOne({ _id: req.params.id, user_id: req.userId });
    if (result.deletedCount === 0) {
      res.status(404).json({ error: "Trip not found" });
      return;
    }
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to delete trip." });
  }
});

// ─── DELETE /api/trips ───────────────────────────────────────────────
router.delete("/", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await SavedTrip.deleteMany({ user_id: req.userId });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to clear trips." });
  }
});

export default router;
