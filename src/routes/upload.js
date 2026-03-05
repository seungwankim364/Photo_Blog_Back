import express from 'express';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import multerS3 from 'multer-s3';
import multer from 'multer';
import { getDb } from '../db.js';
import { ObjectId } from 'mongodb';
import { requireAuth } from '../middleware/auth.js';
import path from 'path';

const router = express.Router();
const S3_BUCKET = process.env.S3_UPLOAD_BUCKET || 'photo-blog-s3-uploads-651914029420';
const SIGNED_URL_TTL_SECONDS = Number(process.env.S3_SIGNED_URL_TTL_SECONDS || 3600);
const USE_SIGNED_URLS = (process.env.S3_USE_SIGNED_URLS || 'true').toLowerCase() !== 'false';

const s3 = new S3Client({
  region: 'ap-northeast-2',
});

const upload = multer({
  storage: multerS3({
    s3,
    bucket: S3_BUCKET,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key(req, file, cb) {
      const ext = path.extname(file.originalname).toLowerCase();
      const randomStr = Math.random().toString(36).substring(2, 6);
      const key = `uploads/${Date.now()}-${randomStr}${ext}`;
      cb(null, key);
}

,
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image files are allowed.'));
      return;
    }
    cb(null, true);
  },
});

function normalizeUrls(value) {
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim());
  }
  if (typeof value === 'string' && value.trim()) {
    return [value.trim()];
  }
  return [];
}

async function buildPhotoResponse(photo) {
  const urls = normalizeUrls(photo.urls ?? photo.url ?? photo.path);

  if (USE_SIGNED_URLS && photo.s3Key) {
    try {
      const signedUrl = await getSignedUrl(
        s3,
        new GetObjectCommand({ Bucket: S3_BUCKET, Key: photo.s3Key }),
        { expiresIn: SIGNED_URL_TTL_SECONDS }
      );
      return { ...photo, urls: [signedUrl] };
    } catch (err) {
      console.error('Failed to generate signed URL:', err);
    }
  }

  return { ...photo, urls };
}

router.post('/', requireAuth, upload.single('image'), async (req, res) => {
  try {
    const db = await getDb();
    const { title = '', description = '', date = '' } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const photo = {
      urls: [req.file.location],
      s3Key: req.file.key,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      title,
      description,
      date,
      createdAt: new Date(),
      ownerId: req.user._id,
    };

    const result = await db.collection('photos').insertOne(photo);
    const responsePhoto = await buildPhotoResponse({ ...photo, _id: result.insertedId });

    res.status(200).json({
      message: 'Upload success',
      photo: responsePhoto,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/', requireAuth, async (req, res) => {
  try {
    const db = await getDb();
    const photos = await db
      .collection('photos')
      .find({ ownerId: req.user._id })
      .sort({ createdAt: -1 })
      .toArray();

    const hydratedPhotos = await Promise.all(photos.map((photo) => buildPhotoResponse(photo)));
    res.status(200).json(hydratedPhotos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    const db = await getDb();
    const photo = await db
      .collection('photos')
      .findOne({ _id: new ObjectId(id), ownerId: req.user._id });

    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    const hydratedPhoto = await buildPhotoResponse(photo);
    res.status(200).json(hydratedPhoto);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    const updateFields = {};
    if (title !== undefined) updateFields.title = title;
    if (description !== undefined) updateFields.description = description;

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateFields.updatedAt = new Date();

    const db = await getDb();
    const result = await db.collection('photos').updateOne(
      { _id: new ObjectId(id), ownerId: req.user._id },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    res.status(200).json({
      message: 'Update success',
      updated: updateFields,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    const db = await getDb();
    const result = await db
      .collection('photos')
      .deleteOne({ _id: new ObjectId(id), ownerId: req.user._id });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    res.status(200).json({ message: 'Delete success' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
