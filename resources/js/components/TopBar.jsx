import { Bell, LogOut, Search } from "lucide-react";

export function TopBar({ title, onSearch, rep, settings, user, onLogout }) {
  const displayName = user?.name || settings?.company?.signatory || rep?.name || "";
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("") || "?";

  return (
    <header className="topbar">
      <div className="topbar-title">{title}</div>
      <div className="topbar-actions">
        <button className="quick-search" onClick={onSearch}>
          <Search size={15} />
          <span>Quick search...</span>
          <kbd>Cmd K</kbd>
        </button>
        <button className="icon-button" aria-label="Notifications">
          <Bell size={16} />
          <span className="notification-dot" />
        </button>
        <div className="topbar-avatar">{initials}</div>
        {onLogout && (
          <button className="button ghost" type="button" onClick={onLogout}>
            <LogOut size={14} /> <span style={{ marginLeft: 6 }}>Logout</span>
          </button>
        )}
      </div>
    </header>
  );
}
