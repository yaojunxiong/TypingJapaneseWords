import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import {
  COMFYUI_OUTPUT_DIR,
  LESSON_1_COMFYUI_OUTPUT_METADATA_PUBLIC_PATH,
  LESSON_1_COMFYUI_TEST_PUBLIC_PATH,
  LESSON_1_REMAKE_CLIP_PUBLIC_PATH,
  publicPathToDisk
} from "../src/lib/video-remake-comfyui";

const videoExtensions = new Set([".mp4", ".webm", ".mov"]);

async function findVideoFiles(folder: string): Promise<string[]> {
  const entries = await fs.readdir(folder, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(folder, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findVideoFiles(fullPath)));
    } else if (entry.isFile() && videoExtensions.has(path.extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }

  return files;
}

async function main() {
  if (!fsSync.existsSync(COMFYUI_OUTPUT_DIR)) {
    throw new Error(`ComfyUI output folder does not exist: ${COMFYUI_OUTPUT_DIR}`);
  }

  const videoFiles = await findVideoFiles(COMFYUI_OUTPUT_DIR);
  if (videoFiles.length === 0) {
    throw new Error(
      `No ComfyUI video output found in ${COMFYUI_OUTPUT_DIR}. Expected one of: .mp4, .webm, .mov`
    );
  }

  const newest = (
    await Promise.all(
      videoFiles.map(async (file) => ({
        file,
        stat: await fs.stat(file)
      }))
    )
  ).sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs)[0];

  const targetClipPath = publicPathToDisk(LESSON_1_REMAKE_CLIP_PUBLIC_PATH);
  const previewPath = publicPathToDisk(LESSON_1_COMFYUI_TEST_PUBLIC_PATH);
  const metadataPath = publicPathToDisk(LESSON_1_COMFYUI_OUTPUT_METADATA_PUBLIC_PATH);

  await fs.mkdir(path.dirname(targetClipPath), { recursive: true });
  await fs.mkdir(path.dirname(previewPath), { recursive: true });
  await fs.copyFile(newest.file, targetClipPath);
  await fs.copyFile(newest.file, previewPath);

  const metadata = {
    sourceOutputPath: newest.file,
    copiedAt: new Date().toISOString(),
    targetClipPath,
    targetClipPublicPath: LESSON_1_REMAKE_CLIP_PUBLIC_PATH,
    previewPath,
    previewPublicPath: LESSON_1_COMFYUI_TEST_PUBLIC_PATH,
    fileSize: newest.stat.size
  };

  await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2) + "\n");

  console.log(`Latest ComfyUI output: ${newest.file}`);
  console.log(`Copied remake clip to: ${targetClipPath}`);
  console.log(`Copied preview to: ${previewPath}`);
  console.log(`Metadata written to: ${metadataPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
