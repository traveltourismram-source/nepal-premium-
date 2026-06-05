import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { ItineraryCache } from '../db/models';
import { optionalAuth } from '../middleware/auth';

const router = Router();

// Simple static sample itinerary (used when no Anthropic key is set)
const sampleItinerary = {
  days: [
    { label: 'Day 1', location: 'Origin', activities: [{ time: '08:00', type: 'travel', description: 'Depart from Origin' }] },
    { label: 'Day 2', location: 'Destination', activities: [{ time: '09:00', type: 'sightseeing', description: 'Explore Destination' }] },
  ],
};

router.post(
  '/',
  optionalAuth,
  [
    body('origin').trim().notEmpty(),
    body('destination').trim().notEmpty(),
    body('mode').isIn(['tourist-bus', 'private', 'flight']),
    body('distanceKm').isFloat({ min: 0 }),
    body('durationMin').isFloat({ min: 0 }),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: errors.array()[0].msg });
      return;
    }

    const { origin, destination, mode, distanceKm, durationMin } = req.body;
    const cacheKey = `${origin.toLowerCase()}|${destination.toLowerCase()}|${mode}`;

    // Try cache (24h)
    const cached = await ItineraryCache.findOne({
      cache_key: cacheKey,
      expires_at: { $gt: Math.floor(Date.now() / 1000) },
    });
    if (cached) {
      res.json({ itinerary: JSON.parse(cached.itinerary_json), cached: true });
      return;
    }

    // No Anthropic key -> return static sample
    const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
    if (!ANTHROPIC_KEY || ANTHROPIC_KEY.startsWith('sk-ant-your')) {
      res.json({ itinerary: sampleItinerary, cached: false });
      return;
    }

    // Placeholder for future AI integration – currently respond with sample
    res.json({ itinerary: sampleItinerary, cached: false });
  }
);

export default router;
