"use client";

import { boxScoreCsv, type BoxScoreSnapshot } from "@/lib/boxScoreExport";

export default function BoxScoreExport({ snapshot }: { snapshot: BoxScoreSnapshot }) {
  function download() {
    const blob = new Blob(["\uFEFF", boxScoreCsv(snapshot)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sce-picks-box-score.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  return (
    <button
      type="button"
      onClick={download}
      className="rounded-lg border border-line px-3 py-2 text-xs font-black uppercase tracking-wider text-bone hover:bg-panel"
    >
      Export CSV
    </button>
  );
}
