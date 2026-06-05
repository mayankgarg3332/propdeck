/**
 * Normalize a selection entry to the canonical object format.
 * Handles both old format (plain string planId) and new format ({ recommended, showcase }).
 */
export function normalizeSelection(sel) {
  if (!sel) return null;
  if (typeof sel === "string") return { recommended: sel, showcase: [] };
  return { recommended: sel.recommended, showcase: Array.isArray(sel.showcase) ? sel.showcase : [] };
}

/**
 * Build line items for pricing from selections.
 * Only the recommended plan per product contributes to totals.
 * Showcase plans are attached for display purposes only.
 */
export function buildLineItems({ selections, products, discounts = {} }) {
  return Object.entries(selections)
    .map(([productId, rawSelection]) => {
      const sel = normalizeSelection(rawSelection);
      if (!sel?.recommended) return null;

      const product = products.find((p) => p.id === productId);
      const plan = product?.plans.find((p) => p.id === sel.recommended);
      if (!product || !plan) return null;

      const repDiscountRate = Number(discounts[productId] || 0) / 100;
      const final = Math.round(plan.mrp * (1 - repDiscountRate));

      // Resolve showcase plans (display only — no pricing)
      const showcasePlans = sel.showcase
        .map((id) => product.plans.find((p) => p.id === id))
        .filter(Boolean);

      return {
        product,
        plan,           // recommended plan — drives pricing
        showcasePlans,  // additional plans shown for comparison
        mrp: plan.mrp,
        repDiscount: Number(discounts[productId] || 0),
        frequencyDiscount: 0,
        final,
      };
    })
    .filter(Boolean);
}

export function summarizeProposal(lineItems, gstRate = 18) {
  const subtotal = lineItems.reduce((sum, item) => sum + item.final, 0);
  const gst = Math.round(subtotal * (Number(gstRate) / 100));
  return {
    subtotal,
    gst,
    total: subtotal + gst,
  };
}

export function nextProposalId(proposals, settings) {
  const prefix = settings?.defaults?.proposalPrefix?.trim() || "PD";
  const startNumber = Math.max(1, Number(settings?.defaults?.proposalStartNumber) || 1);
  const year = new Date().getFullYear();

  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^${escapedPrefix}-${year}-(\\d+)$`);

  const existingIds = new Set(proposals.map((p) => p.id));

  let candidate = startNumber;
  while (existingIds.has(`${prefix}-${year}-${candidate}`)) {
    candidate++;
  }

  return `${prefix}-${year}-${candidate}`;
}
