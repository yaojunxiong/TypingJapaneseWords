import fs from "node:fs";
import { NextResponse } from "next/server";
import {
  COMFYUI_COPIED_INPUT_IMAGE_PATH,
  COMFYUI_INPUT_DIR,
  COMFYUI_LESSON_1_PROMPT,
  COMFYUI_LTX_WORKFLOW_PATH,
  COMFYUI_MODEL_PATHS,
  COMFYUI_OUTPUT_DIR,
  COMFYUI_API_WORKFLOW_PUBLIC_PATH,
  COMFYUI_API_EXPORT_REPORT_PUBLIC_PATH,
  COMFYUI_PATCH_REPORT_PUBLIC_PATH,
  COMFYUI_PATCHED_WORKFLOW_PUBLIC_PATH,
  COMFYUI_QUEUE_RESULT_PUBLIC_PATH,
  COMFYUI_RECOMMENDED_PARAMS,
  COMFYUI_RUN_INSTRUCTIONS_PUBLIC_PATH,
  COMFYUI_URL,
  COMFYUI_WORKFLOW_COPIED_PUBLIC_PATH,
  LESSON_1_COMFYUI_OUTPUT_METADATA_PUBLIC_PATH,
  LESSON_1_COMFYUI_TEST_PUBLIC_PATH,
  LESSON_1_COMFYUI_INPUTS_PATH,
  LESSON_1_FINAL_REMAKE_PUBLIC_PATH,
  LESSON_1_REMAKE_CLIP_PUBLIC_PATH,
  LESSON_1_SOURCE_VIDEO_PATH,
  publicPathToDisk
} from "@/lib/video-remake-comfyui";

const frameFiles = ["first_frame.png", "middle_frame.png", "later_frame.png"];

