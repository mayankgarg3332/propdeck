import { formatDate, formatINR, getStatusStyle } from "../../lib/format.js";

export function ProposalDetailModal({ proposal, client, rep, settings, onClose, onPdf }) {
  if (!proposal) return null;
  const statusStyle = getStatusStyle(proposal.status);
  const preparedBy = settings?.company?.signatory || rep?.name || proposal.repId || "—";
  const phone = settings?.company?.phone || rep?.phone || "—";

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

        <div className="modal-actions">
          <button className="button primary" onClick={() => onPdf(proposal)}>Download PDF</button>
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
