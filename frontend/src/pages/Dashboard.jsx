import { useEffect, useState, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import CountUp from "@/components/CountUp";
import ViralityScore from "@/components/ViralityScore";
import {
  Rocket, Target, Activity, Brain, FlaskConical, Gauge, Trophy, ArrowRight, Plus, Zap,
} from "lucide-react";

const LOOP = [
  { label: "PREDICTION", icon: Target, color: "#0066FF" },
  { label: "LAUNCH", icon: Rocket, color: "#FFFFFF" },
  { label: "REALITY", icon: Activity, color: "#D3FF24" },
  { label: "LEARNING", icon: Brain, color: "#FF3366" },
];

function Stat({ label, value, suffix = "", testid }) {
  return (
    <div className="rounded-xl border border-white/10 bg-panel p-5" data-testid={testid}>
      <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">{label}</div>
      <div className="font-mono-metric text-3xl font-bold">
        <CountUp value={value} />{suffix}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get("/analytics"), api.get("/campaigns")])
      .then(([a, c]) => { setAnalytics(a.data); setCampaigns(c.data); })
      .finally(() => setLoading(false));
  }, []);

  const t = analytics?.totals;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-extrabold tracking-tight">
            Welcome back, {user?.name?.split(" ")[0]}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Every launch, smarter than the last.</p>
        </div>
        <button onClick={() => navigate("/app/launch")} data-testid="dashboard-new-launch"
          className="flex items-center gap-2 bg-growth text-black font-semibold px-5 py-2.5 rounded-lg transition-transform hover:scale-[0.98] active:scale-95">
          <Plus size={18} /> Create Launch
        </button>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-28 rounded-xl border border-white/10 bg-panel animate-pulse" />)}
        </div>
      ) : t ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Experiments" value={t.campaigns} testid="stat-campaigns" />
          <Stat label="Avg Virality" value={t.avg_score} testid="stat-avg-score" />
          <Stat label="Prediction Accuracy" value={t.avg_accuracy} suffix="%" testid="stat-accuracy" />
          <Stat label="Total Impressions" value={t.total_impressions} testid="stat-impressions" />
        </div>
      ) : null}

      {/* Loop visual */}
      <div className="rounded-xl border border-white/10 bg-panel p-6 grain">
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-5">Your Launch Twin loop</div>
        <div className="grid grid-cols-2 md:grid-cols-7 items-center gap-3">
          {LOOP.map((s, i) => (
            <Fragment key={s.label}>
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                className="rounded-lg border border-white/10 bg-surface p-4 flex flex-col items-center text-center">
                <s.icon size={20} style={{ color: s.color }} />
                <div className="font-mono-metric text-xs font-bold mt-2" style={{ color: s.color }}>{s.label}</div>
              </motion.div>
              {i < LOOP.length - 1 && <ArrowRight className="hidden md:block mx-auto text-white/20" size={18} />}
            </Fragment>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* recent experiments */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading text-lg font-bold flex items-center gap-2"><FlaskConical size={18} /> Recent experiments</h2>
            <button onClick={() => navigate("/app/experiments")} className="text-xs text-muted-foreground hover:text-white transition-colors" data-testid="view-all-experiments">View all</button>
          </div>
          {campaigns.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/15 bg-panel p-10 text-center">
              <Rocket className="mx-auto text-white/30" size={28} />
              <p className="text-sm text-muted-foreground mt-3">No experiments yet. Create your first launch.</p>
              <button onClick={() => navigate("/app/launch")} data-testid="empty-create-launch"
                className="mt-4 inline-flex items-center gap-2 bg-white text-black font-semibold px-4 py-2 rounded-lg text-sm transition-transform hover:scale-[0.98] active:scale-95">
                <Zap size={16} /> Create Launch
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.slice(0, 4).map((c) => (
                <button key={c.id} onClick={() => navigate(`/app/experiments/${c.id}`)} data-testid={`recent-campaign-${c.id}`}
                  className="w-full text-left rounded-xl border border-white/10 bg-panel p-4 flex items-center justify-between gap-4 hover:border-white/20 transition-colors">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{c.product_name}</div>
                    <div className="text-sm text-muted-foreground truncate">{c.angle.headline}</div>
                    <div className="text-xs text-muted-foreground mt-1">{c.angle.channel} · {c.goal}</div>
                  </div>
                  <ViralityScore score={c.score} compact testid={`recent-score-${c.id}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* quick links */}
        <div className="space-y-3">
          <h2 className="font-heading text-lg font-bold">Jump to</h2>
          {[
            { to: "/app/audiences", icon: Gauge, label: "Audience DNA", note: "Reusable profiles" },
            { to: "/app/leaderboard", icon: Trophy, label: "Leaderboard", note: "Where you rank" },
            { to: "/app/analytics", icon: Activity, label: "Analytics", note: "Trends & accuracy" },
          ].map((q) => (
            <button key={q.to} onClick={() => navigate(q.to)} data-testid={`jump-${q.label.toLowerCase().replace(/\s/g, "-")}`}
              className="w-full text-left rounded-xl border border-white/10 bg-panel p-4 flex items-center gap-3 hover:border-white/20 transition-colors">
              <div className="h-9 w-9 rounded-lg bg-surface flex items-center justify-center"><q.icon size={18} className="text-growth" /></div>
              <div><div className="text-sm font-medium">{q.label}</div><div className="text-xs text-muted-foreground">{q.note}</div></div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
