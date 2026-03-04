import { Router, Request, Response } from "express";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { updateTalentProfile } from "../services/profile.service.js";

const router = Router();

/**
 * Update current user's profile (talent for now)
 * PUT /api/profile
 */
router.put("/", authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    // Allow talent only (can expand later)
    if (req.user.role !== "talent") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const updated = await updateTalentProfile(req.user.id, req.body || {});
    res.json({ success: true, user: updated });
  } catch (error: any) {
    console.error("Update profile error:", error);
    res.status(400).json({ error: error.message || "Failed to update profile" });
  }
});

export default router;
