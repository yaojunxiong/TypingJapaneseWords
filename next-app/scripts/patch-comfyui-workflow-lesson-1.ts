import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import {
  COMFYUI_CHECKPOINT_MODEL_NAME,
  COMFYUI_INPUT_IMAGE_NAME,
  COMFYUI_LESSON_1_PROMPT,
  COMFYUI_LTX_WORKFLOW_PATH,
  COMFYUI_NEGATIVE_PROMPT,
  COMFYUI_PATCH_REPORT_PUBLIC_PATH,
  COMFYUI_PATCHED_WORKFLOW_PUBLIC_PATH,
  LESSON_1_COMFYUI_INPUTS_PATH,
  publicPathToDisk
} from "../src/lib/video-remake-comfyui";

type DetectedFormat = "ui" | "api" | "unknown";

type Replacement = {
  path: string;
  before: string;
  after: string;
};

type PatchReport = {
  detectedFormat: DetectedFormat;
  checkpointReplacements: Replacement[];
  promptReplacements: Replacement[];
  imageReplacements: Replacement[];
  warnings: string[];
  patchedWorkflowPath: string;
};

const imageFilePattern = /\.(png|jpe?g|webp|bmp)$/i;
const sceneryPromptPattern =
  /(beautiful|scenery|nature|glass bottle|purple galaxy|red fox|snow|landscape|russet coat|winter air)/i;
const negativePromptPattern = /(low quality|worst quality|deformed|distorted|disfigured|bad anatomy)/i;

function detectFormat(workflow: unknown): DetectedFormat {
  if (workflow && typeof workflow === "object") {
    const value = workflow as Record<string, unknown>;
    if (Array.isArray(value.nodes) && Array.isArray(value.links)) {
      return "ui";
    }

    const values = Object.values(value);
    if (
      values.length > 0 &&
      values.every(
        (node) =>
          node &&
          typeof node === "object" &&
          "class_type" in (node as Record<string, unknown>) &&
          "inputs" in (node as Record<string, unknown>)
      )
    ) {
      return "api";
    }
  }

  return "unknown";
}

