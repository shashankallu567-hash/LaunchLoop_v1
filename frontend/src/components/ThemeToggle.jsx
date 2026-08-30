import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

const OPTIONS = [
  { key: "light", icon: Sun, label: "Light" },
  { key: "dark", icon: Moon, label: "Dark" },
  { key: "system", icon: Monitor, label: "System" },
];

export default function ThemeToggle({ compact = false }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-9 w-[108px]" aria-hidden />;

  return (
    <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-surface border border-border" role="group" aria-label="Theme" data-testid="theme-toggle">
      {OPTIONS.map((o) => {
        const active = theme === o.key;
        return (
          <button key={o.key} onClick={() => setTheme(o.key)} data-testid={`theme-${o.key}`}
            aria-label={`${o.label} theme`} aria-pressed={active} title={o.label}
            className={`flex items-center justify-center h-8 w-8 rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              active ? "bg-growth text-black" : "text-muted-foreground hover:text-foreground"}`}>
            <o.icon size={16} />
          </button>
        );
      })}
    </div>
  );
}
