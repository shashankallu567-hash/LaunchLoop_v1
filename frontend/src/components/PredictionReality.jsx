import CountUp from "@/components/CountUp";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const METRICS = [
  { key: "impressions", label: "Impressions" },
  { key: "engagement", label: "Engagement" },
  { key: "shares", label: "Shares" },
  { key: "conversions", label: "Conversions" },
];

const VERDICT_STYLE = {
  OVERPERFORMED: { color: "var(--pos)", bg: "rgba(120,200,60,0.14)", Icon: TrendingUp },
  UNDERPERFORMED: { color: "var(--neg)", bg: "rgba(220,60,60,0.14)", Icon: TrendingDown },
  MATCHED: { color: "var(--info)", bg: "rgba(60,120,220,0.14)", Icon: Minus },
};

export default function PredictionReality({ prediction, outcome, delta, source, testid = "prediction-reality" }) {
  if (!prediction) return null;
  const summary = delta?._summary;
  const vs = VERDICT_STYLE[summary?.verdict] || VERDICT_STYLE.MATCHED;

  return (
    <div className="rounded-xl border border-border bg-panel p-6" data-testid={testid}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Prediction vs Reality</div>
          <div className="text-sm text-muted-foreground">
            {source === "real" ? "Real metrics you entered" : "Synthetic plausible outcome"}
          </div>
        </div>
        {summary && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full font-mono-metric text-sm font-bold"
            style={{ color: vs.color, backgroundColor: vs.bg }} data-testid="pvr-verdict">
            <vs.Icon size={16} />
            {summary.verdict}
            <span className="opacity-70">({summary.avg_pct > 0 ? "+" : ""}{summary.avg_pct}%)</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {METRICS.map((m) => {
          const d = delta?.[m.key];
          const pred = prediction[m.key] ?? 0;
          const real = outcome?.[m.key];
          const up = d ? d.diff >= 0 : true;
          return (
            <div key={m.key} className="rounded-lg border border-border bg-surface p-4" data-testid={`pvr-${m.key}`}>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">{m.label}</div>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-[10px] text-muted-foreground">PRED</span>
                <CountUp value={pred} className="font-mono-metric text-sm text-foreground/70" />
              </div>
              {outcome != null && (
                <div className="flex items-baseline justify-between">
                  <span className="text-[10px] text-muted-foreground">REAL</span>
                  <CountUp value={real} className="font-mono-metric text-lg font-bold text-foreground" />
                </div>
              )}
              {d && (
                <div className="mt-2 font-mono-metric text-xs font-bold"
                  style={{ color: up ? "var(--pos)" : "var(--neg)" }}>
                  {up ? "+" : ""}{d.pct}%
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
