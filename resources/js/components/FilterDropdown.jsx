import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export function FilterDropdown({ label, count = 0, active, children, width = 280 }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const isActive = active ?? count > 0;

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const handleKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div className="filter-dropdown" ref={ref}>
      <button
        type="button"
        className={`filter-trigger ${isActive ? "filter-trigger-active" : ""}`}
        onClick={() => setOpen((o) => !o)}
      >
        <span>{label}</span>
        {count > 0 && <span className="filter-badge">{count}</span>}
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="filter-panel" style={{ width }}>
          {typeof children === "function" ? children({ close: () => setOpen(false) }) : children}
        </div>
      )}
    </div>
  );
}
