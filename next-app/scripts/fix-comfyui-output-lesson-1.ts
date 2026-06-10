import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import ffmpegPath from "ffmpeg-static";
import {
  LESSON_1_COMFYUI_TEST_PUBLIC_PATH,
  LESSON_1_REMAKE_CLIP_PUBLIC_PATH,
  publicPathToDisk
} from "../src/lib/video-remake-comfyui";

type VideoInfo = {
  width: number;
  height: number;
  duration?: number;
};

type FixedFileReport = {
  label: string;
  path: string;
  before: VideoInfo;
  after: VideoInfo;
};

const referenceScenePath = publicPathToDisk(
  "/videos/source/everyones-japanese/lesson-1/clips/scene_001.mp4"
);
const fixReportPath = publicPathToDisk(
  "/videos/remake/everyones-japanese/lesson-1/comfyui-output-fix-report.json"
);
const targets = [
  {
    label: "ComfyUI test preview",
    path: publicPathToDisk(LESSON_1_COMFYUI_TEST_PUBLIC_PATH)
  },
  {
    label: "scene_001 remake clip",
    path: publicPathToDisk(LESSON_1_REMAKE_CLIP_PUBLIC_PATH)
  }
];

function findCommand(command: string) {
  const candidates = [
    command,
    `/opt/homebrew/bin/${command}`,
    `/usr/local/bin/${command}`,
    `/usr/bin/${command}`
  ];

  return candidates.find((candidate) => fsSync.existsSync(candidate) || candidate === command) ?? command;
}

function run(command: string, args: string[], options: { capture?: boolean } = {}) {
  return new Promise<string>((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    const child = spawn(command, args, {
      stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit"
    });

    if (options.capture) {
      child.stdout?.on("data", (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr?.on("data", (chunk) => {
        stderr += chunk.toString();
      });
    }

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`${command} exited with code ${code}${stderr ? `\n${stderr}` : ""}`));
      }
    });
  });
}

async function probeVideo(filePath: string): Promise<VideoInfo> {
  const ffprobePath = findCommand("ffprobe");
  const output = await run(
    ffprobePath,
    [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=width,height,duration",
      "-of",
      "json",
      filePath
    ],
    { capture: true }
  );
  const parsed = JSON.parse(output) as {
    streams?: Array<{ width?: number; height?: number; duration?: string }>;
  };
  const stream = parsed.streams?.[0];

  if (!stream?.width || !stream?.height) {
    throw new Error(`Could not read video dimensions from ${filePath}`);
  }

  return {
    width: stream.width,
    height: stream.height,
    duration: stream.duration ? Number(stream.duration) : undefined
  };
}

async function fixVideo(filePath: string, label: string, target: VideoInfo): Promise<FixedFileReport> {
  if (!ffmpegPath) {
    throw new Error("ffmpeg-static is unavailable. Please install dependencies first.");
  }

  if (!fsSync.existsSync(filePath)) {
    throw new Error(`Missing ${label}: ${filePath}`);
  }

  const before = await probeVideo(filePath);
  const targetAspect = target.width / target.height;
  const filter = [
    `crop=w='if(gt(a,${targetAspect}),ih*${targetAspect},iw)':h='if(gt(a,${targetAspect}),ih,iw/${targetAspect})':x='(iw-ow)/2':y='(ih-oh)/2'`,
    `scale=${target.width}:${target.height}`,
    "setsar=1",
    "fps=30",
    "format=yuv420p"
  ].join(",");
  const tempPath = filePath.replace(/\.mp4$/i, ".fixed.mp4");

  await run(ffmpegPath, [
    "-y",
    "-i",
    filePath,
    "-vf",
    filter,
    "-an",
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "18",
    "-movflags",
    "+faststart",
    tempPath
  ]);
  await fs.rename(tempPath, filePath);

  const after = await probeVideo(filePath);
  return { label, path: filePath, before, after };
}

async function main() {
  if (!fsSync.existsSync(referenceScenePath)) {
    throw new Error(`Missing reference scene for aspect/size matching: ${referenceScenePath}`);
  }

  const target = await probeVideo(referenceScenePath);
  const fixedFiles: FixedFileReport[] = [];

  for (const targetFile of targets) {
    fixedFiles.push(await fixVideo(targetFile.path, targetFile.label, target));
  }

  const report = {
    generatedAt: new Date().toISOString(),
    strategy: "center-crop to source scene aspect, then scale to source scene resolution",
    referenceScenePath,
    targetResolution: {
      width: target.width,
      height: target.height
    },
    fixedFiles
  };

  await fs.mkdir(path.dirname(fixReportPath), { recursive: true });
  await fs.writeFile(fixReportPath, `${JSON.stringify(report, null, 2)}\n`);

  console.log(`Reference scene: ${referenceScenePath}`);
  console.log(`Target resolution: ${target.width}x${target.height}`);
  for (const fixed of fixedFiles) {
    console.log(
      `${fixed.label}: ${fixed.before.width}x${fixed.before.height} -> ${fixed.after.width}x${fixed.after.height}`
    );
  }
  console.log(`Fix report written to: ${fixReportPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
