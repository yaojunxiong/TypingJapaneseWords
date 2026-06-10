import fs from "node:fs";
import Link from "next/link";
import { CopyPromptButton } from "@/components/copy-prompt-button";
import { RefreshResultStatusButton } from "@/components/refresh-result-status-button";
import {
  COMFYUI_API_WORKFLOW_PUBLIC_PATH,
  COMFYUI_API_EXPORT_REPORT_PUBLIC_PATH,
  COMFYUI_CHECKPOINT_MODEL_NAME,
  COMFYUI_COPIED_INPUT_IMAGE_PATH,
  COMFYUI_INPUT_DIR,
  COMFYUI_INPUT_IMAGE_NAME,
  COMFYUI_LESSON_1_PROMPT,
  COMFYUI_LTX_WORKFLOW_PATH,
  COMFYUI_MODEL_PATHS,
  COMFYUI_OUTPUT_DIR,
  COMFYUI_OUTPUT_HINT,
  COMFYUI_QUEUE_RESULT_PUBLIC_PATH,
  COMFYUI_RECOMMENDED_PARAMS,
  COMFYUI_PATCH_REPORT_PUBLIC_PATH,
  COMFYUI_PATCHED_WORKFLOW_PUBLIC_PATH,
  COMFYUI_RUN_INSTRUCTIONS_PUBLIC_PATH,
  COMFYUI_URL,
  COMFYUI_WORKFLOW_COPIED_PUBLIC_PATH,
  LESSON_1_COMFYUI_OUTPUT_METADATA_PUBLIC_PATH,
  LESSON_1_COMFYUI_TEST_PUBLIC_PATH,
  LESSON_1_COMFYUI_INPUTS_PATH,
  LESSON_1_FINAL_REMAKE_PUBLIC_PATH,
  LESSON_1_REMAKE_CLIP_PUBLIC_PATH,
  LESSON_1_SOURCE_VIDEO_PATH,
  publicPathToDisk,
  readJsonFile
} from "@/lib/video-remake-comfyui";

export const dynamic = "force-dynamic";

type ComfyMetadata = {
  generatedAt?: string;
  comfyuiInputFolderAbsPath?: string;
  frames?: Array<{
    filename: string;
    timestamp: string;
    relativePath: string;
    absolutePath: string;
  }>;
};

type RunInstructions = {
  generatedAt?: string;
  workflowCopiedPath?: string;
  patchedWorkflowPath?: string;
  patchReportPath?: string;
  inputImageComfyuiPath?: string;
  outputFolder?: string;
};

type PatchReport = {
  detectedFormat?: "ui" | "api" | "unknown";
  checkpointReplacements?: Array<unknown>;
  promptReplacements?: Array<unknown>;
  imageReplacements?: Array<unknown>;
  warnings?: string[];
  patchedWorkflowPath?: string;
};

type ApiExportReport = {
  canAutoExport?: boolean;
  reason?: string;
  sourceFormat?: string;
  outputPath?: string;
  nextAction?: string;
  warnings?: string[];
  nodeCount?: number;
  outputNodeCount?: number;
  generatedAt?: string;
};

type OutputMetadata = {
  sourceOutputPath?: string;
  copiedAt?: string;
  targetClipPath?: string;
  previewPath?: string;
  fileSize?: number;
};

type ResultVideo = {
  title: string;
  diskPath: string;
  publicUrl: string;
  exists: boolean;
  presentLabel: string;
  missingLabel: string;
  missingCommands: string[];
  missingHint?: string;
  openLabel: string;
};

const frameNames = ["first_frame.png", "middle_frame.png", "later_frame.png"];

function frameInfo(filename: string, metadata: ComfyMetadata) {
  const fromMetadata = metadata.frames?.find((frame) => frame.filename === filename);
  const relativePath = `${LESSON_1_COMFYUI_INPUTS_PATH}/${filename}`;
  return {
    filename,
    timestamp: fromMetadata?.timestamp ?? "",
    relativePath,
    absolutePath: fromMetadata?.absolutePath ?? publicPathToDisk(relativePath),
    exists: fs.existsSync(publicPathToDisk(relativePath)),
    isRecommended: filename === "middle_frame.png"
  };
}

function resultVideo(
  title: string,
  publicUrl: string,
  presentLabel: string,
  missingLabel: string,
  missingCommands: string[],
  openLabel: string,
  missingHint?: string
): ResultVideo {
  const diskPath = publicPathToDisk(publicUrl);
  return {
    title,
    diskPath,
    publicUrl,
    exists: fs.existsSync(diskPath),
    presentLabel,
    missingLabel,
    missingCommands,
    missingHint,
    openLabel
  };
}

