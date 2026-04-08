import { Router, type Request, type Response, type NextFunction } from 'express';
import multer, { type FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import type { UploadType } from '../types/index.js';

const router = Router();

// Ensure upload directory exists
const uploadPath = process.env.UPLOAD_PATH || './tmp/uploads';
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

// Configure multer
const storage = multer.diskStorage({
  destination: (
    _req: Request,
    _file: Express.Multer.File,
    cb: (error: Error | null, destination: string) => void
  ) => {
    cb(null, uploadPath);
  },
  filename: (
    _req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, filename: string) => void
  ) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  },
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback): void => {
  const type = (req.body.type || req.query.type) as UploadType | undefined;
  const mimetype = file.mimetype;

  // Allowed types based on upload type
  const allowedTypes: Record<UploadType, string[]> = {
    profile: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    presentation: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm'],
  };

  const allowed = allowedTypes[type || 'presentation'];

  if (allowed.includes(mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed: ${allowed.join(', ')}`));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800', 10), // 50MB default
  },
});

// Upload file
router.post('/', upload.single('file'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const mimetype = req.file.mimetype;
    let mediaType: 'image' | 'video' = 'image';
    if (mimetype.startsWith('video/')) {
      mediaType = 'video';
    }

    res.json({
      path: `/uploads/${req.file.filename}`,
      media_type: mediaType,
      original_name: req.file.originalname,
      size: req.file.size,
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Error handler for multer
router.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 50MB.' });
    }
    return res.status(400).json({ error: error.message });
  }
  if (error) {
    return res.status(400).json({ error: error.message });
  }
  next();
});

export default router;
