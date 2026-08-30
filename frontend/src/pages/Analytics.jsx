import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import CountUp from "@/components/CountUp";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { BarChart3, Trophy, Zap, Gauge } from "lucide-react";

const AXIS = { fontSize: 11, fill: "#71717A" };
const tooltipStyle = { background: "#0A0A0C", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 };

function Panel({ title, children, testid }) {
  return (
    <div className="rounded-xl border border-white/10 bg-panel p-6" data-testid={testid}>
      <div className="text-xs uppercase tracking-widest text-muted-foreground mb-4">{title}</div>
      {children}
    </div>
  );
}

export default function Analytics() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.get("/analytics").then((r) => setData(r.data)).finally(() => setLoading(false)); }, []);

  if (loading) return <div className="h-96 rounded-xl border border-white/10 bg-panel animate-pulse" />;

  if (!data || data.empty) {
    return (
      <div className="space-y-6">
        <h1 className="font-heading text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2"><BarChart3 /> Analytics</h1>
        <div className="rounded-xl border border-dashed border-white/15 bg-panel p-12 text-center">
          <BarChart3 className="mx-auto text-white/30" size={30} />
          <p className="text-sm text-muted-foreground mt-3">Run your first launch to unlock analytics.</p>
          <button onClick={() => navigate("/app/launch")} className="mt-4 inline-flex items-center gap-2 bg-white text-black font-semibold px-4 py-2 rounded-lg text-sm"><Zap size={16} /> Create Launch</button>
        </div>
      </div>
    );
  }

  const t = data.totals;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2"><BarChart3 /> Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">Score trends, prediction accuracy, and what's working.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Experiments", value: t.campaigns },
          { label: "Avg Virality", value: t.avg_score },
          { label: "Prediction Accuracy", value: t.avg_accuracy, suffix: "%" },
          { label: "Total Impressions", value: t.total_impressions },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-white/10 bg-panel p-5" data-testid={`analytics-stat-${s.label.toLowerCase().replace(/\s/g, "-")}`}>
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">{s.label}</div>
            <div className="font-mono-metric text-3xl font-bold"><CountUp value={s.value} />{s.suffix || ""}</div>
          </div>
        ))}
      </div>

      {/* highlight cards */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-white/10 bg-panel p-6 flex items-start gap-4" data-testid="best-angle-card">
          <div className="h-10 w-10 rounded-lg bg-growth/10 flex items-center justify-center"><Trophy size={20} className="text-growth" /></div>
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Best-performing angle</div>
            {data.best_angle ? (
              <>
                <div className="font-heading font-bold leading-snug">{data.best_angle.headline}</div>
                <div className="text-sm text-muted-foreground mt-1">{data.best_angle.channel} · Score {data.best_angle.score}</div>
              </>
            ) : <div className="text-sm text-muted-foreground">Not enough data.</div>}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-panel p-6 flex items-start gap-4" data-testid="best-platform-card">
          <div className="h-10 w-10 rounded-lg bg-neutral/10 flex items-center justify-center"><Gauge size={20} style={{ color: "#0066FF" }} /></div>
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Best platform</div>
            <div className="font-heading text-xl font-bold">{t.best_platform || "—"}</div>
            <div className="text-sm text-muted-foreground mt-1">Highest average impressions</div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Virality score trend" testid="chart-score-trend">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data.score_trend}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="date" tick={AXIS} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={AXIS} axisLine={false} tickLine={false} width={28} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="score" stroke="#D3FF24" strokeWidth={2.5} dot={{ r: 3, fill: "#D3FF24" }} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Prediction accuracy over time" testid="chart-accuracy">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data.accuracy_trend}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="date" tick={AXIS} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={AXIS} axisLine={false} tickLine={false} width={28} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="accuracy" stroke="#0066FF" strokeWidth={2.5} dot={{ r: 3, fill: "#0066FF" }} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Predicted vs actual impressions" testid="chart-pred-real">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.pred_vs_real}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="name" tick={AXIS} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS} axisLine={false} tickLine={false} width={40} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="predicted" fill="#3A3A40" radius={[3, 3, 0, 0]} />
              <Bar dataKey="actual" fill="#D3FF24" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Average score by factor" testid="chart-factors">
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={data.factor_avg}>
              <PolarGrid stroke="rgba(255,255,255,0.1)" />
              <PolarAngleAxis dataKey="factor" tick={{ fontSize: 11, fill: "#A1A1AA" }} />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              <Radar dataKey="value" stroke="#D3FF24" fill="#D3FF24" fillOpacity={0.25} strokeWidth={2} />
              <Tooltip contentStyle={tooltipStyle} />
            </RadarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <Panel title="Top launch angles" testid="top-angles">
        <div className="space-y-2">
          {data.top_angles.map((a, i) => (
            <button key={a.id} onClick={() => navigate(`/app/experiments/${a.id}`)} data-testid={`top-angle-${a.id}`}
              className="w-full text-left flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-surface px-4 py-3 hover:border-white/20 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-mono-metric text-sm text-muted-foreground">{i + 1}</span>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{a.headline}</div>
                  <div className="text-xs text-muted-foreground">{a.channel}</div>
                </div>
              </div>
              <span className="font-mono-metric font-bold" style={{ color: a.score >= 80 ? "#D3FF24" : a.score >= 65 ? "#0066FF" : "#A1A1AA" }}>{a.score}</span>
            </button>
          ))}
        </div>
      </Panel>
    </div>
  );
}
