"use client";

export function CopyPromptButton({ prompt }: { prompt: string }) {
  return (
    <button
      className="btn"
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(prompt);
      }}
    >
      复制
    </button>
  );
}
