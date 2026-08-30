import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { toast } from "sonner";
import ViralityScore from "@/components/ViralityScore";
import DeepAnalysis from "@/components/DeepAnalysis";
import AngleRewrite from "@/components/AngleRewrite";
import {
  ArrowRight, ArrowLeft, Check, Rocket, Dna, Target, Share2, Sparkles, Loader2, Plus,
} from "lucide-react";

const GOALS = [
  { id: "awareness", label: "Awareness & Reach", note: "Get seen by as many of the right people as possible" },
  { id: "signups", label: "Waitlist / Signups", note: "Capture emails and early users" },
  { id: "sales", label: "Sales / Conversions", note: "Drive paid conversions" },
  { id: "engagement", label: "Community Engagement", note: "Spark replies, discussion and reposts" },
  { id: "launch", label: "Launch-day Splash", note: "A coordinated big-bang launch" },
];

const PLATFORMS = ["Twitter/X", "LinkedIn", "Product Hunt", "Email", "Newsletter", "Reddit", "Instagram", "TikTok"];

const STEPS = [
  { id: 0, label: "Product", icon: Rocket },
  { id: 1, label: "Audience", icon: Dna },
  { id: 2, label: "Goal", icon: Target },
  { id: 3, label: "Platforms", icon: Share2 },
  { id: 4, label: "Generate", icon: Sparkles },
];

