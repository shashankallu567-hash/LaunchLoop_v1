import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard, Rocket, Dna, FlaskConical, Trophy,
  BarChart3, LogOut, Sparkles, Menu, X, HelpCircle,
} from "lucide-react";
import { useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import TeamWatermark from "@/components/TeamWatermark";

const NAV = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true, testid: "nav-dashboard" },
  { to: "/app/launch", label: "Create Launch", icon: Rocket, testid: "nav-launch" },
  { to: "/app/audiences", label: "Audience DNA", icon: Dna, testid: "nav-audiences" },
  { to: "/app/experiments", label: "Experiments", icon: FlaskConical, testid: "nav-experiments" },
  { to: "/app/leaderboard", label: "Leaderboard", icon: Trophy, testid: "nav-leaderboard" },
  { to: "/app/analytics", label: "Analytics", icon: BarChart3, testid: "nav-analytics" },
  { to: "/app/help", label: "How to use", icon: HelpCircle, testid: "nav-help" },
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
                isActive ? "bg-surface text-foreground border border-border" : "text-muted-foreground hover:text-foreground hover:bg-surface/60"
              }`}>
            <n.icon size={18} />{n.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-border space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-widest text-muted-foreground">Theme</span>
          <ThemeToggle />
        </div>
        <button onClick={() => navigate("/app/launch")} data-testid="sidebar-new-launch"
          className="w-full flex items-center justify-center gap-2 bg-growth text-black font-semibold text-sm py-2.5 rounded-lg transition-transform hover:scale-[0.98] active:scale-95">
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
    <div className="min-h-screen bg-background text-foreground flex">
      <TeamWatermark sidebarOffset />
      {/* desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-panel fixed inset-y-0 left-0 z-30">
        <SidebarContent />
      </aside>

      {/* mobile top bar */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-40 glass border-b border-border flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-growth flex items-center justify-center"><Sparkles size={16} className="text-black" /></div>
          <span className="font-heading font-extrabold tracking-tight">LaunchLoop<span className="text-growth">.</span></span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button onClick={() => setOpen(true)} data-testid="mobile-menu-btn" className="p-2"><Menu size={22} /></button>
        </div>
      </div>

      {/* mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
          <aside className="relative w-72 bg-panel border-r border-border flex flex-col">
            <button onClick={() => setOpen(false)} className="absolute top-4 right-4 p-1 text-muted-foreground"><X size={20} /></button>
            <SidebarContent />
          </aside>
        </div>
      )}

      <main className="flex-1 lg:ml-64 pt-14 lg:pt-0 min-w-0 relative z-10">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
