import { useState } from "react";
import { Boxes, ChevronLeft, ChevronRight, FileText, Home, Plus, Settings, UserCog, Users } from "lucide-react";
import { usePermissions } from "../hooks/usePermissions.js";

const navItems = [
  { path: "/", label: "Dashboard", icon: Home, section: null },
  { path: "/proposals/new", label: "New Proposal", icon: Plus, cta: true, section: "proposals", requiresWrite: true },
  { path: "/proposals", label: "All Proposals", icon: FileText, section: "proposals" },
  { path: "/clients", label: "Clients", icon: Users, section: "clients" },
  { path: "/products", label: "Products & Plans", icon: Boxes, section: "products" },
  { path: "/team", label: "Team", icon: UserCog, ownerOnly: true },
  { path: "/settings", label: "Settings", icon: Settings, settingsNav: true },
];

const COLLAPSE_STORAGE_KEY = "propdeck.sidebarCollapsed";

export function Sidebar({ currentPath, onNavigate, onNewProposal, rep, settings, user }) {
  const perms = usePermissions();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_STORAGE_KEY) === "1");
  const displayName = user?.name || settings?.company?.signatory || rep?.name || "—";
  const displayRole = user?.email || settings?.company?.designation || rep?.role || "Sales Rep";
  const initials = displayName
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  };

  return (
    <aside className={`sidebar ${collapsed ? "sidebar-collapsed" : ""}`}>
      <button
        type="button"
        className="sidebar-collapse-toggle"
        onClick={toggleCollapsed}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
      <div className="sidebar-logo">
        <div className="brand">{collapsed ? "P" : "Propdeck"}</div>
        {!collapsed && <div className="brand-subtitle">Proposal Studio</div>}
      </div>
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          if (item.ownerOnly && !perms.isAccountOwner) return null;
          if (item.settingsNav && !perms.canAccessSettings()) return null;
          if (item.section && !perms.canRead(item.section)) return null;
          if (item.requiresWrite && !perms.canWrite(item.section)) return null;

          const Icon = item.icon;
          const active = currentPath === item.path;
          return (
            <button
              key={item.path}
              className={`sidebar-item ${active ? "active" : ""} ${item.cta ? "cta" : ""}`}
              onClick={() => (item.cta ? onNewProposal() : onNavigate(item.path))}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={17} />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>
      <div className="sidebar-user" title={collapsed ? `${displayName} · ${displayRole}` : undefined}>
        <div className="avatar">{initials}</div>
        {!collapsed && (
          <div>
            <div className="user-name">{displayName}</div>
            <div className="user-role">{displayRole}</div>
          </div>
        )}
      </div>
    </aside>
  );
}