export default function CreateLaunch() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [audiences, setAudiences] = useState([]);
  const [form, setForm] = useState({
    product_name: "", product_description: "",
    audience_id: null, goal: "awareness", platforms: ["Twitter/X"],
  });
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [selected, setSelected] = useState(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    api.get("/audiences").then((r) => {
      setAudiences(r.data);
      if (r.data[0]) setForm((f) => ({ ...f, audience_id: r.data[0].id }));
    });
  }, []);

  const togglePlatform = (p) => {
    setForm((f) => ({
      ...f,
      platforms: f.platforms.includes(p) ? f.platforms.filter((x) => x !== p) : [...f.platforms, p],
    }));
  };

  const canNext = () => {
    if (step === 0) return form.product_name.trim() && form.product_description.trim();
    if (step === 1) return !!form.audience_id;
    if (step === 3) return form.platforms.length > 0;
    return true;
  };

  const doGenerate = async () => {
    setGenerating(true); setResult(null); setSelected(null);
    try {
      const { data } = await api.post("/generate", {
        product_name: form.product_name,
        product_description: form.product_description,
        goal: form.goal, platforms: form.platforms, audience_id: form.audience_id,
      });
      setResult(data);
      const best = [...data.angles].sort((a, b) => b.score.overall - a.score.overall)[0];
      setSelected(best.id);
      toast.success(data.source === "ai" ? "Angles generated with Gemini" : "Angles generated (synthetic)");
    } catch (e) {
      toast.error("Generation failed");
    } finally { setGenerating(false); }
  };

  const next = () => {
    if (step === 3) { setStep(4); doGenerate(); return; }
    setStep((s) => Math.min(s + 1, 4));
  };

  const applyRewrite = (improved) => {
    setResult((r) => ({
      ...r,
      angles: r.angles.map((a) => (a.id === selected
        ? { ...a, headline: improved.headline, body: improved.body, score: improved.score }
        : a)),
    }));
  };

  const runLaunch = async () => {    const angle = result.angles.find((a) => a.id === selected);
    if (!angle) return;
    setRunning(true);
    try {
      const { data } = await api.post("/campaigns", {
        product_name: form.product_name, product_description: form.product_description,
        goal: form.goal, platforms: form.platforms,
        audience_id: form.audience_id, audience_snapshot: result.audience, angle,
      });
      toast.success("Launch is live — outcome generated");
      navigate(`/app/experiments/${data.id}`);
    } catch {
      toast.error("Could not run launch");
      setRunning(false);
    }
  };

  const selectedAudience = audiences.find((a) => a.id === form.audience_id);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl md:text-3xl font-extrabold tracking-tight">Create Launch</h1>
        <p className="text-muted-foreground text-sm mt-1">Product → Audience → Goal → Platforms → Generate</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1" data-testid="launch-stepper">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2 shrink-0">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
              step === s.id ? "border-growth/50 bg-growth/10 text-growth"
              : step > s.id ? "border-border bg-panel text-foreground" : "border-border bg-panel text-muted-foreground"}`}>
              {step > s.id ? <Check size={15} /> : <s.icon size={15} />}
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < STEPS.length - 1 && <div className="h-px w-4 bg-surface" />}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
          {step === 0 && (
            <div className="rounded-xl border border-border bg-panel p-6 space-y-5 max-w-2xl" data-testid="step-product">
              <div>
                <label className="text-xs uppercase tracking-wide text-muted-foreground">Product name</label>
                <input value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} data-testid="input-product-name"
                  placeholder="e.g. TaskFlow" className="mt-1.5 w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/50" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-muted-foreground">What does it do?</label>
                <textarea value={form.product_description} onChange={(e) => setForm({ ...form, product_description: e.target.value })} data-testid="input-product-desc"
                  rows={4} placeholder="AI task manager that plans your day automatically…"
                  className="mt-1.5 w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/50 resize-none" />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4" data-testid="step-audience">
              {audiences.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-panel p-10 text-center">
                  <Dna className="mx-auto text-foreground/30" size={26} />
                  <p className="text-sm text-muted-foreground mt-3">No audience profiles yet.</p>
                  <button onClick={() => navigate("/app/audiences")} className="mt-4 inline-flex items-center gap-2 bg-foreground text-background font-semibold px-4 py-2 rounded-lg text-sm">
                    <Plus size={16} /> Create Audience DNA
                  </button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {audiences.map((a) => (
                    <button key={a.id} onClick={() => setForm({ ...form, audience_id: a.id })} data-testid={`audience-select-${a.id}`}
                      className={`text-left rounded-xl border p-5 transition-colors ${form.audience_id === a.id ? "border-growth/60 bg-growth/5" : "border-border bg-panel hover:border-borderStrong"}`}>
                      <div className="flex items-center justify-between">
                        <div className="font-heading font-bold">{a.name}</div>
                        {form.audience_id === a.id && <Check size={16} className="text-growth" />}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{a.description}</p>
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {(a.pain_points || []).slice(0, 3).map((p) => (
                          <span key={p} className="text-[11px] px-2 py-0.5 rounded-full bg-surface text-muted-foreground">{p}</span>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="grid md:grid-cols-2 gap-4 max-w-3xl" data-testid="step-goal">
              {GOALS.map((g) => (
                <button key={g.id} onClick={() => setForm({ ...form, goal: g.id })} data-testid={`goal-${g.id}`}
                  className={`text-left rounded-xl border p-5 transition-colors ${form.goal === g.id ? "border-growth/60 bg-growth/5" : "border-border bg-panel hover:border-borderStrong"}`}>
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{g.label}</div>
                    {form.goal === g.id && <Check size={16} className="text-growth" />}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{g.note}</p>
                </button>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="rounded-xl border border-border bg-panel p-6 max-w-2xl" data-testid="step-platforms">
              <div className="text-sm text-muted-foreground mb-4">Pick the platforms you'll launch on. Angles are tailored to each.</div>
              <div className="flex flex-wrap gap-2.5">
                {PLATFORMS.map((p) => (
                  <button key={p} onClick={() => togglePlatform(p)} data-testid={`platform-${p}`}
                    className={`px-4 py-2 rounded-full border text-sm transition-colors ${form.platforms.includes(p) ? "border-growth/60 bg-growth/10 text-growth" : "border-border bg-surface text-muted-foreground hover:text-foreground"}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5" data-testid="step-generate">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="text-sm text-muted-foreground">
                  {generating ? "Generating launch angles…" : result
                    ? <>Pick your winning angle. <span className="text-foreground">{selectedAudience?.name}</span> · {form.goal} · {form.platforms.join(", ")}</>
                    : "Ready to generate."}
                </div>
                {!generating && result && (
                  <button onClick={doGenerate} data-testid="regenerate-btn" className="text-xs border border-border px-3 py-1.5 rounded-lg hover:bg-surface transition-colors">Regenerate</button>
                )}
              </div>

              {generating ? (
                <div className="grid md:grid-cols-2 gap-4">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="h-52 rounded-xl border border-border bg-panel animate-pulse flex items-center justify-center">
                      <Loader2 className="animate-spin text-foreground/20" />
                    </div>
                  ))}
                </div>
              ) : result ? (
                <>
                  <div className="grid md:grid-cols-2 gap-4">
                    {result.angles.map((a) => (
                      <button key={a.id} onClick={() => setSelected(a.id)} data-testid={`angle-${a.id}`}
                        className={`text-left rounded-xl border p-5 transition-colors ${selected === a.id ? "border-growth/60 bg-growth/5" : "border-border bg-panel hover:border-borderStrong"}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-surface text-muted-foreground">{a.channel} · {a.format}</span>
                          <ViralityScore score={a.score} compact testid={`angle-score-${a.id}`} />
                        </div>
                        <div className="font-heading font-bold leading-snug">{a.headline}</div>
                        <p className="text-sm text-muted-foreground mt-1.5">{a.body}</p>
                        {selected === a.id && <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-growth"><Check size={14} /> Selected</div>}
                      </button>
                    ))}
                  </div>

                  {selected && (() => {
                    const selAngle = result.angles.find((a) => a.id === selected);
                    return (
                    <div className="space-y-4">
                      <div className="grid lg:grid-cols-2 gap-4">
                        <ViralityScore score={selAngle.score} />
                        <DeepAnalysis headline={selAngle.headline} body={selAngle.body} audience={result.audience}
                          goal={form.goal} platform={selAngle.channel} heuristic={selAngle.score} />
                      </div>
                      <AngleRewrite angle={selAngle} audience={result.audience} goal={form.goal}
                        platform={selAngle.channel} onApply={applyRewrite} />
                      <div className="rounded-xl border border-border bg-panel p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h3 className="font-heading font-bold text-lg">Launch this angle</h3>
                          <p className="text-sm text-muted-foreground mt-1 max-w-lg">
                            Running the launch generates a predicted outcome, then a synthetic reality so you can
                            compare and learn. You can swap in real numbers anytime.
                          </p>
                        </div>
                        <button onClick={runLaunch} disabled={running} data-testid="run-launch-btn"
                          className="shrink-0 flex items-center justify-center gap-2 bg-growth text-black font-semibold px-6 py-3 rounded-lg transition-transform hover:scale-[0.98] active:scale-95 disabled:opacity-60">
                          {running ? <><Loader2 size={18} className="animate-spin" /> Launching…</> : <><Rocket size={18} /> Run Launch</>}
                        </button>
                      </div>
                    </div>
                    );
                  })()}
                </>
              ) : (
                <button onClick={doGenerate} className="bg-growth text-black font-semibold px-6 py-3 rounded-lg">Generate</button>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* nav buttons */}
      {step < 4 && (
        <div className="flex items-center justify-between max-w-3xl">
          <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} data-testid="step-back"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors">
            <ArrowLeft size={16} /> Back
          </button>
          <button onClick={next} disabled={!canNext()} data-testid="step-next"
            className="flex items-center gap-2 bg-foreground text-background font-semibold px-5 py-2.5 rounded-lg transition-transform hover:scale-[0.98] active:scale-95 disabled:opacity-40">
            {step === 3 ? "Generate angles" : "Continue"} <ArrowRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
