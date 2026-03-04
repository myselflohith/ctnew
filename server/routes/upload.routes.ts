import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { updateTalentProfile } from "../services/profile.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../../uploads/profile");
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

/**
 * Upload talent profile photo
 * POST /api/uploads/profile-photo
 */
router.post("/profile-photo", authenticateToken, upload.single("photo"), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    if (req.user.role !== "talent") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    const publicUrl = `/uploads/profile/${req.file.filename}`;

    const updated = await updateTalentProfile(req.user.id, { photo_url: publicUrl });

    res.json({ success: true, url: publicUrl, user: updated });
  } catch (error: any) {
    console.error("Profile photo upload error:", error);
    res.status(400).json({ error: error.message || "Failed to upload photo" });
  }
});

export default router;
