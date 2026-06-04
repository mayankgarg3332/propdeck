export function buildLineItems({ selections, products, discounts = {} }) {
  return Object.entries(selections)
    .map(([productId, planId]) => {
      const product = products.find((item) => item.id === productId);
      const plan = product?.plans.find((item) => item.id === planId);
      if (!product || !plan) return null;

      const repDiscountRate = Number(discounts[productId] || 0) / 100;
      const final = Math.round(plan.mrp * (1 - repDiscountRate));

      return {
        product,
        plan,
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

  // Escape prefix for use in regex (handles hyphens and other literals)
  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^${escapedPrefix}-${year}-(\\d+)$`);

  // Client-side fallback only — server assigns globally unique IDs via app-state.
  const existingIds = new Set(proposals.map((p) => p.id));

  let candidate = startNumber;
  while (existingIds.has(`${prefix}-${year}-${candidate}`)) {
    candidate++;
  }

  return `${prefix}-${year}-${candidate}`;
}
