import { useEffect, useMemo, useRef, useState } from "react";
import { Boxes, Building2, FileText, Plus, Search, Users } from "lucide-react";
import { formatINR, getStatusStyle } from "../lib/format.js";

const quickLinks = [
  { label: "Clients", path: "/clients", icon: Users },
  { label: "All Proposals", path: "/proposals", icon: FileText },
  { label: "Products & Plans", path: "/products", icon: Boxes },
  { label: "New Proposal", path: "/proposals/new", icon: Plus },
];

function matches(query, ...fields) {
  return fields.some((f) => f?.toLowerCase().includes(query));
}

function buildResults(query, data) {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const groups = [];

  const clients = data.clients.filter((c) =>
    matches(q, c.agency, c.contact, c.city, c.email, c.phone)
  );
  if (clients.length > 0) {
    groups.push({
      type: "client",
      label: "Clients",
      items: clients.slice(0, 4).map((c) => ({
        id: c.id,
        primary: c.agency,
        secondary: `${c.contact}${c.city ? ` · ${c.city}` : ""}`,
        path: "/clients",
        icon: Building2,
      })),
    });
  }

  const proposals = data.proposals.filter((p) => {
    const agency = data.clients.find((c) => c.id === p.clientId)?.agency || "";
    return matches(q, p.id, p.status, agency, ...(p.products || []));
  });
  if (proposals.length > 0) {
    groups.push({
      type: "proposal",
      label: "Proposals",
      items: proposals.slice(0, 4).map((p) => {
        const agency = data.clients.find((c) => c.id === p.clientId)?.agency || "";
        return {
          id: p.id,
          primary: p.id,
          secondary: `${agency} · ${formatINR(p.amount)}`,
          path: "/proposals",
          icon: FileText,
          status: p.status,
        };
      }),
    });
  }

  const products = data.products.filter((p) =>
    matches(q, p.name, p.description, p.category)
  );
  if (products.length > 0) {
    groups.push({
      type: "product",
      label: "Products",
      items: products.slice(0, 3).map((p) => ({
        id: p.id,
        primary: p.name,
        secondary: p.description,
        path: "/products",
        icon: Boxes,
        color: p.color,
      })),
    });
  }

  return groups;
}

export function SearchDialog({ data, onClose, onNavigate }) {
  const [query, setQuery] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(0);
  const inputRef = useRef(null);

  const groups = useMemo(() => buildResults(query, data), [query, data]);

  // Flat list of all items for keyboard nav
  const flatItems = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  // Reset focused index when results change
  useEffect(() => { setFocusedIndex(0); }, [query]);

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((i) => Math.min(i + 1, flatItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && flatItems[focusedIndex]) {
      onNavigate(flatItems[focusedIndex].path);
    }
  };

  const hasQuery = query.trim().length > 0;
  const noResults = hasQuery && groups.length === 0;

  // Running index across groups for keyboard focus tracking
  let globalIndex = 0;

  return (
    <div className="search-backdrop" onClick={onClose}>
      <div className="search-dialog" onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <div className="search-input-row">
          <Search size={20} />
          <input
            ref={inputRef}
            autoFocus
            placeholder="Search clients, proposals, products..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <kbd>Esc</kbd>
        </div>

        {!hasQuery && (
          <>
            <div className="search-section-title">Quick Jump</div>
            <div className="quick-links">
              {quickLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <button key={link.path} onClick={() => onNavigate(link.path)}>
                    <Icon size={16} />
                    {link.label}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {hasQuery && groups.length > 0 && (
          <div className="search-results">
            {groups.map((group) => (
              <div key={group.type} className="search-result-group">
                <div className="search-section-title">{group.label}</div>
                {group.items.map((item) => {
                  const isFocused = globalIndex === focusedIndex;
                  const currentIndex = globalIndex;
                  globalIndex++;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      className={`search-result-item ${isFocused ? "focused" : ""}`}
                      onMouseEnter={() => setFocusedIndex(currentIndex)}
                      onClick={() => onNavigate(item.path)}
                    >
                      <span
                        className="search-result-icon"
                        style={item.color ? { background: item.color + "22", color: item.color } : {}}
                      >
                        <Icon size={14} />
                      </span>
                      <span className="search-result-text">
                        <span className="search-result-primary">{item.primary}</span>
                        <span className="search-result-secondary">{item.secondary}</span>
                      </span>
                      {item.status && (
                        <span className="status-pill" style={{ ...getStatusStyle(item.status), fontSize: 10, padding: "2px 8px" }}>
                          {item.status}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {noResults && (
          <div className="search-no-results">
            No results for <strong>"{query}"</strong>
          </div>
        )}

        <div className="search-counts">
          {data.clients.length} clients · {data.proposals.length} proposals · {data.products.length} products
          {hasQuery && flatItems.length > 0 && (
            <span className="search-nav-hint"> · ↑↓ to navigate · Enter to open</span>
          )}
        </div>
      </div>
    </div>
  );
}
