/**
 * Default billing types used when none are configured in settings.
 * Each entry: { value, label, shortLabel }
 *   value      — stored key on a plan (never changes for existing data)
 *   label      — shown in dropdowns and proposal body ("Monthly")
 *   shortLabel — compact form next to price ("/mo", "/yr")
 */
export const DEFAULT_BILLING_TYPES = [
  { value: "monthly",   label: "Monthly",   shortLabel: "/mo"  },
  { value: "quarterly", label: "Quarterly", shortLabel: "/qtr" },
  { value: "annual",    label: "Annual",    shortLabel: "/yr"  },
  { value: "one-time",  label: "One-time",  shortLabel: "once" },
];

/**
 * Resolve the billing types to use.
 * Falls back to defaults when settings hasn't been configured yet.
 */
export function getBillingTypes(settings) {
  const types = settings?.defaults?.billingTypes;
  if (Array.isArray(types) && types.length > 0) return types;
  return DEFAULT_BILLING_TYPES;
}

/**
 * Get the human-readable label for a billing value.
 * e.g. "monthly" → "Monthly" (or the shortLabel form for compact display)
 */
export function billingLabel(value, settings, { short = false } = {}) {
  if (!value) return "";
  const types = getBillingTypes(settings);
  const found = types.find((t) => t.value === value);
  if (!found) return value; // safe fallback for old/unknown values
  return short ? (found.shortLabel || found.label) : found.label;
}

/**
 * Get the short label used next to prices ("/mo", "/yr", etc.)
 */
export function billingShortLabel(value, settings) {
  return billingLabel(value, settings, { short: true });
}
