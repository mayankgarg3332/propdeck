import { useEffect, useState } from "react";
import { Mail, ExternalLink, FileDown, MessageCircle, Eye } from "lucide-react";
import { formatDate, formatINR, getStatusStyle } from "../../lib/format.js";
import { api } from "../../services/api.js";
import { formatWhatsAppPhone } from "../../lib/whatsapp.js";

const EVENT_META = {
  emailed: { icon: Mail, label: "Emailed via SMTP" },
  gmail_opened: { icon: ExternalLink, label: "Opened in Gmail (unconfirmed)" },
  pdf_downloaded: { icon: FileDown, label: "PDF downloaded" },
  whatsapp_shared: { icon: MessageCircle, label: "Shared via WhatsApp" },
  link_viewed: { icon: Eye, label: "Public link opened by client" },
};

function ProposalActivity({ proposalId }) {
  const [events, setEvents] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setEvents(null);
    setError("");
    api
      .getProposalEvents(proposalId)
      .then((data) => {
        if (!cancelled) setEvents(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Failed to load activity.");
      });
    return () => {
      cancelled = true;
    };
  }, [proposalId]);

  if (error) return <p className="muted">{error}</p>;
  if (events === null) return <p className="muted">Loading...</p>;
  if (events.length === 0) return <p className="muted">No activity yet.</p>;

  return (
    <div className="proposal-activity-timeline">
      {events.map((event) => {
        const meta = EVENT_META[event.type] || { icon: Mail, label: event.type };
        const Icon = meta.icon;
        const when = event.createdAt ? new Date(event.createdAt).toLocaleString() : "";
        return (
          <div className="proposal-activity-row" key={event.id}>
            <span className="proposal-activity-icon">
              <Icon size={14} />
            </span>
            <div>
              <div>
                <strong>{meta.label}</strong>
                {event.userName ? ` by ${event.userName}` : ""}
              </div>
              <div className="proposal-activity-meta">{when}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ProposalDetailModal({ proposal, client, rep, settings, teamMembers, onClose, onPdf, onWhatsApp }) {
  if (!proposal) return null;
  const statusStyle = getStatusStyle(proposal.status);

  // If the master user is viewing a proposal created by someone else, resolve
  // that creator's salesperson details from teamMembers instead of using the
  // currently-logged-in user's settings.
  const creator = teamMembers?.[proposal.createdByUserId];
  const preparedBy = creator?.signatory || settings?.company?.signatory || rep?.name || proposal.repId || "—";
  const phone = creator?.phone || settings?.company?.phone || rep?.phone || "—";

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card proposal-detail-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{proposal.id}</h2>
            <p>{client?.agency} · {formatDate(proposal.date)}</p>
          </div>
          <button className="modal-close" onClick={onClose}>x</button>
        </div>

        <div className="proposal-detail-hero">
          <div>
            <span className="field-label">Prepared For</span>
            <strong>{client?.agency}</strong>
            <small>{client?.contact} · {client?.email}</small>
          </div>
          <div>
            <span className="field-label">Amount</span>
            <strong>{formatINR(proposal.amount)}</strong>
            <span className="status-pill" style={statusStyle}>{proposal.status}</span>
          </div>
        </div>

        <div className="proposal-detail-grid">
          <DetailBlock label="Prepared By" value={preparedBy} />
          <DetailBlock label="Phone" value={phone} />
          <DetailBlock label="Client GST" value={client?.gst || "-"} />
          <DetailBlock label="Valid For" value={`${settings?.defaults?.validityDays || 7} days`} />
        </div>

        <section className="proposal-detail-section">
          <h3>Products</h3>
          <ul>
            {proposal.products.map((product) => <li key={product}>{product}</li>)}
          </ul>
        </section>

        <section className="proposal-detail-section">
          <h3>Payment</h3>
          <p>{settings?.payment?.bank} · {settings?.payment?.account} · {settings?.payment?.ifsc}</p>
        </section>

        <section className="proposal-detail-section">
          <h3>Activity</h3>
          <ProposalActivity proposalId={proposal.id} />
        </section>

        <div className="modal-actions">
          <button className="button primary" onClick={() => onPdf(proposal)}>Download PDF</button>
          {onWhatsApp && (
            <button
              className="button"
              onClick={() => onWhatsApp(proposal)}
              title={
                formatWhatsAppPhone(client?.phone)
                  ? undefined
                  : "No valid phone on file — you'll pick a contact in WhatsApp"
              }
            >
              <MessageCircle size={14} /> WhatsApp
            </button>
          )}
          <button className="button" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function DetailBlock({ label, value }) {
  return (
    <div className="detail-block">
      <span>{label}</span>
      <strong>{value || "-"}</strong>
    </div>
  );
}
