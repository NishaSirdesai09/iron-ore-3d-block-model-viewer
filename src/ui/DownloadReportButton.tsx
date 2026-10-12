import { useState } from "react";
import { useStore } from "../state/store";

/** Saves a PDF resource report at the current cut-off. */
export function DownloadReportButton({ className = "btn" }: { className?: string }) {
  const cut = useStore((s) => s.cut);
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");

  const onClick = async () => {
    setState("busy");
    try {
      const { downloadReport } = await import("../report/download");
      await downloadReport(cut);
      setState("idle");
    } catch (err) {
      console.error(err);
      setState("error");
    }
  };

  return (
    <>
      <button
        className={className}
        onClick={onClick}
        disabled={state === "busy"}
        aria-busy={state === "busy"}
        title={`Download a PDF report at the ${cut}% Fe cut-off`}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          aria-hidden="true"
          style={{ marginRight: 6, verticalAlign: -2 }}
        >
          <path
            d="M8 1.5v8.5M4.5 6.8 8 10.3l3.5-3.5M2.5 12.5v2h11v-2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {state === "busy" ? "Preparing report…" : "Download report (PDF)"}
      </button>
      {state === "error" && (
        <span className="hint" role="alert" style={{ margin: 0 }}>
          The report could not be created. Please try again.
        </span>
      )}
    </>
  );
}