function checkpointNameFor(before: string) {
  return before.includes("/") ? before.replace(/ltx-video[^/"'\\]*?\.safetensors/gi, COMFYUI_CHECKPOINT_MODEL_NAME) : COMFYUI_CHECKPOINT_MODEL_NAME;
}

function replaceCheckpointString(value: string) {
  if (!/ltx-video[^/"'\\]*?\.safetensors/i.test(value)) {
    return value;
  }

  return value.replace(/ltx-video[^/"'\\]*?\.safetensors/gi, COMFYUI_CHECKPOINT_MODEL_NAME);
}

function setStringAtPath(root: unknown, pathParts: Array<string | number>, after: string) {
  let parent = root as Record<string, unknown> | unknown[];
  for (const part of pathParts.slice(0, -1)) {
    parent = (parent as Record<string, unknown> | unknown[])[part as never] as Record<string, unknown> | unknown[];
  }

  (parent as Record<string, unknown> | unknown[])[pathParts[pathParts.length - 1] as never] = after as never;
}

function pushReplacement(list: Replacement[], pathLabel: string, before: string, after: string, includeUnchanged = false) {
  if ((includeUnchanged || before !== after) && !list.some((item) => item.path === pathLabel)) {
    list.push({ path: pathLabel, before, after });
  }
}

function patchUiWorkflow(workflow: Record<string, unknown>, report: PatchReport) {
  const nodes = Array.isArray(workflow.nodes) ? workflow.nodes : [];

  nodes.forEach((node, nodeIndex) => {
    if (!node || typeof node !== "object") {
      return;
    }

    const item = node as Record<string, unknown>;
    const type = String(item.type ?? "");
    const title = String(item.title ?? "");
    const label = `${type} ${title}`.toLowerCase();
    const widgets = Array.isArray(item.widgets_values) ? item.widgets_values : [];

    widgets.forEach((value, widgetIndex) => {
      if (typeof value !== "string") {
        return;
      }

      const pathLabel = `nodes[${nodeIndex}].widgets_values[${widgetIndex}]`;

      if (/checkpoint|ckpt|model/.test(label) && /ltx-video/i.test(value)) {
        const after = checkpointNameFor(value);
        widgets[widgetIndex] = after;
        pushReplacement(report.checkpointReplacements, pathLabel, value, after, true);
        return;
      }

      if (/cliptextencode/.test(label) && /positive/.test(label)) {
        widgets[widgetIndex] = COMFYUI_LESSON_1_PROMPT;
        pushReplacement(report.promptReplacements, pathLabel, value, COMFYUI_LESSON_1_PROMPT);
        return;
      }

      if (/cliptextencode/.test(label) && /negative/.test(label)) {
        widgets[widgetIndex] = COMFYUI_NEGATIVE_PROMPT;
        pushReplacement(report.promptReplacements, pathLabel, value, COMFYUI_NEGATIVE_PROMPT);
        return;
      }

      if (/loadimage|load image/.test(label) && imageFilePattern.test(value)) {
        widgets[widgetIndex] = COMFYUI_INPUT_IMAGE_NAME;
        pushReplacement(report.imageReplacements, pathLabel, value, COMFYUI_INPUT_IMAGE_NAME);
      }
    });
  });
}

function patchApiWorkflow(workflow: Record<string, unknown>, report: PatchReport) {
  for (const [nodeId, node] of Object.entries(workflow)) {
    if (!node || typeof node !== "object") {
      continue;
    }

    const item = node as Record<string, unknown>;
    const classType = String(item.class_type ?? "");
    const title = String((item._meta as Record<string, unknown> | undefined)?.title ?? "");
    const label = `${classType} ${title}`.toLowerCase();
    const inputs = item.inputs;

    if (!inputs || typeof inputs !== "object") {
      continue;
    }

    for (const [key, value] of Object.entries(inputs as Record<string, unknown>)) {
      if (typeof value !== "string") {
        continue;
      }

      const pathLabel = `${nodeId}.inputs.${key}`;
      const keyLabel = key.toLowerCase();

      if (
        (/checkpoint|ckpt|model/.test(label) || /checkpoint|ckpt|model_name|ckpt_name/.test(keyLabel)) &&
        /ltx-video/i.test(value)
      ) {
        const after = checkpointNameFor(value);
        (inputs as Record<string, unknown>)[key] = after;
        pushReplacement(report.checkpointReplacements, pathLabel, value, after, true);
        continue;
      }

      if (/loadimage|load image/.test(label) && /image|filename/.test(keyLabel) && imageFilePattern.test(value)) {
        (inputs as Record<string, unknown>)[key] = COMFYUI_INPUT_IMAGE_NAME;
        pushReplacement(report.imageReplacements, pathLabel, value, COMFYUI_INPUT_IMAGE_NAME);
        continue;
      }

      if (/prompt|text/.test(keyLabel)) {
        if (/negative/.test(label) || negativePromptPattern.test(value)) {
          (inputs as Record<string, unknown>)[key] = COMFYUI_NEGATIVE_PROMPT;
          pushReplacement(report.promptReplacements, pathLabel, value, COMFYUI_NEGATIVE_PROMPT);
        } else if (/positive/.test(label) || sceneryPromptPattern.test(value)) {
          (inputs as Record<string, unknown>)[key] = COMFYUI_LESSON_1_PROMPT;
          pushReplacement(report.promptReplacements, pathLabel, value, COMFYUI_LESSON_1_PROMPT);
        }
      }
    }
  }
}

function patchCheckpointStrings(root: unknown, report: PatchReport) {
  function walk(value: unknown, pathParts: Array<string | number>, parentKey = "") {
    if (typeof value === "string") {
      const shouldCheck =
        /checkpoint|ckpt|model|filename/.test(parentKey.toLowerCase()) || /ltx-video/i.test(value);
      if (shouldCheck) {
        const after = replaceCheckpointString(value);
        if (after !== value) {
          setStringAtPath(root, pathParts, after);
          pushReplacement(report.checkpointReplacements, pathParts.join("."), value, after);
        }
      }
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item, index) => walk(item, [...pathParts, index], String(index)));
      return;
    }

    if (value && typeof value === "object") {
      for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
        walk(item, [...pathParts, key], key);
      }
    }
  }

  walk(root, []);
}

export async function patchLessonOneComfyWorkflow() {
  if (!fsSync.existsSync(COMFYUI_LTX_WORKFLOW_PATH)) {
    throw new Error(`ComfyUI workflow template was not found: ${COMFYUI_LTX_WORKFLOW_PATH}`);
  }

  const helperFolderPath = publicPathToDisk(LESSON_1_COMFYUI_INPUTS_PATH);
  const patchedWorkflowPath = publicPathToDisk(COMFYUI_PATCHED_WORKFLOW_PUBLIC_PATH);
  const patchReportPath = publicPathToDisk(COMFYUI_PATCH_REPORT_PUBLIC_PATH);
  const workflow = JSON.parse(await fs.readFile(COMFYUI_LTX_WORKFLOW_PATH, "utf8")) as Record<string, unknown>;
  const report: PatchReport = {
    detectedFormat: detectFormat(workflow),
    checkpointReplacements: [],
    promptReplacements: [],
    imageReplacements: [],
    warnings: [],
    patchedWorkflowPath
  };

  if (report.detectedFormat === "ui") {
    patchUiWorkflow(workflow, report);
  } else if (report.detectedFormat === "api") {
    patchApiWorkflow(workflow, report);
  } else {
    report.warnings.push("Workflow format was not recognized. Only generic checkpoint replacement was attempted.");
  }

  patchCheckpointStrings(workflow, report);

  if (report.checkpointReplacements.length === 0) {
    report.warnings.push("No checkpoint fields were replaced. Please verify the checkpoint node after importing.");
  }
  if (report.promptReplacements.length === 0) {
    report.warnings.push("No prompt fields were replaced. Please verify the positive prompt after importing.");
  }
  if (report.imageReplacements.length === 0) {
    report.warnings.push("No image fields were replaced. Please verify the Load Image node after importing.");
  }

  await fs.mkdir(helperFolderPath, { recursive: true });
  await fs.writeFile(patchedWorkflowPath, JSON.stringify(workflow, null, 2) + "\n");
  await fs.writeFile(patchReportPath, JSON.stringify(report, null, 2) + "\n");

  return { report, patchedWorkflowPath, patchReportPath };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  patchLessonOneComfyWorkflow()
    .then(({ report, patchedWorkflowPath, patchReportPath }) => {
      console.log(`Patched workflow written to: ${patchedWorkflowPath}`);
      console.log(`Patch report written to: ${patchReportPath}`);
      console.log(
        JSON.stringify(
          {
            detectedFormat: report.detectedFormat,
            checkpointReplacements: report.checkpointReplacements.length,
            promptReplacements: report.promptReplacements.length,
            imageReplacements: report.imageReplacements.length,
            warnings: report.warnings
          },
          null,
          2
        )
      );
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    });
}
