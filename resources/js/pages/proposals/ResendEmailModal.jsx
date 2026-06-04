import { useState, useEffect } from "react";
import { SendProposalEmailModal } from "../../components/SendProposalEmailModal.jsx";
import { buildProposalHtmlEmail, generateUpiQr, lineItemsFromSnapshot, totalsFromProposal } from "../../lib/proposalEmail.js";
import { api } from "../../services/api.js";

export function ResendEmailModal({ proposal, client, settings, rep, reload, onClose }) {
  const [upiQrDataUrl, setUpiQrDataUrl] = useState(null);

  const upiId = settings?.payment?.upi || "";
  const companyName = settings?.company?.name || "";
  useEffect(() => {
    generateUpiQr(upiId, companyName).then(setUpiQrDataUrl);
  }, [upiId, companyName]);

  const defaultSubject = (settings?.email?.subjectTemplate || "Proposal {{id}} for {{agency}}")
    .replace("{{id}}", proposal.id)
    .replace("{{agency}}", client?.agency || "");

  const lineItems = lineItemsFromSnapshot(proposal);
  const totals = totalsFromProposal(proposal);

  const htmlBody = buildProposalHtmlEmail({
    client,
    proposalId: proposal.id,
    lineItems,
    totals,
    paymentLink: "",
    frequency: proposal.frequency || "monthly",
    extrasHeading: proposal.extrasHeading || "",
    extrasText: proposal.extrasText || "",
    settings,
    rep,
    proposalDate: proposal.date,
    upiQrDataUrl,
  });

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
