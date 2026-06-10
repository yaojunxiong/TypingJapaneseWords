import fs from "node:fs/promises";
import fsSync from "node:fs";
import {
  COMFYUI_API_EXPORT_REPORT_PUBLIC_PATH,
  COMFYUI_API_WORKFLOW_PUBLIC_PATH,
  COMFYUI_PATCHED_WORKFLOW_PUBLIC_PATH,
  COMFYUI_URL,
  publicPathToDisk
} from "../src/lib/video-remake-comfyui";

type UiNode = {
  id: number;
  type: string;
  title?: string;
  inputs?: Array<{ name: string; link: number | null }>;
  outputs?: unknown[];
  widgets_values?: unknown[];
};

type UiWorkflow = {
  nodes: UiNode[];
  links: Array<[number, number, number, number, number, string]>;
};

type ObjectInfo = Record<
  string,
  {
    input?: Record<string, Record<string, unknown>>;
    input_order?: Record<string, string[]>;
    output_node?: boolean;
  }
>;

type ApiWorkflow = Record<
  string,
  {
    class_type: string;
    inputs: Record<string, unknown>;
    _meta?: { title?: string };
  }
>;

const sourcePath = publicPathToDisk(COMFYUI_PATCHED_WORKFLOW_PUBLIC_PATH);
const outputPath = publicPathToDisk(COMFYUI_API_WORKFLOW_PUBLIC_PATH);
const reportPath = publicPathToDisk(COMFYUI_API_EXPORT_REPORT_PUBLIC_PATH);

function isUiWorkflow(value: unknown): value is UiWorkflow {
  return (
    value !== null &&
    typeof value === "object" &&
    Array.isArray((value as Record<string, unknown>).nodes) &&
    Array.isArray((value as Record<string, unknown>).links)
  );
}

async function writeReport(report: Record<string, unknown>) {
  await fs.mkdir(publicPathToDisk("/videos/source/everyones-japanese/lesson-1/comfyui-inputs"), {
    recursive: true
  });
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2) + "\n");
}

async function fetchObjectInfo() {
  const response = await fetch(`${COMFYUI_URL}/object_info`);
  if (!response.ok) {
    throw new Error(`ComfyUI /object_info returned ${response.status}`);
  }
  return (await response.json()) as ObjectInfo;
}

function convertUiToApi(workflow: UiWorkflow, objectInfo: ObjectInfo) {
  const warnings: string[] = [];
  const ignoredWidgets: string[] = [];
  const linkMap = new Map<number, [string, number]>();
  for (const [linkId, originId, originSlot] of workflow.links) {
    linkMap.set(linkId, [String(originId), originSlot]);
  }

  const api: ApiWorkflow = {};
  let outputNodeCount = 0;

  for (const node of workflow.nodes) {
    const info = objectInfo[node.type];
    if (!info) {
      if ((node.outputs?.length ?? 0) > 0 || (node.inputs?.length ?? 0) > 0) {
        warnings.push(`Missing ComfyUI object_info for node ${node.id} (${node.type}).`);
      }
      continue;
    }

    const inputs: Record<string, unknown> = {};
    const linkedInputNames = new Set<string>();

    for (const input of node.inputs ?? []) {
      if (input.link == null) {
        continue;
      }

      const link = linkMap.get(input.link);
      if (!link) {
        warnings.push(`Node ${node.id} (${node.type}) input ${input.name} references missing link ${input.link}.`);
        continue;
      }

      inputs[input.name] = link;
      linkedInputNames.add(input.name);
    }

    const inputOrder = [
      ...(info.input_order?.required ?? []),
      ...(info.input_order?.optional ?? [])
    ].filter((name) => !linkedInputNames.has(name));

    const widgets = node.widgets_values ?? [];
    let inputIndex = 0;
    widgets.forEach((value, widgetIndex) => {
      const inputName = inputOrder[inputIndex];
      if (!inputName) {
        ignoredWidgets.push(`Node ${node.id} (${node.type}) widget ${widgetIndex} is UI-only and was ignored.`);
        return;
      }

      const previousInputName = inputOrder[inputIndex - 1];
      const previousInputSpec = previousInputName
        ? info.input?.required?.[previousInputName] ?? info.input?.optional?.[previousInputName]
        : undefined;
      const previousInputOptions = Array.isArray(previousInputSpec) ? previousInputSpec[1] : undefined;
      const isControlAfterGenerateWidget =
        typeof value === "string" &&
        ["fixed", "increment", "decrement", "randomize"].includes(value) &&
        previousInputOptions &&
        typeof previousInputOptions === "object" &&
        "control_after_generate" in previousInputOptions;

      if (isControlAfterGenerateWidget) {
        ignoredWidgets.push(
          `Node ${node.id} (${node.type}) widget ${widgetIndex} is control_after_generate UI state and was ignored.`
        );
        return;
      }

      inputs[inputName] = value;
      inputIndex += 1;
    });

    if (info.output_node) {
      outputNodeCount += 1;
    }

    api[String(node.id)] = {
      class_type: node.type,
      inputs,
      _meta: {
        title: node.title ?? node.type
      }
    };
  }

  if (outputNodeCount === 0) {
    warnings.push("Converted workflow has no ComfyUI output node.");
  }

  return { api, warnings, ignoredWidgets, outputNodeCount };
}

