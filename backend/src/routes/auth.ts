import { Router, Request, Response } from "express";
import { body, validationResult } from "express-validator";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { User, RefreshToken, UserLog } from "../db/models";
import {
  signAccessToken,
  generateRefreshToken,
  hashToken,
  refreshExpiresAt,
} from "../lib/jwt";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

// ─── Helper ──────────────────────────────────────────────────────────
function formatUser(row: any) {
  return {
    id: row.id || row._id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    role: row.role,
    newsletter: Boolean(row.newsletter),
    avatar: `https://api.dicebear.com/8.x/thumbs/svg?seed=${encodeURIComponent(row.avatar_seed)}&backgroundColor=f59e0b`,
    joinedAt: row.created_at * 1000,
  };
}

// ─── POST /api/auth/register ─────────────────────────────────────────
router.post(
  "/register",
  [
    body("firstName").trim().notEmpty().withMessage("First name is required"),
    body("lastName").trim().notEmpty().withMessage("Last name is required"),
    body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
    body("password").isLength({ min: 8 }).withMessage("Password must be ≥ 8 chars"),
    body("role").optional().isString(),
    body("newsletter").optional().isBoolean(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: errors.array()[0].msg });
      return;
    }

    const { firstName, lastName, email, password, role = "solo-trekker", newsletter = true } = req.body;

    try {
      // Check duplicate email
      const existing = await User.findOne({ email });
      if (existing) {
        res.status(409).json({ error: "An account with this email already exists." });
        return;
      }

      const id = uuidv4();
      const passwordHash = await bcrypt.hash(password, 12);
      const avatarSeed = `${firstName} ${lastName}`;

      const newUser = new User({
        _id: id,
        first_name: firstName,
        last_name: lastName,
        email,
        password_hash: passwordHash,
        role,
        avatar_seed: avatarSeed,
        newsletter: newsletter ? 1 : 0,
      });
      await newUser.save();

      // Issue tokens
      const accessToken = signAccessToken({ sub: id, email });
      const refreshToken = generateRefreshToken();

      const newRefreshToken = new RefreshToken({
        _id: uuidv4(),
        user_id: id,
        token_hash: hashToken(refreshToken),
        expires_at: refreshExpiresAt(),
      });
      await newRefreshToken.save();

      // Log registration
      const signupLog = new UserLog({
        _id: uuidv4(),
        user_id: id,
        action: "register",
        details: `Account registered successfully for ${firstName} ${lastName}`,
        ip_address: req.ip || null,
      });
      await signupLog.save();

      res.status(201).json({
        user: formatUser(newUser),
        accessToken,
        refreshToken,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to register user." });
    }
  }
);

// ─── POST /api/auth/login ────────────────────────────────────────────
router.post(
  "/login",
  [
    body("email").isEmail().normalizeEmail(),
    body("password").notEmpty(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: "Invalid email or password." });
      return;
    }

    const { email, password } = req.body;

    try {
      const user = await User.findOne({ email });
      if (!user) {
        res.status(401).json({ error: "No account found with this email. Please sign up." });
        return;
      }

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        res.status(401).json({ error: "Incorrect password." });
        return;
      }

      const accessToken = signAccessToken({ sub: user._id, email: user.email });
      const refreshToken = generateRefreshToken();

      const newRefreshToken = new RefreshToken({
        _id: uuidv4(),
        user_id: user._id,
        token_hash: hashToken(refreshToken),
        expires_at: refreshExpiresAt(),
      });
      await newRefreshToken.save();

      // Log login
      const loginLog = new UserLog({
        _id: uuidv4(),
        user_id: user._id,
        action: "login",
        details: `User logged in successfully`,
        ip_address: req.ip || null,
      });
      await loginLog.save();

      res.json({
        user: formatUser(user),
        accessToken,
        refreshToken,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to login user." });
    }
  }
);

// ─── POST /api/auth/refresh ──────────────────────────────────────────
router.post("/refresh", async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    res.status(400).json({ error: "refreshToken is required" });
    return;
  }

  const tokenHash = hashToken(refreshToken);

  try {
    const stored = await RefreshToken.findOne({
      token_hash: tokenHash,
      expires_at: { $gt: Math.floor(Date.now() / 1000) },
    });

    if (!stored) {
      res.status(401).json({ error: "Refresh token invalid or expired. Please sign in again." });
      return;
    }

    const user = await User.findById(stored.user_id);
    if (!user) {
      res.status(401).json({ error: "User not found." });
      return;
    }

    // Rotate: delete old, issue new
    await RefreshToken.deleteOne({ _id: stored._id });

    const newAccessToken = signAccessToken({ sub: stored.user_id, email: user.email });
    const newRefreshTokenVal = generateRefreshToken();

    const newRefreshToken = new RefreshToken({
      _id: uuidv4(),
      user_id: stored.user_id,
      token_hash: hashToken(newRefreshTokenVal),
      expires_at: refreshExpiresAt(),
    });
    await newRefreshToken.save();

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshTokenVal });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to refresh token." });
  }
});

