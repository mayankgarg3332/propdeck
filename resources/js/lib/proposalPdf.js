import { jsPDF } from "jspdf";
import { formatDate } from "./format.js";
import {
  getProposalHeaderColor,
  headerSubtitleColorPdf,
  buildProposalTheme,
} from "./proposalTheme.js";
import { billingLabel as _billingLabel, billingShortLabel } from "./billingTypes.js";

// Helvetica (the only built-in jsPDF font) has no ₹ glyph — use Rs. instead
const inr = (v) => `Rs.${Number(v || 0).toLocaleString("en-IN")}`;

function amountInWords(amount) {
  const n = Math.round(amount);
  if (n === 0) return "Zero Rupees Only";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight",
    "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen"];
  const tensW = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  function convert(num) {
    if (num === 0) return "";
    if (num < 20) return ones[num];
    if (num < 100) return tensW[Math.floor(num / 10)] + (num % 10 ? " " + ones[num % 10] : "");
    if (num < 1000) return ones[Math.floor(num / 100)] + " Hundred" + (num % 100 ? " " + convert(num % 100) : "");
    if (num < 100000) return convert(Math.floor(num / 1000)) + " Thousand" + (num % 1000 ? " " + convert(num % 1000) : "");
    if (num < 10000000) return convert(Math.floor(num / 100000)) + " Lakh" + (num % 100000 ? " " + convert(num % 100000) : "");
    return convert(Math.floor(num / 10000000)) + " Crore" + (num % 10000000 ? " " + convert(num % 10000000) : "");
  }
  return convert(n) + " Rupees Only";
}

