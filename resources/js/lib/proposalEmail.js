import QRCode from "qrcode";
import { amountInWords, formatDate } from "./format.js";
import { getProposalHeaderColor, headerSubtitleColor, buildProposalTheme } from "./proposalTheme.js";
import { billingLabel as _billingLabel } from "./billingTypes.js";

/**
 * Generate a static UPI QR code as a base64 PNG data URL.
 * Returns null if upiId is blank.
 */
export async function generateUpiQr(upiId, payeeName = "") {
  if (!upiId?.trim()) return null;
  const params = new URLSearchParams({ pa: upiId.trim(), pn: payeeName.trim() || "Payment", cu: "INR" });
  const upiString = `upi://pay?${params.toString()}`;
  try {
    return await QRCode.toDataURL(upiString, {
      width: 160,
      margin: 1,
      color: { dark: "#111827", light: "#ffffff" },
    });
  } catch {
    return null;
  }
}

export function billingLabel(value, settings) {
  return _billingLabel(value, settings);
}

export function renderExtrasHtml(extrasText) {
  if (!extrasText) return "";
  const lines = extrasText.split("\n").filter((l) => l.trim());
  const isBullet = (l) => /^[-•*]/.test(l.trim());
  if (lines.every(isBullet)) {
    const items = lines
      .map((l) => `<li style="padding:3px 0;font-size:13px;color:#374151;">${l.trim().replace(/^[-•*]\s*/, "")}</li>`)
      .join("");
    return `<ul style="margin:8px 0 0 18px;padding:0;">${items}</ul>`;
  }
  return lines
    .map((l) => {
      if (isBullet(l)) return `<div style="padding:3px 0;font-size:13px;color:#374151;">• ${l.trim().replace(/^[-•*]\s*/, "")}</div>`;
      return `<p style="margin:4px 0;font-size:13px;color:#374151;line-height:1.6;">${l}</p>`;
    })
    .join("");
}

/**
 * Reconstruct lineItems array from a saved proposal's lineItemsSnapshot.
 * Returns null when no snapshot exists (older proposals without item detail).
 */
export function lineItemsFromSnapshot(proposal) {
  if (!proposal?.lineItemsSnapshot?.length) return null;
  return proposal.lineItemsSnapshot.map((s) => ({
    product: { name: s.productName, color: s.productColor, id: s.productName },
    plan: {
      name: s.planName,
      description: s.planDescription,
      features: s.features || [],
      billing: s.billing || null,
    },
    showcasePlans: (s.showcasePlans || []).map((p) => ({
      name: p.planName,
      description: p.planDescription,
      features: p.features || [],
      billing: p.billing || null,
      mrp: p.mrp,
    })),
    mrp: s.mrp,
    repDiscount: s.repDiscount,
    frequencyDiscount: s.frequencyDiscount || 0,
    final: s.final,
  }));
}

export function totalsFromProposal(proposal) {
  return {
    subtotal: proposal.subtotal ?? proposal.amount,
    gst: proposal.gst ?? 0,
    total: proposal.amount,
  };
}

/**
 * Build a hosted QR image URL for use in email HTML.
 * Email clients block data: URIs, so we use api.qrserver.com which returns
 * a plain HTTPS image URL that renders in every email client.
 */
function upiQrEmailUrl(upiId, payeeName = "") {
  if (!upiId?.trim()) return null;
  const params = new URLSearchParams({ pa: upiId.trim(), pn: payeeName.trim() || "Payment", cu: "INR" });
  const upiString = `upi://pay?${params.toString()}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=90x90&margin=1&data=${encodeURIComponent(upiString)}`;
}

/**
 * Build the full rich HTML email for a proposal.
 * Used by both the New Proposal builder and the Resend flow.
 *
 * When lineItems is null (older proposals without a snapshot), falls back
 * to a simple product name list from proposal.products.
 */
