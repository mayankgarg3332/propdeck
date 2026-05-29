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

  return {
    isAccountOwner,
    canRead: (section) => Boolean(permissions[section]?.read),
    canWrite: (section) => Boolean(permissions[section]?.write),
    canReadSettingsTab: (tabId) =>
      isAccountOwner || Boolean(permissions[SETTINGS_TAB_SECTIONS[tabId]]?.read),
    canWriteSettingsTab: (tabId) =>
      isAccountOwner || Boolean(permissions[SETTINGS_TAB_SECTIONS[tabId]]?.write),
    canAccessSettings: () => canAccessAnySettings(permissions, isAccountOwner),
    settingsSectionForTab: (tabId) => SETTINGS_TAB_SECTIONS[tabId],
  };
}
