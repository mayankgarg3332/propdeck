import { FilterDropdown } from "./FilterDropdown.jsx";
import { formatDate } from "../lib/format.js";

function isoDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function isoStartOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

const PRESETS = [
  { label: "Last 7 days", from: () => isoDaysAgo(6), to: todayIso },
  { label: "Last 30 days", from: () => isoDaysAgo(29), to: todayIso },
  { label: "This month", from: isoStartOfMonth, to: todayIso },
];

export function DateRangeFilter({ from, to, onChange }) {
  const active = Boolean(from || to);
  const label = active
    ? `${from ? formatDate(from) : "Any"} – ${to ? formatDate(to) : "Any"}`
    : "Date range";

  return (
    <FilterDropdown label={label} count={0} active={active} width={260}>
      {() => (
        <div className="filter-panel-body">
          <div className="filter-date-presets">
            {PRESETS.map((preset) => (
              <button
                type="button"
                key={preset.label}
                className="filter-preset-chip"
                onClick={() => onChange({ from: preset.from(), to: preset.to() })}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div className="filter-date-inputs">
            <label>
              <span>From</span>
              <input
                type="date"
                value={from || ""}
                max={to || undefined}
                onChange={(e) => onChange({ from: e.target.value, to })}
              />
            </label>
            <label>
              <span>To</span>
              <input
                type="date"
                value={to || ""}
                min={from || undefined}
                onChange={(e) => onChange({ from, to: e.target.value })}
              />
            </label>
          </div>
          {active && (
            <button type="button" className="filter-clear-link" onClick={() => onChange({ from: "", to: "" })}>
              Clear date range
            </button>
          )}
        </div>
      )}
    </FilterDropdown>
  );
}
