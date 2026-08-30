import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { toast } from "sonner";
import ViralityScore from "@/components/ViralityScore";
import { FlaskConical, Rocket, Trash2, TrendingUp, TrendingDown, Minus } from "lucide-react";

const VERDICT = {
  OVERPERFORMED: { c: "#D3FF24", Icon: TrendingUp },
  UNDERPERFORMED: { c: "#FF3366", Icon: TrendingDown },
  MATCHED: { c: "#0066FF", Icon: Minus },
};

export default function Experiments() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => api.get("/campaigns").then((r) => setItems(r.data)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const remove = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Delete this experiment?")) return;
    await api.delete(`/campaigns/${id}`);
    toast.success("Deleted"); load();
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2"><FlaskConical /> Experiments</h1>
          <p className="text-muted-foreground text-sm mt-1">Every launch you've run, comparable over time.</p>
        </div>
        <button onClick={() => navigate("/app/launch")} data-testid="experiments-new" className="flex items-center gap-2 bg-growth text-black font-semibold px-5 py-2.5 rounded-lg transition-transform hover:scale-[0.98] active:scale-95">
          <Rocket size={18} /> New Launch
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-24 rounded-xl border border-white/10 bg-panel animate-pulse" />)}</div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 bg-panel p-12 text-center">
          <FlaskConical className="mx-auto text-white/30" size={30} />
          <p className="text-sm text-muted-foreground mt-3">No experiments yet.</p>
          <button onClick={() => navigate("/app/launch")} className="mt-4 inline-flex items-center gap-2 bg-white text-black font-semibold px-4 py-2 rounded-lg text-sm"><Rocket size={16} /> Create Launch</button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((c, idx) => {
            const v = c.delta?._summary?.verdict;
            const V = VERDICT[v] || VERDICT.MATCHED;
            return (
              <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
                onClick={() => navigate(`/app/experiments/${c.id}`)} data-testid={`experiment-${c.id}`} role="button" tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter") navigate(`/app/experiments/${c.id}`); }}
                className="w-full cursor-pointer text-left rounded-xl border border-white/10 bg-panel p-5 flex flex-wrap items-center justify-between gap-4 hover:border-white/20 transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-bold">{c.product_name}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-surface text-muted-foreground">{c.angle.channel}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-surface text-muted-foreground">{c.goal}</span>
                  </div>
                  <div className="text-sm text-muted-foreground truncate mt-1">{c.angle.headline}</div>
                  <div className="text-xs text-muted-foreground mt-1">{new Date(c.created_at).toLocaleDateString()}</div>
                </div>
                <div className="flex items-center gap-5">
                  {v && (
                    <div className="flex items-center gap-1.5 font-mono-metric text-xs font-bold" style={{ color: V.c }}>
                      <V.Icon size={14} /> {v}
                    </div>
                  )}
                  <ViralityScore score={c.score} compact testid={`exp-score-${c.id}`} />
                  <button onClick={(e) => remove(e, c.id)} data-testid={`delete-exp-${c.id}`} className="p-2 rounded-lg text-muted-foreground hover:text-danger hover:bg-surface transition-colors"><Trash2 size={15} /></button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
