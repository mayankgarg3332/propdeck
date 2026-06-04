export const DEFAULT_PROPOSAL_HEADER_COLOR = "#0f6e56";

/** Normalize user input to #RRGGBB or return fallback. */
export function normalizeHexColor(value, fallback = DEFAULT_PROPOSAL_HEADER_COLOR) {
  if (!value || typeof value !== "string") return fallback;
  const raw = value.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(raw)) return raw.toLowerCase();
  if (/^[0-9A-Fa-f]{6}$/.test(raw)) return `#${raw.toLowerCase()}`;
  return fallback;
}

export function getProposalHeaderColor(company) {
  return normalizeHexColor(company?.proposalHeaderColor);
}

export function hexToRgb(hex) {
  const h = normalizeHexColor(hex).slice(1);
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/** Subtitle text on colored proposal header (HTML). */
export function headerSubtitleColor() {
  return "rgba(255,255,255,0.65)";
}

/** Subtitle text on colored proposal header (PDF hex). */
export function headerSubtitleColorPdf(headerHex) {
  const [r, g, b] = hexToRgb(headerHex);
  const blend = (c) => Math.round(c + (255 - c) * 0.72);
  const rr = blend(r);
  const gg = blend(g);
  const bb = blend(b);
  return `#${rr.toString(16).padStart(2, "0")}${gg.toString(16).padStart(2, "0")}${bb.toString(16).padStart(2, "0")}`;
}

/** Darken a hex color by ratio (0–1). */
function darkenColor(hex, ratio) {
  const [r, g, b] = hexToRgb(hex);
  const d = (c) => Math.max(0, Math.round(c * (1 - ratio)));
  return `#${d(r).toString(16).padStart(2, "0")}${d(g).toString(16).padStart(2, "0")}${d(b).toString(16).padStart(2, "0")}`;
}

/** Blend color toward white by ratio (0 = no change, 1 = pure white). */
function tintColor(hex, whiteMix) {
  const [r, g, b] = hexToRgb(hex);
  const t = (c) => Math.round(c + (255 - c) * whiteMix);
  return `#${t(r).toString(16).padStart(2, "0")}${t(g).toString(16).padStart(2, "0")}${t(b).toString(16).padStart(2, "0")}`;
}

/** WCAG relative luminance. */
function luminance(r, g, b) {
  return [r, g, b].reduce((acc, c, i) => {
    const s = c / 255;
    const linear = s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    return acc + linear * [0.2126, 0.7152, 0.0722][i];
  }, 0);
}

/** WCAG contrast ratio between two hex colors. */
function contrastRatio(hex1, hex2) {
  const [r1, g1, b1] = hexToRgb(hex1);
  const [r2, g2, b2] = hexToRgb(hex2);
  const l1 = luminance(r1, g1, b1);
  const l2 = luminance(r2, g2, b2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Ensure a color is readable on white (WCAG AA = 4.5:1).
 * Progressively darkens until contrast is met.
 */
function ensureReadableOnWhite(hex) {
  if (contrastRatio(hex, "#ffffff") >= 4.5) return hex;
  for (let ratio = 0.05; ratio <= 0.85; ratio += 0.05) {
    const darkened = darkenColor(hex, ratio);
    if (contrastRatio(darkened, "#ffffff") >= 4.5) return darkened;
  }
  return "#111827"; // fallback to near-black
}

/**
 * Build a complete color theme from the proposal header color.
 * All accent colors in the proposal (preview, email HTML, PDF) derive from this.
 *
 * - primary:      solid accent — borders, left-bars, checkmarks, prices, badges text
 * - primaryDark:  text on white — headings, footer brand name (guaranteed 4.5:1 contrast)
 * - primaryBg:    very light section background (bank transfer, extras)
 * - primaryBadgeBg: plan badge pill background
 */
export function buildProposalTheme(headerColor) {
  const primary = normalizeHexColor(headerColor);
  const primaryDark = ensureReadableOnWhite(primary);
  const primaryBg = tintColor(primary, 0.93);
  const primaryBadgeBg = tintColor(primary, 0.88);
  // Light tint for text that sits ON the primary-colored solid bar (e.g. "amount in words")
  const primaryOnSolid = tintColor(primary, 0.78);

  return { primary, primaryDark, primaryBg, primaryBadgeBg, primaryOnSolid };
}
