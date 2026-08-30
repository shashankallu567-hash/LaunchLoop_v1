import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Sparkles, ArrowRight, Zap } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const { login, register, demoLogin } = useAuth();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      if (mode === "login") await login(form.email, form.password);
      else await register(form.email, form.password, form.name);
      toast.success(mode === "login" ? "Welcome back" : "Account created");
      navigate("/app");
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail) || err.message);
    } finally { setLoading(false); }
  };

  const demo = async () => {
    setLoading(true);
    try { await demoLogin(); toast.success("Demo started"); navigate("/app"); }
    catch { setError("Could not start demo"); setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-5 grain">
      <div className="w-full max-w-md">
        <button onClick={() => navigate("/")} className="flex items-center gap-2.5 mb-8 mx-auto" data-testid="login-logo">
          <div className="h-9 w-9 rounded-lg bg-growth flex items-center justify-center"><Sparkles size={20} className="text-black" /></div>
          <span className="font-heading font-extrabold tracking-tight text-xl">LaunchLoop<span className="text-growth">.</span></span>
        </button>

        <div className="rounded-2xl border border-border bg-panel p-7">
          <div className="flex gap-1 p-1 rounded-lg bg-surface mb-6">
            {["login", "signup"].map((m) => (
              <button key={m} onClick={() => { setMode(m); setError(""); }} data-testid={`tab-${m}`}
                className={`flex-1 py-2 text-sm rounded-md transition-colors ${mode === m ? "bg-foreground text-background font-semibold" : "text-muted-foreground hover:text-foreground"}`}>
                {m === "login" ? "Sign in" : "Sign up"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="text-xs uppercase tracking-wide text-muted-foreground">Name</label>
                <input value={form.name} onChange={set("name")} data-testid="input-name" placeholder="Jane Founder"
                  className="mt-1.5 w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/50 transition-shadow" />
              </div>
            )}
            <div>
              <label className="text-xs uppercase tracking-wide text-muted-foreground">Email</label>
              <input type="email" required value={form.email} onChange={set("email")} data-testid="input-email" placeholder="you@startup.com"
                className="mt-1.5 w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/50 transition-shadow" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-muted-foreground">Password</label>
              <input type="password" required value={form.password} onChange={set("password")} data-testid="input-password" placeholder="••••••••"
                className="mt-1.5 w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/50 transition-shadow" />
            </div>

            {error && <div className="text-sm text-danger" data-testid="login-error">{error}</div>}

            <button type="submit" disabled={loading} data-testid="submit-auth"
              className="w-full flex items-center justify-center gap-2 bg-foreground text-background font-semibold py-2.5 rounded-lg transition-transform hover:scale-[0.99] active:scale-95 disabled:opacity-60">
              {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"} <ArrowRight size={16} />
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-surface" /><span className="text-xs text-muted-foreground">or</span><div className="flex-1 h-px bg-surface" />
          </div>

          <button onClick={demo} disabled={loading} data-testid="demo-login-btn"
            className="w-full flex items-center justify-center gap-2 border border-growth/40 bg-growth/10 text-growth font-semibold py-2.5 rounded-lg transition-transform hover:scale-[0.99] active:scale-95 disabled:opacity-60">
            <Zap size={16} /> Instant demo (no signup)
          </button>
          <p className="text-xs text-muted-foreground text-center mt-3">demo@launchloop.ai · pre-loaded with sample campaigns</p>
        </div>
      </div>
    </div>
  );
}