export async function GET() {
  const sourceVideoDiskPath = publicPathToDisk(LESSON_1_SOURCE_VIDEO_PATH);
  const inputFolderDiskPath = publicPathToDisk(LESSON_1_COMFYUI_INPUTS_PATH);

  const frames = frameFiles.map((filename) => {
    const url = `${LESSON_1_COMFYUI_INPUTS_PATH}/${filename}`;
    return {
      filename,
      exists: fs.existsSync(publicPathToDisk(url)),
      url,
      relativePath: url,
      absolutePath: publicPathToDisk(url)
    };
  });

  return NextResponse.json({
    sourceVideoExists: fs.existsSync(sourceVideoDiskPath),
    sourceVideo: LESSON_1_SOURCE_VIDEO_PATH,
    comfyuiInputsFolderExists: fs.existsSync(inputFolderDiskPath),
    comfyuiInputsFolderAbsPath: inputFolderDiskPath,
    comfyuiUrl: COMFYUI_URL,
    comfyuiInputDir: COMFYUI_INPUT_DIR,
    comfyuiOutputDir: COMFYUI_OUTPUT_DIR,
    copiedInputImagePath: COMFYUI_COPIED_INPUT_IMAGE_PATH,
    copiedInputImageExists: fs.existsSync(COMFYUI_COPIED_INPUT_IMAGE_PATH),
    frames,
    workflowPath: COMFYUI_LTX_WORKFLOW_PATH,
    workflowExists: fs.existsSync(COMFYUI_LTX_WORKFLOW_PATH),
    workflowCopiedPath: publicPathToDisk(COMFYUI_WORKFLOW_COPIED_PUBLIC_PATH),
    workflowCopiedPublicPath: COMFYUI_WORKFLOW_COPIED_PUBLIC_PATH,
    workflowCopiedExists: fs.existsSync(publicPathToDisk(COMFYUI_WORKFLOW_COPIED_PUBLIC_PATH)),
    patchedWorkflowPath: publicPathToDisk(COMFYUI_PATCHED_WORKFLOW_PUBLIC_PATH),
    patchedWorkflowPublicPath: COMFYUI_PATCHED_WORKFLOW_PUBLIC_PATH,
    patchedWorkflowExists: fs.existsSync(publicPathToDisk(COMFYUI_PATCHED_WORKFLOW_PUBLIC_PATH)),
    patchReportPath: publicPathToDisk(COMFYUI_PATCH_REPORT_PUBLIC_PATH),
    patchReportPublicPath: COMFYUI_PATCH_REPORT_PUBLIC_PATH,
    patchReportExists: fs.existsSync(publicPathToDisk(COMFYUI_PATCH_REPORT_PUBLIC_PATH)),
    apiWorkflowPath: publicPathToDisk(COMFYUI_API_WORKFLOW_PUBLIC_PATH),
    apiWorkflowPublicPath: COMFYUI_API_WORKFLOW_PUBLIC_PATH,
    apiWorkflowExists: fs.existsSync(publicPathToDisk(COMFYUI_API_WORKFLOW_PUBLIC_PATH)),
    apiExportReportPath: publicPathToDisk(COMFYUI_API_EXPORT_REPORT_PUBLIC_PATH),
    apiExportReportPublicPath: COMFYUI_API_EXPORT_REPORT_PUBLIC_PATH,
    apiExportReportExists: fs.existsSync(publicPathToDisk(COMFYUI_API_EXPORT_REPORT_PUBLIC_PATH)),
    queueResultPath: publicPathToDisk(COMFYUI_QUEUE_RESULT_PUBLIC_PATH),
    queueResultPublicPath: COMFYUI_QUEUE_RESULT_PUBLIC_PATH,
    queueResultExists: fs.existsSync(publicPathToDisk(COMFYUI_QUEUE_RESULT_PUBLIC_PATH)),
    comfyuiTestVideo: LESSON_1_COMFYUI_TEST_PUBLIC_PATH,
    comfyuiTestVideoExists: fs.existsSync(publicPathToDisk(LESSON_1_COMFYUI_TEST_PUBLIC_PATH)),
    remakeClipPath: publicPathToDisk(LESSON_1_REMAKE_CLIP_PUBLIC_PATH),
    remakeClipPublicPath: LESSON_1_REMAKE_CLIP_PUBLIC_PATH,
    remakeClipExists: fs.existsSync(publicPathToDisk(LESSON_1_REMAKE_CLIP_PUBLIC_PATH)),
    comfyuiOutputMetadataPath: publicPathToDisk(LESSON_1_COMFYUI_OUTPUT_METADATA_PUBLIC_PATH),
    comfyuiOutputMetadataPublicPath: LESSON_1_COMFYUI_OUTPUT_METADATA_PUBLIC_PATH,
    comfyuiOutputMetadataExists: fs.existsSync(publicPathToDisk(LESSON_1_COMFYUI_OUTPUT_METADATA_PUBLIC_PATH)),
    finalRemakePath: publicPathToDisk(LESSON_1_FINAL_REMAKE_PUBLIC_PATH),
    finalRemakePublicPath: LESSON_1_FINAL_REMAKE_PUBLIC_PATH,
    finalRemakeExists: fs.existsSync(publicPathToDisk(LESSON_1_FINAL_REMAKE_PUBLIC_PATH)),
    runInstructionsPath: publicPathToDisk(COMFYUI_RUN_INSTRUCTIONS_PUBLIC_PATH),
    runInstructionsPublicPath: COMFYUI_RUN_INSTRUCTIONS_PUBLIC_PATH,
    runInstructionsExists: fs.existsSync(publicPathToDisk(COMFYUI_RUN_INSTRUCTIONS_PUBLIC_PATH)),
    modelChecks: COMFYUI_MODEL_PATHS.map((model) => ({
      ...model,
      exists: fs.existsSync(model.path)
    })),
    recommendedPrompt: COMFYUI_LESSON_1_PROMPT,
    recommendedParams: COMFYUI_RECOMMENDED_PARAMS,
    recommendedFrame: "middle_frame.png"
  });
}
