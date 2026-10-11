import { useStore } from "../state/store";

/** North arrow that turns with the camera's azimuth. */
export function Compass() {
  const azimuth = useStore((s) => s.azimuth);
  return (
    <div className="compass" role="img" aria-label="North arrow">
      <span aria-hidden="true">N</span>
      <svg
        width="30"
        height="30"
        viewBox="-15 -15 30 30"
        aria-hidden="true"
        style={{ transform: `rotate(${((azimuth * 180) / Math.PI).toFixed(1)}deg)` }}
      >
        <path d="M0 -10 L4 4 L0 1.5 L-4 4Z" fill="currentColor" />
      </svg>
    </div>
  );
}
