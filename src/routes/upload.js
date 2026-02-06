import express from "express";
import multer from "multer";
import path from "path";
import { getDb } from "../db.js";
import { ObjectId } from "mongodb";


const router = express.Router();

/* multer 설정 */
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, "uploads/");
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname);
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, filename);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter(req, file, cb) {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("이미지 파일만 업로드 가능"));
    }
    cb(null, true);
  },
});

/* POST /upload */
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const db = await getDb();

    if (!req.file) {
      return res.status(400).json({ error: "파일 없음" });
    }

    const photo = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype,
      createdAt: new Date(),
    };

    await db.collection("photos").insertOne(photo);

    res.status(200).json({
      message: "업로드 성공",
      photo,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const db = await getDb();

    const photos = await db
      .collection("photos")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json(photos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const updateFields = {};
    if (title !== undefined) updateFields.title = title;
    if (description !== undefined) updateFields.description = description;

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ error: "업데이트할 필드 없음" });
    }

    updateFields.updatedAt = new Date();

    const db = await getDb();

    const result = await db.collection("photos").updateOne(
      { _id: new ObjectId(id) },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "사진 없음" });
    }

    res.status(200).json({
      message: "업데이트 성공",
      updated: updateFields,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const updateFields = {};
    if (title !== undefined) updateFields.title = title;
    if (description !== undefined) updateFields.description = description;

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ error: "업데이트할 필드 없음" });
    }

    updateFields.updatedAt = new Date();

    const db = await getDb();

    const result = await db.collection("photos").updateOne(
      { _id: new ObjectId(id) },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "사진 없음" });
    }

    res.status(200).json({
      message: "업데이트 성공",
      updated: updateFields,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;

