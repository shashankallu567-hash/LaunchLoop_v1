import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { toast } from "sonner";
import { Wand2, Loader2, ArrowRight, Check, X, RotateCw } from "lucide-react";

const FACTOR_ORDER = ["hook", "emotion", "audience_fit", "shareability", "platform_fit"];

function chipColor(v) {
  if (v >= 75) return "var(--score-strong)";
  if (v >= 55) return "var(--score-mid)";
  if (v >= 40) return "var(--warning)";
  return "var(--score-weak)";
}

export default function AngleRewrite({ angle, audience, goal, platform, onApply, testid = "angle-rewrite" }) {
  const [selected, setSelected] = useState(null); // factor key
  const [state, setState] = useState("idle"); // idle | loading | done
  const [res, setRes] = useState(null);

  const factors = FACTOR_ORDER.map((k) => angle.score?.factors?.[k]).filter(Boolean);
  const weakest = factors.length ? factors.reduce((a, b) => (a.score <= b.score ? a : b)) : null;

  const pick = (key) => { setSelected(key); setState("idle"); setRes(null); };

  const rewrite = async () => {
    if (!selected) return;
    setState("loading");
    try {
      const { data } = await api.post("/rewrite", {
        headline: angle.headline, body: angle.body, weak_factor: selected,
        audience, goal, platform, before_score: angle.score,
      });
      setRes(data);
      setState("done");
    } catch {
      setState("idle");
      toast.error("Rewrite unavailable — please try again");
    }
  };

  const keepImproved = () => {
    onApply({ ...angle, headline: res.improved.headline, body: res.improved.body, score: res.improved.score });
    const up = res.improved.score.overall >= res.original.score.overall;
    if (up) toast.success("Improved angle applied");
    else toast.message("Applied new version (lower score)");
    setSelected(null); setRes(null); setState("idle");
  };

  const selFactor = angle.score?.factors?.[selected];

  return (
    <div className="rounded-xl border border-border bg-panel p-6" data-testid={testid}>
      <div className="flex items-center gap-2 mb-1">
        <Wand2 size={18} className="text-growth" />
        <h3 className="font-heading font-bold">Angle Rewrite</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">Select a weak factor and let AI rewrite the angle to lift it — everything else stays the same.</p>

      <div className="flex flex-wrap gap-2 mb-4">
        {factors.map((f) => {
          const isWeak = weakest && f.key === weakest.key;
          const active = selected === f.key;
          return (
            <button key={f.key} onClick={() => pick(f.key)} data-testid={`rewrite-factor-${f.key}`}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs transition-colors ${active ? "border-growth bg-growth/10" : isWeak ? "border-warning/50 bg-warning/5" : "border-border bg-surface hover:border-borderStrong"}`}>
              <span>{f.label}</span>
              <span className="font-mono-metric font-bold" style={{ color: chipColor(f.score) }}>{f.score}</span>
            </button>
          );
        })}
      </div>

      {selected && selFactor && (
        <div className="rounded-lg bg-surface border border-border p-4 mb-4" data-testid="rewrite-why-weak">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
            {selFactor.score < 65
              ? `Why ${selFactor.label} is at ${selFactor.score}`
              : `${selFactor.label} is already strong at ${selFactor.score} — rewriting may not lift it`}
          </div>
          <ul className="space-y-1">
            {selFactor.reasons.slice(0, 2).map((r, i) => <li key={i} className="text-xs text-muted-foreground flex gap-1.5"><span className="text-foreground/30 mt-px">›</span>{r}</li>)}
          </ul>
          {state !== "done" && (
            <button onClick={rewrite} disabled={state === "loading"} data-testid="rewrite-angle-btn"
              className="mt-3 flex items-center gap-2 bg-growth text-black font-semibold px-4 py-2 rounded-lg text-sm transition-transform hover:scale-[0.98] active:scale-95 disabled:opacity-60">
              {state === "loading" ? <><Loader2 size={15} className="animate-spin" /> Rewriting…</> : <><Wand2 size={15} /> Rewrite Angle</>}
            </button>
          )}
        </div>
      )}

      <AnimatePresence>
        {state === "done" && res && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} data-testid="rewrite-result">
            <div className="space-y-3">
              <div className="rounded-lg border border-border p-3">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Before</div>
                <p className="text-sm text-muted-foreground line-through decoration-1">{res.original.headline}</p>
              </div>
              <div className="rounded-lg border border-growth/40 bg-growth/5 p-3">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">After</div>
                <p className="text-sm font-medium">{res.improved.headline}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{selFactor?.label}</span>
                <div className="flex items-center gap-2 font-mono-metric font-bold">
                  <span style={{ color: chipColor(res.original.score.factors[selected].score) }}>{res.original.score.factors[selected].score}</span>
                  <ArrowRight size={14} className="text-muted-foreground" />
                  <span style={{ color: chipColor(res.improved.score.factors[selected].score) }}>{res.improved.score.factors[selected].score}</span>
                </div>
                <span className="text-[11px] text-muted-foreground">· overall {res.original.score.overall} → <span className="text-foreground font-mono-metric">{res.improved.score.overall}</span></span>
              </div>
              <div className="rounded-lg bg-surface border border-border p-3">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">What changed{res.source === "fallback" ? " (offline rewrite)" : ""}</div>
                <p className="text-xs text-muted-foreground">{res.what_changed}</p>
              </div>
              {(() => {
                const before = res.original.score.overall;
                const after = res.improved.score.overall;
                const up = after >= before;
                return (
                  <>
                    {!up && (
                      <div className="flex gap-2 rounded-lg border p-3 text-xs" style={{ borderColor: "var(--warning)", background: "rgba(168,101,0,0.08)" }} data-testid="rewrite-downgrade-warning">
                        <span style={{ color: "var(--warning)" }}>⚠</span>
                        <span>This rewrite <strong>lowered</strong> the overall score ({before} → {after}). We recommend keeping the original or trying again.</span>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button onClick={keepImproved} data-testid="keep-improved-btn"
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-transform hover:scale-[0.98] active:scale-95 ${up ? "bg-growth text-black" : "border border-border hover:bg-surface"}`}>
                        <Check size={15} /> {up ? "Keep Improved" : "Use New Version"}
                      </button>
                      <button onClick={() => { setSelected(null); setRes(null); setState("idle"); }} data-testid="keep-original-btn"
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${up ? "border border-border hover:bg-surface" : "bg-growth text-black transition-transform hover:scale-[0.98] active:scale-95"}`}>
                        <X size={15} /> Keep Original
                      </button>
                      <button onClick={rewrite} data-testid="try-again-btn" className="flex items-center gap-1.5 border border-border px-4 py-2 rounded-lg text-sm hover:bg-surface transition-colors"><RotateCw size={15} /> Try Again</button>
                    </div>
                  </>
                );
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
