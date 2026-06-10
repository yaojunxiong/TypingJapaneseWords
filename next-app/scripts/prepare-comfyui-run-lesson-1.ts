import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import {
  COMFYUI_CHECKPOINT_MODEL_NAME,
  COMFYUI_COPIED_INPUT_IMAGE_PATH,
  COMFYUI_INPUT_DIR,
  COMFYUI_INPUT_IMAGE_NAME,
  COMFYUI_LESSON_1_PROMPT,
  COMFYUI_LTX_WORKFLOW_PATH,
  COMFYUI_MODEL_PATHS,
  COMFYUI_OUTPUT_DIR,
  COMFYUI_PATCH_REPORT_PUBLIC_PATH,
  COMFYUI_PATCHED_WORKFLOW_PUBLIC_PATH,
  COMFYUI_RECOMMENDED_FRAME_PUBLIC_PATH,
  COMFYUI_RECOMMENDED_PARAMS,
  COMFYUI_RUN_INSTRUCTIONS_PUBLIC_PATH,
  COMFYUI_URL,
  COMFYUI_WORKFLOW_COPIED_PUBLIC_PATH,
  LESSON_1_COMFYUI_INPUTS_PATH,
  publicPathToDisk
} from "../src/lib/video-remake-comfyui";

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

async function ensureRecommendedFrame() {
  const framePath = publicPathToDisk(COMFYUI_RECOMMENDED_FRAME_PUBLIC_PATH);
  if (fsSync.existsSync(framePath)) {
    return framePath;
  }

  console.log("middle_frame.png was not found. Generating lesson 1 ComfyUI inputs first...");
  await run("npm", ["run", "prepare:lesson1-comfyui"]);

  if (!fsSync.existsSync(framePath)) {
    throw new Error(`Failed to generate recommended input frame: ${framePath}`);
  }

  return framePath;
}

async function main() {
  const missingModels = COMFYUI_MODEL_PATHS.filter((model) => !fsSync.existsSync(model.path));
  if (missingModels.length > 0) {
    throw new Error(
      [
        "ComfyUI model files are missing:",
        ...missingModels.map((model) => `- ${model.label}: ${model.path}`),
        "Please place the model files in the listed ComfyUI model folders before running this script."
      ].join("\n")
    );
  }

  if (!fsSync.existsSync(COMFYUI_LTX_WORKFLOW_PATH)) {
    throw new Error(`ComfyUI LTX workflow template was not found: ${COMFYUI_LTX_WORKFLOW_PATH}`);
  }

  const recommendedFramePath = await ensureRecommendedFrame();
  const helperFolderPath = publicPathToDisk(LESSON_1_COMFYUI_INPUTS_PATH);
  const copiedWorkflowPath = publicPathToDisk(COMFYUI_WORKFLOW_COPIED_PUBLIC_PATH);
  const patchedWorkflowPath = publicPathToDisk(COMFYUI_PATCHED_WORKFLOW_PUBLIC_PATH);
  const patchReportPath = publicPathToDisk(COMFYUI_PATCH_REPORT_PUBLIC_PATH);
  const runInstructionsPath = publicPathToDisk(COMFYUI_RUN_INSTRUCTIONS_PUBLIC_PATH);

  await fs.mkdir(COMFYUI_INPUT_DIR, { recursive: true });
  await fs.mkdir(helperFolderPath, { recursive: true });
  await fs.copyFile(recommendedFramePath, COMFYUI_COPIED_INPUT_IMAGE_PATH);
  await fs.copyFile(COMFYUI_LTX_WORKFLOW_PATH, copiedWorkflowPath);
  await run("npm", ["run", "patch:lesson1-comfyui-workflow"]);

  const runInstructions = {
    comfyuiUrl: COMFYUI_URL,
    workflowSourcePath: COMFYUI_LTX_WORKFLOW_PATH,
    workflowCopiedPath: copiedWorkflowPath,
    workflowCopiedPublicPath: COMFYUI_WORKFLOW_COPIED_PUBLIC_PATH,
    patchedWorkflowPath,
    patchedWorkflowPublicPath: COMFYUI_PATCHED_WORKFLOW_PUBLIC_PATH,
    patchReportPath,
    patchReportPublicPath: COMFYUI_PATCH_REPORT_PUBLIC_PATH,
    inputImageProjectPath: recommendedFramePath,
    inputImageProjectPublicPath: COMFYUI_RECOMMENDED_FRAME_PUBLIC_PATH,
    inputImageComfyuiPath: COMFYUI_COPIED_INPUT_IMAGE_PATH,
    checkpointModelName: COMFYUI_CHECKPOINT_MODEL_NAME,
    inputImageName: COMFYUI_INPUT_IMAGE_NAME,
    prompt: COMFYUI_LESSON_1_PROMPT,
    outputFolder: COMFYUI_OUTPUT_DIR,
    recommendedPrompt: COMFYUI_LESSON_1_PROMPT,
    recommendedParams: COMFYUI_RECOMMENDED_PARAMS,
    generatedAt: new Date().toISOString()
  };

  await fs.writeFile(runInstructionsPath, JSON.stringify(runInstructions, null, 2) + "\n");

  console.log("ComfyUI lesson 1 run assets prepared.");
  console.log(`Input image copied to: ${COMFYUI_COPIED_INPUT_IMAGE_PATH}`);
  console.log(`Workflow copied to: ${copiedWorkflowPath}`);
  console.log(`Patched workflow written to: ${patchedWorkflowPath}`);
  console.log(`Patch report written to: ${patchReportPath}`);
  console.log(`Run instructions written to: ${runInstructionsPath}`);
  console.log(`Open ComfyUI: ${COMFYUI_URL}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