// ─── POST /api/auth/logout ───────────────────────────────────────────
router.post("/logout", async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body;
  try {
    if (refreshToken) {
      const tokenHash = hashToken(refreshToken);
      const stored = await RefreshToken.findOne({ token_hash: tokenHash });
      if (stored) {
        // Log logout
        const logoutLog = new UserLog({
          _id: uuidv4(),
          user_id: stored.user_id,
          action: "logout",
          details: `User logged out successfully`,
          ip_address: req.ip || null,
        });
        await logoutLog.save();
        await RefreshToken.deleteOne({ _id: stored._id });
      }
    }
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to logout user." });
  }
});

// ─── Google OAuth ───────────────────────────────────────────────────────
router.get(
  "/google",
  passport.authenticate("google", { scope: ["email", "profile"] })
);
router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: "/login" }),
  async (req: Request, res: Response) => {
    const user = (req as any).user;
    if (!user) {
      return res.redirect(`${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/login?error=oauth`);
    }
    const accessToken = signAccessToken({ sub: user.id, email: user.email });
    const refreshToken = generateRefreshToken();
    const newRefreshToken = new RefreshToken({
      _id: uuidv4(),
      user_id: user.id,
      token_hash: hashToken(refreshToken),
      expires_at: refreshExpiresAt(),
    });
    await newRefreshToken.save();
    const redirectUrl = `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/login?access=${accessToken}&refresh=${refreshToken}`;
    res.redirect(redirectUrl);
  }
);

// ─── Facebook OAuth ─────────────────────────────────────────────────────
router.get(
  "/facebook",
  passport.authenticate("facebook", { scope: ["email"] })
);
router.get(
  "/facebook/callback",
  passport.authenticate("facebook", { session: false, failureRedirect: "/login" }),
  async (req: Request, res: Response) => {
    const user = (req as any).user;
    if (!user) {
      return res.redirect(`${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/login?error=oauth`);
    }
    const accessToken = signAccessToken({ sub: user.id, email: user.email });
    const refreshToken = generateRefreshToken();
    const newRefreshToken = new RefreshToken({
      _id: uuidv4(),
      user_id: user.id,
      token_hash: hashToken(refreshToken),
      expires_at: refreshExpiresAt(),
    });
    await newRefreshToken.save();
    const redirectUrl = `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/login?access=${accessToken}&refresh=${refreshToken}`;
    res.redirect(redirectUrl);
  }
);


// ─── GET /api/auth/me ────────────────────────────────────────────────
router.get("/me", requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({ user: formatUser(user) });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch profile." });
  }
});

// ─── PATCH /api/auth/me ──────────────────────────────────────────────
router.patch(
  "/me",
  requireAuth,
  [
    body("firstName").optional().trim().notEmpty(),
    body("lastName").optional().trim().notEmpty(),
    body("email").optional().isEmail().normalizeEmail(),
    body("password").optional().isLength({ min: 8 }),
    body("role").optional().isString(),
    body("newsletter").optional().isBoolean(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: errors.array()[0].msg });
      return;
    }

    const { firstName, lastName, email, password, role, newsletter } = req.body;

    try {
      // Check email uniqueness if changing
      if (email) {
        const dup = await User.findOne({ email, _id: { $ne: req.userId } });
        if (dup) {
          res.status(409).json({ error: "Email already in use." });
          return;
        }
      }

      const user = await User.findById(req.userId);
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      user.updated_at = Math.floor(Date.now() / 1000);

      if (firstName) user.first_name = firstName;
      if (lastName)  user.last_name = lastName;
      if (email)     user.email = email;
      if (role)      user.role = role;
      if (newsletter !== undefined) user.newsletter = newsletter ? 1 : 0;

      if (password) {
        const hash = await bcrypt.hash(password, 12);
        user.password_hash = hash;
      }

      if (firstName || lastName) {
        const fn = firstName ?? user.first_name;
        const ln = lastName  ?? user.last_name;
        user.avatar_seed = `${fn} ${ln}`;
      }

      await user.save();
      res.json({ user: formatUser(user) });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to update profile." });
    }
  }
);

// ─── DELETE /api/auth/me ─────────────────────────────────────────────
router.delete("/me", requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await User.deleteOne({ _id: req.userId });
    await RefreshToken.deleteMany({ user_id: req.userId });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to delete user." });
  }
});

export default router;
