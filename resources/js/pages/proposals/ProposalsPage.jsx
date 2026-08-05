import { useState, useEffect, useMemo } from "react";
import { Filter, IndianRupee, FileText, Users, TrendingUp, Zap, Divide } from "lucide-react";
import { api } from "../../services/api.js";
import { downloadProposalPdf, lineItemsFromProposal, totalsFromProposal } from "../../lib/proposalPdf.js";
import { generateUpiQr } from "../../lib/proposalEmail.js";
import { getProposalStatuses, getStatusStyle } from "../../lib/proposalStatuses.js";
import { formatINR } from "../../lib/format.js";
import { formatWhatsAppPhone, buildWhatsAppMessage, buildWhatsAppShareUrl } from "../../lib/whatsapp.js";
import { ProposalRows } from "../dashboard/DashboardPage.jsx";
import { ProposalDetailModal } from "./ProposalDetailModal.jsx";
import { ResendEmailModal } from "./ResendEmailModal.jsx";
import { usePermissions } from "../../hooks/usePermissions.js";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { MultiSelectFilter } from "../../components/MultiSelectFilter.jsx";
import { DateRangeFilter } from "../../components/DateRangeFilter.jsx";

export function ProposalsPage({ data, reload }) {
  const perms = usePermissions();
  const { user: authUser } = useAuth();
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

  // ---- Filters ----
  const [statusFilter, setStatusFilter] = useState([]);
  const [sentByFilter, setSentByFilter] = useState([]);
  const [clientFilter, setClientFilter] = useState([]);
  const [dateRange, setDateRange] = useState({ from: "", to: "" });

  // "Sent by" only makes sense when there's more than one person in the account
  // to distinguish between — mirrors the "Sent by" column's own gating.
  const showSentByFilter = Boolean(data.teamMembers && Object.keys(data.teamMembers).length > 1);

  const statusOptions = useMemo(
    () => configuredStatuses.map((s) => ({
      value: s.value,
      label: s.label,
      swatch: getStatusStyle(s.value, data.settings),
    })),
    [configuredStatuses, data.settings]
  );

  const sentByOptions = useMemo(() => {
    if (!showSentByFilter) return [];
    return Object.entries(data.teamMembers).map(([id, member]) => ({
      value: id,
      label: member.name || member.email || "Unknown",
    }));
  }, [data.teamMembers, showSentByFilter]);

  const clientOptions = useMemo(
    () =>
      [...data.clients]
        .sort((a, b) => (a.agency || "").localeCompare(b.agency || ""))
        .map((c) => ({ value: c.id, label: c.agency, sublabel: c.contact })),
    [data.clients]
  );

  const activeFilterCount =
    statusFilter.length +
    sentByFilter.length +
    clientFilter.length +
    (dateRange.from || dateRange.to ? 1 : 0);

  const clearAllFilters = () => {
    setStatusFilter([]);
    setSentByFilter([]);
    setClientFilter([]);
    setDateRange({ from: "", to: "" });
  };

  const filtered = {
    ...data,
    proposals: data.proposals.filter((proposal) => {
      if (statusFilter.length > 0 && !statusFilter.includes(proposal.status)) return false;
      if (sentByFilter.length > 0 && !sentByFilter.includes(String(proposal.createdByUserId))) return false;
      if (clientFilter.length > 0 && !clientFilter.includes(proposal.clientId)) return false;
      if (dateRange.from || dateRange.to) {
        const raw = proposal.createdAt || (proposal.date ? `${proposal.date}T00:00:00` : null);
        if (!raw) return false;
        const d = new Date(raw);
        if (dateRange.from && d < new Date(`${dateRange.from}T00:00:00`)) return false;
        if (dateRange.to && d > new Date(`${dateRange.to}T23:59:59.999`)) return false;
      }
      return true;
    }),
  };

  // Pre-tax amount per proposal: prefer the stored subtotal (excludes GST);
  // fall back to amount minus GST for older proposals saved without a subtotal.
  const preTaxAmount = (proposal) =>
    proposal.subtotal != null ? proposal.subtotal : proposal.amount - (proposal.gst || 0);

  const metricsTotalAmount = filtered.proposals.reduce((sum, p) => sum + (preTaxAmount(p) || 0), 0);
  const metricsCount = filtered.proposals.length;
  const metricsUniqueSenders = new Set(
    filtered.proposals.map((p) => p.createdByUserId).filter((id) => id != null)
  ).size;
  const metricsTicketSize = metricsCount > 0 ? metricsTotalAmount / metricsCount : 0;
  const metricsProductivity = metricsUniqueSenders > 0 ? metricsTotalAmount / metricsUniqueSenders : 0;
  const metricsProposalsPerSender = metricsUniqueSenders > 0 ? metricsCount / metricsUniqueSenders : 0;

  const metricTiles = [
    { label: "Total amount (excl. tax)", value: formatINR(metricsTotalAmount), icon: IndianRupee },
    { label: "Proposals", value: String(metricsCount), icon: FileText },
    { label: "Unique senders", value: String(metricsUniqueSenders), icon: Users },
    { label: "Avg. ticket size", value: formatINR(metricsTicketSize), icon: TrendingUp },
    { label: "Productivity (amount/sender)", value: formatINR(metricsProductivity), icon: Zap },
    { label: "Proposals/sender", value: metricsProposalsPerSender.toFixed(1), icon: Divide },
  ];

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

  const shareViaWhatsApp = (proposal) => {
    const client = data.clients.find((c) => c.id === proposal.clientId);
    const phoneDigits = formatWhatsAppPhone(client?.phone);
    const message = buildWhatsAppMessage({
      clientContact: client?.contact,
      companyName: data.settings?.company?.name || "PropDeck",
      proposalId: proposal.id,
      amountLabel: formatINR(proposal.amount),
      publicUrl: proposal.publicUrl,
    });
    window.open(buildWhatsAppShareUrl(phoneDigits, message), "_blank");
    api.notifyWhatsAppShare({ proposalId: proposal.id, to: phoneDigits }).catch(() => {});
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">All Proposals</h1>
          <div className="muted">
            {activeFilterCount > 0
              ? `${filtered.proposals.length} of ${data.proposals.length} proposals`
              : `${data.proposals.length} proposals total`}
          </div>
        </div>
      </div>
      <div className="card filters-toolbar">
        <MultiSelectFilter label="Status" options={statusOptions} selected={statusFilter} onChange={setStatusFilter} />
        {showSentByFilter && (
          <MultiSelectFilter label="Sent by" options={sentByOptions} selected={sentByFilter} onChange={setSentByFilter} />
        )}
        <MultiSelectFilter
          label="Client"
          options={clientOptions}
          selected={clientFilter}
          onChange={setClientFilter}
          searchable
          searchPlaceholder="Search clients..."
        />
        <DateRangeFilter
          from={dateRange.from}
          to={dateRange.to}
          onChange={setDateRange}
        />
        {activeFilterCount > 0 && (
          <button type="button" className="filters-clear-all" onClick={clearAllFilters}>
            Clear all filters
          </button>
        )}
      </div>
      <div className="proposals-metrics-grid">
        {metricTiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <div className="card stat-card" key={tile.label}>
              <div>
                <div className="muted">{tile.label}</div>
                <strong>{tile.value}</strong>
              </div>
              <div className="stat-icon">
                <Icon size={20} />
              </div>
            </div>
          );
        })}
      </div>
      {activeFilterCount > 0 && filtered.proposals.length === 0 ? (
        <div className="card table-card">
          <div className="team-empty-state">
            <div className="team-empty-icon">
              <Filter size={28} />
            </div>
            <h3>No proposals match your filters</h3>
            <p>Try adjusting or clearing the filters above.</p>
            <button className="button primary" type="button" onClick={clearAllFilters}>
              Clear filters
            </button>
          </div>
        </div>
      ) : (
        <div className="card table-card">
          <ProposalRows
            data={filtered}
            editableStatuses={configuredStatuses}
            onStatusChange={perms.canWrite("proposals") ? updateProposalStatus : null}
            onDelete={perms.canWrite("proposals") ? setProposalToDelete : null}
            onView={setViewingProposal}
            onResend={perms.canWrite("proposals") ? setResendProposal : null}
            onPdf={exportPdf}
            onWhatsApp={shareViaWhatsApp}
          />
        </div>
      )}

      {viewingProposal && (
        <ProposalDetailModal
          proposal={viewingProposal}
          client={data.clients.find((client) => client.id === viewingProposal.clientId)}
          rep={data.rep}
          settings={data.settings}
          teamMembers={data.teamMembers}
          onClose={() => setViewingProposal(null)}
          onPdf={exportPdf}
          onWhatsApp={shareViaWhatsApp}
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
