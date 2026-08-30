import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { toast } from "sonner";
import CountUp from "@/components/CountUp";
import { Brain, Loader2, Check, AlertCircle, Sparkles, RefreshCw } from "lucide-react";

function scoreColor(v) {
  if (v >= 75) return "var(--score-strong)";
  if (v >= 55) return "var(--score-mid)";
  if (v >= 40) return "var(--warning)";
  return "var(--score-weak)";
}

export default function DeepAnalysis({ headline, body, audience, goal, platform, heuristic, campaignId, initial, readOnly = false, testid = "deep-analysis" }) {
  const [state, setState] = useState(initial ? "done" : "idle"); // idle | loading | done | error
  const [res, setRes] = useState(initial || null);

  const run = async () => {
    setState("loading");
    try {
      const { data } = campaignId
        ? await api.post(`/campaigns/${campaignId}/deep-analysis`)
        : await api.post("/deep-analysis", { headline, body, audience, goal, platform, heuristic });
      setRes(data);
      setState("done");
      if (campaignId) toast.success("Deep Analysis saved to report");
    } catch {
      setState("error");
      toast.error("Deep Analysis unavailable — showing heuristic only");
    }
  };

  return (
    <div className="rounded-xl border border-border bg-panel p-6" data-testid={testid}>
      <div className="flex items-center justify-between gap-3 mb-1">
        <div className="flex items-center gap-2">
          <Brain size={18} className="text-growth" />
          <h3 className="font-heading font-bold">Deep Analysis</h3>
          <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-surface text-muted-foreground">AI second opinion</span>
        </div>
        {state === "done" && !readOnly && (
          <button onClick={run} data-testid="deep-rerun" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"><RefreshCw size={12} /> Re-run</button>
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-4">{readOnly ? "AI second opinion captured for this launch." : "Optional — the heuristic stays your primary score. AI independently judges the same five factors."}</p>

      {readOnly && !res ? (
        <div className="text-sm text-muted-foreground py-4">No Deep Analysis was saved for this launch.</div>
      ) : (state === "idle" || state === "error") ? (
        <button onClick={run} data-testid="run-deep-analysis"
          className="w-full flex items-center justify-center gap-2 border border-growth/40 bg-growth/10 text-growth font-semibold py-2.5 rounded-lg transition-transform hover:scale-[0.99] active:scale-95">
          <Sparkles size={16} /> {state === "error" ? "Retry Deep Analysis" : "Run Deep Analysis"}
        </button>
      ) : state === "loading" ? (
        <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground"><Loader2 className="animate-spin" size={18} /> AI is judging the angle…</div>
      ) : (
        <AnimatePresence>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} data-testid="deep-analysis-result">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 mb-5">
              <div className="rounded-lg border border-border bg-surface p-4 text-center">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Heuristic</div>
                <CountUp value={res.heuristic.overall} className="font-mono-metric text-3xl font-bold" />
              </div>
              <div className="text-xs text-muted-foreground font-mono-metric">vs</div>
              <div className="rounded-lg border border-growth/30 bg-growth/5 p-4 text-center">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">AI 2nd Opinion</div>
                <CountUp value={res.ai.overall} className="font-mono-metric text-3xl font-bold" style={{ color: scoreColor(res.ai.overall) }} />
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex gap-2.5" data-testid="deep-agreement">
                <Check size={16} className="mt-0.5 shrink-0" style={{ color: "var(--pos)" }} />
                <div><div className="text-[11px] uppercase tracking-wide text-muted-foreground">Agreement</div><p className="text-sm">{res.comparison.agreement}</p></div>
              </div>
              <div className="flex gap-2.5" data-testid="deep-difference">
                <AlertCircle size={16} className="mt-0.5 shrink-0" style={{ color: "var(--warning)" }} />
                <div><div className="text-[11px] uppercase tracking-wide text-muted-foreground">Difference</div><p className="text-sm">{res.comparison.difference}</p></div>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2 mb-4">
              {res.comparison.factor_diffs.map((f) => (
                <div key={f.key} className="text-center">
                  <div className="text-[9px] uppercase text-muted-foreground truncate" title={f.label}>{f.label.split(" ")[0]}</div>
                  <div className="font-mono-metric text-xs mt-1"><span className="text-muted-foreground">{f.heuristic}</span><span className="text-muted-foreground">/</span><span style={{ color: scoreColor(f.ai) }}>{f.ai}</span></div>
                </div>
              ))}
            </div>

            <div className="rounded-lg bg-surface border border-border p-3">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5 flex items-center gap-1"><Sparkles size={11} /> AI-generated reasons{res.ai.source === "fallback" ? " (heuristic estimate — AI offline)" : ""}</div>
              <ul className="space-y-1">
                {res.ai.reasons.map((r, i) => <li key={i} className="text-xs text-muted-foreground flex gap-1.5"><span className="text-growth mt-px">›</span>{r}</li>)}
              </ul>
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
