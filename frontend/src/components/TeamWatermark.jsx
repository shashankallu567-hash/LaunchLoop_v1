/**
 * TeamWatermark — subtle, centered background watermark for TAS INNOVATORS.
 *
 * TO USE THE REAL LOGO: drop the file at /app/frontend/public/tas-innovators-logo.png
 * (transparent PNG recommended) and set LOGO_SRC below to "/tas-innovators-logo.png".
 * Everything else (positioning, opacity, theme handling) stays the same.
 */
const LOGO_SRC = null; // e.g. "/tas-innovators-logo.png"

export default function TeamWatermark({ sidebarOffset = false }) {
  return (
    <div
      aria-hidden="true"
      data-testid="team-watermark"
      className={`fixed inset-0 z-0 pointer-events-none overflow-hidden flex items-center justify-center select-none ${
        sidebarOffset ? "lg:left-64" : ""
      }`}
    >
      {/* opacity kept low & theme-aware: lighter in light mode for readability */}
      <div className="opacity-[0.07] dark:opacity-[0.10]">
        {LOGO_SRC ? (
          <img
            src={LOGO_SRC}
            alt=""
            className="w-[min(70vw,720px)] max-w-none object-contain"
            draggable={false}
          />
        ) : (
          <div className="flex flex-col items-center leading-none text-center">
            <span
              className="font-heading font-extrabold tracking-tight"
              style={{
                color: "#C9A227",
                fontSize: "clamp(3.5rem, 20vw, 15rem)",
                letterSpacing: "-0.03em",
              }}
            >
              TAS
            </span>
            <span
              className="font-heading font-bold"
              style={{
                color: "#C9A227",
                fontSize: "clamp(1rem, 6vw, 4.25rem)",
                letterSpacing: "0.25em",
                marginTop: "0.15em",
              }}
            >
              INNOVATORS
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
