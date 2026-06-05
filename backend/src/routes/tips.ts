import { Router, Request, Response } from "express";
import { body, validationResult } from "express-validator";
import { v4 as uuidv4 } from "uuid";
import { TipCache } from "../db/models";
import { optionalAuth } from "../middleware/auth";

const router = Router();

// ─── POST /api/tips ──────────────────────────────────────────────────
router.post(
  "/",
  optionalAuth,
  [
    body("origin").trim().notEmpty(),
    body("destination").trim().notEmpty(),
    body("mode").isIn(["tourist-bus", "private", "flight"]),
    body("distanceKm").isFloat({ min: 0 }),
    body("durationMin").isFloat({ min: 0 }),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: errors.array()[0].msg });
      return;
    }

    const { origin, destination, mode, distanceKm, durationMin } = req.body;

    // Cache key
    const cacheKey = `${origin.toLowerCase()}|${destination.toLowerCase()}|${mode}`;

    try {
      // Try cache (24h)
      const cached = await TipCache.findOne({
        cache_key: cacheKey,
        expires_at: { $gt: Math.floor(Date.now() / 1000) },
      });

      if (cached) {
        res.json({ summary: cached.summary, tips: JSON.parse(cached.tips_json), cached: true });
        return;
      }

      // No Anthropic key configured
      const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
      if (!ANTHROPIC_KEY || ANTHROPIC_KEY.startsWith("sk-ant-your")) {
        res.status(503).json({
          error: "AI tips not configured on this server. Set ANTHROPIC_API_KEY in backend/.env",
        });
        return;
      }

      const h = Math.floor(durationMin / 60);
      const m = Math.round(durationMin % 60);
      const durationStr = h > 0 ? `${h}h ${m}min` : `${m}min`;
      const modeLabel = mode === "tourist-bus" ? "tourist bus" : mode === "flight" ? "domestic flight" : "private vehicle";

      const upstream = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: `You are a friendly Nepal travel expert who gives concise, practical, locally-informed travel tips.
Always respond ONLY with valid JSON matching this exact schema (no markdown, no preamble):
{
  "summary": "2-sentence engaging description of this journey",
  "tips": [
    { "category": "CategoryName", "tip": "Practical tip text" }
  ]
}
Generate exactly 6 tips. Categories must be chosen from: Food, Safety, Timing, Packing, Culture, Budget, Scenery, Transport.`,
          messages: [{
            role: "user",
            content: `Give me travel tips for a trip from ${origin} to ${destination} in Nepal.\nRoute details: ${distanceKm.toFixed(0)}km, approx ${durationStr} by ${modeLabel}.`,
          }],
        }),
      });

      if (!upstream.ok) {
        const err = await upstream.text();
        console.error("Anthropic error:", err);
        res.status(502).json({ error: "AI service error. Please try again." });
        return;
      }

      const data = await upstream.json() as any;
      const text = data.content?.find((b: any) => b.type === "text")?.text ?? "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);

      // Cache for 24h
      const expiresAt = Math.floor(Date.now() / 1000) + 24 * 60 * 60;
      await TipCache.findOneAndUpdate(
        { cache_key: cacheKey },
        {
          _id: uuidv4(),
          cache_key: cacheKey,
          summary: parsed.summary ?? "",
          tips_json: JSON.stringify(parsed.tips ?? []),
          expires_at: expiresAt,
          created_at: Math.floor(Date.now() / 1000),
        },
        { upsert: true, new: true }
      );

      res.json({ summary: parsed.summary, tips: parsed.tips, cached: false });
    } catch (err: any) {
      console.error("Tips generation error:", err);
      res.status(500).json({ error: err.message || "Failed to generate tips. Please try again." });
    }
  }
);

export default router;
