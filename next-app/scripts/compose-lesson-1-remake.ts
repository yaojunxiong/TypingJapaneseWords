import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import ffmpegPath from "ffmpeg-static";
import {
  LESSON_1_FINAL_REMAKE_PUBLIC_PATH,
  publicPathToDisk
} from "../src/lib/video-remake-comfyui";

type SceneClip = {
  index: number;
  start: number;
  end: number;
  duration: number;
  clipPath: string;
  aiRemakePath?: string;
};

const scenesPath = publicPathToDisk("/videos/source/everyones-japanese/lesson-1/scenes.json");
const audioPath = publicPathToDisk("/videos/source/everyones-japanese/lesson-1/audio.mp3");
const fullRemakePath = publicPathToDisk(
  "/videos/source/everyones-japanese/lesson-1/full-remake/conversation_remake.mp4"
);
const outputPath = publicPathToDisk(LESSON_1_FINAL_REMAKE_PUBLIC_PATH);

function sceneRemakePublicPath(scene: SceneClip) {
  return `/videos/source/everyones-japanese/lesson-1/remake-clips/scene_${String(
    scene.index
  ).padStart(3, "0")}_remake.mp4`;
}

function pickClip(scene: SceneClip) {
  const conventionalPath = sceneRemakePublicPath(scene);
  if (fsSync.existsSync(publicPathToDisk(conventionalPath))) {
    return conventionalPath;
  }

  if (scene.aiRemakePath && fsSync.existsSync(publicPathToDisk(scene.aiRemakePath))) {
    return scene.aiRemakePath;
  }

  return scene.clipPath;
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

function assertExists(filePath: string, label: string) {
  if (!fsSync.existsSync(filePath)) {
    throw new Error(`Missing ${label}: ${filePath}`);
  }
}

async function main() {
  if (!ffmpegPath) {
    throw new Error("ffmpeg-static is unavailable. Please install dependencies first.");
  }

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  assertExists(audioPath, "lesson 1 original audio");

  if (fsSync.existsSync(fullRemakePath)) {
    console.log("Composing lesson 1 remake from full conversation_remake.mp4.");
    await run(ffmpegPath, [
      "-y",
      "-i",
      fullRemakePath,
      "-i",
      audioPath,
      "-map",
      "0:v",
      "-map",
      "1:a",
      "-vf",
      "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,format=yuv420p",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-shortest",
      outputPath
    ]);

    console.log(`Final remake video written to ${outputPath}`);
    return;
  }

  assertExists(scenesPath, "lesson 1 scenes.json");
  const scenes = JSON.parse(await fs.readFile(scenesPath, "utf8")) as SceneClip[];
  if (scenes.length === 0) {
    throw new Error("scenes.json is empty");
  }

  const selectedClips = scenes
    .sort((a, b) => a.index - b.index)
    .map((scene) => ({
      scene,
      publicPath: pickClip(scene)
    }));

  selectedClips.forEach(({ scene, publicPath }) => {
    assertExists(publicPathToDisk(publicPath), `scene_${String(scene.index).padStart(3, "0")} clip`);
  });

  const inputArgs = selectedClips.flatMap(({ publicPath }) => ["-i", publicPathToDisk(publicPath)]);
  const audioInputIndex = selectedClips.length;
  const filterParts = selectedClips.map(
    (_, index) =>
      `[${index}:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,fps=30,setsar=1,format=yuv420p[v${index}]`
  );
  const concatInputs = selectedClips.map((_, index) => `[v${index}]`).join("");
  const filterComplex = `${filterParts.join(";")};${concatInputs}concat=n=${
    selectedClips.length
  }:v=1:a=0[v]`;

  console.log("Composing lesson 1 remake with clips:");
  selectedClips.forEach(({ scene, publicPath }) => {
    console.log(`- scene_${String(scene.index).padStart(3, "0")}: ${publicPath}`);
  });

  await run(ffmpegPath, [
    "-y",
    ...inputArgs,
    "-i",
    audioPath,
    "-filter_complex",
    filterComplex,
    "-map",
    "[v]",
    "-map",
    `${audioInputIndex}:a`,
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-shortest",
    outputPath
  ]);

  console.log(`Final remake video written to ${outputPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
