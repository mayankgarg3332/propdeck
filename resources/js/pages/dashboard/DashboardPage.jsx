import { useState, useEffect } from "react";
import { FileText, IndianRupee, PlusCircle, CheckCircle2 } from "lucide-react";
import { formatDate, formatDateTime, formatINR } from "../../lib/format.js";
import { getStatusStyle, getStatusesByRole, getProposalStatuses } from "../../lib/proposalStatuses.js";
import { downloadProposalPdf, lineItemsFromProposal, totalsFromProposal } from "../../lib/proposalPdf.js";
import { generateUpiQr } from "../../lib/proposalEmail.js";
import { ProposalDetailModal } from "../proposals/ProposalDetailModal.jsx";
import { ResendEmailModal } from "../proposals/ResendEmailModal.jsx";
import { usePermissions } from "../../hooks/usePermissions.js";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function isSameMonth(dateStr, year, month) {
  const d = new Date(dateStr);
  return d.getFullYear() === year && d.getMonth() === month;
}

function computeStats(proposals, settings) {
  const now = new Date();
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth();
  const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
  const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;

  const thisMonthProposals = proposals.filter((p) => isSameMonth(p.date, thisYear, thisMonth));
  const lastMonthProposals = proposals.filter((p) => isSameMonth(p.date, lastMonthYear, lastMonth));
  const delta = thisMonthProposals.length - lastMonthProposals.length;

  // Use role-based counting so renamed/custom "positive" statuses are included
  const positiveValues = new Set(getStatusesByRole(settings, "positive").map((s) => s.value));
  const accepted = proposals.filter((p) => positiveValues.has(p.status));
  const positiveLabel = getStatusesByRole(settings, "positive").map((s) => s.label).join(" / ") || "Accepted";

  const acceptanceRate = proposals.length > 0 ? Math.round((accepted.length / proposals.length) * 100) : 0;
  const revenue = accepted.reduce((sum, p) => sum + p.amount, 0);

  const deltaLabel =
    delta === 0 ? "Same as last month" :
    delta > 0 ? `+${delta} from last month` :
    `${delta} from last month`;

  return { thisMonthCount: thisMonthProposals.length, deltaLabel, accepted, acceptanceRate, revenue, positiveLabel };
}

export function DashboardPage({ data, reload, navigate, openNewProposal }) {
  const perms = usePermissions();
  const [viewingProposal, setViewingProposal] = useState(null);
  const [resendProposal, setResendProposal] = useState(null);
  const [upiQrDataUrl, setUpiQrDataUrl] = useState(null);
  const { thisMonthCount, deltaLabel, accepted, acceptanceRate, revenue, positiveLabel } = computeStats(data.proposals, data.settings);

  const upiId = data.settings?.payment?.upi || "";
  const companyName = data.settings?.company?.name || "";
  useEffect(() => {
    generateUpiQr(upiId, companyName).then(setUpiQrDataUrl);
  }, [upiId, companyName]);

  const stats = [
    { label: "Proposals this month", value: String(thisMonthCount), sub: deltaLabel, icon: FileText },
    { label: `${positiveLabel} proposals`, value: String(accepted.length), sub: `${acceptanceRate}% acceptance rate`, icon: CheckCircle2 },
    { label: "Revenue committed", value: formatINR(revenue), sub: `From ${positiveLabel.toLowerCase()} proposals`, icon: IndianRupee },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{getGreeting()}, {(data.settings?.company?.signatory || data.rep?.name)?.split(" ")[0] || "there"}</h1>
          <div className="muted">Offline-first proposal workspace</div>
        </div>
      </div>

      <div className="dashboard-grid">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div className="card stat-card" key={stat.label}>
              <div>
                <div className="muted">{stat.label}</div>
                <strong>{stat.value}</strong>
                <span>{stat.sub}</span>
              </div>
              <div className="stat-icon"><Icon size={20} /></div>
            </div>
          );
        })}
        {perms.canWrite("proposals") && (
          <button className="new-proposal-card" onClick={() => openNewProposal()}>
            <PlusCircle size={34} />
            <strong>New Proposal</strong>
            <span>Create in under 5 min</span>
          </button>
        )}
      </div>

      <div className="card table-card">
        <div className="table-card-header">
          <h2>Recent Proposals</h2>
          <button className="button" onClick={() => navigate("/proposals")}>View all</button>
        </div>
        <ProposalRows
          data={data}
          limit={6}
          onView={setViewingProposal}
          onResend={perms.canWrite("proposals") ? setResendProposal : null}
          onPdf={(proposal) => downloadProposalPdf({
            proposal,
            client: data.clients.find((client) => client.id === proposal.clientId),
            settings: data.settings,
            rep: data.rep,
            lineItems: lineItemsFromProposal(proposal),
            totals: totalsFromProposal(proposal),
            frequency: proposal.frequency,
            upiQrDataUrl,
          })}
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
          onPdf={(proposal) => {
            const creator = data.teamMembers?.[proposal.createdByUserId];
            downloadProposalPdf({
              proposal,
              client: data.clients.find((client) => client.id === proposal.clientId),
              settings: data.settings,
              rep: data.rep,
              creatorSettings: creator,
              lineItems: lineItemsFromProposal(proposal),
              totals: totalsFromProposal(proposal),
              frequency: proposal.frequency,
              upiQrDataUrl,
            });
          }}
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
    </div>
  );
}

