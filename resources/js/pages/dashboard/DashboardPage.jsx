import { useState, useEffect } from "react";
import { FileText, IndianRupee, PlusCircle, CheckCircle2, Mail, FileDown, MessageCircle, Eye, RotateCw, Trash2 } from "lucide-react";
import { formatDate, formatDateTime, formatINR } from "../../lib/format.js";
import { getStatusStyle, getStatusesByRole, getProposalStatuses } from "../../lib/proposalStatuses.js";
import { downloadProposalPdf, lineItemsFromProposal, totalsFromProposal } from "../../lib/proposalPdf.js";
import { generateUpiQr } from "../../lib/proposalEmail.js";
import { resolveCreatorName } from "../../lib/teamMembers.js";
import { formatWhatsAppPhone, buildWhatsAppMessage, buildWhatsAppShareUrl } from "../../lib/whatsapp.js";
import { ProposalDetailModal } from "../proposals/ProposalDetailModal.jsx";
import { ResendEmailModal } from "../proposals/ResendEmailModal.jsx";
import { usePermissions } from "../../hooks/usePermissions.js";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { api } from "../../services/api.js";

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
  const { user: authUser } = useAuth();
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
          onWhatsApp={shareViaWhatsApp}
          onPdf={(proposal) => {
            const lineItems = lineItemsFromProposal(proposal);
            const totals = totalsFromProposal(proposal);
            const client = data.clients.find((c) => c.id === proposal.clientId);
            downloadProposalPdf({ proposal, client, settings: data.settings, rep: data.rep, lineItems, totals, frequency: proposal.frequency, upiQrDataUrl, paymentLink: proposal.paymentLink || null });
            api.notifyPdfDownload({ proposalId: proposal.id, clientName: client?.agency || "", clientEmail: client?.email || "", date: proposal.date || "", lineItems, totals, frequency: proposal.frequency || "", downloadedBy: authUser?.name || "" }).catch(() => {});
          }}
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
          onWhatsApp={shareViaWhatsApp}
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
              paymentLink: proposal.paymentLink || null,
            });
            const lineItems2 = lineItemsFromProposal(proposal);
            const totals2 = totalsFromProposal(proposal);
            const client2 = data.clients.find((c) => c.id === proposal.clientId);
            api.notifyPdfDownload({ proposalId: proposal.id, clientName: client2?.agency || "", clientEmail: client2?.email || "", date: proposal.date || "", lineItems: lineItems2, totals: totals2, frequency: proposal.frequency || "", downloadedBy: authUser?.name || "" }).catch(() => {});
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

function formatActivityTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/**
 * Compact "did this proposal actually get sent to the customer" indicator.
 * Emailed (SMTP) is server-verified; Gmail opens are self-reported (the
 * server can never confirm the user actually hit send in Gmail), so they're
 * grouped into the same "mail" badge but the tooltip breaks them apart.
 */
function ActivityBadges({ activity }) {
  if (!activity) return <span className="muted">—</span>;

  const emailedCount = (activity.emailed?.count || 0) + (activity.gmailOpened?.count || 0);
  const pdfCount = activity.pdfDownloaded?.count || 0;

  const emailParts = [];
  if (activity.emailed?.count) emailParts.push(`Emailed (SMTP): ${activity.emailed.count}`);
  if (activity.gmailOpened?.count) emailParts.push(`Opened in Gmail (unconfirmed): ${activity.gmailOpened.count}`);
  const lastEmailAt = [activity.emailed?.lastAt, activity.gmailOpened?.lastAt].filter(Boolean).sort().pop();
  if (lastEmailAt) emailParts.push(`Last: ${formatActivityTime(lastEmailAt)}`);

  const pdfParts = [];
  if (pdfCount) pdfParts.push(`PDF downloaded: ${pdfCount}`);
  if (activity.pdfDownloaded?.lastAt) pdfParts.push(`Last: ${formatActivityTime(activity.pdfDownloaded.lastAt)}`);

  const whatsappCount = activity.whatsappShared?.count || 0;
  const whatsappParts = [];
  if (whatsappCount) whatsappParts.push(`Shared via WhatsApp: ${whatsappCount}`);
  if (activity.whatsappShared?.lastAt) whatsappParts.push(`Last: ${formatActivityTime(activity.whatsappShared.lastAt)}`);

  const viewedCount = activity.linkViewed?.count || 0;
  const viewedParts = [];
  if (viewedCount) viewedParts.push(`Opened by client: ${viewedCount}`);
  if (activity.linkViewed?.lastAt) viewedParts.push(`Last: ${formatActivityTime(activity.linkViewed.lastAt)}`);

  const emailTooltip = emailParts.join(" · ") || "Not emailed yet";
  const pdfTooltip = pdfParts.join(" · ") || "PDF not downloaded yet";
  const whatsappTooltip = whatsappParts.join(" · ") || "Not shared via WhatsApp yet";
  const viewedTooltip = viewedParts.join(" · ") || "Client hasn't opened the link yet";

  return (
    <div className="activity-badges">
      <span
        className={`activity-badge tooltip ${emailedCount ? "activity-badge-active" : "activity-badge-muted"}`}
        data-tooltip={emailTooltip}
        aria-label={emailTooltip}
      >
        <Mail size={13} />
      </span>
      <span
        className={`activity-badge tooltip ${pdfCount ? "activity-badge-active" : "activity-badge-muted"}`}
        data-tooltip={pdfTooltip}
        aria-label={pdfTooltip}
      >
        <FileDown size={13} />
      </span>
      <span
        className={`activity-badge tooltip ${whatsappCount ? "activity-badge-active" : "activity-badge-muted"}`}
        data-tooltip={whatsappTooltip}
        aria-label={whatsappTooltip}
      >
        <MessageCircle size={13} />
      </span>
      <span
        className={`activity-badge tooltip ${viewedCount ? "activity-badge-active" : "activity-badge-muted"}`}
        data-tooltip={viewedTooltip}
        aria-label={viewedTooltip}
      >
        <Eye size={13} />
      </span>
    </div>
  );
}

