import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { ChevronDown, AlertTriangle } from "lucide-react";
import CountUp from "@/components/CountUp";

const FACTOR_ORDER = ["hook", "emotion", "audience_fit", "shareability", "platform_fit"];

function barColor(v) {
  if (v >= 75) return "var(--score-strong)";
  if (v >= 55) return "var(--score-mid)";
  if (v >= 40) return "var(--warning)";
  return "var(--score-weak)";
}

function gradeColor(grade) {
  return { A: "var(--score-strong)", B: "var(--score-mid)", C: "var(--warning)", D: "var(--score-weak)" }[grade] || "hsl(var(--muted-foreground))";
}

export default function ViralityScore({ score, compact = false, defaultOpen = false, testid = "virality-score" }) {
  const [open, setOpen] = useState(defaultOpen ? Object.fromEntries(FACTOR_ORDER.map((k) => [k, true])) : {});
  if (!score) return null;
  const factors = FACTOR_ORDER.map((k) => score.factors[k]).filter(Boolean);
  const toggle = (k) => setOpen((o) => ({ ...o, [k]: !o[k] }));

  if (compact) {
    return (
      <div className="flex items-center gap-3" data-testid={testid}>
        <div className="font-mono-metric text-2xl font-bold" style={{ color: gradeColor(score.grade) }}>
          {score.overall}
        </div>
        <div className="flex gap-1">
          {factors.map((f) => (
            <div key={f.key} className="h-6 w-1.5 rounded-full bg-surface overflow-hidden flex flex-col justify-end" title={`${f.label}: ${f.score}`}>
              <div style={{ height: `${f.score}%`, backgroundColor: barColor(f.score) }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-panel p-6" data-testid={testid}>
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
        {factors.map((f, i) => {
          const weak = f.score < 55;
          const isOpen = !!open[f.key];
          return (
          <motion.div key={f.key}
            initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }} data-testid={`factor-${f.key}`}>
            <button onClick={() => toggle(f.key)} data-testid={`factor-toggle-${f.key}`}
              aria-expanded={isOpen} aria-label={`${f.label} explanation`}
              className="w-full flex items-center justify-between mb-1.5 py-1 group focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">
              <div className="flex items-center gap-2 text-left">
                <ChevronDown size={13} className={`text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                <span className="text-sm font-medium">{f.label}</span>
                {weak && <AlertTriangle size={12} style={{ color: "var(--warning)" }} aria-label="weak factor" />}
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {Math.round(f.weight * 100)}% weight
                </span>
              </div>
              <span className="font-mono-metric text-sm font-bold" style={{ color: barColor(f.score) }}>
                {f.score}
              </span>
            </button>
            <div className="h-2 rounded-full bg-track overflow-hidden">
              <motion.div className="h-full rounded-full"
                initial={{ width: 0 }} animate={{ width: `${f.score}%` }}
                transition={{ delay: i * 0.06 + 0.1, duration: 0.6, ease: "easeOut" }}
                style={{ backgroundColor: barColor(f.score) }} />
            </div>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }} className="mt-1.5 space-y-0.5 overflow-hidden">
                  {f.reasons.map((r, j) => (
                    <li key={`${f.key}-${j}`} className="text-xs text-muted-foreground flex gap-1.5">
                      <span className="text-foreground/30 mt-px">›</span>{r}
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </motion.div>
          );
        })}
      </div>

      <div className="mt-4 text-[11px] text-muted-foreground">Tap any factor to expand its explanation.</div>
      <div className="mt-3 pt-4 border-t border-border text-xs text-muted-foreground">
        Overall = weighted sum of the five factors above. Deterministic &amp; explainable — the same copy always scores the same.
      </div>
    </div>
  );
}
