import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import ffmpegPath from "ffmpeg-static";
import {
  COMFYUI_OUTPUT_DIR,
  publicPathToDisk
} from "../src/lib/video-remake-comfyui";

const sceneId = process.argv[2];
const videoExtensions = new Set([".mp4", ".webm", ".mov"]);

function assertSceneId(value: string | undefined): asserts value is string {
  if (!value || !/^\d{3}$/.test(value)) {
    throw new Error("Please pass a scene id, for example: npm run pull:lesson1-comfyui-scene -- 001");
  }
}

function run(command: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with code ${code}`));
      }
    });
  });
}

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
  assertSceneId(sceneId);

  if (!ffmpegPath) {
    throw new Error("ffmpeg-static is unavailable. Please install dependencies first.");
  }
  if (!fsSync.existsSync(COMFYUI_OUTPUT_DIR)) {
    throw new Error(`ComfyUI output folder does not exist: ${COMFYUI_OUTPUT_DIR}`);
  }

  const videoFiles = await findVideoFiles(COMFYUI_OUTPUT_DIR);
  if (videoFiles.length === 0) {
    throw new Error(`No ComfyUI video output found in ${COMFYUI_OUTPUT_DIR}`);
  }

  const newest = (
    await Promise.all(videoFiles.map(async (file) => ({ file, stat: await fs.stat(file) })))
  ).sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs)[0];
  const referenceClipPath = publicPathToDisk(`/videos/source/everyones-japanese/lesson-1/clips/scene_${sceneId}.mp4`);
  const remakeClipPath = publicPathToDisk(
    `/videos/source/everyones-japanese/lesson-1/remake-clips/scene_${sceneId}_remake.mp4`
  );
  const previewPath = publicPathToDisk(
    `/videos/remake/everyones-japanese/lesson-1/scene-previews/scene_${sceneId}_comfyui-test.mp4`
  );
  const metadataPath = publicPathToDisk(
    `/videos/remake/everyones-japanese/lesson-1/scene-previews/scene_${sceneId}_metadata.json`
  );

  if (!fsSync.existsSync(referenceClipPath)) {
    throw new Error(`Reference scene clip does not exist: ${referenceClipPath}`);
  }

  await fs.mkdir(path.dirname(remakeClipPath), { recursive: true });
  await fs.mkdir(path.dirname(previewPath), { recursive: true });

  for (const targetPath of [remakeClipPath, previewPath]) {
    await run(ffmpegPath, [
      "-y",
      "-i",
      newest.file,
      "-vf",
      "crop=w='if(gt(a,16/9),ih*16/9,iw)':h='if(gt(a,16/9),ih,iw/(16/9))':x='(iw-ow)/2':y='(ih-oh)/2',scale=1920:1080,setsar=1,fps=30,format=yuv420p",
      "-an",
      "-c:v",
      "libx264",
      "-crf",
      "18",
      "-movflags",
      "+faststart",
      targetPath
    ]);
  }

  await fs.writeFile(
    metadataPath,
    `${JSON.stringify(
      {
        sceneId,
        sourceOutputPath: newest.file,
        copiedAt: new Date().toISOString(),
        targetClipPath: remakeClipPath,
        previewPath,
        fileSize: newest.stat.size
      },
      null,
      2
    )}\n`
  );

  console.log(`Latest ComfyUI output: ${newest.file}`);
  console.log(`Scene remake clip written to: ${remakeClipPath}`);
  console.log(`Scene preview written to: ${previewPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
