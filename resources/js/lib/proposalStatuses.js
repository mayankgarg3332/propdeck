/**
 * Proposal status system.
 *
 * Each status has:
 *   value      — immutable DB key (stored on proposals, never changes)
 *   label      — display name (fully editable)
 *   color      — badge background colour
 *   textColor  — badge text colour
 *   role       — semantic role that drives business logic:
 *                  "initial"  → default status for new proposals
 *                  "sent"     → auto-set when a proposal email is sent
 *                  "positive" → counted in acceptance rate + revenue stats
 *                  "neutral"  → no special meaning
 *                  "negative" → negative outcome
 *
 * Rules enforced in the Settings UI:
 *   - Exactly 1 "initial" role required
 *   - Exactly 1 "sent"    role required
 *   - At least 1 "positive" role required
 *   - Cannot delete a status that has proposals using it
 *   - Cannot delete the last status of a required role
 *   - `value` is auto-generated from label on creation, then locked forever
 */

export const STATUS_ROLES = [
  { value: "initial",  label: "Initial (new proposals default)" },
  { value: "sent",     label: "Sent (auto-set on email send)"   },
  { value: "positive", label: "Positive (counts in stats)"      },
  { value: "neutral",  label: "Neutral"                         },
  { value: "negative", label: "Negative"                        },
];

export const COLOR_PRESETS = [
  { label: "Gray",   bg: "#f3f4f6", text: "#6b7280"  },
  { label: "Blue",   bg: "#eff6ff", text: "#2563eb"  },
  { label: "Green",  bg: "#e1f5ee", text: "#0f6e56"  },
  { label: "Red",    bg: "#fef2f2", text: "#dc2626"  },
  { label: "Amber",  bg: "#fffbeb", text: "#d97706"  },
  { label: "Purple", bg: "#f3e8ff", text: "#7c3aed"  },
  { label: "Teal",   bg: "#ccfbf1", text: "#0f766e"  },
  { label: "Pink",   bg: "#fce7f3", text: "#9d174d"  },
];

export const DEFAULT_PROPOSAL_STATUSES = [
  { value: "Draft",    label: "Draft",    color: "#f3f4f6", textColor: "#6b7280",  role: "initial"  },
  { value: "Sent",     label: "Sent",     color: "#eff6ff", textColor: "#2563eb",  role: "sent"     },
  { value: "Accepted", label: "Accepted", color: "#e1f5ee", textColor: "#0f6e56",  role: "positive" },
  { value: "Rejected", label: "Rejected", color: "#fef2f2", textColor: "#dc2626",  role: "negative" },
  { value: "Expired",  label: "Expired",  color: "#fef2f2", textColor: "#dc2626",  role: "negative" },
  { value: "Revised",  label: "Revised",  color: "#fffbeb", textColor: "#d97706",  role: "neutral"  },
];

/** Resolve the statuses to use — falls back to defaults if not configured. */
export function getProposalStatuses(settings) {
  const custom = settings?.defaults?.proposalStatuses;
  if (Array.isArray(custom) && custom.length > 0) return custom;
  return DEFAULT_PROPOSAL_STATUSES;
}

/** Find the single status with a given role (returns first match). */
export function getStatusByRole(settings, role) {
  return getProposalStatuses(settings).find((s) => s.role === role) ?? null;
}

/** All statuses whose role matches — used for stats (e.g. all "positive"). */
export function getStatusesByRole(settings, role) {
  return getProposalStatuses(settings).filter((s) => s.role === role);
}

/** Get CSS style object for a status value, looking up from settings. */
export function getStatusStyle(value, settings) {
  const statuses = getProposalStatuses(settings);
  const found = statuses.find((s) => s.value === value);
  if (found) return { background: found.color, color: found.textColor };
  // Fallback for old/unknown statuses — neutral gray
  return { background: "#f3f4f6", color: "#6b7280" };
}

/**
 * Validate a proposed statuses array.
 * Returns array of error strings (empty = valid).
 */
export function validateStatuses(statuses) {
  const errors = [];
  if (!statuses || statuses.length === 0) {
    errors.push("At least one status is required.");
    return errors;
  }
  const initialCount  = statuses.filter((s) => s.role === "initial").length;
  const sentCount     = statuses.filter((s) => s.role === "sent").length;
  const positiveCount = statuses.filter((s) => s.role === "positive").length;

  if (initialCount !== 1) errors.push(`Exactly one status must have the "Initial" role (currently ${initialCount}).`);
  if (sentCount    !== 1) errors.push(`Exactly one status must have the "Sent" role (currently ${sentCount}).`);
  if (positiveCount < 1) errors.push('At least one status must have the "Positive" role for stats.');

  statuses.forEach((s, i) => {
    if (!s.value?.trim()) errors.push(`Row ${i + 1}: value (key) cannot be empty.`);
    if (!s.label?.trim()) errors.push(`Row ${i + 1}: label cannot be empty.`);
  });

  // Duplicate values
  const values = statuses.map((s) => s.value?.trim().toLowerCase()).filter(Boolean);
  const dupes = values.filter((v, i) => values.indexOf(v) !== i);
  if (dupes.length > 0) errors.push(`Duplicate status values: ${[...new Set(dupes)].join(", ")}.`);

  return errors;
}

/** Generate a slug-safe value from a label for new statuses. */
export function slugifyStatusLabel(label) {
  return label.trim().replace(/\s+/g, "_").replace(/[^A-Za-z0-9_-]/g, "");
}
