import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Rocket, Dna, Gauge, Brain, Wand2, Activity, BarChart3, Trophy, Share2, Mic, ArrowRight, Sparkles,
} from "lucide-react";

const STEPS = [
  { n: "01", title: "Create Launch", body: "Enter your product and pick an Audience DNA, a goal and the platforms you'll post on." },
  { n: "02", title: "Generate angles", body: "AI drafts four platform-tailored launch angles you can compare side by side." },
  { n: "03", title: "Read the Virality Score", body: "Each angle gets a transparent 0–100 score across five explainable factors." },
  { n: "04", title: "Deep Analysis (optional)", body: "Get an AI 'second opinion' and see where it agrees or disagrees with the heuristic." },
  { n: "05", title: "Rewrite a weak factor", body: "Pick the weakest factor and let AI rewrite the angle to lift it — then it's re-scored." },
  { n: "06", title: "Run the launch", body: "Ship the winning angle to generate a predicted outcome." },
  { n: "07", title: "Prediction vs Reality", body: "Compare predicted vs actual metrics (synthetic by default, or enter real numbers)." },
  { n: "08", title: "Learn & repeat", body: "Read the 'What We Learned' note and carry it into your next launch." },
];

const CONCEPTS = [
  { icon: Rocket, title: "Launch Twin", body: "The full working loop: Prediction → Launch → Reality → Learning, for every experiment." },
  { icon: Dna, title: "Audience DNA", body: "Reusable, editable audience profiles (motivations, pains, triggers) that sharpen every angle." },
  { icon: Gauge, title: "Virality Score", body: "Deterministic, explainable score over Hook, Emotion, Audience Fit, Shareability and Platform Fit." },
  { icon: Brain, title: "Deep Analysis", body: "An AI second opinion scored independently, shown next to the heuristic with agreement/difference." },
  { icon: Wand2, title: "Angle Rewrite", body: "AI rewrites an angle to improve one chosen weak factor while keeping product, audience and goal." },
  { icon: Activity, title: "Prediction vs Reality", body: "See the delta between what you predicted and what happened — over- or under-performed." },
  { icon: BarChart3, title: "Analytics", body: "Score trends, prediction accuracy, best angle and best platform over time." },
  { icon: Trophy, title: "Leaderboard", body: "Rank your campaigns against a global set of launches, or filter to just yours." },
  { icon: Share2, title: "Share Report", body: "A clean, linkable/downloadable summary of a launch, including the Deep Analysis." },
];

export default function HowToUse() {
  const navigate = useNavigate();
  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-extrabold tracking-tight">How to use LaunchLoop</h1>
          <p className="text-muted-foreground text-sm mt-1">The full loop in eight steps — plus what each concept means.</p>
        </div>
        <button onClick={() => navigate("/app/launch")} data-testid="help-start-launch"
          className="flex items-center gap-2 bg-growth text-black font-semibold px-5 py-2.5 rounded-lg transition-transform hover:scale-[0.98] active:scale-95">
          <Rocket size={18} /> Start a launch
        </button>
      </div>

      {/* workflow */}
      <section>
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-4">The workflow</div>
        <div className="grid md:grid-cols-2 gap-3">
          {STEPS.map((s, i) => (
            <motion.div key={s.n} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.03 }}
              className="rounded-xl border border-border bg-panel p-5 flex gap-4">
              <div className="font-mono-metric text-growth font-bold text-sm shrink-0">{s.n}</div>
              <div>
                <div className="font-heading font-bold">{s.title}</div>
                <p className="text-sm text-muted-foreground mt-1">{s.body}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* voice tip */}
      <div className="rounded-xl border border-border bg-panel p-5 flex items-start gap-3">
        <div className="h-9 w-9 rounded-lg bg-surface flex items-center justify-center shrink-0"><Mic size={18} className="text-growth" /></div>
        <div>
          <div className="font-heading font-bold">Voice input</div>
          <p className="text-sm text-muted-foreground mt-1">Look for the mic button next to the Product and Audience description fields — click it to dictate instead of typing. Typing always works too.</p>
        </div>
      </div>

      {/* concepts */}
      <section>
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-4">The concepts</div>
        <div className="grid md:grid-cols-3 gap-3">
          {CONCEPTS.map((c, i) => (
            <motion.div key={c.title} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.03 }}
              className="rounded-xl border border-border bg-panel p-5 hover:border-borderStrong transition-colors">
              <c.icon size={20} className="text-growth" />
              <div className="font-heading font-bold mt-3">{c.title}</div>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{c.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <div className="rounded-xl border border-border bg-panel p-6 grain flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Sparkles className="text-growth" size={20} />
          <p className="text-sm text-muted-foreground max-w-lg">Everything runs on synthetic demo data out of the box — no API key needed. Explore freely, then swap in real metrics whenever you have them.</p>
        </div>
        <button onClick={() => navigate("/app/launch")} data-testid="help-cta"
          className="flex items-center gap-2 border border-border px-5 py-2.5 rounded-lg text-sm hover:bg-surface transition-colors">
          Try it now <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
