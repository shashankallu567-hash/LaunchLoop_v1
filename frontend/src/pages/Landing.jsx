import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Sparkles, ArrowRight, Target, Rocket, Activity, Brain, Dna, Trophy, BarChart3, Gauge } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

const LOOP = [
  { label: "PREDICTION", icon: Target, note: "Heuristic virality score forecasts your reach", color: "var(--info)" },
  { label: "LAUNCH", icon: Rocket, note: "Ship the winning angle to your platforms", color: "hsl(var(--foreground))" },
  { label: "REALITY", icon: Activity, note: "Synthetic or real metrics come back in", color: "var(--pos)" },
  { label: "LEARNING", icon: Brain, note: "The delta teaches your next launch", color: "var(--neg)" },
];

const FEATURES = [
  { icon: Rocket, title: "Launch Twin", body: "Your working session: product + audience in, launch angles out." },
  { icon: Dna, title: "Audience DNA", body: "Reusable, editable audience profiles that sharpen every run." },
  { icon: Gauge, title: "Explainable Virality Score", body: "Five factors, always shown. Never a black box." },
  { icon: Activity, title: "Prediction vs Reality", body: "See the delta and what it means for next time." },
  { icon: Trophy, title: "Leaderboard", body: "Stack your campaigns against the best launches." },
  { icon: BarChart3, title: "Analytics", body: "Score trends, prediction accuracy, top angles." },
];

export default function Landing() {
  const navigate = useNavigate();
  const { demoLogin } = useAuth();
  const [loading, setLoading] = useState(false);

  const tryDemo = async () => {
    setLoading(true);
    try {
      await demoLogin();
      toast.success("Welcome to the demo");
      navigate("/app");
    } catch {
      toast.error("Could not start demo");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="glass border-b border-border sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-growth flex items-center justify-center"><Sparkles size={18} className="text-black" /></div>
            <span className="font-heading font-extrabold tracking-tight text-lg">LaunchLoop<span className="text-growth">.</span></span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button onClick={() => navigate("/login")} data-testid="header-signin"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors">Sign in</button>
            <button onClick={tryDemo} disabled={loading} data-testid="header-demo"
              className="text-sm bg-foreground text-background font-semibold px-4 py-2 rounded-lg transition-transform hover:scale-[0.98] active:scale-95 disabled:opacity-60">
              {loading ? "Starting…" : "Try live demo"}
            </button>
          </div>
        </div>
      </header>

      <section className="grain relative max-w-6xl mx-auto px-5 md:px-8 pt-20 pb-16">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3 py-1 text-xs text-muted-foreground mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-growth" /> GTM intelligence for founders
          </div>
          <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tighter leading-[1.05]">
            Build launches people <span className="text-growth">actually share.</span>
          </h1>
          <p className="text-base md:text-lg text-muted-foreground mt-5 max-w-2xl leading-relaxed">
            LaunchLoop AI generates launch angles, scores their virality with an explainable formula,
            then closes the loop between what you predicted and what really happened — so every launch is smarter than the last.
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-8">
            <button onClick={tryDemo} disabled={loading} data-testid="hero-demo"
              className="group flex items-center gap-2 bg-growth text-black font-semibold px-6 py-3 rounded-lg transition-transform hover:scale-[0.98] active:scale-95 disabled:opacity-60">
              {loading ? "Starting demo…" : "Launch the demo"} <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button onClick={() => navigate("/login")} data-testid="hero-signin"
              className="border border-border px-6 py-3 rounded-lg text-sm hover:bg-surface transition-colors">Create an account</button>
          </div>
          <p className="text-xs text-muted-foreground mt-4">No API key required · Fully working on synthetic demo data</p>
        </motion.div>
      </section>

      {/* The Loop */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 py-10">
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-6">The Launch Twin loop</div>
        <div className="grid md:grid-cols-4 gap-4">
          {LOOP.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.08 }}
              className="relative rounded-xl border border-border bg-panel p-5">
              <s.icon size={22} style={{ color: s.color }} />
              <div className="font-mono-metric text-sm font-bold mt-3" style={{ color: s.color }}>{s.label}</div>
              <p className="text-sm text-muted-foreground mt-1">{s.note}</p>
              <div className="absolute top-5 right-4 font-mono-metric text-xs text-foreground/20">0{i + 1}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 py-14">
        <div className="grid md:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-border bg-panel p-6 hover:border-borderStrong transition-colors">
              <f.icon size={22} className="text-growth" />
              <h3 className="font-heading font-bold mt-3">{f.title}</h3>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        LaunchLoop AI · Turn your one shot into a repeatable growth loop.
      </footer>
    </div>
  );
}
