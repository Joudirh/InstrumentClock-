import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "../lib/prisma";
import { ensureBucket, uploadFile } from "../lib/s3-client";

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

async function main() {
  await ensureBucket();

  const assetsDir = path.resolve("public/assets");
  const files = await readdir(assetsDir);

  for (const filename of files) {
    const body = await readFile(path.join(assetsDir, filename));
    const key = `flags/${filename}`;
    const mimeType = MIME_TYPES[path.extname(filename).toLowerCase()] ?? "application/octet-stream";

    await uploadFile(key, body, mimeType);
    await prisma.asset.upsert({
      where: { key },
      update: { filename, mimeType, size: body.byteLength },
      create: { key, filename, mimeType, size: body.byteLength },
    });

    console.log(`uploaded ${key}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
