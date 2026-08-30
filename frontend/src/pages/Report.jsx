import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";
import ViralityScore from "@/components/ViralityScore";
import DeepAnalysis from "@/components/DeepAnalysis";
import PredictionReality from "@/components/PredictionReality";
import { Sparkles, Link2, Download, Rocket, Brain, Dna } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import TeamWatermark from "@/components/TeamWatermark";

export default function Report() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [c, setC] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    api.get(`/report/${id}`).then((r) => setC(r.data)).catch(() => setError(true)).finally(() => setLoading(false));
  }, [id]);

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(window.location.href); toast.success("Share link copied"); }
    catch { toast.error("Copy failed — select the URL manually"); }
  };
  const download = () => window.print();

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="h-8 w-8 rounded-full border-2 border-border border-t-growth animate-spin" /></div>;
  if (error || !c) return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center gap-4">
      <p className="text-muted-foreground">Report not found.</p>
      <button onClick={() => navigate("/")} className="bg-foreground text-background font-semibold px-4 py-2 rounded-lg text-sm">Go home</button>
    </div>
  );

  const aud = c.audience_snapshot || {};

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TeamWatermark />
      {/* action bar */}
      <div className="no-print glass border-b border-border sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-growth flex items-center justify-center"><Sparkles size={18} className="text-black" /></div>
            <span className="font-heading font-extrabold tracking-tight">LaunchLoop<span className="text-growth">.</span></span>
          </button>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <ThemeToggle />
            <button onClick={copyLink} data-testid="copy-link-btn" className="flex items-center gap-2 border border-border px-3 py-2 rounded-lg text-sm hover:bg-surface transition-colors"><Link2 size={15} /> <span className="hidden sm:inline">Copy link</span></button>
            <button onClick={download} data-testid="download-report-btn" className="flex items-center gap-2 border border-border px-3 py-2 rounded-lg text-sm hover:bg-surface transition-colors"><Download size={15} /> <span className="hidden sm:inline">Download</span></button>
            <button onClick={() => navigate("/app/launch")} data-testid="report-new-experiment" className="flex items-center gap-2 bg-growth text-black font-semibold px-3 py-2 rounded-lg text-sm transition-transform hover:scale-[0.98] active:scale-95"><Rocket size={15} /> <span className="hidden sm:inline">New experiment</span></button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-5 md:px-8 py-10 space-y-8 relative z-10" data-testid="report-content">
        {/* header */}
        <div className="grain rounded-2xl border border-border bg-panel p-8">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Launch report</div>
          <h1 className="font-heading text-3xl md:text-4xl font-extrabold tracking-tight">{c.product_name}</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">{c.product_description}</p>
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-surface text-muted-foreground">by {c.founder}</span>
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-surface text-muted-foreground">{c.angle.channel}</span>
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-surface text-muted-foreground">Goal: {c.goal}</span>
          </div>
        </div>

        {/* audience */}
        <div className="rounded-xl border border-border bg-panel p-6">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5"><Dna size={13} /> Audience</div>
          <div className="font-heading font-bold text-lg">{aud.name || "General audience"}</div>
          {aud.description && <p className="text-sm text-muted-foreground mt-1">{aud.description}</p>}
          {(aud.pain_points || []).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {aud.pain_points.map((p) => <span key={p} className="text-[11px] px-2 py-0.5 rounded-full bg-surface text-foreground/80">{p}</span>)}
            </div>
          )}
        </div>

        {/* winning angle */}
        <div className="rounded-xl border border-border bg-panel p-6">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Winning launch angle</div>
          <div className="font-heading text-xl font-bold leading-snug">{c.angle.headline}</div>
          <p className="text-sm text-muted-foreground mt-2">{c.angle.body}</p>
        </div>

        <ViralityScore score={c.score} defaultOpen testid="report-score" />
        {c.deep_analysis && (
          <DeepAnalysis initial={c.deep_analysis} readOnly testid="report-deep-analysis" />
        )}
        <PredictionReality prediction={c.prediction} outcome={c.outcome} delta={c.delta} source={c.outcome_source} testid="report-pvr" />

        {/* learning */}
        <div className="rounded-xl border border-border bg-panel p-6">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5"><Brain size={13} /> Key learning</div>
          <p className="text-base leading-relaxed">{c.learning}</p>
        </div>

        <div className="text-center text-xs text-muted-foreground py-6 border-t border-border">
          Generated with LaunchLoop AI · Virality score is a deterministic, explainable heuristic.
        </div>
      </div>
    </div>
  );
}