export function ProposalRows({ data, limit, editableStatuses, onStatusChange, onDelete, onView, onPdf, onResend, onWhatsApp }) {
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
    <div className="table-scroll">
      <table className="table">
        <thead>
          <tr>
            <th className="col-id">Proposal ID</th>
            <th className="col-client">Client</th>
            <th className="col-products">Products</th>
            <th className="col-amount">Amount</th>
            <th className="col-status">Status</th>
            <th className="col-date">Date</th>
            <th className="col-activity">Activity</th>
            {showSentBy && <th className="col-sentby">Sent by</th>}
            <th className="col-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((proposal) => {
            const style = getStatusStyle(proposal.status, data.settings);
            const creatorName = showSentBy
              ? resolveCreatorName(proposal.createdByUserId, teamMembers, null)
              : null;
            const products = proposal.products || [];
            const extraProductsCount = products.length - 1;

            return (
              <tr key={proposal.id}>
                <td className="col-id"><strong className="proposal-id">{proposal.id}</strong></td>
                <td className="col-client">
                  <strong>{proposal.client?.agency}</strong>
                  <div className="muted">{proposal.client?.contact}</div>
                </td>
                <td className="muted col-products">
                  <div className="products-cell tooltip" data-tooltip={products.join(", ")}>
                    <span className="products-primary">{products[0]}</span>
                    {extraProductsCount > 0 && <span className="products-more">+{extraProductsCount}</span>}
                  </div>
                </td>
                <td className="col-amount"><strong>{formatINR(proposal.amount)}</strong></td>
                <td className="col-status">
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
                <td className="muted col-date">
                  {(() => {
                    const dt = formatDateTime(proposal.createdAt);
                    return dt ? (
                      <><span>{dt.date}</span><div style={{ fontSize: 11, color: "#9ca3af" }}>{dt.time}</div></>
                    ) : formatDate(proposal.date);
                  })()}
                </td>
                <td className="col-activity">
                  <ActivityBadges activity={proposal.activity} />
                </td>
                {showSentBy && (
                  <td className="muted col-sentby">
                    {creatorName ? (
                      <span style={creatorName === "Deleted user" ? { color: "#9ca3af", fontStyle: "italic" } : {}}>
                        {creatorName}
                      </span>
                    ) : (
                      <span style={{ color: "#9ca3af" }}>—</span>
                    )}
                  </td>
                )}
                <td className="col-actions">
                  <div className="row-actions">
                    <button className="icon-btn tooltip" onClick={() => onView?.(proposal)} data-tooltip="View" aria-label="View">
                      <Eye size={15} />
                    </button>
                    {onResend && (
                      <button className="icon-btn tooltip" onClick={() => onResend(proposal)} data-tooltip="Resend" aria-label="Resend">
                        <RotateCw size={15} />
                      </button>
                    )}
                    <button className="icon-btn tooltip" onClick={() => onPdf?.(proposal)} data-tooltip="Download PDF" aria-label="Download PDF">
                      <FileDown size={15} />
                    </button>
                    {onWhatsApp && (() => {
                      const whatsappTooltip = formatWhatsAppPhone(proposal.client?.phone)
                        ? "Share via WhatsApp"
                        : "No valid phone on file — you'll pick a contact in WhatsApp";
                      return (
                        <button
                          className="icon-btn tooltip"
                          onClick={() => onWhatsApp(proposal)}
                          data-tooltip={whatsappTooltip}
                          aria-label={whatsappTooltip}
                        >
                          <MessageCircle size={15} />
                        </button>
                      );
                    })()}
                    {onDelete && (
                      <button className="icon-btn tooltip danger-action" onClick={() => onDelete(proposal)} data-tooltip="Delete" aria-label="Delete">
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