/**
 * Resolve a display name for who created a proposal.
 *
 * teamMembers: { [userId]: { name, email } } — only present for account owners
 * createdByUserId: the user ID stored on the proposal
 * currentUserId: the logged-in user's ID (to show "You" for own proposals)
 *
 * Edge cases:
 *  - createdByUserId is null (old proposals before tracking was added) → "—"
 *  - User has been deleted (id not in teamMembers) → "Deleted user"
 *  - Created by the account owner themselves → owner's name
 */
function resolveCreatorName(createdByUserId, teamMembers, currentUserId) {
  if (!createdByUserId) return null; // null = don't show (old proposals)
  if (!teamMembers) return null;     // not account owner — don't show column
  const member = teamMembers[createdByUserId];
  if (!member) return "Deleted user";
  return member.name || member.email || "Unknown";
}

export function ProposalRows({ data, limit, editableStatuses, onStatusChange, onDelete, onView, onPdf, onResend }) {
  const sortKey = (p) => p.createdAt || (p.date + "T00:00:00");
  const rows = [...data.proposals]
    .sort((a, b) => new Date(sortKey(b)) - new Date(sortKey(a)))
    .slice(0, limit)
    .map((proposal) => ({
    ...proposal,
    client: data.clients.find((client) => client.id === proposal.clientId),
  }));

  // Show "Sent by" column only for account owners who have teamMembers data
  // AND only when there are actually sub-users (more than 1 team member)
  const teamMembers = data.teamMembers;
  const showSentBy = Boolean(teamMembers && Object.keys(teamMembers).length > 1);

  return (
    <table className="table">
      <thead>
        <tr>
          <th>Proposal ID</th>
          <th>Client</th>
          <th>Products</th>
          <th>Amount</th>
          <th>Status</th>
          <th>Date</th>
          {showSentBy && <th>Sent by</th>}
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((proposal) => {
          const style = getStatusStyle(proposal.status, data.settings);
          const creatorName = showSentBy
            ? resolveCreatorName(proposal.createdByUserId, teamMembers, null)
            : null;

          return (
            <tr key={proposal.id}>
              <td><strong className="proposal-id">{proposal.id}</strong></td>
              <td>
                <strong>{proposal.client?.agency}</strong>
                <div className="muted">{proposal.client?.contact}</div>
              </td>
              <td className="muted">{proposal.products.join(", ")}</td>
              <td><strong>{formatINR(proposal.amount)}</strong></td>
              <td>
                {onStatusChange ? (
                  <select
                    className="status-select"
                    style={style}
                    value={proposal.status}
                    onChange={(event) => onStatusChange(proposal, event.target.value)}
                  >
                    {(editableStatuses || []).map((s) => (
                      <option key={s.value ?? s} value={s.value ?? s}>{s.label ?? s}</option>
                    ))}
                  </select>
                ) : (
                  <span className="status-pill" style={style}>{proposal.status}</span>
                )}
              </td>
              <td className="muted">
                {(() => {
                  const dt = formatDateTime(proposal.createdAt);
                  return dt ? (
                    <><span>{dt.date}</span><div style={{ fontSize: 11, color: "#9ca3af" }}>{dt.time}</div></>
                  ) : formatDate(proposal.date);
                })()}
              </td>
              {showSentBy && (
                <td className="muted">
                  {creatorName ? (
                    <span style={creatorName === "Deleted user" ? { color: "#9ca3af", fontStyle: "italic" } : {}}>
                      {creatorName}
                    </span>
                  ) : (
                    <span style={{ color: "#9ca3af" }}>—</span>
                  )}
                </td>
              )}
              <td>
                <div className="row-actions">
                  <button onClick={() => onView?.(proposal)}>View</button>
                  {onResend && <button onClick={() => onResend(proposal)}>Resend</button>}
                  <button onClick={() => onPdf?.(proposal)}>PDF</button>
                  {onDelete && <button className="danger-action" onClick={() => onDelete(proposal)}>Delete</button>}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
