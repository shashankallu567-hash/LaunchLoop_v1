import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { toast } from "sonner";
import ViralityScore from "@/components/ViralityScore";
import DeepAnalysis from "@/components/DeepAnalysis";
import PredictionReality from "@/components/PredictionReality";
import {
  Target, Rocket, Activity, Brain, ArrowLeft, Share2, RefreshCw, PencilLine, Check, Loader2,
} from "lucide-react";

const STAGES = [
  { key: "prediction", label: "PREDICTION", icon: Target, color: "var(--info)" },
  { key: "launch", label: "LAUNCH", icon: Rocket, color: "hsl(var(--foreground))" },
  { key: "reality", label: "REALITY", icon: Activity, color: "var(--pos)" },
  { key: "learning", label: "LEARNING", icon: Brain, color: "var(--neg)" },
];

function StageHeader({ stage, num }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-9 w-9 rounded-lg border border-border bg-surface flex items-center justify-center">
        <stage.icon size={18} style={{ color: stage.color }} />
      </div>
      <div>
        <div className="font-mono-metric text-xs font-bold" style={{ color: stage.color }}>{num} · {stage.label}</div>
      </div>
    </div>
  );
}

export default function ExperimentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [c, setC] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ impressions: 0, engagement: 0, shares: 0, conversions: 0 });
  const [busy, setBusy] = useState(false);

  const load = () => api.get(`/campaigns/${id}`).then((r) => {
    setC(r.data);
    setForm(r.data.outcome || { impressions: 0, engagement: 0, shares: 0, conversions: 0 });
  }).catch(() => toast.error("Not found")).finally(() => setLoading(false));

  useEffect(() => { load(); }, [id]);

  const resynth = async () => {
    setBusy(true);
    try { const { data } = await api.post(`/campaigns/${id}/resynth`); setC(data); setForm(data.outcome); toast.success("New synthetic outcome generated"); }
    finally { setBusy(false); }
  };

  const saveReal = async () => {
    setBusy(true);
    try {
      const { data } = await api.post(`/campaigns/${id}/outcome`, {
        impressions: Number(form.impressions), engagement: Number(form.engagement),
        shares: Number(form.shares), conversions: Number(form.conversions),
      });
      setC(data); setEditing(false); toast.success("Real metrics saved — loop updated");
    } catch { toast.error("Could not save"); } finally { setBusy(false); }
  };

  if (loading) return <div className="h-96 rounded-xl border border-border bg-panel animate-pulse" />;
  if (!c) return <div className="text-muted-foreground">Experiment not found.</div>;

  return (
    <div className="space-y-6">
      <button onClick={() => navigate("/app/experiments")} data-testid="back-experiments" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft size={16} /> Experiments
      </button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-heading text-2xl md:text-3xl font-extrabold tracking-tight">{c.product_name}</h1>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-surface text-muted-foreground">{c.angle.channel}</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-surface text-muted-foreground">{c.goal}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">{c.product_description}</p>
        </div>
        <button onClick={() => navigate(`/report/${c.id}`)} data-testid="open-report-btn"
          className="flex items-center gap-2 border border-border px-4 py-2.5 rounded-lg text-sm hover:bg-surface transition-colors">
          <Share2 size={16} /> Share report
        </button>
      </div>

      {/* Twin loop rail */}
      <div className="grid md:grid-cols-4 gap-3">
        {STAGES.map((s, i) => (
          <div key={s.key} className="rounded-lg border border-border bg-panel p-3 flex items-center gap-2">
            <s.icon size={16} style={{ color: s.color }} />
            <span className="font-mono-metric text-[11px] font-bold" style={{ color: s.color }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* STAGE 1 — PREDICTION (angle + score) */}
      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <StageHeader stage={STAGES[0]} num="01" />
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-panel p-6">
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Winning launch angle</div>
            <div className="font-heading text-lg font-bold leading-snug">{c.angle.headline}</div>
            <p className="text-sm text-muted-foreground mt-2">{c.angle.body}</p>
            <div className="text-xs text-muted-foreground mt-3">{c.angle.channel} · {c.angle.format}</div>
          </div>
          <ViralityScore score={c.score} />
        </div>
        <DeepAnalysis headline={c.angle.headline} body={c.angle.body} audience={c.audience_snapshot}
          goal={c.goal} platform={c.angle.channel} heuristic={c.score} />
      </motion.section>

      {/* STAGE 2 — LAUNCH */}
      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <StageHeader stage={STAGES[1]} num="02" />
        <div className="rounded-xl border border-border bg-panel p-6 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            Launched to <span className="text-foreground">{(c.platforms || [c.angle.channel]).join(", ")}</span> targeting <span className="text-foreground">{c.audience_snapshot?.name || "your audience"}</span>.
          </div>
          <div className="flex items-center gap-1.5 text-xs text-growth"><Check size={14} /> Live</div>
        </div>
      </motion.section>

      {/* STAGE 3 — REALITY */}
      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <StageHeader stage={STAGES[2]} num="03" />
        <PredictionReality prediction={c.prediction} outcome={c.outcome} delta={c.delta} source={c.outcome_source} />

        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => setEditing((v) => !v)} data-testid="enter-real-btn"
            className="flex items-center gap-2 border border-border px-4 py-2 rounded-lg text-sm hover:bg-surface transition-colors">
            <PencilLine size={15} /> {c.outcome_source === "real" ? "Edit real metrics" : "Enter real metrics"}
          </button>
          <button onClick={resynth} disabled={busy} data-testid="resynth-btn"
            className="flex items-center gap-2 border border-border px-4 py-2 rounded-lg text-sm hover:bg-surface transition-colors disabled:opacity-60">
            {busy ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} Regenerate synthetic
          </button>
          {c.outcome_source === "synthetic" && <span className="text-xs text-muted-foreground">Synthetic (deterministic) data — override with real numbers anytime.</span>}
        </div>

        {editing && (
          <div className="rounded-xl border border-border bg-panel p-6" data-testid="real-metrics-form">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {["impressions", "engagement", "shares", "conversions"].map((k) => (
                <div key={k}>
                  <label className="text-[11px] uppercase tracking-wide text-muted-foreground">{k}</label>
                  <input type="number" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} data-testid={`real-${k}`}
                    className="mt-1.5 w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm font-mono-metric focus:outline-none focus:ring-2 focus:ring-white/50" />
                </div>
              ))}
            </div>
            <button onClick={saveReal} disabled={busy} data-testid="save-real-btn"
              className="mt-4 bg-growth text-black font-semibold px-5 py-2.5 rounded-lg text-sm transition-transform hover:scale-[0.98] active:scale-95 disabled:opacity-60">
              {busy ? "Saving…" : "Save real metrics"}
            </button>
          </div>
        )}
      </motion.section>

      {/* STAGE 4 — LEARNING */}
      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <StageHeader stage={STAGES[3]} num="04" />
        <div className="rounded-xl border border-border bg-panel p-6 grain" data-testid="learning-note">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">What we learned</div>
          <p className="text-base leading-relaxed">{c.learning}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button onClick={() => navigate("/app/launch")} data-testid="start-new-experiment"
              className="flex items-center gap-2 bg-foreground text-background font-semibold px-5 py-2.5 rounded-lg text-sm transition-transform hover:scale-[0.98] active:scale-95">
              <Rocket size={16} /> Start new experiment
            </button>
            <button onClick={() => navigate(`/report/${c.id}`)} className="flex items-center gap-2 border border-border px-5 py-2.5 rounded-lg text-sm hover:bg-surface transition-colors">
              <Share2 size={16} /> Share report
            </button>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
