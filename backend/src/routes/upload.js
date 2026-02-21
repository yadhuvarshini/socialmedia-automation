import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config.js';
import { requireAuth } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '../../uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const safe = Buffer.from(String(Date.now()) + Math.random().toString(36)).toString('base64url').slice(0, 12);
    cb(null, `post-${safe}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /^image\/(jpeg|jpg|png|gif|webp)$|^video\/(mp4|mov|avi|webm)$/i;
    if (allowed.test(file.mimetype)) cb(null, true);
    else cb(new Error('Invalid file type'), false);
  },
});

const router = express.Router();
router.use(requireAuth);

router.post('/', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const base = (config.uploadBaseUrl || '').trim();
    const url = base
      ? `${base.replace(/\/$/, '')}/${req.file.filename}`
      : `/uploads/${req.file.filename}`;
    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
