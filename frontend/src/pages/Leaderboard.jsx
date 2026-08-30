import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import api from "@/lib/api";
import CountUp from "@/components/CountUp";
import { Trophy, Crown } from "lucide-react";

export default function Leaderboard() {
  const [scope, setScope] = useState("global");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/leaderboard?scope=${scope}`).then((r) => setItems(r.data)).finally(() => setLoading(false));
  }, [scope]);

  const rankColor = (r) => (r === 1 ? "#D3FF24" : r === 2 ? "#A1A1AA" : r === 3 ? "#F5A623" : "#71717A");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2"><Trophy /> Leaderboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Global launches ranked by virality — see where you stand.</p>
        </div>
        <div className="flex gap-1 p-1 rounded-lg bg-surface" data-testid="leaderboard-scope">
          {["global", "mine"].map((s) => (
            <button key={s} onClick={() => setScope(s)} data-testid={`scope-${s}`}
              className={`px-4 py-2 text-sm rounded-md transition-colors capitalize ${scope === s ? "bg-white text-black font-semibold" : "text-muted-foreground hover:text-white"}`}>
              {s === "mine" ? "My Campaigns" : "Global"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="h-16 rounded-lg border border-white/10 bg-panel animate-pulse" />)}</div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 bg-panel p-12 text-center">
          <Trophy className="mx-auto text-white/30" size={30} />
          <p className="text-sm text-muted-foreground mt-3">No campaigns here yet.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-panel overflow-hidden">
          <div className="grid grid-cols-12 gap-3 px-5 py-3 border-b border-white/10 text-[11px] uppercase tracking-wide text-muted-foreground">
            <div className="col-span-1">#</div>
            <div className="col-span-5">Campaign</div>
            <div className="col-span-2 hidden md:block">Channel</div>
            <div className="col-span-2 text-right">Impressions</div>
            <div className="col-span-2 text-right">Score</div>
          </div>
          {items.map((e, i) => (
            <motion.div key={e.id || i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.4) }}
              data-testid={`leaderboard-row-${e.rank}`}
              className={`grid grid-cols-12 gap-3 px-5 py-4 items-center border-b border-white/5 transition-colors ${e.mine ? "bg-growth/5" : "hover:bg-surface/50"}`}>
              <div className="col-span-1 font-mono-metric font-bold flex items-center gap-1" style={{ color: rankColor(e.rank) }}>
                {e.rank <= 3 && <Crown size={13} />}{e.rank}
              </div>
              <div className="col-span-5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{e.product_name}</span>
                  {e.mine && <span className="text-[10px] px-1.5 py-0.5 rounded bg-growth text-black font-bold">YOU</span>}
                </div>
                <div className="text-xs text-muted-foreground truncate">{e.headline}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">by {e.founder}</div>
              </div>
              <div className="col-span-2 hidden md:block text-sm text-muted-foreground">{e.channel}</div>
              <div className="col-span-2 text-right font-mono-metric text-sm"><CountUp value={e.impressions || 0} /></div>
              <div className="col-span-2 text-right font-mono-metric font-bold" style={{ color: e.score >= 80 ? "#D3FF24" : e.score >= 65 ? "#0066FF" : "#A1A1AA" }}>{e.score}</div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
