import { useState, useEffect } from "react";
import { api } from "../../services/api.js";
import { downloadProposalPdf, lineItemsFromProposal, totalsFromProposal } from "../../lib/proposalPdf.js";
import { generateUpiQr } from "../../lib/proposalEmail.js";
import { getProposalStatuses } from "../../lib/proposalStatuses.js";
import { ProposalRows } from "../dashboard/DashboardPage.jsx";
import { ProposalDetailModal } from "./ProposalDetailModal.jsx";
import { ResendEmailModal } from "./ResendEmailModal.jsx";
import { usePermissions } from "../../hooks/usePermissions.js";
import { useAuth } from "../../contexts/AuthContext.jsx";

export function ProposalsPage({ data, reload }) {
  const perms = usePermissions();
  const { user: authUser } = useAuth();
  const [status, setStatus] = useState("All");
  const [upiQrDataUrl, setUpiQrDataUrl] = useState(null);

  // Resolve statuses from settings (falls back to defaults)
  const configuredStatuses = getProposalStatuses(data.settings);

  const upiId = data.settings?.payment?.upi || "";
  const companyName = data.settings?.company?.name || "";
  useEffect(() => {
    generateUpiQr(upiId, companyName).then(setUpiQrDataUrl);
  }, [upiId, companyName]);
  const [proposalToDelete, setProposalToDelete] = useState(null);
  const [viewingProposal, setViewingProposal] = useState(null);
  const [resendProposal, setResendProposal] = useState(null);
  const filtered = {
    ...data,
    proposals: data.proposals.filter((proposal) => status === "All" || proposal.status === status),
  };

  const updateProposalStatus = async (proposal, nextStatus) => {
    await api.saveProposal({
      ...proposal,
      status: nextStatus,
      statusUpdatedAt: new Date().toISOString(),
    });
    await reload();
  };

  const deleteProposal = async () => {
    if (!proposalToDelete) return;
    await api.deleteProposal(proposalToDelete.id);
    await reload();
    setProposalToDelete(null);
  };

  const exportPdf = (proposal) => {
    const creator = data.teamMembers?.[proposal.createdByUserId];
    const lineItems = lineItemsFromProposal(proposal);
    const totals = totalsFromProposal(proposal);
    const client = data.clients.find((c) => c.id === proposal.clientId);
    downloadProposalPdf({
      proposal,
      client,
      settings: data.settings,
      rep: data.rep,
      creatorSettings: creator,
      lineItems,
      totals,
      frequency: proposal.frequency,
      upiQrDataUrl,
      paymentLink: proposal.paymentLink || null,
    });
    api.notifyPdfDownload({
      proposalId: proposal.id,
      clientName: client?.agency || "",
      clientEmail: client?.email || "",
      date: proposal.date || "",
      lineItems,
      totals,
      frequency: proposal.frequency || "",
      downloadedBy: authUser?.name || "",
    }).catch(() => {});
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">All Proposals</h1>
          <div className="muted">{data.proposals.length} proposals total</div>
        </div>
      </div>
      <div className="card filters">
        <button className={"All" === status ? "active" : ""} onClick={() => setStatus("All")}>
          All
        </button>
        {configuredStatuses.map((s) => (
          <button className={s.value === status ? "active" : ""} key={s.value} onClick={() => setStatus(s.value)}>
            {s.label}
          </button>
        ))}
      </div>
      <div className="card table-card">
        <ProposalRows
          data={filtered}
          editableStatuses={configuredStatuses}
          onStatusChange={perms.canWrite("proposals") ? updateProposalStatus : null}
          onDelete={perms.canWrite("proposals") ? setProposalToDelete : null}
          onView={setViewingProposal}
          onResend={perms.canWrite("proposals") ? setResendProposal : null}
          onPdf={exportPdf}
        />
      </div>

      {viewingProposal && (
        <ProposalDetailModal
          proposal={viewingProposal}
          client={data.clients.find((client) => client.id === viewingProposal.clientId)}
          rep={data.rep}
          settings={data.settings}
          teamMembers={data.teamMembers}
          onClose={() => setViewingProposal(null)}
          onPdf={exportPdf}
        />
      )}

      {resendProposal && (
        <ResendEmailModal
          proposal={resendProposal}
          client={data.clients.find((c) => c.id === resendProposal.clientId)}
          settings={data.settings}
          rep={data.rep}
          reload={reload}
          onClose={() => setResendProposal(null)}
        />
      )}

      {proposalToDelete && (
        <div className="modal-backdrop" onClick={() => setProposalToDelete(null)}>
          <div className="modal-card confirm-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Delete Proposal</h2>
                <p>This will remove {proposalToDelete.id} from this device.</p>
              </div>
              <button className="modal-close" onClick={() => setProposalToDelete(null)}>x</button>
            </div>
            <div className="confirm-copy">
              Are you sure you want to delete the proposal for <strong>{data.clients.find((client) => client.id === proposalToDelete.clientId)?.agency}</strong>?
            </div>
            <div className="modal-actions">
              <button className="button danger" onClick={deleteProposal}>Delete Proposal</button>
              <button className="button" onClick={() => setProposalToDelete(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
