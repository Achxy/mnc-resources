import { promises as fs } from "fs";
import path from "path";
import { createHash } from "crypto";
import { PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { createR2Client, R2_BUCKET } from "./r2-client.mjs";
import { loadIgnoreRules, createIsIgnored } from "./siteignore.mjs";

const PROJECT_ROOT = path.resolve(import.meta.dirname, "..");
const CONTENTS_DIR = path.join(PROJECT_ROOT, "contents");
const SITEIGNORE_PATH = path.join(CONTENTS_DIR, ".siteignore");

const MIME_TYPES = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  txt: "text/plain",
  csv: "text/csv",
  zip: "application/zip",
};

const getMimeType = (filePath) => {
  const ext = path.extname(filePath).slice(1).toLowerCase();
  return MIME_TYPES[ext] || "application/octet-stream";
};

const md5File = async (filePath) => {
  const data = await fs.readFile(filePath);
  return createHash("md5").update(data).digest("hex");
};

const getRemoteETag = async (client, key) => {
  try {
    const res = await client.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    // ETags from S3/R2 are quoted MD5 hashes
    return res.ETag?.replace(/"/g, "") || null;
  } catch (err) {
    if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) return null;
    throw err;
  }
};

const collectFiles = async (dir, relativeBase, isIgnored) => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = relativeBase ? `${relativeBase}/${entry.name}` : entry.name;

    if (isIgnored(relativePath, entry.isDirectory())) continue;

    if (entry.isDirectory() && !entry.isSymbolicLink()) {
      files.push(...(await collectFiles(fullPath, relativePath, isIgnored)));
    } else if (entry.isFile()) {
      files.push({ fullPath, key: relativePath });
    }
  }

  return files;
};

const sync = async () => {
  const stats = await fs.stat(CONTENTS_DIR).catch((err) => {
    if (err.code === "ENOENT") return null;
    throw err;
  });
  if (!stats || !stats.isDirectory()) {
    throw new Error("`contents` directory not found.");
  }

  const rules = await loadIgnoreRules(SITEIGNORE_PATH);
  const isIgnored = createIsIgnored(rules);
  const client = createR2Client();
  const files = await collectFiles(CONTENTS_DIR, "", isIgnored);

  console.log(`Found ${files.length} files to sync.`);

  let uploaded = 0;
  let skipped = 0;

  for (const { fullPath, key } of files) {
    const localHash = await md5File(fullPath);
    const remoteHash = await getRemoteETag(client, key);

    if (localHash === remoteHash) {
      skipped++;
      continue;
    }

    const body = await fs.readFile(fullPath);
    await client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: body,
        ContentType: getMimeType(fullPath),
        CacheControl: "public, max-age=86400",
      })
    );

    uploaded++;
    console.log(`Uploaded: ${key}`);
  }

  console.log(`\nSync complete. Uploaded: ${uploaded}, Skipped (unchanged): ${skipped}`);
};

sync().catch((err) => {
  console.error(err);
  process.exit(1);
});
