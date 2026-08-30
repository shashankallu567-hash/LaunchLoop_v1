import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { toast } from "sonner";
import {
  Dna, Plus, Pencil, Trash2, Rocket, Sparkles, X, Heart, AlertTriangle, Star, Zap, Share2, Users,
} from "lucide-react";

const EMPTY = {
  name: "", description: "", demographics: "", tone: "confident",
  motivations: [], pain_points: [], interests: [], desires: [], content_triggers: [], channels: [], sharing_behavior: "",
};

const CSV = (arr) => (arr || []).join(", ");
const parseCSV = (str) => str.split(",").map((s) => s.trim()).filter(Boolean);

const SECTIONS = [
  { key: "motivations", label: "Motivations", icon: Star },
  { key: "pain_points", label: "Pain Points", icon: AlertTriangle },
  { key: "interests", label: "Interests", icon: Heart },
  { key: "content_triggers", label: "Content Triggers", icon: Zap },
  { key: "channels", label: "Preferred Platforms", icon: Share2 },
];

export default function AudienceDNA() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // object or null
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = () => api.get("/audiences").then((r) => setItems(r.data)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing("new"); setForm(EMPTY); };
  const openEdit = (a) => { setEditing(a.id); setForm({ ...EMPTY, ...a }); };
  const close = () => setEditing(null);

  const save = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    const payload = { ...form };
    try {
      if (editing === "new") await api.post("/audiences", payload);
      else await api.put(`/audiences/${editing}`, payload);
      toast.success("Audience saved");
      close(); load();
    } catch { toast.error("Save failed"); } finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this audience profile?")) return;
    await api.delete(`/audiences/${id}`);
    toast.success("Deleted"); load();
  };

  const aiRefresh = async () => {
    try {
      const { data } = await api.post("/audiences/refresh", form);
      setForm((f) => ({
        ...f,
        motivations: data.motivations, pain_points: data.pain_points, interests: data.interests,
        desires: data.desires, content_triggers: data.content_triggers, channels: data.channels,
      }));
      toast.success("AI suggestions applied — review & save");
    } catch { toast.error("Could not refresh"); }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2"><Dna /> Audience DNA</h1>
          <p className="text-muted-foreground text-sm mt-1">Reusable, editable audience profiles that power every launch.</p>
        </div>
        <button onClick={openNew} data-testid="new-audience-btn" className="flex items-center gap-2 bg-growth text-black font-semibold px-5 py-2.5 rounded-lg transition-transform hover:scale-[0.98] active:scale-95">
          <Plus size={18} /> New Audience
        </button>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">{[0, 1].map((i) => <div key={i} className="h-64 rounded-xl border border-border bg-panel animate-pulse" />)}</div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-panel p-12 text-center">
          <Users className="mx-auto text-foreground/30" size={30} />
          <p className="text-sm text-muted-foreground mt-3">No audience profiles yet.</p>
          <button onClick={openNew} className="mt-4 inline-flex items-center gap-2 bg-foreground text-background font-semibold px-4 py-2 rounded-lg text-sm"><Plus size={16} /> Create your first</button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {items.map((a, idx) => (
            <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
              className="rounded-xl border border-border bg-panel p-6 hover:border-borderStrong transition-colors" data-testid={`audience-card-${a.id}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-heading text-lg font-bold">{a.name}</div>
                  <p className="text-sm text-muted-foreground mt-0.5">{a.description}</p>
                  {a.demographics && <div className="text-xs text-muted-foreground mt-1">{a.demographics}</div>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(a)} data-testid={`edit-audience-${a.id}`} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"><Pencil size={15} /></button>
                  <button onClick={() => remove(a.id)} data-testid={`delete-audience-${a.id}`} className="p-2 rounded-lg text-muted-foreground hover:text-danger hover:bg-surface transition-colors"><Trash2 size={15} /></button>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {SECTIONS.map((s) => (
                  (a[s.key] || []).length > 0 && (
                    <div key={s.key}>
                      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5"><s.icon size={12} /> {s.label}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {a[s.key].map((v) => <span key={v} className="text-[11px] px-2 py-0.5 rounded-full bg-surface text-foreground/80">{v}</span>)}
                      </div>
                    </div>
                  )
                ))}
                {a.sharing_behavior && (
                  <div className="text-xs text-muted-foreground pt-1"><span className="text-foreground/70">Sharing behavior: </span>{a.sharing_behavior}</div>
                )}
              </div>

              <button onClick={() => navigate("/app/launch")} data-testid={`use-audience-${a.id}`}
                className="mt-5 w-full flex items-center justify-center gap-2 border border-border py-2.5 rounded-lg text-sm hover:bg-surface transition-colors">
                <Rocket size={15} /> Use in a launch
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Editor drawer */}
      {editing && (
        <div className="fixed inset-0 z-50 flex justify-end" data-testid="audience-editor">
          <div className="absolute inset-0 bg-black/70" onClick={close} />
          <div className="relative w-full max-w-lg bg-panel border-l border-border h-full overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-heading text-xl font-bold">{editing === "new" ? "New Audience" : "Edit Audience"}</h2>
              <button onClick={close} className="p-2 text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <Field label="Name"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="audience-name" className="ll-input" placeholder="Indie SaaS Founders" /></Field>
              <Field label="Description"><textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} data-testid="audience-desc" className="ll-input resize-none" /></Field>
              <Field label="Demographics"><input value={form.demographics} onChange={(e) => setForm({ ...form, demographics: e.target.value })} className="ll-input" placeholder="25-40, technical, US/EU" /></Field>
              {[
                ["motivations", "Motivations"], ["pain_points", "Pain Points"], ["interests", "Interests"],
                ["desires", "Desires"], ["content_triggers", "Content Triggers"], ["channels", "Preferred Platforms"],
              ].map(([k, label]) => (
                <Field key={k} label={`${label} (comma separated)`}>
                  <input value={CSV(form[k])} onChange={(e) => setForm({ ...form, [k]: parseCSV(e.target.value) })} data-testid={`audience-${k}`} className="ll-input" />
                </Field>
              ))}
              <Field label="Sharing behavior"><input value={form.sharing_behavior} onChange={(e) => setForm({ ...form, sharing_behavior: e.target.value })} className="ll-input" /></Field>
              <Field label="Tone"><input value={form.tone} onChange={(e) => setForm({ ...form, tone: e.target.value })} className="ll-input" placeholder="confident, no-fluff" /></Field>
            </div>
            <div className="flex items-center gap-3 mt-6">
              <button onClick={aiRefresh} data-testid="ai-refresh-btn" className="flex items-center gap-2 border border-growth/40 bg-growth/10 text-growth text-sm font-semibold px-4 py-2.5 rounded-lg transition-transform hover:scale-[0.98] active:scale-95">
                <Sparkles size={15} /> AI suggest
              </button>
              <button onClick={save} disabled={saving} data-testid="save-audience-btn" className="flex-1 bg-foreground text-background font-semibold py-2.5 rounded-lg transition-transform hover:scale-[0.99] active:scale-95 disabled:opacity-60">
                {saving ? "Saving…" : "Save audience"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`.ll-input{width:100%;background:var(--elevated);border:1px solid hsl(var(--border));border-radius:8px;padding:10px 12px;font-size:14px;color:hsl(var(--foreground))}.ll-input:focus{outline:none;box-shadow:0 0 0 2px hsl(var(--ring))}`}</style>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
