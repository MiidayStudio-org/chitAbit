import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { requireAuth } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = path.resolve(__dirname, '../../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Allowed file types, checked by BOTH extension and MIME type.
// No .svg / .html / .htm / .xml: browsers can run scripts inside them (stored XSS).
const ALLOWED_TYPES: Record<string, string[]> = {
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.png': ['image/png'],
  '.gif': ['image/gif'],
  '.webp': ['image/webp'],
  '.pdf': ['application/pdf'],
  '.txt': ['text/plain'],
  '.md': ['text/markdown', 'text/plain', 'text/x-markdown'],
  '.json': ['application/json', 'text/plain'],
  '.js': ['text/javascript', 'application/javascript', 'text/plain'],
  '.ts': ['text/typescript', 'video/mp2t', 'application/typescript', 'text/plain'],
  '.py': ['text/x-python', 'text/x-script.python', 'application/x-python-code', 'text/plain'],
  '.css': ['text/css', 'text/plain'],
  '.csv': ['text/csv', 'text/plain'],
  '.log': ['text/plain'],
  '.zip': ['application/zip', 'application/x-zip-compressed'],
};

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);

function getSafeExtension(originalName: string): string {
  return path.extname(originalName).toLowerCase();
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    // Random name + vetted extension; the user's original filename never touches the disk path
    const unique = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${getSafeExtension(file.originalname)}`;
    cb(null, unique);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ALLOWED_TYPES[getSafeExtension(file.originalname)];
    if (allowedMimes && allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Allowed: images (jpg, png, gif, webp), pdf, zip, and text/code files up to 5MB.'));
    }
  },
});

const router = Router();

router.post('/', requireAuth, (req: Request, res: Response): void => {
  upload.single('file')(req, res, (err: any) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({ error: 'File size exceeds 5 MB limit' });
        return;
      }
      res.status(400).json({ error: err?.message || 'File upload failed' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const isImage = IMAGE_EXTENSIONS.has(getSafeExtension(req.file.originalname));

    res.json({
      url: `/uploads/${req.file.filename}`,
      name: req.file.originalname.slice(0, 255),
      size: req.file.size,
      type: isImage ? 'image' : 'file',
      mimetype: req.file.mimetype,
    });
  });
});

export default router;
