import fs from "node:fs/promises";
import fsSync from "node:fs";
import {
  COMFYUI_API_WORKFLOW_PUBLIC_PATH,
  COMFYUI_CHECKPOINT_MODEL_NAME,
  COMFYUI_INPUT_IMAGE_NAME,
  COMFYUI_LESSON_1_PROMPT,
  COMFYUI_NEGATIVE_PROMPT,
  COMFYUI_QUEUE_RESULT_PUBLIC_PATH,
  COMFYUI_URL,
  publicPathToDisk
} from "../src/lib/video-remake-comfyui";

type ApiNode = {
  class_type: string;
  inputs: Record<string, unknown>;
  _meta?: { title?: string };
};

const apiWorkflowPath = publicPathToDisk(COMFYUI_API_WORKFLOW_PUBLIC_PATH);
const queueResultPath = publicPathToDisk(COMFYUI_QUEUE_RESULT_PUBLIC_PATH);
const negativePromptPattern = /(low quality|worst quality|deformed|distorted|disfigured|bad anatomy)/i;
const sceneryPromptPattern =
  /(beautiful|scenery|nature|glass bottle|purple galaxy|red fox|snow|landscape|russet coat|winter air)/i;

function isApiPrompt(workflow: unknown): workflow is Record<string, ApiNode> {
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

function checkpointNameFor(value: string) {
  return value.includes("/")
    ? value.replace(/ltx-video[^/"'\\]*?\.safetensors/gi, COMFYUI_CHECKPOINT_MODEL_NAME)
    : COMFYUI_CHECKPOINT_MODEL_NAME;
}

function patchApiPrompt(workflow: Record<string, ApiNode>) {
  for (const [nodeId, node] of Object.entries(workflow)) {
    const label = `${node.class_type} ${node._meta?.title ?? ""}`.toLowerCase();

    for (const [key, value] of Object.entries(node.inputs)) {
      if (typeof value !== "string") {
        continue;
      }

      const keyLabel = key.toLowerCase();
      if (
        (/checkpoint|ckpt|model/.test(label) || /checkpoint|ckpt|model_name|ckpt_name/.test(keyLabel)) &&
        /ltx-video/i.test(value)
      ) {
        node.inputs[key] = checkpointNameFor(value);
        continue;
      }

      if (/loadimage|load image/.test(label) && /image|filename/.test(keyLabel)) {
        node.inputs[key] = COMFYUI_INPUT_IMAGE_NAME;
        continue;
      }

      if (/prompt|text/.test(keyLabel)) {
        if (/negative/.test(label) || negativePromptPattern.test(value)) {
          node.inputs[key] = COMFYUI_NEGATIVE_PROMPT;
        } else if (/positive/.test(label) || sceneryPromptPattern.test(value)) {
          node.inputs[key] = COMFYUI_LESSON_1_PROMPT;
        }
      }
    }

    if (node.class_type === "LoadImage" && typeof node.inputs.image === "string") {
      node.inputs.image = COMFYUI_INPUT_IMAGE_NAME;
    }

    if (/CheckpointLoader/.test(node.class_type)) {
      for (const key of ["ckpt_name", "model_name", "checkpoint"]) {
        if (typeof node.inputs[key] === "string" && /ltx-video/i.test(node.inputs[key])) {
          node.inputs[key] = checkpointNameFor(node.inputs[key]);
        }
      }
    }

    if (node.class_type === "CLIPTextEncode" && typeof node.inputs.text === "string") {
      if (/negative/.test(label)) {
        node.inputs.text = COMFYUI_NEGATIVE_PROMPT;
      } else if (/positive/.test(label)) {
        node.inputs.text = COMFYUI_LESSON_1_PROMPT;
      } else {
        console.log(`CLIPTextEncode node ${nodeId} has no positive/negative title; keeping text as-is.`);
      }
    }
  }
}

async function main() {
  if (!fsSync.existsSync(apiWorkflowPath)) {
    throw new Error(
      [
        "API workflow does not exist.",
        `Expected: ${apiWorkflowPath}`,
        "Run npm run export:lesson1-comfyui-api first. If export cannot auto-convert, open the patched workflow in ComfyUI and use Save(API Format)."
      ].join("\n")
    );
  }

  let statsResponse: Response;
  try {
    statsResponse = await fetch(`${COMFYUI_URL}/system_stats`);
  } catch {
    throw new Error(`ComfyUI 未启动或无法连接：${COMFYUI_URL}`);
  }

  if (!statsResponse.ok) {
    throw new Error(`ComfyUI health check failed: GET /system_stats returned ${statsResponse.status}`);
  }

  const workflow = JSON.parse(await fs.readFile(apiWorkflowPath, "utf8")) as unknown;

  if (!isApiPrompt(workflow)) {
    throw new Error(
      [
        "workflow 不是 API 格式。",
        "需要顶层是 node id object，且每个节点包含 class_type 和 inputs。",
        `Current file: ${apiWorkflowPath}`
      ].join("\n")
    );
  }

  patchApiPrompt(workflow);

  const response = await fetch(`${COMFYUI_URL}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: workflow })
  });

  if (!response.ok) {
    throw new Error(`ComfyUI /prompt returned ${response.status}: ${await response.text()}`);
  }

  const result = (await response.json()) as { prompt_id?: string; number?: number; node_errors?: unknown };
  await fs.writeFile(
    queueResultPath,
    JSON.stringify(
      {
        queuedAt: new Date().toISOString(),
        comfyuiUrl: COMFYUI_URL,
        apiWorkflowPath,
        result
      },
      null,
      2
    ) + "\n"
  );
  console.log(`Queued ComfyUI prompt: ${result.prompt_id ?? "(no prompt_id returned)"}`);
  console.log(`Queue result written to: ${queueResultPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