// Reconstruct lineItems and totals from the snapshot stored on a saved proposal
export function lineItemsFromProposal(proposal) {
  if (!proposal?.lineItemsSnapshot?.length) return null;
  return proposal.lineItemsSnapshot.map((s) => ({
    product: { name: s.productName, color: s.productColor, id: s.productName },
    plan: { name: s.planName, description: s.planDescription, features: s.features || [], billing: s.billing || null },
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
  if (!proposal?.lineItemsSnapshot?.length || proposal.subtotal == null) return null;
  return { subtotal: proposal.subtotal, gst: proposal.gst, total: proposal.amount };
}

const GRAY_BG = "#f8fafc";
const AMBER_BG = "#fffbeb";
const AMBER_TEXT = "#92400e";
const AMBER_BDR = "#f59e0b";
const CD = "#111827";
const CM = "#374151";
const CL = "#6b7280";
const CMU = "#9ca3af";

/**
 * Strip characters that Helvetica (WinAnsi) cannot render.
 * jsPDF uses Helvetica as its only built-in font, which covers U+0020–U+00FF.
 * Anything outside that range — emojis (surrogate pairs), CJK, Arabic, etc. —
 * gets mis-encoded as garbage bytes. Stripping them is safer than garbled output.
 */
function sanitizeForPdf(text) {
  // Array.from() iterates over true Unicode code points (not UTF-16 code units),
  // so emoji like 🥈 (U+1F948, stored as a surrogate pair 🥈) are
  // treated as a single character and filtered out cleanly. The regex approach
  // operates on code units and can let surrogate bytes bleed through jsPDF's
  // internal Latin-1 encoder, producing garbage like "Ø>ÝH".
  return Array.from(String(text ?? ""))
    .filter((char) => {
      const code = char.codePointAt(0);
      return code >= 0x20 && code <= 0xFF;
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

export function downloadProposalPdf({ proposal, client, settings, rep, creatorSettings, lineItems, totals, frequency, upiQrDataUrl = null, paymentLink = null }) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const M = 40;
  const CW = pw - M * 2;
  let y = 0;

  const company = settings?.company || {};
  const headerColor = getProposalHeaderColor(company);
  const headerMuted = headerSubtitleColorPdf(headerColor);
  const { primary: ac, primaryDark: acd, primaryBg: acbg, primaryBadgeBg: acbadge, primaryOnSolid: acos } = buildProposalTheme(headerColor);
  const payment = settings?.payment || {};
  const kyc = settings?.defaults?.kyc || [];
  // Content blocks: use per-proposal snapshot if available, else fall back to global defaults (migration path)
  const contentBlocks = proposal.contentBlocks
    || (settings?.defaults?.contentBlocks
      ? settings.defaults.contentBlocks.filter((b) => b.enabled)
      : (settings?.defaults?.terms?.length
          ? [{ id: "terms_legacy", title: "Terms & Conditions", content: settings.defaults.terms }]
          : []));
  const resolvedPaymentLink = paymentLink || proposal.paymentLink || null;
  const gstRate = settings?.defaults?.gstRate || 18;
  const validityDays = settings?.defaults?.validityDays || 7;
  const freqLabel = frequency || "monthly";

  const proposalDate = proposal.date ? new Date(proposal.date + "T00:00:00") : new Date();
  const validTill = new Date(proposalDate);
  validTill.setDate(validTill.getDate() + validityDays);
  const dateStr = formatDate(proposalDate.toISOString().split("T")[0]);
  const validTillStr = formatDate(validTill.toISOString().split("T")[0]);
  // If a creatorSettings object is provided (master viewing sub-user's proposal),
  // use the creator's signatory/phone; otherwise fall back to logged-in user's settings.
  const signatory = creatorSettings?.signatory || company.signatory || rep?.name || "Sales Team";
  const phone = creatorSettings?.phone || company.phone || rep?.phone || "";
  const repEmail = company.email || rep?.email || "";

  const txt = (text, x, lineY, opts = {}) => {
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(opts.size || 10);
    doc.setTextColor(opts.color || CD);
    doc.text(sanitizeForPdf(text), x, lineY, {
      align: opts.align || "left",
      maxWidth: opts.maxWidth || CW,
    });
  };

  // Sanitized version of splitTextToSize — always strips emoji/non-Latin before measuring
  const splitSafe = (text, maxW) => doc.splitTextToSize(sanitizeForPdf(text), maxW);

  const need = (h) => {
    if (y + h > ph - 48) {
      doc.addPage();
      y = M;
    }
  };

  // ── HEADER ───────────────────────────────────────────────
  doc.setFillColor(headerColor);
  doc.rect(0, 0, pw, 90, "F");
  y = 34;
  txt(company.name || "Propdeck", M, y, { size: 18, bold: true, color: "#ffffff" });
  txt(company.tagline || "", M, y + 18, { size: 9, color: headerMuted });
  txt(proposal.id, pw - M, y, { size: 13, bold: true, color: "#ffffff", align: "right" });
  txt(`Prepared for ${client?.agency || ""}`, pw - M, y + 18, { size: 9, color: headerMuted, align: "right" });

  // ── META STRIP ───────────────────────────────────────────
  doc.setFillColor(GRAY_BG);
  doc.rect(0, 90, pw, 52, "F");
  doc.setDrawColor("#e2e8f0");
  doc.setLineWidth(0.5);
  doc.line(0, 142, pw, 142);

  const colW = CW / 4;
  [
    ["PREPARED BY", signatory],
    ["PREPARED FOR", client?.agency || ""],
    ["DATE", dateStr],
    ["VALID TILL", validTillStr],
  ].forEach(([label, value], i) => {
    const cx = M + i * colW;
    txt(label, cx, 108, { size: 7.5, bold: true, color: CMU, maxWidth: colW - 6 });
    txt(value, cx, 126, { size: 9.5, bold: true, color: CD, maxWidth: colW - 6 });
  });

  y = 162;

  // ── PRODUCTS ─────────────────────────────────────────────
  if (lineItems && lineItems.length > 0) {
    need(20);
    txt("Products Offered", M, y, { size: 12, bold: true });
    y += 18;

    lineItems.forEach((item) => {
      const showcase = item.showcasePlans || [];
      const hasComparison = showcase.length > 0;

      if (!hasComparison) {
        // ── Single plan card (existing layout) ──
        const features = item.plan.features || [];
        const cardH = 46 + features.length * 14 + 8;
        need(cardH + 8);

        doc.setFillColor("#f9fafb");
        doc.setDrawColor("#e5e7eb");
        doc.setLineWidth(0.5);
        doc.rect(M, y, CW, cardH, "FD");
        doc.setFillColor(item.product.color || ac);
        doc.rect(M, y, 4, cardH, "F");

        const iX = M + 16;
        txt(item.product.name, iX, y + 16, { size: 11, bold: true });

        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        const nameW = doc.getTextWidth(item.product.name);
        const badgeLabel = item.plan.name;
        const badgeX = iX + nameW + 8;
        doc.setFontSize(8);
        const badgeW = doc.getTextWidth(badgeLabel) + 8;
        doc.setFillColor(acbadge);
        doc.rect(badgeX, y + 6, badgeW, 13, "F");
        txt(badgeLabel, badgeX + 4, y + 15.5, { size: 8, bold: true, color: acd });

        txt(inr(item.final), pw - M - 12, y + 16, { size: 11, bold: true, color: ac, align: "right" });

        const bl = _billingLabel(item.plan?.billing, settings);
        if (bl) txt(bl, pw - M - 12, y + 29, { size: 7.5, color: CMU, align: "right" });

        txt(item.plan.description, iX, y + 30, { size: 8.5, color: CL });

        let fY = y + 44;
        features.forEach((feat) => {
          doc.setFillColor(ac);
          doc.rect(iX, fY - 7, 7, 7, "F");
          doc.setTextColor("#ffffff");
          doc.setFont("helvetica", "bold");
          doc.setFontSize(6.5);
          doc.text("✓", iX + 1, fY - 1);
          txt(feat, iX + 11, fY, { size: 8.5, color: CM });
          fY += 14;
        });

        y += cardH + 8;
      } else {
        // ── Comparison card — max 3 plans per row ──
        const allPlans = [
          { plan: item.plan, isRec: true, price: item.final, disc: item.repDiscount + (item.frequencyDiscount || 0) },
          ...showcase.map((p) => ({ plan: p, isRec: false, price: p.mrp, disc: 0 })),
        ];

        const headerH = 40;

        // Product header bar
        doc.setFillColor("#f9fafb");
        doc.setDrawColor("#e5e7eb");
        doc.setLineWidth(0.5);
        doc.rect(M, y, CW, headerH, "FD");
        doc.setFillColor(item.product.color || ac);
        doc.rect(M, y, 4, headerH, "F");
        txt(item.product.name, M + 14, y + 14, { size: 11, bold: true });
        txt("Choose the plan that works for you", M + 14, y + 28, { size: 8.5, color: CL });
        y += headerH + 6;

        // Split plans into rows of max 3
        const planRows = [];
        for (let i = 0; i < allPlans.length; i += 3) planRows.push(allPlans.slice(i, i + 3));

        planRows.forEach((rowPlans) => {
          const numCols = rowPlans.length;
          const colW2 = Math.floor((CW - (numCols - 1) * 5) / numCols);
          const featMaxW = colW2 - 14;

          // ── Pre-measure each column's actual height ──────────
          // Must set font+size before splitTextToSize so wrapping is accurate
          const colData = rowPlans.map(({ plan, isRec, price, disc }) => {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7.5);
            const featureLineGroups = (plan.features || []).map((f) =>
              splitSafe(`- ${f}`, featMaxW)
            );
            const featH = featureLineGroups.reduce((s, ls) => s + ls.length * 10, 0);
            const badgeH  = isRec ? 18 : 0;
            const discH   = (isRec && disc > 0) ? 11 : 0;
            const billingH = plan.billing ? 11 : 5;
            const totalH  = 14 + badgeH + 14 + discH + 12 + billingH + featH + 8;
            return { plan, isRec, price, disc, featureLineGroups, totalH };
          });
          const compCardH = Math.max(...colData.map((c) => c.totalH));
          need(compCardH + 10);

          // ── Draw each column ──────────────────────────────────
          colData.forEach(({ plan, isRec, price, disc, featureLineGroups }, ci) => {
            const cx = M + ci * (colW2 + 5);
            const cy = y;

            doc.setFillColor(isRec ? acbg : "#fff");
            doc.setDrawColor(isRec ? ac : "#e5e7eb");
            doc.setLineWidth(isRec ? 1.5 : 0.5);
            doc.rect(cx, cy, colW2, compCardH, "FD");

            let ry = cy + 14;

            // Recommended badge
            if (isRec) {
              doc.setFillColor(ac);
              doc.setFont("helvetica", "bold");
              doc.setFontSize(7);
              const recLabel = "Recommended";
              const recW = doc.getTextWidth(recLabel) + 10;
              doc.rect(cx + 6, ry - 9, recW, 12, "F");
              doc.setTextColor("#ffffff");
              doc.text(recLabel, cx + 11, ry - 1);
              ry += 18;
            }

            // Plan name (may wrap — use maxWidth)
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
            doc.setTextColor(CD);
            const nameLines = splitSafe(plan.name, colW2 - 12);
            doc.text(nameLines.map(sanitizeForPdf), cx + 6, ry);
            ry += nameLines.length * 12;

            // Strikethrough MRP
            if (isRec && disc > 0) {
              doc.setFont("helvetica", "normal");
              doc.setFontSize(7.5);
              doc.setTextColor(CMU);
              const mrpStr = inr(item.mrp);
              doc.text(mrpStr, cx + 6, ry);
              const mw = doc.getTextWidth(mrpStr);
              doc.setDrawColor(CMU);
              doc.setLineWidth(0.5);
              doc.line(cx + 6, ry - 4, cx + 6 + mw, ry - 4);
              ry += 11;
            }

            // Price
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9.5);
            doc.setTextColor(isRec ? ac : CD);
            doc.text(inr(price), cx + 6, ry);
            ry += 12;

            // Billing label
            const bl = billingShortLabel(plan.billing, settings);
            if (bl) {
              doc.setFont("helvetica", "normal");
              doc.setFontSize(7);
              doc.setTextColor(CMU);
              doc.text(bl, cx + 6, ry);
              ry += 11;
            } else {
              ry += 5;
            }

            // Features — already split at correct font size
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7.5);
            doc.setTextColor(isRec ? CM : CL);
            featureLineGroups.forEach((lines) => {
              doc.text(lines.map(sanitizeForPdf), cx + 6, ry);
              ry += lines.length * 10;
            });
          });

          y += compCardH + 8;
        });

        y += 4;
      }
    });

    // ── PRICING TABLE ─────────────────────────────────────
    y += 6;
    need(30 + lineItems.length * 24 + 80);
    txt("Pricing Breakdown", M, y, { size: 12, bold: true });
    y += 16;

    const hasDiscount = lineItems.some((item) => (item.repDiscount + (item.frequencyDiscount || 0)) > 0);

    const TC = hasDiscount ? [
      { label: "Product",    x: M,       w: 120 },
      { label: "Plan",       x: M + 120, w: 85 },
      { label: "MRP",        x: M + 205, w: 85 },
      { label: "Discount",   x: M + 290, w: 65 },
      { label: "Your Price", x: M + 355, w: CW - 355 },
    ] : [
      { label: "Product",    x: M,       w: 180 },
      { label: "Plan",       x: M + 180, w: 150 },
      { label: "Amount",     x: M + 330, w: CW - 330 },
    ];

    doc.setFillColor("#f3f4f6");
    doc.rect(M, y, CW, 22, "F");
    TC.forEach((col) => txt(col.label, col.x + 4, y + 15, { size: 8, bold: true, color: CL }));
    y += 22;

    lineItems.forEach((item, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor("#fafafa");
        doc.rect(M, y, CW, 24, "F");
      }
      const disc = item.repDiscount + (item.frequencyDiscount || 0);
      const mrpStr = inr(item.mrp);

      txt(item.product.name, TC[0].x + 4, y + 16, { size: 9, color: CD });
      txt(item.plan.name, TC[1].x + 4, y + 16, { size: 9, color: CD });

      if (hasDiscount) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        if (disc > 0) {
          doc.setTextColor(CMU);
          doc.text(mrpStr, TC[2].x + 4, y + 16);
          const mw = doc.getTextWidth(mrpStr);
          doc.setDrawColor(CMU);
          doc.setLineWidth(0.6);
          doc.line(TC[2].x + 4, y + 10.5, TC[2].x + 4 + mw, y + 10.5);
        } else {
          txt(mrpStr, TC[2].x + 4, y + 16, { size: 9, color: CD });
        }
        txt(disc > 0 ? `${disc}%` : "—", TC[3].x + 4, y + 16, { size: 9, color: CD });
        txt(inr(item.final), TC[4].x + 4, y + 16, { size: 9, bold: true, color: ac });
      } else {
        txt(inr(item.final), TC[2].x + 4, y + 16, { size: 9, bold: true, color: ac });
      }

      doc.setDrawColor("#e5e7eb");
      doc.setLineWidth(0.4);
      doc.line(M, y + 24, M + CW, y + 24);
      y += 24;
    });

    // Subtotal
    doc.setFillColor("#f9fafb");
    doc.rect(M, y, CW, 22, "F");
    txt("Subtotal", TC[0].x + 4, y + 15, { size: 8.5, color: CL });
    txt(inr(totals.subtotal), pw - M - 4, y + 15, { size: 8.5, bold: true, align: "right" });
    y += 22;

    // GST
    doc.setFillColor("#f9fafb");
    doc.rect(M, y, CW, 22, "F");
    txt(`GST (${gstRate}%)`, TC[0].x + 4, y + 15, { size: 8.5, color: CL });
    txt(inr(totals.gst), pw - M - 4, y + 15, { size: 8.5, bold: true, align: "right" });
    y += 22;

    // Total Payable
    need(52);
    doc.setFillColor(ac);
    doc.rect(M, y, CW, 52, "F");
    txt("TOTAL PAYABLE", M + 10, y + 20, { size: 11, bold: true, color: "#ffffff" });
    txt(inr(totals.total), pw - M - 14, y + 20, { size: 12, bold: true, color: "#ffffff", align: "right" });
    txt(amountInWords(totals.total), M + 10, y + 38, { size: 8, color: acos, maxWidth: CW - 24 });
    y += 52;

    y += 8;
    txt(`Prices in INR. GST @ ${gstRate}% applicable. Frequency: ${freqLabel}.`, M, y, { size: 8, color: CMU });
    y += 20;

  } else {
    // Fallback for historical proposals without lineItems
    need(20);
    txt("Products", M, y, { size: 12, bold: true });
    y += 16;
    (proposal.products || []).forEach((p) => {
      need(16);
      txt(`• ${p}`, M + 8, y, { size: 10, color: CM });
      y += 16;
    });
    y += 8;
    need(36);
    doc.setFillColor(ac);
    doc.rect(M, y, CW, 52, "F");
    txt("TOTAL PAYABLE", M + 10, y + 20, { size: 11, bold: true, color: "#ffffff" });
    txt(inr(proposal.amount), pw - M - 14, y + 20, { size: 12, bold: true, color: "#ffffff", align: "right" });
    txt(amountInWords(proposal.amount), M + 10, y + 38, { size: 8, color: acos, maxWidth: CW - 24 });
    y += 60;
    txt(`Prices in INR. GST @ ${gstRate}% applicable.`, M, y, { size: 8, color: CMU });
    y += 20;
  }

  // ── EXTRAS / COMPLIMENTARY ───────────────────────────────
  const extrasText = proposal.extrasText || "";
  const extrasHeading = proposal.extrasHeading || "Complimentary / Extras";
  if (extrasText.trim()) {
    y += 8;
    txt(extrasHeading, M, y, { size: 12, bold: true });
    y += 14;

    const extrasLines = extrasText.split("\n").filter((l) => l.trim());
    const isBullet = (l) => /^[-•*]/.test(l.trim());
    const lineH = 15;
    const extrasBoxH = extrasLines.length * lineH + 18;
    need(extrasBoxH + 10);

    doc.setFillColor(acbg);
    doc.setDrawColor(ac);
    doc.setLineWidth(1);
    doc.rect(M, y, CW, extrasBoxH, "FD");
    doc.setFillColor(ac);
    doc.rect(M, y, 3, extrasBoxH, "F");

    let eY = y + 14;
    extrasLines.forEach((line) => {
      const clean = line.trim();
      const label = isBullet(clean) ? `• ${clean.replace(/^[-•*]\s*/, "")}` : clean;
      txt(label, M + 14, eY, { size: 9, color: CD, maxWidth: CW - 24 });
      eY += lineH;
    });
    y += extrasBoxH + 18;
  }

  // ── BANK TRANSFER ─────────────────────────────────────────
  y += 8;
  const qrSize = 72;
  const upiStripH = (upiQrDataUrl || payment.upi) ? (qrSize + 24) : 0;
  const bankRows = [
    [["Bank", payment.bank], ["Account Holder", payment.holder || payment.bank]],
    [["Account No", payment.account], ["Account Type", payment.type]],
    [["IFSC", payment.ifsc], ["", ""]],
  ];
  const boxH = bankRows.length * 30 + 16 + upiStripH;
  need(boxH + 30);
  txt("Bank Transfer Details", M, y, { size: 12, bold: true });
  y += 14;

  doc.setFillColor(acbg);
  doc.setDrawColor(ac);
  doc.setLineWidth(1);
  doc.rect(M, y, CW, boxH, "FD");
  doc.setFillColor(ac);
  doc.rect(M, y, 3, boxH, "F");

  let bY = y + 18;
  bankRows.forEach(([left, right]) => {
    txt(left[0], M + 14, bY, { size: 7.5, bold: true, color: CL });
    txt(left[1] || "—", M + 14, bY + 12, { size: 9, bold: true, color: CD, maxWidth: CW / 2 - 20 });
    if (right[0]) {
      txt(right[0], M + CW / 2 + 10, bY, { size: 7.5, bold: true, color: CL });
      txt(right[1] || "—", M + CW / 2 + 10, bY + 12, { size: 9, bold: true, color: CD, maxWidth: CW / 2 - 14 });
    }
    bY += 30;
  });

  // UPI QR strip
  if (upiQrDataUrl || payment.upi) {
    doc.setDrawColor(ac + "33");
    doc.setLineWidth(0.5);
    doc.line(M + 14, bY, M + CW - 14, bY);
    bY += 10;
    if (upiQrDataUrl) {
      doc.addImage(upiQrDataUrl, "PNG", M + 14, bY, qrSize, qrSize);
    }
    const textX = upiQrDataUrl ? M + 14 + qrSize + 12 : M + 14;
    txt("PAY VIA UPI", textX, bY + 11, { size: 8, bold: true, color: acd });
    const upiLines = splitSafe(payment.upi || "", CW - (upiQrDataUrl ? qrSize + 44 : 28));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(CD);
    doc.text(upiLines, textX, bY + 24);
    txt("Scan with GPay · PhonePe · Paytm · any UPI app", textX, bY + 24 + upiLines.length * 12 + 4, { size: 7.5, color: CL });
  }

  y += boxH + 18;

  // ── PAY NOW BUTTON ───────────────────────────────────────
  if (resolvedPaymentLink) {
    need(52);
    const btnW = 160;
    const btnH = 32;
    const btnX = M + (CW - btnW) / 2;
    doc.setFillColor(ac);
    doc.roundedRect(btnX, y, btnW, btnH, 6, 6, "F");
    txt("Pay Now", btnX + btnW / 2, y + 21, { size: 11, bold: true, color: acos, align: "center" });
    doc.link(btnX, y, btnW, btnH, { url: resolvedPaymentLink });
    y += btnH + 18;
  }

  // ── KYC ──────────────────────────────────────────────────
  if (kyc.length > 0) {
    need(30 + kyc.length * 18 + 14);
    txt("KYC Documents Required", M, y, { size: 12, bold: true });
    y += 14;
    const kH = kyc.length * 18 + 14;
    doc.setFillColor(AMBER_BG);
    doc.setDrawColor(AMBER_BDR);
    doc.setLineWidth(1);
    doc.rect(M, y, CW, kH, "FD");
    doc.setFillColor(AMBER_BDR);
    doc.rect(M, y, 3, kH, "F");
    let kY = y + 16;
    kyc.forEach((item, i) => {
      txt(`${i + 1}. ${item}`, M + 14, kY, { size: 8.5, color: AMBER_TEXT });
      kY += 18;
    });
    y += kH + 18;
  }

  // ── CONTENT BLOCKS (Terms, Policies, etc.) ───────────────
  contentBlocks.forEach((block) => {
    const lines = (block.content || []).filter((l) => l.trim());
    if (!block.title && lines.length === 0) return;
    need(24);
    if (block.title) {
      txt(block.title, M, y, { size: 12, bold: true });
      y += 14;
    }
    lines.forEach((item, i) => {
      const wrapped = splitSafe(`${i + 1}. ${item}`, CW);
      need(wrapped.length * 13 + 6);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(CL);
      doc.text(wrapped, M, y);
      y += wrapped.length * 13 + 4;
    });
    y += 6;
  });

  // ── FOOTER ───────────────────────────────────────────────
  need(90);
  y += 12;
  doc.setDrawColor("#e5e7eb");
  doc.setLineWidth(0.5);
  doc.line(M, y, pw - M, y);
  y += 16;
  txt(company.name || "Propdeck", pw / 2, y, { size: 11, bold: true, color: headerColor, align: "center" });
  y += 14;
  if (company.address) {
    const addrLines = splitSafe(company.address.replace(/\n/g, ", "), CW - 60);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(CL);
    doc.text(addrLines, pw / 2, y, { align: "center" });
    y += addrLines.length * 11 + 3;
  }
  if (company.gst) {
    txt(`GST No: ${company.gst}`, pw / 2, y, { size: 8, color: CL, align: "center" });
    y += 12;
  }
  const byParts = [`Prepared by ${signatory}`, phone, repEmail].filter(Boolean);
  txt(byParts.join(" · "), pw / 2, y, { size: 8.5, color: CL, align: "center", maxWidth: CW });
  y += 13;
  txt(`© ${new Date().getFullYear()} ${company.name || "Propdeck"}. All rights reserved.`, pw / 2, y, { size: 7.5, color: CMU, align: "center" });

  doc.save(`${proposal.id}.pdf`);
}
