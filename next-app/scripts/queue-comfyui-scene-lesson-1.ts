import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import {
  COMFYUI_URL,
  LESSON_1_COMFYUI_INPUTS_PATH,
  publicPathToDisk
} from "../src/lib/video-remake-comfyui";

const sceneId = process.argv[2];
const sceneInputsDir = publicPathToDisk(`${LESSON_1_COMFYUI_INPUTS_PATH}/scenes`);

function assertSceneId(value: string | undefined): asserts value is string {
  if (!value || !/^\d{3}$/.test(value)) {
    throw new Error("Please pass a scene id, for example: npm run queue:lesson1-comfyui-scene -- 001");
  }
}

async function main() {
  assertSceneId(sceneId);

  const apiWorkflowPath = path.join(sceneInputsDir, `lesson1_scene_${sceneId}_api_workflow.json`);
  const queueResultPath = path.join(sceneInputsDir, `lesson1_scene_${sceneId}_queue-result.json`);

  if (!fsSync.existsSync(apiWorkflowPath)) {
    throw new Error(
      [
        `Scene API workflow does not exist: ${apiWorkflowPath}`,
        "Run npm run prepare:lesson1-comfyui-scenes first."
      ].join("\n")
    );
  }

  let statsResponse: Response;
  try {
    statsResponse = await fetch(`${COMFYUI_URL}/system_stats`);
  } catch {
    throw new Error(`ComfyUI is not reachable: ${COMFYUI_URL}`);
  }

  if (!statsResponse.ok) {
    throw new Error(`ComfyUI health check failed: GET /system_stats returned ${statsResponse.status}`);
  }

  const workflow = JSON.parse(await fs.readFile(apiWorkflowPath, "utf8")) as unknown;
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
    `${JSON.stringify(
      {
        queuedAt: new Date().toISOString(),
        sceneId,
        comfyuiUrl: COMFYUI_URL,
        apiWorkflowPath,
        result
      },
      null,
      2
    )}\n`
  );

  console.log(`Queued Lesson 1 scene ${sceneId}: ${result.prompt_id ?? "(no prompt_id returned)"}`);
  console.log(`Queue result written to: ${queueResultPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
