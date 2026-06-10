"use client";

export function RefreshResultStatusButton() {
  return (
    <button className="pillLink" type="button" onClick={() => window.location.reload()}>
      刷新结果状态
    </button>
  );
}
