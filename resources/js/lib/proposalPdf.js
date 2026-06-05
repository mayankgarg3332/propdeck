import { jsPDF } from "jspdf";
import { formatDate } from "./format.js";
import {
  getProposalHeaderColor,
  headerSubtitleColorPdf,
  buildProposalTheme,
} from "./proposalTheme.js";

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

export function downloadProposalPdf({ proposal, client, settings, rep, lineItems, totals, frequency, upiQrDataUrl = null }) {
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
  const terms = settings?.defaults?.terms || [];
  const gstRate = settings?.defaults?.gstRate || 18;
  const validityDays = settings?.defaults?.validityDays || 7;
  const freqLabel = frequency || "monthly";

  const proposalDate = proposal.date ? new Date(proposal.date + "T00:00:00") : new Date();
  const validTill = new Date(proposalDate);
  validTill.setDate(validTill.getDate() + validityDays);
  const dateStr = formatDate(proposalDate.toISOString().split("T")[0]);
  const validTillStr = formatDate(validTill.toISOString().split("T")[0]);
  const signatory = company.signatory || rep?.name || "Sales Team";
  const phone = company.phone || rep?.phone || "";
  const repEmail = company.email || rep?.email || "";

  const txt = (text, x, lineY, opts = {}) => {
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(opts.size || 10);
    doc.setTextColor(opts.color || CD);
    doc.text(String(text ?? ""), x, lineY, {
      align: opts.align || "left",
      maxWidth: opts.maxWidth || CW,
    });
  };

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

        const bl = (() => {
          const b = item.plan?.billing;
          if (!b) return "";
          if (b === "monthly") return "per month";
          if (b === "annual") return "per year";
          if (b === "one-time") return "one-time";
          return b;
        })();
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
          const maxFeatures = Math.max(...rowPlans.map((a) => (a.plan.features || []).length));
          const compCardH = 10 + maxFeatures * 13 + 60;
          need(compCardH + 10);

          rowPlans.forEach(({ plan, isRec, price, disc }, ci) => {
            const cx = M + ci * (colW2 + 5);
            const cy = y;

            doc.setFillColor(isRec ? acbg : "#fff");
            doc.setDrawColor(isRec ? ac : "#e5e7eb");
            doc.setLineWidth(isRec ? 1.5 : 0.5);
            doc.rect(cx, cy, colW2, compCardH, "FD");

            let ry = cy + 12;

            if (isRec) {
              doc.setFillColor(ac);
              doc.setFont("helvetica", "bold");
              doc.setFontSize(7);
              const recW = doc.getTextWidth("Recommended") + 8;
              doc.rect(cx + 6, ry - 8, recW, 11, "F");
              doc.setTextColor("#ffffff");
              doc.text("Recommended", cx + 10, ry - 0.5);
              ry += 8;
            }

            txt(plan.name, cx + 6, ry + 2, { size: 9, bold: true, color: CD, maxWidth: colW2 - 12 });
            ry += 13;

            if (isRec && disc > 0) {
              txt(inr(item.mrp), cx + 6, ry, { size: 7.5, color: CMU, maxWidth: colW2 - 12 });
              ry += 10;
            }
            txt(inr(price), cx + 6, ry, { size: 9.5, bold: true, color: isRec ? ac : CD, maxWidth: colW2 - 12 });
            ry += 11;

            const bl = plan.billing === "monthly" ? "/mo" : plan.billing === "annual" ? "/yr" : plan.billing === "one-time" ? "once" : "";
            if (bl) { txt(bl, cx + 6, ry, { size: 7, color: CMU }); ry += 10; }
            else ry += 4;

            (plan.features || []).forEach((feat) => {
              const flines = doc.splitTextToSize(`✓ ${feat}`, colW2 - 12);
              doc.setFont("helvetica", "normal");
              doc.setFontSize(7.5);
              doc.setTextColor(isRec ? CM : CL);
              doc.text(flines, cx + 6, ry);
              ry += flines.length * 10;
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
    const upiLines = doc.splitTextToSize(payment.upi || "", CW - (upiQrDataUrl ? qrSize + 44 : 28));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(CD);
    doc.text(upiLines, textX, bY + 24);
    txt("Scan with GPay · PhonePe · Paytm · any UPI app", textX, bY + 24 + upiLines.length * 12 + 4, { size: 7.5, color: CL });
  }

  y += boxH + 18;

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

  // ── TERMS ────────────────────────────────────────────────
  if (terms.length > 0) {
    need(24);
    txt("Terms & Conditions", M, y, { size: 12, bold: true });
    y += 14;
    terms.forEach((term, i) => {
      const lines = doc.splitTextToSize(`${i + 1}. ${term}`, CW);
      need(lines.length * 13 + 6);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(CL);
      doc.text(lines, M, y);
      y += lines.length * 13 + 4;
    });
  }

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
    const addrLines = doc.splitTextToSize(company.address.replace(/\n/g, ", "), CW - 60);
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