export function buildProposalHtmlEmail({
  client,
  proposalId,
  lineItems,
  totals,
  paymentLink = "",
  frequency = "monthly",
  extrasHeading = "",
  extrasText = "",
  settings,
  rep,
  proposalDate = null,
}) {
  const payment = settings?.payment || {};
  const kyc = settings?.defaults?.kyc || [];
  const terms = settings?.defaults?.terms || [];
  const gstRate = settings?.defaults?.gstRate || 18;
  const validityDays = settings?.defaults?.validityDays || 7;
  const company = settings?.company || {};
  const headerColor = getProposalHeaderColor(company);
  const headerSub = headerSubtitleColor();
  const { primary: ac, primaryDark: acd, primaryBg: acbg, primaryBadgeBg: acbadge } = buildProposalTheme(headerColor);
  const freqLabel = frequency || "monthly";
  const repEmail = company.email || rep?.email || "";
  // Use a hosted QR URL for email — data: URIs are blocked by Gmail/Outlook/Apple Mail
  const emailQrUrl = upiQrEmailUrl(payment.upi, company.name);
  const signatory = company.signatory || rep?.name || "Sales Team";
  const phone = company.phone || rep?.phone || "";

  const inr = (v) => `₹${Number(v).toLocaleString("en-IN")}`;

  // Date handling: use supplied proposal date if available, else today
  const baseDate = proposalDate ? new Date(proposalDate + "T00:00:00") : new Date();
  const dateStr = baseDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const validTill = new Date(baseDate);
  validTill.setDate(validTill.getDate() + validityDays);
  const validTillStr = validTill.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  // Product section — full cards if lineItems available, simple list otherwise
  let productsSection = "";
  let pricingSection = "";

  if (lineItems && lineItems.length > 0) {
    const productCards = lineItems.map((item) => {
      const disc = item.repDiscount + (item.frequencyDiscount || 0);
      const showcase = item.showcasePlans || [];
      const hasComparison = showcase.length > 0;

      if (!hasComparison) {
        // Single plan card — same as before
        const mrpHtml = disc > 0
          ? `<span style="text-decoration:line-through;color:#9ca3af;font-size:12px;margin-right:4px;">${inr(item.mrp)}</span>`
          : "";
        const features = (item.plan.features || []).map((f) =>
          `<div style="padding:2px 0;font-size:12px;color:#374151;"><span style="color:${ac};font-weight:700;margin-right:5px;">✓</span>${f}</div>`
        ).join("");
        return `
<div style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:12px;">
  <div style="border-left:4px solid ${item.product.color || ac};padding:14px 16px;background:#fafafa;">
    <table style="width:100%;border-collapse:collapse;"><tr>
      <td><span style="font-size:15px;font-weight:700;color:#111827;">${item.product.name}</span>
        <span style="display:inline-block;background:${acbadge};color:${acd};font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px;margin-left:8px;">${item.plan.name}</span>
        <div style="color:#6b7280;font-size:12px;margin-top:3px;">${item.plan.description}</div>
      </td>
      <td style="text-align:right;white-space:nowrap;vertical-align:top;">
        ${mrpHtml}<div style="font-size:16px;font-weight:800;color:${ac};">${inr(item.final)}</div>
        ${item.plan.billing ? `<div style="font-size:11px;color:#9ca3af;">${billingLabel(item.plan.billing, settings)}</div>` : ""}
      </td>
    </tr></table>
  </div>
  <div style="padding:10px 16px 12px;background:#fff;">${features}</div>
</div>`;
      }

      // Comparison card — recommended + showcase plans, max 3 per row
      const allPlans = [
        { plan: item.plan, isRecommended: true, finalPrice: item.final, disc },
        ...showcase.map((p) => ({ plan: p, isRecommended: false, finalPrice: p.mrp, disc: 0 })),
      ];
      // Split into rows of max 3
      const rows = [];
      for (let i = 0; i < allPlans.length; i += 3) rows.push(allPlans.slice(i, i + 3));

      const buildPlanCols = (rowPlans) => {
        const colWidth = Math.floor(100 / rowPlans.length);
        return rowPlans.map(({ plan, isRecommended, finalPrice, disc: d }) => {
        const features = (plan.features || []).map((f) =>
          `<div style="padding:2px 0;font-size:11px;color:${isRecommended ? "#374151" : "#6b7280"};">
            <span style="color:${isRecommended ? ac : "#9ca3af"};font-weight:700;margin-right:4px;">✓</span>${f}
          </div>`
        ).join("");
        const mrpLine = isRecommended && d > 0
          ? `<div style="text-decoration:line-through;color:#9ca3af;font-size:11px;">${inr(item.mrp)}</div>`
          : "";
        return `<td style="width:${colWidth}%;padding:12px 10px;vertical-align:top;border:${isRecommended ? `2px solid ${ac}` : "1px solid #e5e7eb"};border-radius:8px;background:${isRecommended ? acbg : "#fff"};">
          ${isRecommended ? `<div style="display:inline-block;background:${ac};color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:999px;margin-bottom:6px;">⭐ Recommended</div>` : ""}
          <div style="font-size:13px;font-weight:700;color:#111827;margin-bottom:2px;">${plan.name}</div>
          <div style="font-size:11px;color:#6b7280;margin-bottom:8px;">${plan.description}</div>
          ${mrpLine}
          <div style="font-size:15px;font-weight:800;color:${isRecommended ? ac : "#374151"};margin-bottom:2px;">${inr(finalPrice)}</div>
          ${plan.billing ? `<div style="font-size:10px;color:#9ca3af;margin-bottom:8px;">${billingLabel(plan.billing)}</div>` : "<div style='margin-bottom:8px;'></div>"}
          ${features}
        </td>`;
        }).join(`<td style="width:8px;"></td>`);
      };

      const rowTables = rows.map((rowPlans) =>
        `<table style="width:100%;border-collapse:separate;border-spacing:0;margin-bottom:${rows.length > 1 ? "10px" : "0"};"><tr>${buildPlanCols(rowPlans)}</tr></table>`
      ).join("");

      return `
<div style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:12px;">
  <div style="border-left:4px solid ${item.product.color || ac};padding:12px 16px;background:#fafafa;">
    <span style="font-size:15px;font-weight:700;color:#111827;">${item.product.name}</span>
    <div style="font-size:11px;color:#6b7280;margin-top:2px;">Choose the plan that works for you</div>
  </div>
  <div style="padding:12px 14px;background:#fff;">${rowTables}</div>
</div>`;
    }).join("");

    const hasDiscount = lineItems.some((item) => (item.repDiscount + (item.frequencyDiscount || 0)) > 0);
    const pricingRows = lineItems.map((item) => {
      const disc = item.repDiscount + (item.frequencyDiscount || 0);
      const mrpCell = disc > 0 ? `<s style="color:#9ca3af;">${inr(item.mrp)}</s>` : inr(item.mrp);
      return `<tr style="border-bottom:1px solid #f3f4f6;">
      <td style="padding:10px 12px;font-size:13px;color:#374151;">${item.product.name}</td>
      <td style="padding:10px 12px;font-size:13px;color:#6b7280;">${item.plan.name}</td>
      ${hasDiscount ? `<td style="padding:10px 12px;font-size:13px;">${mrpCell}</td>` : ""}
      ${hasDiscount ? `<td style="padding:10px 12px;font-size:13px;text-align:center;color:#374151;">${disc > 0 ? `${disc}%` : "—"}</td>` : ""}
      <td style="padding:10px 12px;font-size:13px;font-weight:700;color:${ac};text-align:right;">${inr(item.final)}</td>
    </tr>`;
    }).join("");

    productsSection = `
  <h3 style="margin:0 0 14px;font-size:15px;color:#111827;font-weight:700;">Products Offered</h3>
  ${productCards}
  <h3 style="margin:24px 0 12px;font-size:15px;color:#111827;font-weight:700;">Pricing Breakdown</h3>
  <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:8px;">
    <thead><tr style="background:#f3f4f6;">
      <th style="padding:10px 12px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;font-weight:700;">Product</th>
      <th style="padding:10px 12px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;font-weight:700;">Plan</th>
      ${hasDiscount ? `<th style="padding:10px 12px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;font-weight:700;">MRP</th>` : ""}
      ${hasDiscount ? `<th style="padding:10px 12px;text-align:center;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;font-weight:700;">Disc.%</th>` : ""}
      <th style="padding:10px 12px;text-align:right;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;font-weight:700;">${hasDiscount ? "Your Price" : "Amount"}</th>
    </tr></thead>
    <tbody>${pricingRows}</tbody>
  </table>
  <table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
    <tr><td style="padding:6px 12px;font-size:13px;color:#6b7280;">Subtotal</td><td style="padding:6px 12px;text-align:right;font-size:13px;font-weight:600;color:#374151;">${inr(totals.subtotal)}</td></tr>
    <tr><td style="padding:6px 12px;font-size:13px;color:#6b7280;">GST (${gstRate}%)</td><td style="padding:6px 12px;text-align:right;font-size:13px;font-weight:600;color:#374151;">${inr(totals.gst)}</td></tr>
  </table>`;
  } else {
    // Fallback for older proposals without lineItemsSnapshot
    const productRows = (client?.products || []).map((p) =>
      `<div style="padding:4px 0;font-size:13px;color:#374151;"><span style="color:${ac};font-weight:700;margin-right:6px;">✓</span>${p}</div>`
    ).join("");
    productsSection = `
  <h3 style="margin:0 0 12px;font-size:15px;color:#111827;font-weight:700;">Products Included</h3>
  <div style="border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px;background:#fafafa;margin-bottom:20px;">${productRows}</div>`;
  }

  const kycItems = kyc.map((d, i) => `<div style="padding:3px 0;font-size:13px;color:#92400e;">${i + 1}. ${d}</div>`).join("");
  const termItems = terms.map((t, i) => `<div style="padding:3px 0;font-size:12px;color:#6b7280;">${i + 1}. ${t}</div>`).join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Inter,ui-sans-serif,system-ui,-apple-system,sans-serif;">
<div style="max-width:640px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

<div style="background:${headerColor};padding:26px 32px;">
  <table style="width:100%;border-collapse:collapse;"><tr>
    <td><div style="color:#fff;font-size:20px;font-weight:800;">${company.name || "Propdeck"}</div>
      <div style="color:${headerSub};font-size:11px;margin-top:3px;">${company.tagline || ""}</div></td>
    <td style="text-align:right;"><div style="color:#fff;font-size:14px;font-weight:700;">${proposalId}</div>
      <div style="color:${headerSub};font-size:11px;margin-top:3px;">Prepared for ${client?.agency || ""}</div></td>
  </tr></table>
</div>

<div style="background:#f8fafc;border-bottom:1px solid #e2e8f0;padding:14px 32px;">
  <table style="width:100%;border-collapse:collapse;"><tr>
    <td style="width:25%;padding-right:8px;">
      <div style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Prepared By</div>
      <div style="font-size:12px;font-weight:600;color:#111827;margin-top:3px;">${signatory}</div>
    </td>
    <td style="width:25%;padding:0 8px;">
      <div style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Prepared For</div>
      <div style="font-size:12px;font-weight:600;color:#111827;margin-top:3px;">${client?.agency || ""}</div>
    </td>
    <td style="width:25%;padding:0 8px;">
      <div style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Date</div>
      <div style="font-size:12px;font-weight:600;color:#111827;margin-top:3px;">${dateStr}</div>
    </td>
    <td style="width:25%;padding-left:8px;">
      <div style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Valid Till</div>
      <div style="font-size:12px;font-weight:600;color:#111827;margin-top:3px;">${validTillStr}</div>
    </td>
  </tr></table>
</div>

<div style="padding:28px 32px;">
  <p style="margin:0 0 20px;color:#374151;line-height:1.7;">Dear <strong>${client?.contact || "Sir/Madam"}</strong>,</p>
  ${company.about ? `<p style="margin:0 0 24px;color:#6b7280;font-size:13px;line-height:1.7;">${company.about}</p>` : ""}

  ${productsSection}

  <div style="background:${ac};border-radius:8px;padding:14px 16px;margin-bottom:6px;">
    <table style="width:100%;border-collapse:collapse;"><tr>
      <td style="color:#fff;font-weight:700;font-size:14px;">TOTAL PAYABLE</td>
      <td style="text-align:right;color:#fff;font-weight:800;font-size:20px;">${inr(totals.total)}</td>
    </tr><tr>
      <td colspan="2" style="color:rgba(255,255,255,0.8);font-size:11px;padding-top:4px;">${amountInWords(totals.total)}</td>
    </tr></table>
  </div>
  <p style="margin:0 0 24px;font-size:11px;color:#9ca3af;">Prices in INR. GST @ ${gstRate}% applicable. Frequency: ${freqLabel}.</p>

  ${paymentLink ? `<div style="margin-bottom:24px;text-align:center;"><a href="${paymentLink}" style="display:inline-block;background:${ac};color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:700;font-size:14px;">Pay Now</a></div>` : ""}

  ${extrasText ? `
  <div style="border:1.5px solid ${ac};border-radius:8px;overflow:hidden;background:${acbg};margin-bottom:24px;">
    <div style="border-left:4px solid ${ac};padding:16px;">
      <div style="font-size:14px;font-weight:700;color:${acd};margin-bottom:8px;">${extrasHeading || "Complimentary / Extras"}</div>
      ${renderExtrasHtml(extrasText)}
    </div>
  </div>` : ""}

  <h3 style="margin:0 0 12px;font-size:15px;color:#111827;font-weight:700;">Bank Transfer Details</h3>
  <div style="border:1.5px solid ${ac};border-radius:8px;overflow:hidden;background:${acbg};margin-bottom:24px;">
    <div style="border-left:4px solid ${ac};padding:16px;">
      <table style="width:100%;border-collapse:collapse;"><tr>
        <td style="width:50%;padding-right:16px;vertical-align:top;">
          <div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;">Bank</div>
          <div style="font-size:13px;font-weight:600;color:#111827;margin-bottom:10px;">${payment.bank || "—"}</div>
          <div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;">Account No</div>
          <div style="font-size:13px;font-weight:600;color:#111827;margin-bottom:10px;">${payment.account || "—"}</div>
          <div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;">IFSC</div>
          <div style="font-size:13px;font-weight:600;color:#111827;">${payment.ifsc || "—"}</div>
        </td>
        <td style="width:50%;vertical-align:top;">
          <div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;">Account Holder</div>
          <div style="font-size:13px;font-weight:600;color:#111827;margin-bottom:10px;">${payment.holder || payment.bank || "—"}</div>
          <div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;">Account Type</div>
          <div style="font-size:13px;font-weight:600;color:#111827;margin-bottom:10px;">${payment.type || "—"}</div>
        </td>
      </tr></table>
      ${(emailQrUrl || payment.upi) ? `
      <div style="border-top:1px solid ${ac}22;margin-top:12px;padding-top:12px;">
        <table style="width:100%;border-collapse:collapse;"><tr>
          ${emailQrUrl ? `<td style="width:100px;vertical-align:middle;padding-right:14px;">
            <img src="${emailQrUrl}" width="90" height="90" style="display:block;border-radius:6px;border:1px solid #e5e7eb;" alt="UPI QR"/>
          </td>` : ""}
          <td style="vertical-align:middle;">
            <div style="font-size:11px;font-weight:700;color:${acd};margin-bottom:4px;">PAY VIA UPI</div>
            <div style="font-size:12px;font-weight:600;color:#111827;word-break:break-all;margin-bottom:6px;">${payment.upi || ""}</div>
            <div style="font-size:10px;color:#6b7280;">Scan with GPay · PhonePe · Paytm · any UPI app</div>
          </td>
        </tr></table>
      </div>` : ""}
    </div>
  </div>

  ${kyc.length > 0 ? `
  <h3 style="margin:0 0 12px;font-size:15px;color:#111827;font-weight:700;">KYC Documents Required</h3>
  <div style="border:1.5px solid #f59e0b;border-radius:8px;overflow:hidden;background:#fffbeb;margin-bottom:24px;">
    <div style="border-left:4px solid #f59e0b;padding:14px 16px;">${kycItems}</div>
  </div>` : ""}

  ${terms.length > 0 ? `
  <h3 style="margin:0 0 10px;font-size:15px;color:#111827;font-weight:700;">Terms & Conditions</h3>
  <div style="margin-bottom:24px;">${termItems}</div>` : ""}

  <div style="border-top:1px solid #f3f4f6;padding-top:18px;">
    <div style="font-weight:700;color:#111827;font-size:14px;">${signatory}</div>
    <div style="color:#6b7280;font-size:12px;margin-top:2px;">${company.designation || rep?.role || "Sales Rep"} · ${company.name || "Propdeck"}</div>
    <div style="margin-top:6px;font-size:12px;color:#6b7280;">${[phone, repEmail].filter(Boolean).join(" · ")}</div>
  </div>
</div>

<div style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px;text-align:center;">
  <div style="color:${acd};font-weight:700;font-size:13px;margin-bottom:4px;">${company.name || "Propdeck"}</div>
  ${company.address ? `<div style="color:#6b7280;font-size:11px;margin-bottom:3px;">${company.address.replace(/\n/g, ", ")}</div>` : ""}
  ${company.gst ? `<div style="color:#6b7280;font-size:11px;margin-bottom:3px;">GST No: ${company.gst}</div>` : ""}
  <div style="color:#9ca3af;font-size:10px;">© ${new Date().getFullYear()} ${company.name || "Propdeck"}. All rights reserved.</div>
</div>

</div>
</body>
</html>`;
}
