import crypto from "crypto";
import fs from "fs";
import multer, { type FileFilterCallback } from "multer";
import path from "path";

const MAX_BANNER_SIZE_BYTES = 2 * 1024 * 1024;
const HIVE_UPLOAD_DIR = path.resolve(process.cwd(), "uploads", "hives");
const POST_UPLOAD_DIR = path.resolve(process.cwd(), "uploads", "posts");

fs.mkdirSync(HIVE_UPLOAD_DIR, { recursive: true });
fs.mkdirSync(POST_UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, HIVE_UPLOAD_DIR);
  },
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const safeBase = path
      .basename(file.originalname, extension)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60);
    const uniqueSuffix = `${Date.now()}-${crypto.randomUUID()}`;

    callback(null, `${safeBase || "hive-banner"}-${uniqueSuffix}${extension}`);
  },
});

function imageOnlyFileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  callback: FileFilterCallback,
): void {
  if (file.mimetype.startsWith("image/")) {
    callback(null, true);
    return;
  }

  const badTypeError = new Error("Banner file must be an image.") as Error & {
    status?: number;
  };
  badTypeError.status = 400;
  callback(badTypeError);
}

export const uploadHiveBanner = multer({
  storage,
  fileFilter: imageOnlyFileFilter,
  limits: { fileSize: MAX_BANNER_SIZE_BYTES },
}).single("bannerImage");

const postStorage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, POST_UPLOAD_DIR);
  },
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const safeBase = path
      .basename(file.originalname, extension)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60);
    const uniqueSuffix = `${Date.now()}-${crypto.randomUUID()}`;

    callback(null, `${safeBase || "hive-post"}-${uniqueSuffix}${extension}`);
  },
});

export const uploadHivePostImage = multer({
  storage: postStorage,
  fileFilter: imageOnlyFileFilter,
  limits: { fileSize: MAX_BANNER_SIZE_BYTES },
}).single("image");
