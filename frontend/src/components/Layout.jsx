import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard, Rocket, Dna, FlaskConical, Trophy,
  BarChart3, LogOut, Sparkles, Menu, X,
} from "lucide-react";
import { useState } from "react";

const NAV = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true, testid: "nav-dashboard" },
  { to: "/app/launch", label: "Create Launch", icon: Rocket, testid: "nav-launch" },
  { to: "/app/audiences", label: "Audience DNA", icon: Dna, testid: "nav-audiences" },
  { to: "/app/experiments", label: "Experiments", icon: FlaskConical, testid: "nav-experiments" },
  { to: "/app/leaderboard", label: "Leaderboard", icon: Trophy, testid: "nav-leaderboard" },
  { to: "/app/analytics", label: "Analytics", icon: BarChart3, testid: "nav-analytics" },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const SidebarContent = () => (
    <>
      <div className="px-5 py-6 flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-lg bg-growth flex items-center justify-center">
          <Sparkles size={18} className="text-black" />
        </div>
        <div>
          <div className="font-heading font-extrabold tracking-tight leading-none">LaunchLoop<span className="text-growth">.</span></div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">AI GTM Platform</div>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} data-testid={n.testid}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive ? "bg-surface text-white border border-white/10" : "text-muted-foreground hover:text-white hover:bg-surface/60"
              }`}>
            <n.icon size={18} />{n.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-white/10">
        <button onClick={() => navigate("/app/launch")} data-testid="sidebar-new-launch"
          className="w-full mb-3 flex items-center justify-center gap-2 bg-growth text-black font-semibold text-sm py-2.5 rounded-lg transition-transform hover:scale-[0.98] active:scale-95">
          <Rocket size={16} /> New Launch
        </button>
        <div className="flex items-center justify-between px-2">
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">{user?.name}</div>
            <div className="text-xs text-muted-foreground truncate">{user?.is_demo ? "Demo account" : user?.email}</div>
          </div>
          <button onClick={() => { logout(); navigate("/"); }} data-testid="logout-btn"
            className="p-2 rounded-lg text-muted-foreground hover:text-danger hover:bg-surface transition-colors" title="Log out">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white flex">
      {/* desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-white/10 bg-panel fixed inset-y-0 left-0 z-30">
        <SidebarContent />
      </aside>

      {/* mobile top bar */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-40 glass border-b border-white/10 flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-growth flex items-center justify-center"><Sparkles size={16} className="text-black" /></div>
          <span className="font-heading font-extrabold tracking-tight">LaunchLoop<span className="text-growth">.</span></span>
        </div>
        <button onClick={() => setOpen(true)} data-testid="mobile-menu-btn" className="p-2"><Menu size={22} /></button>
      </div>

      {/* mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
          <aside className="relative w-72 bg-panel border-r border-white/10 flex flex-col">
            <button onClick={() => setOpen(false)} className="absolute top-4 right-4 p-1 text-muted-foreground"><X size={20} /></button>
            <SidebarContent />
          </aside>
        </div>
      )}

      <main className="flex-1 lg:ml-64 pt-14 lg:pt-0 min-w-0">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
