import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import ffmpegPath from "ffmpeg-static";
import {
  COMFYUI_API_WORKFLOW_PUBLIC_PATH,
  COMFYUI_CHECKPOINT_MODEL_NAME,
  COMFYUI_INPUT_DIR,
  COMFYUI_LESSON_1_PROMPT,
  COMFYUI_LTX_WORKFLOW_PATH,
  COMFYUI_NEGATIVE_PROMPT,
  COMFYUI_PATCHED_WORKFLOW_PUBLIC_PATH,
  COMFYUI_URL,
  LESSON_1_COMFYUI_INPUTS_PATH,
  publicPathToDisk
} from "../src/lib/video-remake-comfyui";

type SceneAsset = {
  sceneId: string;
  clipPath: string;
  inputImageName: string;
  inputImageProjectPath: string;
  inputImageComfyuiPath: string;
  patchedWorkflowPath: string;
  apiWorkflowPath: string | null;
  middleTime: number;
  duration: number;
};

const clipsDir = publicPathToDisk("/videos/source/everyones-japanese/lesson-1/clips");
const sceneInputsDir = publicPathToDisk(`${LESSON_1_COMFYUI_INPUTS_PATH}/scenes`);
const manifestPath = path.join(sceneInputsDir, "scene-assets.json");
const imageFilePattern = /\.(png|jpe?g|webp|bmp)$/i;
const negativePromptPattern = /(low quality|worst quality|deformed|distorted|disfigured|bad anatomy)/i;
const sceneryPromptPattern =
  /(beautiful|scenery|nature|glass bottle|purple galaxy|red fox|snow|landscape|russet coat|winter air)/i;

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

function findCommand(command: string) {
  const candidates = [
    command,
    `/opt/homebrew/bin/${command}`,
    `/usr/local/bin/${command}`,
    `/usr/bin/${command}`
  ];

  return candidates.find((candidate) => fsSync.existsSync(candidate) || candidate === command) ?? command;
}

async function probeDuration(filePath: string) {
  const output = await run(
    findCommand("ffprobe"),
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      filePath
    ],
    { capture: true }
  );
  const duration = Number(output.trim());

  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error(`Could not read duration from ${filePath}`);
  }

  return duration;
}

