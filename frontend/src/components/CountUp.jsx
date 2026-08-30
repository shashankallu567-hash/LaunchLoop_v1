import { useEffect, useRef, useState } from "react";

/** Count-up animated number (respects prefers-reduced-motion). */
export default function CountUp({ value = 0, duration = 900, decimals = 0, className = "", style }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef();
  const start = useRef();

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setDisplay(value); return; }
    const from = 0;
    const step = (ts) => {
      if (!start.current) start.current = ts;
      const p = Math.min((ts - start.current) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (value - from) * eased);
      if (p < 1) raf.current = requestAnimationFrame(step);
    };
    start.current = null;
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [value, duration]);

  const formatted = Number(display).toLocaleString(undefined, {
    maximumFractionDigits: decimals, minimumFractionDigits: decimals,
  });
  return <span className={className} style={style}>{formatted}</span>;
}
