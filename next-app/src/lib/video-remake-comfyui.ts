import fs from "node:fs";
import path from "node:path";

export const COMFYUI_LESSON_1_PROMPT =
  "Transform the source image into a clean Japanese anime educational conversation style. Keep the original character positions, camera framing, and classroom atmosphere. Use friendly language-school students and teachers, clean line art, soft colors, natural facial expressions, and a high-quality TV anime look. Do not add new characters. Do not change the lesson content.";

export const LESSON_1_SOURCE_VIDEO_PATH =
  "/videos/source/everyones-japanese/lesson-1/conversation.mp4";

export const LESSON_1_COMFYUI_INPUTS_PATH =
  "/videos/source/everyones-japanese/lesson-1/comfyui-inputs";

export const COMFYUI_URL = "http://127.0.0.1:8188";

export const COMFYUI_INPUT_DIR = "/Users/jimmy/ComfyUI/input";

export const COMFYUI_OUTPUT_DIR = "/Users/jimmy/ComfyUI/output";

export const COMFYUI_LTX_WORKFLOW_PATH =
  "/Users/jimmy/ComfyUI/venv/lib/python3.11/site-packages/comfyui_workflow_templates_media_video/templates/ltxv_image_to_video.json";

export const COMFYUI_WORKFLOW_COPIED_PUBLIC_PATH =
  `${LESSON_1_COMFYUI_INPUTS_PATH}/ltxv_image_to_video.json`;

export const COMFYUI_PATCHED_WORKFLOW_PUBLIC_PATH =
  `${LESSON_1_COMFYUI_INPUTS_PATH}/lesson1_ltxv_image_to_video_patched.json`;

export const COMFYUI_PATCH_REPORT_PUBLIC_PATH =
  `${LESSON_1_COMFYUI_INPUTS_PATH}/patch-report.json`;

export const COMFYUI_API_WORKFLOW_PUBLIC_PATH =
  `${LESSON_1_COMFYUI_INPUTS_PATH}/lesson1_api_workflow.json`;

export const COMFYUI_API_EXPORT_REPORT_PUBLIC_PATH =
  `${LESSON_1_COMFYUI_INPUTS_PATH}/api-export-report.json`;

export const COMFYUI_QUEUE_RESULT_PUBLIC_PATH =
  `${LESSON_1_COMFYUI_INPUTS_PATH}/queue-result.json`;

export const COMFYUI_RUN_INSTRUCTIONS_PUBLIC_PATH =
  `${LESSON_1_COMFYUI_INPUTS_PATH}/run-instructions.json`;

export const COMFYUI_RECOMMENDED_FRAME_PUBLIC_PATH =
  `${LESSON_1_COMFYUI_INPUTS_PATH}/middle_frame.png`;

export const COMFYUI_COPIED_INPUT_IMAGE_PATH =
  `${COMFYUI_INPUT_DIR}/lesson1_middle_frame.png`;

export const COMFYUI_INPUT_IMAGE_NAME = "lesson1_middle_frame.png";

export const COMFYUI_CHECKPOINT_MODEL_NAME = "ltx-video-2b-v0.9.5.safetensors";

export const COMFYUI_NEGATIVE_PROMPT =
  "text, watermark, logo, blurry, low quality, distorted face, extra people";

export const COMFYUI_OUTPUT_HINT = COMFYUI_OUTPUT_DIR;

export const LESSON_1_REMAKE_CLIP_PUBLIC_PATH =
  "/videos/source/everyones-japanese/lesson-1/remake-clips/scene_001_remake.mp4";

export const LESSON_1_COMFYUI_TEST_PUBLIC_PATH =
  "/videos/remake/everyones-japanese/lesson-1/comfyui-test.mp4";

export const LESSON_1_COMFYUI_OUTPUT_METADATA_PUBLIC_PATH =
  "/videos/remake/everyones-japanese/lesson-1/comfyui-output-metadata.json";

export const LESSON_1_FINAL_REMAKE_PUBLIC_PATH =
  "/videos/remake/everyones-japanese/lesson-1/final.mp4";

export const COMFYUI_MODEL_PATHS = [
  {
    label: "checkpoints/ltx-video-2b-v0.9.5.safetensors",
    path: "/Users/jimmy/ComfyUI/models/checkpoints/ltx-video-2b-v0.9.5.safetensors"
  },
  {
    label: "text_encoders/t5xxl_fp16.safetensors",
    path: "/Users/jimmy/ComfyUI/models/text_encoders/t5xxl_fp16.safetensors"
  }
];

export const COMFYUI_RECOMMENDED_PARAMS = {
  duration: "2 seconds",
  fps: "8 or 12",
  resolution: "512px width",
  steps: "low first, then increase"
};

export function publicPathToDisk(publicPath: string) {
  return path.join(process.cwd(), "public", publicPath.replace(/^\//, ""));
}

export function readJsonFile<T>(filePath: string, fallback: T): T {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}
