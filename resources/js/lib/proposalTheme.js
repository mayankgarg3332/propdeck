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
