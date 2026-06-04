import { SendProposalEmailModal } from "../../components/SendProposalEmailModal.jsx";
import { buildProposalHtmlEmail, lineItemsFromSnapshot, totalsFromProposal } from "../../lib/proposalEmail.js";
import { api } from "../../services/api.js";

export function ResendEmailModal({ proposal, client, settings, rep, reload, onClose }) {
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