function ResultVideoCard({ video }: { video: ResultVideo }) {
  return (
    <article style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <h3 style={{ marginTop: 0 }}>{video.title}</h3>
        <strong style={{ color: video.exists ? "#047857" : "#b91c1c" }}>
          {video.exists ? video.presentLabel : video.missingLabel}
        </strong>
      </div>
      <p className="small">文件路径：</p>
      <code className="code" style={{ display: "block", overflowWrap: "anywhere" }}>
        {video.diskPath}
      </code>
      {video.exists ? (
        <>
          <p className="small">页面链接：</p>
          <code className="code" style={{ display: "block", overflowWrap: "anywhere" }}>
            {video.publicUrl}
          </code>
          <video
            controls
            src={video.publicUrl}
            style={{ width: "100%", marginTop: 12, borderRadius: 8, background: "#0f172a" }}
          />
          <div style={{ marginTop: 12 }}>
            <a className="pillLink" href={video.publicUrl} target="_blank" rel="noreferrer">
              {video.openLabel}
            </a>
          </div>
        </>
      ) : (
        <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
          <button
            disabled
            type="button"
            style={{
              justifySelf: "start",
              border: "1px solid #cbd5e1",
              borderRadius: 999,
              padding: "8px 12px",
              color: "#64748b",
              background: "#f1f5f9",
              cursor: "not-allowed"
            }}
          >
            尚未生成
          </button>
          {video.missingHint ? <p className="small">{video.missingHint}</p> : null}
          {video.missingCommands.map((command) => (
            <code className="code" key={command}>
              {command}
            </code>
          ))}
        </div>
      )}
    </article>
  );
}

