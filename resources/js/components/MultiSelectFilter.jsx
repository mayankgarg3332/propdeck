import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { FilterDropdown } from "./FilterDropdown.jsx";

export function MultiSelectFilter({ label, options, selected, onChange, searchable = false, searchPlaceholder = "Search..." }) {
  const [query, setQuery] = useState("");

  const filteredOptions = useMemo(() => {
    if (!searchable || !query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter(
      (opt) =>
        opt.label?.toLowerCase().includes(q) ||
        (opt.sublabel && opt.sublabel.toLowerCase().includes(q))
    );
  }, [options, query, searchable]);

  const toggle = (value) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <FilterDropdown label={label} count={selected.length}>
      {() => (
        <div className="filter-panel-body">
          {searchable && (
            <div className="filter-search">
              <Search size={14} />
              <input
                autoFocus
                placeholder={searchPlaceholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          )}
          <div className="filter-option-list">
            {filteredOptions.length === 0 ? (
              <div className="filter-empty">No matches</div>
            ) : (
              filteredOptions.map((opt) => (
                <label className="filter-option" key={opt.value}>
                  <input
                    type="checkbox"
                    checked={selected.includes(opt.value)}
                    onChange={() => toggle(opt.value)}
                  />
                  {opt.swatch && <span className="filter-option-swatch" style={opt.swatch} />}
                  <span className="filter-option-text">
                    {opt.label}
                    {opt.sublabel && <span className="filter-option-sublabel">{opt.sublabel}</span>}
                  </span>
                </label>
              ))
            )}
          </div>
          {selected.length > 0 && (
            <button type="button" className="filter-clear-link" onClick={() => onChange([])}>
              Clear {label.toLowerCase()}
            </button>
          )}
        </div>
      )}
    </FilterDropdown>
  );
}
