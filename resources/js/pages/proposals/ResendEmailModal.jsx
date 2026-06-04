import { formatDate, amountInWords } from "../../lib/format.js";
import { SendProposalEmailModal } from "../../components/SendProposalEmailModal.jsx";
import { getProposalHeaderColor, headerSubtitleColor } from "../../lib/proposalTheme.js";
import { api } from "../../services/api.js";

export function ResendEmailModal({ proposal, client, settings, rep, reload, onClose }) {
  const defaultSubject = (settings?.email?.subjectTemplate || "Proposal {{id}} for {{agency}}")
    .replace("{{id}}", proposal.id)
    .replace("{{agency}}", client?.agency || "");

  const htmlBody = buildResendHtml({ proposal, client, settings, rep });

  return (
    <SendProposalEmailModal
      title="Resend proposal"
      subtitle={`${proposal.id} · ${client?.agency || ""}`}
      settings={settings}
      toEmail={client?.email || ""}
      subject={defaultSubject}
      htmlBody={htmlBody}
      proposalId={proposal.id}
      onSent={async (method) => {
        if (method === "gmail") {
          await api.saveProposal({
            ...proposal,
            status: "Sent",
            statusUpdatedAt: new Date().toISOString(),
          });
        }
        await reload();
        onClose();
      }}
      onClose={onClose}
    />
  );
}

function buildResendHtml({ proposal, client, settings, rep }) {
  const company = settings?.company || {};
  const headerColor = getProposalHeaderColor(company);
  const headerSub = headerSubtitleColor();
  const payment = settings?.payment || {};
  const kyc = settings?.defaults?.kyc || [];
  const terms = settings?.defaults?.terms || [];
  const gstRate = settings?.defaults?.gstRate || 18;
  const validityDays = settings?.defaults?.validityDays || 7;

  const now = new Date();
  const dateStr = formatDate(proposal.date);
  const validTill = new Date(proposal.date + "T00:00:00");
  validTill.setDate(validTill.getDate() + validityDays);
  const validTillStr = formatDate(validTill.toISOString().split("T")[0]);
  const signatory = company.signatory || rep?.name || "Sales Team";
  const phone = company.phone || rep?.phone || "";

  const inr = (v) => `₹${Number(v).toLocaleString("en-IN")}`;

  const productRows = (proposal.products || []).map((p) =>
    `<div style="padding:4px 0;font-size:13px;color:#374151;"><span style="color:#1d9e75;font-weight:700;margin-right:6px;">✓</span>${p}</div>`
  ).join("");

  const kycItems = kyc.map((d, i) =>
    `<div style="padding:3px 0;font-size:13px;color:#92400e;">${i + 1}. ${d}</div>`
  ).join("");

  const termItems = terms.map((t, i) =>
    `<div style="padding:3px 0;font-size:12px;color:#6b7280;">${i + 1}. ${t}</div>`
  ).join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Inter,ui-sans-serif,system-ui,-apple-system,sans-serif;">
<div style="max-width:640px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

<div style="background:${headerColor};padding:26px 32px;">
  <table style="width:100%;border-collapse:collapse;"><tr>
    <td><div style="color:#fff;font-size:20px;font-weight:800;">${company.name || "Propdeck"}</div>
      <div style="color:${headerSub};font-size:11px;margin-top:3px;">${company.tagline || ""}</div></td>
    <td style="text-align:right;"><div style="color:#fff;font-size:14px;font-weight:700;">${proposal.id}</div>
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

  <h3 style="margin:0 0 12px;font-size:15px;color:#111827;font-weight:700;">Products Included</h3>
  <div style="border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px;background:#fafafa;margin-bottom:20px;">${productRows}</div>

  <div style="background:#1d9e75;border-radius:8px;padding:14px 16px;margin-bottom:6px;">
    <table style="width:100%;border-collapse:collapse;"><tr>
      <td style="color:#fff;font-weight:700;font-size:14px;">TOTAL PAYABLE</td>
      <td style="text-align:right;color:#fff;font-weight:800;font-size:20px;">${inr(proposal.amount)}</td>
    </tr><tr>
      <td colspan="2" style="color:rgba(255,255,255,0.8);font-size:11px;padding-top:4px;">${amountInWords(proposal.amount)}</td>
    </tr></table>
  </div>
  <p style="margin:0 0 24px;font-size:11px;color:#9ca3af;">Prices in INR. GST @ ${gstRate}% included.</p>

  ${proposal.extrasText ? `
  <div style="border:1.5px solid #1d9e75;border-radius:8px;overflow:hidden;background:#f0fdf8;margin-bottom:24px;">
    <div style="border-left:4px solid #1d9e75;padding:16px;">
      <div style="font-size:14px;font-weight:700;color:#0f6e56;margin-bottom:8px;">${proposal.extrasHeading || "Complimentary / Extras"}</div>
      ${proposal.extrasText.split("\\n").filter(l => l.trim()).map(l => /^[-•*]/.test(l.trim())
        ? `<div style="padding:3px 0;font-size:13px;color:#374151;">• ${l.trim().replace(/^[-•*]\\s*/,"")}</div>`
        : `<p style="margin:4px 0;font-size:13px;color:#374151;line-height:1.6;">${l}</p>`
      ).join("")}
    </div>
  </div>` : ""}

  <h3 style="margin:0 0 12px;font-size:15px;color:#111827;font-weight:700;">Bank Transfer Details</h3>
  <div style="border:1.5px solid #0f6e56;border-radius:8px;overflow:hidden;background:#f0fdf8;margin-bottom:24px;">
    <div style="border-left:4px solid #0f6e56;padding:16px;">
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
          <div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;">UPI ID</div>
          <div style="font-size:13px;font-weight:600;color:#111827;">${payment.upi || "—"}</div>
        </td>
      </tr></table>
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
    <div style="font-size:12px;color:#6b7280;margin-top:4px;">${[phone, company.email || rep?.email].filter(Boolean).join(" · ")}</div>
  </div>
</div>

<div style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px;text-align:center;">
  <div style="color:#0f6e56;font-weight:700;font-size:13px;margin-bottom:4px;">${company.name || "Propdeck"}</div>
  ${company.address ? `<div style="color:#6b7280;font-size:11px;margin-bottom:3px;">${company.address.replace(/\n/g, ", ")}</div>` : ""}
  ${company.gst ? `<div style="color:#6b7280;font-size:11px;margin-bottom:3px;">GST No: ${company.gst}</div>` : ""}
  <div style="color:#9ca3af;font-size:10px;">© ${new Date().getFullYear()} ${company.name || "Propdeck"}. All rights reserved.</div>
</div>

</div>
</body>
</html>`;
}