export default function LessonOneComfyUiPage() {
  const metadataPath = publicPathToDisk(`${LESSON_1_COMFYUI_INPUTS_PATH}/metadata.json`);
  const runInstructionsPath = publicPathToDisk(COMFYUI_RUN_INSTRUCTIONS_PUBLIC_PATH);
  const patchReportPath = publicPathToDisk(COMFYUI_PATCH_REPORT_PUBLIC_PATH);
  const apiExportReportPath = publicPathToDisk(COMFYUI_API_EXPORT_REPORT_PUBLIC_PATH);
  const outputMetadataPath = publicPathToDisk(LESSON_1_COMFYUI_OUTPUT_METADATA_PUBLIC_PATH);
  const metadata = readJsonFile<ComfyMetadata>(metadataPath, {});
  const runInstructions = readJsonFile<RunInstructions>(runInstructionsPath, {});
  const patchReport = readJsonFile<PatchReport>(patchReportPath, {});
  const apiExportReport = readJsonFile<ApiExportReport>(apiExportReportPath, {});
  const outputMetadata = readJsonFile<OutputMetadata>(outputMetadataPath, {});
  const sourceExists = fs.existsSync(publicPathToDisk(LESSON_1_SOURCE_VIDEO_PATH));
  const inputFolderAbsPath =
    metadata.comfyuiInputFolderAbsPath ?? publicPathToDisk(LESSON_1_COMFYUI_INPUTS_PATH);
  const frames = frameNames.map((filename) => frameInfo(filename, metadata));
  const workflowCopiedDiskPath = publicPathToDisk(COMFYUI_WORKFLOW_COPIED_PUBLIC_PATH);
  const patchedWorkflowDiskPath = publicPathToDisk(COMFYUI_PATCHED_WORKFLOW_PUBLIC_PATH);
  const apiWorkflowDiskPath = publicPathToDisk(COMFYUI_API_WORKFLOW_PUBLIC_PATH);
  const apiExportReportDiskPath = publicPathToDisk(COMFYUI_API_EXPORT_REPORT_PUBLIC_PATH);
  const queueResultDiskPath = publicPathToDisk(COMFYUI_QUEUE_RESULT_PUBLIC_PATH);
  const comfyuiTestVideoDiskPath = publicPathToDisk(LESSON_1_COMFYUI_TEST_PUBLIC_PATH);
  const remakeClipDiskPath = publicPathToDisk(LESSON_1_REMAKE_CLIP_PUBLIC_PATH);
  const finalRemakeDiskPath = publicPathToDisk(LESSON_1_FINAL_REMAKE_PUBLIC_PATH);
  const patchedWorkflowExists = fs.existsSync(patchedWorkflowDiskPath);
  const apiWorkflowExists = fs.existsSync(apiWorkflowDiskPath);
  const apiExportReportExists = fs.existsSync(apiExportReportDiskPath);
  const queueResultExists = fs.existsSync(queueResultDiskPath);
  const comfyuiTestVideoExists = fs.existsSync(comfyuiTestVideoDiskPath);
  const remakeClipExists = fs.existsSync(remakeClipDiskPath);
  const finalRemakeExists = fs.existsSync(finalRemakeDiskPath);
  const copiedInputExists = fs.existsSync(COMFYUI_COPIED_INPUT_IMAGE_PATH);
  const runInstructionsExists = fs.existsSync(runInstructionsPath);
  const patchReportExists = fs.existsSync(patchReportPath);
  const checkpointCount = patchReport.checkpointReplacements?.length ?? 0;
  const promptCount = patchReport.promptReplacements?.length ?? 0;
  const imageCount = patchReport.imageReplacements?.length ?? 0;
  const allResultVideosMissing = !comfyuiTestVideoExists && !remakeClipExists && !finalRemakeExists;
  const resultVideos = [
    resultVideo(
      "ComfyUI 测试动漫片",
      LESSON_1_COMFYUI_TEST_PUBLIC_PATH,
      "已生成",
      "尚未生成",
      ["npm run queue:lesson1-comfyui", "npm run pull:lesson1-comfyui-output"],
      "打开动漫测试片"
    ),
    resultVideo(
      "Scene 001 重绘片段",
      LESSON_1_REMAKE_CLIP_PUBLIC_PATH,
      "已生成",
      "尚未生成",
      ["npm run pull:lesson1-comfyui-output"],
      "打开 scene_001_remake.mp4"
    ),
    resultVideo(
      "Lesson 1 Final 合成结果",
      LESSON_1_FINAL_REMAKE_PUBLIC_PATH,
      "已生成",
      "尚未合成",
      remakeClipExists ? ["npm run compose:lesson-1-remake"] : [],
      "打开 final.mp4",
      remakeClipExists ? undefined : "请先生成或拉取 ComfyUI 输出，再合成 final.mp4。"
    )
  ];

  return (
    <main>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 18 }}>
        <div>
          <h1>Lesson 1 ComfyUI 本地重绘助手</h1>
          <p className="small">准备 LTX image-to-video 输入图，快速跑 2-3 秒本地测试。</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <Link className="pillLink" href="/admin">
            管理后台
          </Link>
          <a className="pillLink" href={COMFYUI_URL} target="_blank" rel="noreferrer">
            打开 ComfyUI
          </a>
          <RefreshResultStatusButton />
        </div>
      </div>

      {allResultVideosMissing ? (
        <section className="card">
          <h2>结果尚未生成</h2>
          <p>当前三个视频都尚未生成，请先运行：</p>
          <code className="code">npm run queue:lesson1-comfyui</code>
          <p>生成完成后运行：</p>
          <code className="code">npm run pull:lesson1-comfyui-output</code>
        </section>
      ) : null}

      <section className="card">
        <h2>当前最短验证路径</h2>
        {!comfyuiTestVideoExists ? (
          <ol style={{ lineHeight: 1.8 }}>
            <li>
              确认 ComfyUI 已启动：<code className="code">{COMFYUI_URL}</code>
            </li>
            <li>
              运行 <code className="code">npm run queue:lesson1-comfyui</code>
            </li>
            <li>等生成完成</li>
            <li>
              运行 <code className="code">npm run pull:lesson1-comfyui-output</code>
            </li>
            <li>回到本页点击“打开动漫测试片”</li>
          </ol>
        ) : !finalRemakeExists ? (
          <ol style={{ lineHeight: 1.8 }}>
            <li>点击“打开动漫测试片”确认效果</li>
            <li>
              满意后运行 <code className="code">npm run compose:lesson-1-remake</code>
            </li>
            <li>回到本页点击“打开 final.mp4”</li>
          </ol>
        ) : (
          <p>Lesson 1 动漫片合成结果已生成，可以直接点击 final.mp4 验证。</p>
        )}
      </section>

      <section className="card">
        <h2>动漫片结果验证</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
          {resultVideos.map((video) => (
            <ResultVideoCard key={video.publicUrl} video={video} />
          ))}
        </div>
      </section>

      <section className="card">
        <h2>半自动运行准备</h2>
        <p className="small">
          这一版会把推荐输入图复制进 ComfyUI input，并生成已替换 checkpoint、prompt、图片名的 patched workflow。
        </p>
        <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
          <code className="code">npm run prepare:lesson1-comfyui-run</code>
          <code className="code">npm run open:comfyui</code>
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          <p>
            输入图：{" "}
            <strong style={{ color: copiedInputExists ? "#047857" : "#b91c1c" }}>
              {copiedInputExists ? "已复制" : "待复制"}
            </strong>{" "}
            <code className="code">lesson1_middle_frame.png</code>
          </p>
          <code className="code" style={{ display: "block", overflowWrap: "anywhere" }}>
            {runInstructions.inputImageComfyuiPath ?? COMFYUI_COPIED_INPUT_IMAGE_PATH}
          </code>
          <p>
            Workflow：{" "}
            <strong style={{ color: patchedWorkflowExists ? "#047857" : "#b91c1c" }}>
              {patchedWorkflowExists ? "已修正" : "待修正"}
            </strong>{" "}
            <code className="code">lesson1_ltxv_image_to_video_patched.json</code>
          </p>
          <code className="code" style={{ display: "block", overflowWrap: "anywhere" }}>
            {runInstructions.patchedWorkflowPath ?? patchedWorkflowDiskPath}
          </code>
          <p>
            Run instructions：{" "}
            <strong style={{ color: runInstructionsExists ? "#047857" : "#b91c1c" }}>
              {runInstructionsExists ? "已生成" : "待生成"}
            </strong>
          </p>
          <code className="code" style={{ display: "block", overflowWrap: "anywhere" }}>
            {runInstructionsPath}
          </code>
          <p>
            输出目录：<code className="code">{runInstructions.outputFolder ?? COMFYUI_OUTPUT_DIR}</code>
          </p>
        </div>
      </section>

      <section className="card">
        <h2>推荐使用已修正版 workflow</h2>
        <p>
          优先拖入 <code className="code">lesson1_ltxv_image_to_video_patched.json</code> 到 ComfyUI，
          不要拖原始 <code className="code">ltxv_image_to_video.json</code>。
        </p>
        <code className="code" style={{ display: "block", overflowWrap: "anywhere", marginBottom: 10 }}>
          {patchedWorkflowDiskPath}
        </code>
        <CopyPromptButton prompt={patchedWorkflowDiskPath} />
        <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
          <p>
            Patch report：{" "}
            <strong style={{ color: patchReportExists ? "#047857" : "#b91c1c" }}>
              {patchReportExists ? "已生成" : "待生成"}
            </strong>{" "}
            <code className="code">{patchReport.detectedFormat ?? "unknown"}</code>
          </p>
          <p>
            checkpoint 替换：<strong>{checkpointCount > 0 ? "已替换" : "未确认"}</strong> · {checkpointCount}处
          </p>
          <p>
            prompt 替换：<strong>{promptCount > 0 ? "已替换" : "未确认"}</strong> · {promptCount}处
          </p>
          <p>
            image 设置：<strong>{imageCount > 0 ? "已设置" : "未确认"}</strong> · {imageCount}处
          </p>
          <p>
            目标 checkpoint：<code className="code">{COMFYUI_CHECKPOINT_MODEL_NAME}</code>
          </p>
          <p>
            目标图片：<code className="code">{COMFYUI_INPUT_IMAGE_NAME}</code>
          </p>
          {(patchReport.warnings ?? []).length > 0 ? (
            <div>
              <p className="small">Warnings:</p>
              <ul>
                {(patchReport.warnings ?? []).map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>

      <section className="card">
        <h2>V3 操作步骤</h2>
        <ol style={{ lineHeight: 1.8 }}>
          <li>
            运行 <code className="code">npm run prepare:lesson1-comfyui-run</code>
          </li>
          <li>
            运行 <code className="code">npm run export:lesson1-comfyui-api</code>
          </li>
          <li>
            如果 API workflow 已生成，运行 <code className="code">npm run queue:lesson1-comfyui</code>
          </li>
          <li>
            生成完成后运行 <code className="code">npm run pull:lesson1-comfyui-output</code>
          </li>
          <li>
            如需手动检查，打开 ComfyUI：<code className="code">{COMFYUI_URL}</code>
          </li>
        </ol>
        <p className="small">
          如果自动导出失败，再拖入 patched workflow 手动检查 checkpoint、prompt、图片，并在 ComfyUI 里 Save(API Format)。
        </p>
      </section>

      <section className="card">
        <h2>API 自动提交状态</h2>
        <p>
          API workflow：{" "}
          <strong style={{ color: apiWorkflowExists ? "#047857" : "#b91c1c" }}>
            {apiWorkflowExists ? "已存在" : "未生成"}
          </strong>
        </p>
        <code className="code" style={{ display: "block", overflowWrap: "anywhere", marginBottom: 10 }}>
          {apiWorkflowDiskPath}
        </code>
        <p>
          API export report：{" "}
          <strong style={{ color: apiExportReportExists ? "#047857" : "#b91c1c" }}>
            {apiExportReportExists ? "已生成" : "待生成"}
          </strong>{" "}
          <code className="code">{apiExportReport.sourceFormat ?? "unknown"}</code>
        </p>
        {apiExportReportExists ? (
          <div style={{ display: "grid", gap: 8 }}>
            <p>
              canAutoExport:{" "}
              <strong style={{ color: apiExportReport.canAutoExport ? "#047857" : "#b91c1c" }}>
                {String(Boolean(apiExportReport.canAutoExport))}
              </strong>
            </p>
            <p className="small">reason: {apiExportReport.reason}</p>
            <p className="small">nextAction: {apiExportReport.nextAction}</p>
            {(apiExportReport.warnings ?? []).length > 0 ? (
              <ul>
                {(apiExportReport.warnings ?? []).map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
        {apiWorkflowExists ? (
          <div style={{ marginTop: 12 }}>
            <p>可以尝试自动排队：</p>
            <code className="code">npm run queue:lesson1-comfyui</code>
            <p className="small">
              Queue result: {queueResultExists ? "已生成" : "待生成"} · {queueResultDiskPath}
            </p>
          </div>
        ) : (
          <div style={{ marginTop: 12 }}>
            <p>先尝试自动导出：</p>
            <code className="code">npm run export:lesson1-comfyui-api</code>
            <p className="small">
              如果无法自动转换：在 ComfyUI 打开 patched workflow，菜单保存为 API Format，并保存成{" "}
              <code className="code">lesson1_api_workflow.json</code>。
            </p>
          </div>
        )}
      </section>

      <section className="card">
        <h2>输出回传</h2>
        <p>从 ComfyUI output 拉取最新视频：</p>
        <code className="code">npm run pull:lesson1-comfyui-output</code>
        <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
          <p className="small">预览输出：</p>
          <code className="code" style={{ display: "block", overflowWrap: "anywhere" }}>
            {publicPathToDisk(LESSON_1_COMFYUI_TEST_PUBLIC_PATH)}
          </code>
          <p className="small">scene remake clip：</p>
          <code className="code" style={{ display: "block", overflowWrap: "anywhere" }}>
            {remakeClipDiskPath}
          </code>
          {outputMetadata.copiedAt ? (
            <p className="small">
              copiedAt: {outputMetadata.copiedAt} · size: {outputMetadata.fileSize ?? 0} bytes
            </p>
          ) : null}
        </div>
        {comfyuiTestVideoExists ? (
          <video
            controls
            src={LESSON_1_COMFYUI_TEST_PUBLIC_PATH}
            style={{ width: "100%", marginTop: 14, borderRadius: 8, background: "#0f172a" }}
          />
        ) : (
          <p className="small">暂无 comfyui-test.mp4。</p>
        )}
      </section>

      <section className="card">
        <h2>下一步 compose</h2>
        <p>
          scene_001_remake.mp4：{" "}
          <strong style={{ color: remakeClipExists ? "#047857" : "#b91c1c" }}>
            {remakeClipExists ? "已存在" : "未生成"}
          </strong>
        </p>
        {remakeClipExists ? <code className="code">npm run compose:lesson-1-remake</code> : null}
        <p className="small">最终输出：</p>
        <code className="code" style={{ display: "block", overflowWrap: "anywhere" }}>
          {finalRemakeDiskPath}
        </code>
        <p className="small">{finalRemakeExists ? "final.mp4 已存在" : "final.mp4 尚未生成"}</p>
      </section>

      <section className="card">
        <h2>打开位置</h2>
        <div style={{ display: "grid", gap: 8 }}>
          <code className="code">npm run open:lesson1-comfyui-inputs</code>
          <code className="code">npm run open:lesson1-comfyui-patched</code>
          <code className="code">npm run open:comfyui-ltx-workflow</code>
          <code className="code">npm run open:comfyui-input</code>
          <code className="code">npm run open:comfyui-output</code>
          <code className="code">npm run open:comfyui</code>
        </div>
        <p className="small">浏览器不能可靠直接打开本地 Finder，请在终端运行上面的命令。</p>
        <p className="small">
          本地开发如果出现 <code className="code">.next/vendor-chunks/next.js ENOENT</code>，
          请执行 <code className="code">rm -rf .next</code> 后重新启动{" "}
          <code className="code">npm run dev</code>。
        </p>
      </section>

      <section className="card">
        <h2>输入图片</h2>
        <p className="small">
          Source video: {LESSON_1_SOURCE_VIDEO_PATH} · {sourceExists ? "已找到" : "未找到"}
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
          {frames.map((frame) => (
            <article
              key={frame.filename}
              style={{ border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden" }}
            >
              {frame.exists ? (
                <img
                  src={frame.relativePath}
                  alt={frame.filename}
                  style={{ display: "block", width: "100%", aspectRatio: "16 / 9", objectFit: "cover" }}
                />
              ) : (
                <div style={{ padding: 18 }}>
                  <p>未生成</p>
                  <code className="code">npm run prepare:lesson1-comfyui</code>
                </div>
              )}
              <div style={{ padding: 12 }}>
                <h3 style={{ marginTop: 0 }}>
                  {frame.filename}{" "}
                  {frame.isRecommended ? <span className="homeTag">推荐使用</span> : null}
                </h3>
                <p className="small">时间点：{frame.timestamp || "待生成"}</p>
                <p className="small">相对路径：{frame.relativePath}</p>
                <p className="small">绝对路径：</p>
                <code className="code" style={{ display: "block", overflowWrap: "anywhere" }}>
                  {frame.absolutePath}
                </code>
                <div style={{ marginTop: 10 }}>
                  <CopyPromptButton prompt={frame.absolutePath} />
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Workflow JSON</h2>
        <p className="small">推荐拖入的 patched workflow：</p>
        <code className="code" style={{ display: "block", overflowWrap: "anywhere", marginBottom: 10 }}>
          {patchedWorkflowDiskPath}
        </code>
        <div style={{ marginBottom: 14 }}>
          <CopyPromptButton prompt={patchedWorkflowDiskPath} />
        </div>
        <p className="small">项目内可拖入页面的 workflow 副本：</p>
        <code className="code" style={{ display: "block", overflowWrap: "anywhere", marginBottom: 10 }}>
          {workflowCopiedDiskPath}
        </code>
        <div style={{ marginBottom: 14 }}>
          <CopyPromptButton prompt={workflowCopiedDiskPath} />
        </div>
        <p className="small">原始模板路径：</p>
        <code className="code" style={{ display: "block", overflowWrap: "anywhere" }}>
          {COMFYUI_LTX_WORKFLOW_PATH}
        </code>
        <div style={{ marginTop: 10 }}>
          <CopyPromptButton prompt={COMFYUI_LTX_WORKFLOW_PATH} />
        </div>
        <p className="small">项目输入图文件夹：{inputFolderAbsPath}</p>
        <p className="small">ComfyUI input 文件夹：{COMFYUI_INPUT_DIR}</p>
      </section>

      <section className="card">
        <h2>模型检查清单</h2>
        <ul style={{ lineHeight: 1.8 }}>
          {COMFYUI_MODEL_PATHS.map((item) => (
            <li key={item.path}>
              <strong style={{ color: fs.existsSync(item.path) ? "#047857" : "#b91c1c" }}>
                {fs.existsSync(item.path) ? "已找到" : "未找到"}
              </strong>{" "}
              <code className="code">{item.label}</code>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>推荐 prompt</h2>
        <textarea
          readOnly
          value={COMFYUI_LESSON_1_PROMPT}
          style={{ width: "100%", minHeight: 150, padding: 12, lineHeight: 1.55 }}
        />
        <div style={{ marginTop: 10 }}>
          <CopyPromptButton prompt={COMFYUI_LESSON_1_PROMPT} />
        </div>
      </section>

      <section className="card">
        <h2>低配置测试参数</h2>
        <ul>
          <li>duration: 2 seconds</li>
          <li>fps: 8 or 12</li>
          <li>resolution: 512px width</li>
          <li>steps: low first, then increase</li>
        </ul>
        <p className="small">JSON 参数：</p>
        <code className="code">{JSON.stringify(COMFYUI_RECOMMENDED_PARAMS)}</code>
        <p className="small">输出目录提示：</p>
        <code className="code">{COMFYUI_OUTPUT_HINT}</code>
      </section>
    </main>
  );
}
