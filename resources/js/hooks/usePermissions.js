import { useAuth } from "../contexts/AuthContext.jsx";
import {
  SETTINGS_TAB_SECTIONS,
  SETTINGS_SECTION_KEYS,
  canAccessAnySettings,
} from "../lib/permissions.js";

export function usePermissions() {
  const { user } = useAuth();
  const permissions = user?.permissions || {};
  const isAccountOwner = Boolean(user?.isAccountOwner);
  const isAdmin = Boolean(user?.isAdmin);

  return {
    isAccountOwner,
    isAdmin,
    canRead: (section) => Boolean(permissions[section]?.read),
    canWrite: (section) => Boolean(permissions[section]?.write),
    // Company profile: owner can edit; sub-users can view (read-only) when they can open Settings.
    canReadSettingsTab: (tabId) => {
      if (tabId === "company") {
        return isAccountOwner || canAccessAnySettings(permissions, false);
      }
      return isAccountOwner || Boolean(permissions[SETTINGS_TAB_SECTIONS[tabId]]?.read);
    },
    canWriteSettingsTab: (tabId) => {
      if (tabId === "company") return isAccountOwner;
      return isAccountOwner || Boolean(permissions[SETTINGS_TAB_SECTIONS[tabId]]?.write);
    },
    canAccessSettings: () => canAccessAnySettings(permissions, isAccountOwner),
    settingsSectionForTab: (tabId) => SETTINGS_TAB_SECTIONS[tabId],
  };
}
