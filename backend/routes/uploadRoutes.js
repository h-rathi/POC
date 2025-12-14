
import path from "path";
import express from "express";
import multer from "multer";
const router = express.Router();
import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";
import dotenv from "dotenv";
dotenv.config();


// Configure Cloudinary from env vars (recommended)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Use memory storage so multer keeps the file in memory (buffer)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const filetypes = /jpe?g|png|webp/;
  const mimetypes = /image\/jpe?g|image\/png|image\/webp/;

  const extname = path.extname(file.originalname).toLowerCase();
  const mimetype = file.mimetype;

  if (filetypes.test(extname) && mimetypes.test(mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Images only"), false);
  }
};

// Optionally limit file size (example: 5 MB)
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const uploadSingleImage = upload.single("image");

// helper to upload buffer to cloudinary using upload_stream
function uploadBufferToCloudinary(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}

router.post("/", (req, res) => {
  uploadSingleImage(req, res, async (err) => {
    if (err) {
      // multer error (file filter, size limit, etc.)
      return res.status(400).send({ message: err.message });
    }

    if (!req.file) {
      return res.status(400).send({ message: "No image file provided" });
    }

    try {
      // Customize folder/public_id/transformations as you like
      const publicId = `${req.file.fieldname}-${Date.now()}`;
      const uploadOptions = {
        folder: "uploads",         // optional: Cloudinary folder
        public_id: publicId,       // optional public id
        resource_type: "image",
        overwrite: false,
      };

      const result = await uploadBufferToCloudinary(req.file.buffer, uploadOptions);

      // result contains secure_url, public_id, width, height, etc.
      res.status(200).send({
        message: "Image uploaded successfully",
        image: result.secure_url,
        public_id: result.public_id,
        raw: result, // optional: remove if you don't want to expose entire response
      });
    } catch (uploadErr) {
      console.error("Cloudinary upload error:", uploadErr);
      res.status(500).send({
        message: "Cloudinary upload failed",
        error: uploadErr.message || uploadErr,
      });
    }
  });
});

export default router;