async function main() {
  if (!fsSync.existsSync(sourcePath)) {
    const reason = `Patched UI workflow does not exist: ${sourcePath}`;
    await writeReport({
      canAutoExport: false,
      reason,
      sourceFormat: "missing",
      outputPath,
      nextAction: "Run npm run prepare:lesson1-comfyui-run first."
    });
    throw new Error(reason);
  }

  const source = JSON.parse(await fs.readFile(sourcePath, "utf8")) as unknown;
  if (!isUiWorkflow(source)) {
    const sourceFormat = source && typeof source === "object" && !Array.isArray(source) ? "api-or-unknown" : "unknown";
    const reason = "Source workflow is not ComfyUI UI nodes/links format.";
    await writeReport({
      canAutoExport: false,
      reason,
      sourceFormat,
      outputPath,
      nextAction: "Open the patched workflow in ComfyUI and use Save(API Format) if this file is not already API format."
    });
    throw new Error(reason);
  }

  let objectInfo: ObjectInfo;
  try {
    objectInfo = await fetchObjectInfo();
  } catch (error) {
    const reason = `Could not read ComfyUI /object_info: ${error instanceof Error ? error.message : String(error)}`;
    await writeReport({
      canAutoExport: false,
      reason,
      sourceFormat: "ui",
      outputPath,
      nextAction:
        "Start ComfyUI at http://127.0.0.1:8188, then rerun npm run export:lesson1-comfyui-api. If export still fails, open the patched workflow and use Save(API Format)."
    });
    throw new Error(reason);
  }

  const { api, warnings, ignoredWidgets, outputNodeCount } = convertUiToApi(source, objectInfo);
  const canAutoExport = warnings.length === 0 && outputNodeCount > 0;

  await fs.mkdir(publicPathToDisk("/videos/source/everyones-japanese/lesson-1/comfyui-inputs"), {
    recursive: true
  });

  if (canAutoExport) {
    await fs.writeFile(outputPath, JSON.stringify(api, null, 2) + "\n");
  }

  const report = {
    canAutoExport,
    reason: canAutoExport
      ? "Converted UI nodes/links workflow using ComfyUI /object_info input definitions."
      : `Automatic conversion produced warnings: ${warnings.join("; ")}`,
    sourceFormat: "ui",
    outputPath,
    nextAction: canAutoExport
      ? "Run npm run queue:lesson1-comfyui to submit the API workflow."
      : "Open lesson1_ltxv_image_to_video_patched.json in ComfyUI, use Save(API Format), and save as lesson1_api_workflow.json.",
    warnings,
    ignoredWidgets,
    nodeCount: Object.keys(api).length,
    outputNodeCount,
    generatedAt: new Date().toISOString()
  };

  await writeReport(report);

  if (!canAutoExport) {
    throw new Error(report.reason);
  }

  console.log(`API workflow written to: ${outputPath}`);
  console.log(`API export report written to: ${reportPath}`);
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
