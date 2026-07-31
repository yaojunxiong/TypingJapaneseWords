import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import ffmpegPath from "ffmpeg-static";
import {
  COMFYUI_LTX_WORKFLOW_PATH,
  COMFYUI_OUTPUT_HINT,
  LESSON_1_COMFYUI_INPUTS_PATH,
  LESSON_1_SOURCE_VIDEO_PATH,
  publicPathToDisk
} from "../src/lib/video-remake-comfyui";

const frames = [
  { timestamp: "00:00:03", filename: "first_frame.png", label: "first" },
  { timestamp: "00:00:10", filename: "middle_frame.png", label: "middle" },
  { timestamp: "00:00:20", filename: "later_frame.png", label: "later" }
];

function run(command: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

async function main() {
  if (!ffmpegPath || !fsSync.existsSync(ffmpegPath)) {
    throw new Error(
      "ffmpeg executable was not found. Run `npm install` first, or install ffmpeg and update this script."
    );
  }

  const sourceVideo = publicPathToDisk(LESSON_1_SOURCE_VIDEO_PATH);
  if (!fsSync.existsSync(sourceVideo)) {
    throw new Error(`Lesson 1 source video was not found: ${sourceVideo}`);
  }

  const outputFolder = publicPathToDisk(LESSON_1_COMFYUI_INPUTS_PATH);
  await fs.mkdir(outputFolder, { recursive: true });

  for (const frame of frames) {
    await run(ffmpegPath, [
      "-y",
      "-ss",
      frame.timestamp,
      "-i",
      sourceVideo,
      "-frames:v",
      "1",
      "-update",
      "1",
      path.join(outputFolder, frame.filename)
    ]);
  }

  const metadata = {
    sourceVideo: LESSON_1_SOURCE_VIDEO_PATH,
    generatedAt: new Date().toISOString(),
    frames: frames.map((frame) => ({
      ...frame,
      relativePath: `${LESSON_1_COMFYUI_INPUTS_PATH}/${frame.filename}`,
      absolutePath: path.join(outputFolder, frame.filename)
    })),
    recommendedFrame: "middle_frame.png",
    comfyuiWorkflowPath: COMFYUI_LTX_WORKFLOW_PATH,
    comfyuiInputFolderAbsPath: outputFolder,
    comfyuiOutputHint: COMFYUI_OUTPUT_HINT
  };

  await fs.writeFile(
    path.join(outputFolder, "metadata.json"),
    JSON.stringify(metadata, null, 2) + "\n"
  );

  console.log(`ComfyUI lesson 1 inputs written to ${outputFolder}`);
  console.log("Recommended frame: middle_frame.png");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
