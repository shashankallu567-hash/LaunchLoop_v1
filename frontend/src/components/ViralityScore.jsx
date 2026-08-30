import { motion } from "framer-motion";
import CountUp from "@/components/CountUp";

const FACTOR_ORDER = ["hook", "emotion", "audience_fit", "shareability", "platform_fit"];

function barColor(v) {
  if (v >= 75) return "#D3FF24";
  if (v >= 55) return "#0066FF";
  if (v >= 40) return "#F5A623";
  return "#FF3366";
}

function gradeColor(grade) {
  return { A: "#D3FF24", B: "#0066FF", C: "#F5A623", D: "#FF3366" }[grade] || "#A1A1AA";
}

export default function ViralityScore({ score, compact = false, testid = "virality-score" }) {
  if (!score) return null;
  const factors = FACTOR_ORDER.map((k) => score.factors[k]).filter(Boolean);

  if (compact) {
    return (
      <div className="flex items-center gap-3" data-testid={testid}>
        <div className="font-mono-metric text-2xl font-bold" style={{ color: gradeColor(score.grade) }}>
          {score.overall}
        </div>
        <div className="flex gap-1">
          {factors.map((f) => (
            <div key={f.key} className="h-6 w-1.5 rounded-full bg-white/10 overflow-hidden flex flex-col justify-end" title={`${f.label}: ${f.score}`}>
              <div style={{ height: `${f.score}%`, backgroundColor: barColor(f.score) }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-panel p-6" data-testid={testid}>
      <div className="flex items-start justify-between gap-6 mb-6">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Virality Score</div>
          <div className="flex items-baseline gap-3">
            <CountUp value={score.overall} className="font-mono-metric text-5xl font-bold" />
            <span className="font-mono-metric text-2xl font-bold px-2 py-0.5 rounded-md"
              style={{ color: "#000", backgroundColor: gradeColor(score.grade) }}>
              {score.grade}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-2 max-w-md">{score.verdict}</p>
        </div>
      </div>

      <div className="space-y-4">
        {factors.map((f, i) => (
          <motion.div key={f.key}
            initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }} data-testid={`factor-${f.key}`}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{f.label}</span>
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {Math.round(f.weight * 100)}% weight
                </span>
              </div>
              <span className="font-mono-metric text-sm font-bold" style={{ color: barColor(f.score) }}>
                {f.score}
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/5 overflow-hidden">
              <motion.div className="h-full rounded-full"
                initial={{ width: 0 }} animate={{ width: `${f.score}%` }}
                transition={{ delay: i * 0.06 + 0.1, duration: 0.6, ease: "easeOut" }}
                style={{ backgroundColor: barColor(f.score) }} />
            </div>
            <ul className="mt-1.5 space-y-0.5">
              {f.reasons.map((r, j) => (
                <li key={j} className="text-xs text-muted-foreground flex gap-1.5">
                  <span className="text-white/30 mt-px">›</span>{r}
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>

      <div className="mt-5 pt-4 border-t border-white/10 text-xs text-muted-foreground">
        Overall = weighted sum of the five factors above. Deterministic &amp; explainable — the same copy always scores the same.
      </div>
    </div>
  );
}