function checkpointNameFor(value: string) {
  return value.includes("/")
    ? value.replace(/ltx-video[^/"'\\]*?\.safetensors/gi, COMFYUI_CHECKPOINT_MODEL_NAME)
    : COMFYUI_CHECKPOINT_MODEL_NAME;
}

function isApiPrompt(workflow: unknown): workflow is Record<string, { class_type: string; inputs: Record<string, unknown>; _meta?: { title?: string } }> {
  if (!workflow || typeof workflow !== "object" || Array.isArray(workflow)) {
    return false;
  }

  const nodes = Object.values(workflow as Record<string, unknown>);
  return (
    nodes.length > 0 &&
    nodes.every(
      (node) =>
        node &&
        typeof node === "object" &&
        !Array.isArray(node) &&
        typeof (node as Record<string, unknown>).class_type === "string" &&
        typeof (node as Record<string, unknown>).inputs === "object"
    )
  );
}

function patchWorkflowForScene(workflow: unknown, imageName: string) {
  function walk(value: unknown, parentKey = ""): unknown {
    if (typeof value === "string") {
      if (/ltx-video[^/"'\\]*?\.safetensors/i.test(value)) {
        return checkpointNameFor(value);
      }

      if ((/image|filename/.test(parentKey.toLowerCase()) || imageFilePattern.test(value)) && imageFilePattern.test(value)) {
        return imageName;
      }

      if (/prompt|text/.test(parentKey.toLowerCase())) {
        if (negativePromptPattern.test(value)) {
          return COMFYUI_NEGATIVE_PROMPT;
        }
        if (sceneryPromptPattern.test(value)) {
          return COMFYUI_LESSON_1_PROMPT;
        }
      }

      return value;
    }

    if (Array.isArray(value)) {
      return value.map((item, index) => walk(item, String(index)));
    }

    if (value && typeof value === "object") {
      const next: Record<string, unknown> = {};
      for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
        next[key] = walk(item, key);
      }
      return next;
    }

    return value;
  }

  const patched = walk(workflow);

  if (isApiPrompt(patched)) {
    for (const node of Object.values(patched)) {
      const label = `${node.class_type} ${node._meta?.title ?? ""}`.toLowerCase();

      if (node.class_type === "LoadImage" && typeof node.inputs.image === "string") {
        node.inputs.image = imageName;
      }

      if (/checkpoint|ckpt|model/.test(label)) {
        for (const key of ["ckpt_name", "model_name", "checkpoint"]) {
          if (typeof node.inputs[key] === "string" && /ltx-video/i.test(node.inputs[key])) {
            node.inputs[key] = checkpointNameFor(node.inputs[key]);
          }
        }
      }

      if (node.class_type === "CLIPTextEncode" && typeof node.inputs.text === "string") {
        node.inputs.text = /negative/.test(label) ? COMFYUI_NEGATIVE_PROMPT : COMFYUI_LESSON_1_PROMPT;
      }
    }
  }

  return patched;
}

async function extractMiddleFrame(clipPath: string, targetPath: string, timestamp: number) {
  if (!ffmpegPath) {
    throw new Error("ffmpeg-static is unavailable. Please install dependencies first.");
  }

  await run(ffmpegPath, [
    "-y",
    "-ss",
    timestamp.toFixed(3),
    "-i",
    clipPath,
    "-frames:v",
    "1",
    "-vf",
    "scale=768:-2",
    targetPath
  ]);
}

async function main() {
  if (!fsSync.existsSync(clipsDir)) {
    throw new Error(`Lesson 1 clips folder does not exist: ${clipsDir}`);
  }
  if (!fsSync.existsSync(COMFYUI_LTX_WORKFLOW_PATH)) {
    throw new Error(`ComfyUI workflow template does not exist: ${COMFYUI_LTX_WORKFLOW_PATH}`);
  }

  await fs.mkdir(sceneInputsDir, { recursive: true });
  await fs.mkdir(COMFYUI_INPUT_DIR, { recursive: true });

  const clipNames = (await fs.readdir(clipsDir))
    .filter((name) => /^scene_\d{3}\.mp4$/.test(name))
    .sort();

  if (clipNames.length === 0) {
    throw new Error(`No scene_XXX.mp4 clips found in ${clipsDir}`);
  }

  const uiWorkflowSourcePath = fsSync.existsSync(publicPathToDisk(COMFYUI_PATCHED_WORKFLOW_PUBLIC_PATH))
    ? publicPathToDisk(COMFYUI_PATCHED_WORKFLOW_PUBLIC_PATH)
    : COMFYUI_LTX_WORKFLOW_PATH;
  const uiWorkflow = JSON.parse(await fs.readFile(uiWorkflowSourcePath, "utf8")) as unknown;
  const apiWorkflowSourcePath = publicPathToDisk(COMFYUI_API_WORKFLOW_PUBLIC_PATH);
  const apiWorkflow = fsSync.existsSync(apiWorkflowSourcePath)
    ? (JSON.parse(await fs.readFile(apiWorkflowSourcePath, "utf8")) as unknown)
    : null;
  const assets: SceneAsset[] = [];

  for (const clipName of clipNames) {
    const sceneId = clipName.match(/^scene_(\d{3})\.mp4$/)?.[1];
    if (!sceneId) {
      continue;
    }

    const clipPath = path.join(clipsDir, clipName);
    const duration = await probeDuration(clipPath);
    const middleTime = Math.max(0.1, duration / 2);
    const inputImageName = `lesson1_scene_${sceneId}_middle_frame.png`;
    const inputImageProjectPath = path.join(sceneInputsDir, inputImageName);
    const inputImageComfyuiPath = path.join(COMFYUI_INPUT_DIR, inputImageName);
    const patchedWorkflowPath = path.join(sceneInputsDir, `lesson1_scene_${sceneId}_ltxv_patched.json`);
    const apiWorkflowPath = apiWorkflow ? path.join(sceneInputsDir, `lesson1_scene_${sceneId}_api_workflow.json`) : null;

    await extractMiddleFrame(clipPath, inputImageProjectPath, middleTime);
    await fs.copyFile(inputImageProjectPath, inputImageComfyuiPath);
    await fs.writeFile(
      patchedWorkflowPath,
      `${JSON.stringify(patchWorkflowForScene(uiWorkflow, inputImageName), null, 2)}\n`
    );

    if (apiWorkflowPath && apiWorkflow) {
      await fs.writeFile(
        apiWorkflowPath,
        `${JSON.stringify(patchWorkflowForScene(apiWorkflow, inputImageName), null, 2)}\n`
      );
    }

    assets.push({
      sceneId,
      clipPath,
      inputImageName,
      inputImageProjectPath,
      inputImageComfyuiPath,
      patchedWorkflowPath,
      apiWorkflowPath,
      middleTime,
      duration
    });
  }

  await fs.writeFile(
    manifestPath,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        comfyuiUrl: COMFYUI_URL,
        sceneCount: assets.length,
        sourceClipsDir: clipsDir,
        sceneInputsDir,
        assets
      },
      null,
      2
    )}\n`
  );

  console.log(`Prepared ${assets.length} Lesson 1 scene ComfyUI inputs.`);
  console.log(`Scene input folder: ${sceneInputsDir}`);
  console.log(`ComfyUI input folder: ${COMFYUI_INPUT_DIR}`);
  console.log(`Manifest written to: ${manifestPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
