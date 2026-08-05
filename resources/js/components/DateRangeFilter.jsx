import { useState } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { FilterDropdown } from "./FilterDropdown.jsx";
import { formatDate } from "../lib/format.js";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_LABEL = new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric" });

function toIso(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function addMonths(date, n) {
  return new Date(date.getFullYear(), date.getMonth() + n, 1);
}

function buildMonthGrid(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const startWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells = [];
  for (let i = startWeekday - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month - 1, daysInPrevMonth - i), inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), inMonth: true });
  }
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1].date;
    cells.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), inMonth: false });
  }
  return cells;
}

const today = new Date();
const todayIso = toIso(today);
const yesterdayIso = toIso(daysAgo(1));
const lastMonthDate = addMonths(today, -1);

const PRESETS = [
  { label: "Today", from: todayIso, to: todayIso },
  { label: "Yesterday", from: yesterdayIso, to: yesterdayIso },
  { label: "Last 7 Days", from: toIso(daysAgo(6)), to: todayIso },
  { label: "Last 14 Days", from: toIso(daysAgo(13)), to: todayIso },
  { label: "Last 30 Days", from: toIso(daysAgo(29)), to: todayIso },
  { label: "Last 90 Days", from: toIso(daysAgo(89)), to: todayIso },
  { label: "This Month", from: toIso(startOfMonth(today)), to: toIso(endOfMonth(today)) },
  { label: "Last Month", from: toIso(startOfMonth(lastMonthDate)), to: toIso(endOfMonth(lastMonthDate)) },
];

export function DateRangeFilter({ from, to, onChange }) {
  const active = Boolean(from || to);
  const label = active
    ? `${from ? formatDate(from) : "Any"} – ${to ? formatDate(to) : "Any"}`
    : "Date range";

  const [viewMonth, setViewMonth] = useState(() => startOfMonth(from ? new Date(from) : today));
  const [hoverIso, setHoverIso] = useState(null);

  const selectDay = (date) => {
    const iso = toIso(date);
    if (!from || (from && to)) {
      onChange({ from: iso, to: "" });
    } else if (iso < from) {
      onChange({ from: iso, to: from });
    } else {
      onChange({ from, to: iso });
    }
  };

  const applyPreset = (preset) => {
    onChange({ from: preset.from, to: preset.to });
    setViewMonth(startOfMonth(new Date(preset.from)));
  };

  const rightMonth = addMonths(viewMonth, 1);

  const renderCalendar = (monthDate, showLeftNav, showRightNav) => {
    const cells = buildMonthGrid(monthDate);
    let rangeStart = from;
    let rangeEnd = to;
    if (from && !to && hoverIso) {
      rangeStart = from < hoverIso ? from : hoverIso;
      rangeEnd = from < hoverIso ? hoverIso : from;
    }

    return (
      <div className="drp-calendar">
        <div className="drp-cal-header">
          <div className="drp-cal-nav-group">
            {showLeftNav && (
              <>
                <button type="button" className="drp-cal-nav-btn" onClick={() => setViewMonth((m) => addMonths(m, -12))} aria-label="Previous year">
                  <ChevronsLeft size={14} />
                </button>
                <button type="button" className="drp-cal-nav-btn" onClick={() => setViewMonth((m) => addMonths(m, -1))} aria-label="Previous month">
                  <ChevronLeft size={14} />
                </button>
              </>
            )}
          </div>
          <div className="drp-cal-title">{MONTH_LABEL.format(monthDate)}</div>
          <div className="drp-cal-nav-group drp-cal-nav-group-end">
            {showRightNav && (
              <>
                <button type="button" className="drp-cal-nav-btn" onClick={() => setViewMonth((m) => addMonths(m, 1))} aria-label="Next month">
                  <ChevronRight size={14} />
                </button>
                <button type="button" className="drp-cal-nav-btn" onClick={() => setViewMonth((m) => addMonths(m, 12))} aria-label="Next year">
                  <ChevronsRight size={14} />
                </button>
              </>
            )}
          </div>
        </div>
        <div className="drp-weekdays">
          {WEEKDAYS.map((w) => <span key={w}>{w}</span>)}
        </div>
        <div className="drp-grid">
          {cells.map((cell) => {
            const iso = toIso(cell.date);
            const isFromSel = iso === from;
            const isToSel = iso === to;
            const isSelectedEdge = isFromSel || isToSel;
            const isRange = Boolean(rangeStart && rangeEnd && rangeStart !== rangeEnd && iso >= rangeStart && iso <= rangeEnd);
            const isRangeStart = isRange && iso === rangeStart;
            const isRangeEnd = isRange && iso === rangeEnd;
            const isToday = iso === todayIso;

            const cellClass = [
              "drp-cell",
              !cell.inMonth && "drp-cell-muted",
              isRange && "drp-cell-in-range",
              isRangeStart && "drp-cell-range-start",
              isRangeEnd && "drp-cell-range-end",
            ].filter(Boolean).join(" ");

            const dayClass = [
              "drp-day",
              isSelectedEdge && "drp-day-selected",
              isToday && !isSelectedEdge && "drp-day-today",
            ].filter(Boolean).join(" ");

            return (
              <div
                key={iso}
                className={cellClass}
                onMouseEnter={() => { if (from && !to) setHoverIso(iso); }}
              >
                <button type="button" className={dayClass} onClick={() => selectDay(cell.date)}>
                  {cell.date.getDate()}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <FilterDropdown label={label} count={0} active={active} width={640}>
      {() => (
        <div className="filter-panel-body">
          <div className="drp-panel">
            <div className="drp-sidebar">
              {PRESETS.map((preset) => (
                <button
                  type="button"
                  key={preset.label}
                  className={`drp-preset ${from === preset.from && to === preset.to ? "drp-preset-active" : ""}`}
                  onClick={() => applyPreset(preset)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="drp-calendars" onMouseLeave={() => setHoverIso(null)}>
              {renderCalendar(viewMonth, true, false)}
              <div className="drp-divider" />
              {renderCalendar(rightMonth, false, true)}
            </div>
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
