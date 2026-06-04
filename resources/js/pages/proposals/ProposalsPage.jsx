import { useState, useEffect } from "react";
import { api } from "../../services/api.js";
import { downloadProposalPdf, lineItemsFromProposal, totalsFromProposal } from "../../lib/proposalPdf.js";
import { generateUpiQr } from "../../lib/proposalEmail.js";
import { ProposalRows } from "../dashboard/DashboardPage.jsx";
import { ProposalDetailModal } from "./ProposalDetailModal.jsx";
import { ResendEmailModal } from "./ResendEmailModal.jsx";
import { usePermissions } from "../../hooks/usePermissions.js";

const statuses = ["All", "Draft", "Sent", "Accepted", "Rejected", "Expired", "Revised"];
const editableStatuses = statuses.filter((status) => status !== "All");

export function ProposalsPage({ data, reload }) {
  const perms = usePermissions();
  const [status, setStatus] = useState("All");
  const [upiQrDataUrl, setUpiQrDataUrl] = useState(null);

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
    downloadProposalPdf({
      proposal,
      client: data.clients.find((client) => client.id === proposal.clientId),
      settings: data.settings,
      rep: data.rep,
      lineItems: lineItemsFromProposal(proposal),
      totals: totalsFromProposal(proposal),
      frequency: proposal.frequency,
      upiQrDataUrl,
    });
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
        {statuses.map((item) => (
          <button className={item === status ? "active" : ""} key={item} onClick={() => setStatus(item)}>
            {item}
          </button>
        ))}
      </div>
      <div className="card table-card">
        <ProposalRows
          data={filtered}
          editableStatuses={editableStatuses}
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
