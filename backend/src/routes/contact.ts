import { Router, Request, Response } from "express";
import { body, validationResult } from "express-validator";
import { v4 as uuidv4 } from "uuid";
import { ContactRequest } from "../db/models";

const router = Router();

// ─── POST /api/contact ───────────────────────────────────────────────
router.post(
  "/",
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
    body("type").optional().isIn(["general", "hotel", "agency", "ad", "guide"]),
    body("message").trim().isLength({ min: 10, max: 3000 }).withMessage("Message must be 10–3000 chars"),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: errors.array()[0].msg });
      return;
    }

    const { name, email, type = "general", message } = req.body;

    try {
      const newRequest = new ContactRequest({
        _id: uuidv4(),
        name,
        email,
        type,
        message,
      });
      await newRequest.save();

      res.status(201).json({ ok: true, message: "Message received. We'll get back to you within 24 hours." });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to submit message." });
    }
  }
);

export default router;
