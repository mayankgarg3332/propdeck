import { useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { formatINR, getStatusStyle } from "../../lib/format.js";
import { api } from "../../services/api.js";
import { usePermissions } from "../../hooks/usePermissions.js";

const blankClient = {
  agency: "",
  contact: "",
  email: "",
  phone: "",
  city: "",
  state: "",
  gst: "",
  notes: "",
};

export function ClientsPage({ data, reload, openNewProposal }) {
  const perms = usePermissions();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newClient, setNewClient] = useState(blankClient);
  const [savedClient, setSavedClient] = useState(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [clientToDelete, setClientToDelete] = useState(null);

  const deleteClient = async () => {
    if (!clientToDelete) return;
    await api.deleteClient(clientToDelete.id);
    await reload();
    setClientToDelete(null);
  };

  const clientStats = data.clients.map((client) => {
    const proposals = data.proposals.filter((proposal) => proposal.clientId === client.id);
    const latest = proposals[0]?.status || "Draft";
    return { ...client, proposals: proposals.length, latest };
  });

  const q = query.toLowerCase().trim();
  const filtered = q
    ? clientStats.filter((c) =>
        c.agency?.toLowerCase().includes(q) ||
        c.contact?.toLowerCase().includes(q) ||
        c.city?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.gst?.toLowerCase().includes(q)
      )
    : clientStats;

  const openAddModal = () => {
    setNewClient(blankClient);
    setSavedClient(null);
    setError("");
    setShowAddModal(true);
  };

  const setField = (field, value) => {
    setNewClient((current) => ({ ...current, [field]: value }));
    setError("");
  };

  const saveClient = async () => {
    if (!newClient.agency.trim() || !newClient.contact.trim() || !newClient.email.trim()) {
      setError("Agency name, contact person, and email are required.");
      return;
    }

    const client = {
      ...newClient,
      id: `client_${crypto.randomUUID()}`,
      agency: newClient.agency.trim(),
      contact: newClient.contact.trim(),
      email: newClient.email.trim(),
      phone: newClient.phone.trim(),
      city: newClient.city.trim(),
      state: newClient.state.trim(),
      gst: newClient.gst.trim(),
      notes: newClient.notes.trim(),
      createdAt: new Date().toISOString(),
    };

    await api.saveClient(client);
    await reload();
    setSavedClient(client);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Clients</h1>
          <div className="muted">
            {q ? `${filtered.length} of ${data.clients.length} travel agencies` : `${data.clients.length} travel agencies`}
          </div>
        </div>
        {perms.canWrite("clients") && (
          <button className="button primary" onClick={openAddModal}><Plus size={16} /> Add Client</button>
        )}
      </div>
      <div className="card search-strip">
        <Search size={16} />
        <input
          placeholder="Search by agency, contact, city, email, GST..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button onClick={() => setQuery("")} style={{ border: "none", background: "none", color: "#9ca3af", cursor: "pointer", padding: "0 4px", fontSize: 16, lineHeight: 1 }}>×</button>
        )}
      </div>
      <div className="card table-card">
        <table className="table">
          <thead>
            <tr>
              <th>Agency</th>
              <th>Contact</th>
              <th>City</th>
              <th>GST</th>
              <th>Proposals</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7} style={{ padding: "28px 16px", textAlign: "center", color: "#9ca3af" }}>No clients match "{query}"</td></tr>
            )}
            {filtered.map((client) => (
              <tr key={client.id}>
                <td><strong>{client.agency}</strong></td>
                <td>{client.contact}</td>
                <td className="muted">{client.city}, {client.state}</td>
                <td className="muted">{client.gst}</td>
                <td><strong>{client.proposals}</strong></td>
                <td><span className="status-pill" style={getStatusStyle(client.latest)}>{client.latest}</span></td>
                <td>
                  <div className="row-actions">
                    {perms.canWrite("proposals") && (
                      <button className="button" onClick={() => openNewProposal(client.id)}>+ Proposal</button>
                    )}
                    {perms.canWrite("clients") && (
                      <button className="danger-action" onClick={() => setClientToDelete(client)}><Trash2 size={13} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {clientToDelete && (() => {
        const linkedProposals = data.proposals.filter((p) => p.clientId === clientToDelete.id);
        const acceptedProposals = linkedProposals.filter((p) => p.status === "Accepted");
        const acceptedRevenue = acceptedProposals.reduce((sum, p) => sum + p.amount, 0);
        const hasAccepted = acceptedProposals.length > 0;
        return (
          <div className="modal-backdrop" onClick={() => setClientToDelete(null)}>
            <div className="modal-card confirm-card" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h2>Delete Client</h2>
                  <p>{clientToDelete.agency}</p>
                </div>
                <button className="modal-close" onClick={() => setClientToDelete(null)}>×</button>
              </div>

              {hasAccepted && (
                <div className="delete-warning-strong">
                  <strong>⚠ Accepted proposals will be lost</strong>
                  <span>{acceptedProposals.length} accepted proposal{acceptedProposals.length > 1 ? "s" : ""} worth {formatINR(acceptedRevenue)} will be permanently deleted.</span>
                </div>
              )}

              <div className="confirm-copy">
                <p>Deleting <strong>{clientToDelete.agency}</strong> will permanently remove:</p>
                <ul className="delete-impact-list">
                  <li>The client record</li>
                  {linkedProposals.length > 0 ? (
                    <li>
                      <strong>{linkedProposals.length} linked proposal{linkedProposals.length > 1 ? "s" : ""}</strong>
                      {" "}({linkedProposals.map((p) => p.status).join(", ")})
                    </li>
                  ) : (
                    <li>No proposals linked — safe to delete</li>
                  )}
                </ul>
                <p style={{ marginTop: 12, color: "#6b7280", fontSize: 13 }}>This cannot be undone.</p>
              </div>

              <div className="modal-actions">
                <button className="button danger" onClick={deleteClient}>
                  <Trash2 size={14} /> Delete Client{linkedProposals.length > 0 ? ` & ${linkedProposals.length} Proposal${linkedProposals.length > 1 ? "s" : ""}` : ""}
                </button>
                <button className="button" onClick={() => setClientToDelete(null)}>Cancel</button>
              </div>
            </div>
          </div>
        );
      })()}

      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Add New Client</h2>
                <p>New client will be saved locally on this device.</p>
              </div>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>x</button>
            </div>

            {savedClient ? (
              <div className="success-state">
                <div className="success-icon">✓</div>
                <h3>Client Added</h3>
                <p>{savedClient.agency} has been saved to your client list.</p>
                <div className="modal-actions centered">
                  <button className="button" onClick={() => setShowAddModal(false)}>Close</button>
                  <button
                    className="button primary"
                    onClick={() => {
                      setShowAddModal(false);
                      openNewProposal(savedClient.id);
                    }}
                  >
                    Create Proposal
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="grid-2">
                  <ClientField label="Travel Agency Name *" value={newClient.agency} onChange={(value) => setField("agency", value)} span />
                  <ClientField label="Contact Person *" value={newClient.contact} onChange={(value) => setField("contact", value)} span />
                  <ClientField label="Email Address *" type="email" value={newClient.email} onChange={(value) => setField("email", value)} />
                  <ClientField label="Phone Number" value={newClient.phone} onChange={(value) => setField("phone", value)} />
                  <ClientField label="City" value={newClient.city} onChange={(value) => setField("city", value)} />
                  <ClientField label="State" value={newClient.state} onChange={(value) => setField("state", value)} />
                  <ClientField label="GST Number" value={newClient.gst} onChange={(value) => setField("gst", value)} span />
                </div>
                {error && <div className="form-error">{error}</div>}
                <div className="modal-note">GST number is optional here, but useful for tax-compliant proposals and invoices later.</div>
                <div className="modal-actions">
                  <button className="button primary" onClick={saveClient}>Save Client</button>
                  <button className="button" onClick={() => setShowAddModal(false)}>Cancel</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ClientField({ label, value, onChange, type = "text", span = false }) {
  return (
    <label className={span ? "span-2" : ""}>
      <span className="field-label">{label}</span>
      <input className="input" type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
