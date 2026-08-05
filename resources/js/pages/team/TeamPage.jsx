import { useCallback, useEffect, useState } from "react";
import {
  Boxes,
  Building2,
  CreditCard,
  FileText,
  Mail,
  Pencil,
  Plus,
  Settings2,
  SlidersHorizontal,
  Trash2,
  Users,
} from "lucide-react";
import { api } from "../../services/api.js";
import { usePermissions } from "../../hooks/usePermissions.js";

const emptyForm = {
  name: "",
  email: "",
  password: "",
  password_confirmation: "",
  is_admin: false,
  permissions: {
    clients: { read: true, write: false },
    proposals: { read: true, write: false },
    products: { read: true, write: false },
    settings_sales: { read: false, write: false },
    settings_payment: { read: false, write: false },
    settings_email: { read: false, write: false },
    settings_defaults: { read: false, write: false },
  },
};

const sectionMeta = [
  { key: "clients", label: "Clients", icon: Users },
  { key: "proposals", label: "Proposals", icon: FileText },
  { key: "products", label: "Products & Plans", icon: Boxes },
];

const settingsSectionMeta = [
  { key: "settings_sales", label: "Sales Person Details", icon: Building2, hint: "Write: signatory, designation, phone, email" },
  { key: "settings_payment", label: "Payment Details", icon: CreditCard },
  { key: "settings_email", label: "Email Config", icon: Mail },
  { key: "settings_defaults", label: "Defaults", icon: SlidersHorizontal },
];

function memberInitials(name) {
  return (name || "?")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function PermBadge({ read, write }) {
  if (write) {
    return <span className="perm-badge perm-badge-write">Read + Write</span>;
  }
  if (read) {
    return <span className="perm-badge perm-badge-read">Read only</span>;
  }
  return <span className="perm-badge perm-badge-none">No access</span>;
}

function FormField({ label, type = "text", value, onChange, span = false, hint }) {
  return (
    <label className={span ? "span-2" : ""}>
      <span className="field-label">{label}</span>
      <input className="input" type={type} value={value} onChange={(e) => onChange(e.target.value)} />
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

function PermissionRow({ sectionKey, label, icon: Icon, hint, value, onChange }) {
  return (
    <div className="permission-table-row">
      <div className="permission-section-label">
        <span className="permission-section-icon">
          <Icon size={16} />
        </span>
        <span>
          {label}
          {hint && <span className="permission-row-hint">{hint}</span>}
        </span>
      </div>
      <label className="perm-toggle">
        <input
          type="checkbox"
          checked={value[sectionKey]?.read ?? false}
          onChange={(e) =>
            onChange({
              ...value,
              [sectionKey]: {
                ...value[sectionKey],
                read: e.target.checked,
                write: e.target.checked ? value[sectionKey]?.write : false,
              },
            })
          }
        />
        <span className="perm-toggle-ui" />
      </label>
      <label className="perm-toggle">
        <input
          type="checkbox"
          checked={value[sectionKey]?.write ?? false}
          onChange={(e) =>
            onChange({
              ...value,
              [sectionKey]: {
                read: e.target.checked ? true : value[sectionKey]?.read,
                write: e.target.checked,
              },
            })
          }
        />
        <span className="perm-toggle-ui" />
      </label>
    </div>
  );
}

function PermissionMatrix({ value, onChange }) {
  return (
    <div className="permission-panel">
      <div className="permission-panel-head">
        <h3>Section permissions</h3>
        <p>Write access includes read. Uncheck both to hide a section.</p>
      </div>
      <div className="permission-table">
        <div className="permission-table-header">
          <span>Section</span>
          <span>Read</span>
          <span>Write</span>
        </div>
        {sectionMeta.map((row) => (
          <PermissionRow
            key={row.key}
            sectionKey={row.key}
            label={row.label}
            icon={row.icon}
            hint={row.hint}
            value={value}
            onChange={onChange}
          />
        ))}
        <div className="permission-table-group">Settings tabs</div>
        {settingsSectionMeta.map((row) => (
          <PermissionRow
            key={row.key}
            sectionKey={row.key}
            label={row.label}
            icon={row.icon}
            hint={row.hint}
            value={value}
            onChange={onChange}
          />
        ))}
      </div>
    </div>
  );
}

export function TeamPage() {
  const { isAccountOwner } = usePermissions();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const list = await api.listSubUsers();
      setMembers(list);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAccountOwner) load();
  }, [isAccountOwner, load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalError("");
    setShowModal(true);
  };

  const openEdit = (member) => {
    setEditing(member);
    setForm({
      name: member.name,
      email: member.email,
      password: "",
      password_confirmation: "",
      is_admin: Boolean(member.is_admin),
      permissions: { ...emptyForm.permissions, ...(member.permissions || {}) },
    });
    setModalError("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalError("");
  };

  const save = async () => {
    setModalError("");
    if (!form.name.trim() || !form.email.trim()) {
      setModalError("Name and email are required.");
      return;
    }
    if (!editing && (!form.password || form.password.length < 8)) {
      setModalError("Password must be at least 8 characters.");
      return;
    }
    if (form.password && form.password !== form.password_confirmation) {
      setModalError("Passwords do not match.");
      return;
    }

    try {
      setSaving(true);
      if (editing) {
        const payload = {
          name: form.name.trim(),
          email: form.email.trim(),
          is_admin: form.is_admin,
          permissions: form.permissions,
        };
        if (form.password) {
          payload.password = form.password;
          payload.password_confirmation = form.password_confirmation;
        }
        await api.updateSubUser(editing.id, payload);
      } else {
        await api.createSubUser({
          ...form,
          name: form.name.trim(),
          email: form.email.trim(),
        });
      }
      closeModal();
      await load();
    } catch (err) {
      setModalError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await api.deleteSubUser(deleteTarget.id);
    setDeleteTarget(null);
    await load();
  };

  if (!isAccountOwner) {
    return (
      <div className="page">
        <div className="card team-empty-card">
          <h1 className="page-title">Team</h1>
          <p className="muted">Only the account owner can manage sub-users.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Team</h1>
          <div className="muted">Invite teammates and control what each person can view or edit.</div>
        </div>
        <button className="button primary" type="button" onClick={openCreate}>
          <Plus size={16} /> Add sub-user
        </button>
      </div>

      {error && <div className="form-error page-error-banner">{error}</div>}

      {loading && <div className="loading-state">Loading team...</div>}

      {!loading && (
        <div className="card table-card">
          <div className="table-card-header">
            <h2>Sub-users</h2>
            <span className="muted">{members.length} member{members.length !== 1 ? "s" : ""}</span>
          </div>
          {members.length === 0 ? (
            <div className="team-empty-state">
              <div className="team-empty-icon">
                <Users size={28} />
              </div>
              <h3>No sub-users yet</h3>
              <p>Add someone from your team and choose what they can access.</p>
              <button className="button primary" type="button" onClick={openCreate}>
                <Plus size={16} /> Add your first sub-user
              </button>
            </div>
          ) : (
            <div className="team-table-scroll">
            <table className="table team-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Admin</th>
                  <th>Clients</th>
                  <th>Proposals</th>
                  <th>Products</th>
                  <th colSpan={4} className="team-settings-head">
                    <Settings2 size={14} /> Settings
                  </th>
                  <th>Actions</th>
                </tr>
                <tr className="team-table-subhead">
                  <th colSpan={5} />
                  <th>Sales</th>
                  <th>Payment</th>
                  <th>Email</th>
                  <th>Defaults</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <div className="team-member-cell">
                        <span className="team-avatar">{memberInitials(member.name)}</span>
                        <div>
                          <strong>{member.name}</strong>
                          <div className="muted">{member.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {member.is_admin ? (
                        <span className="perm-badge perm-badge-write">Admin</span>
                      ) : (
                        <span className="perm-badge perm-badge-none">—</span>
                      )}
                    </td>
                    <td>
                      <PermBadge read={member.permissions?.clients?.read} write={member.permissions?.clients?.write} />
                    </td>
                    <td>
                      <PermBadge read={member.permissions?.proposals?.read} write={member.permissions?.proposals?.write} />
                    </td>
                    <td>
                      <PermBadge read={member.permissions?.products?.read} write={member.permissions?.products?.write} />
                    </td>
                    <td>
                      <PermBadge read={member.permissions?.settings_sales?.read} write={member.permissions?.settings_sales?.write} />
                    </td>
                    <td>
                      <PermBadge read={member.permissions?.settings_payment?.read} write={member.permissions?.settings_payment?.write} />
                    </td>
                    <td>
                      <PermBadge read={member.permissions?.settings_email?.read} write={member.permissions?.settings_email?.write} />
                    </td>
                    <td>
                      <PermBadge read={member.permissions?.settings_defaults?.read} write={member.permissions?.settings_defaults?.write} />
                    </td>
                    <td>
                      <div className="row-actions">
                        <button type="button" className="button" onClick={() => openEdit(member)}>
                          <Pencil size={13} /> Edit
                        </button>
                        <button type="button" className="danger-action" onClick={() => setDeleteTarget(member)} aria-label="Remove">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-card team-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>{editing ? "Edit sub-user" : "Add sub-user"}</h2>
                <p>Set login credentials and access for each section.</p>
              </div>
              <button type="button" className="modal-close" onClick={closeModal} aria-label="Close">×</button>
            </div>

            <div className="team-modal-section">
              <h3 className="team-modal-section-title">Account details</h3>
              <div className="grid-2">
                <FormField
                  label="Full name *"
                  value={form.name}
                  onChange={(value) => setForm({ ...form, name: value })}
                  span
                />
                <FormField
                  label="Email address *"
                  type="email"
                  value={form.email}
                  onChange={(value) => setForm({ ...form, email: value })}
                  span
                />
                <FormField
                  label={editing ? "New password (optional)" : "Password *"}
                  type="password"
                  value={form.password}
                  onChange={(value) => setForm({ ...form, password: value })}
                  hint={editing ? "Leave blank to keep the current password." : "Minimum 8 characters."}
                />
                <FormField
                  label="Confirm password"
                  type="password"
                  value={form.password_confirmation}
                  onChange={(value) => setForm({ ...form, password_confirmation: value })}
                />
              </div>
              <label className="team-admin-toggle">
                <span className="perm-toggle">
                  <input
                    type="checkbox"
                    checked={form.is_admin}
                    onChange={(e) => setForm({ ...form, is_admin: e.target.checked })}
                  />
                  <span className="perm-toggle-ui" />
                </span>
                <span>
                  <strong>Admin</strong>
                  <span className="field-hint">
                    Can view and manage every proposal and client in this account, not just their own.
                  </span>
                </span>
              </label>
            </div>

            <PermissionMatrix
              value={form.permissions}
              onChange={(permissions) => setForm({ ...form, permissions })}
            />

            {modalError && <div className="form-error">{modalError}</div>}

            <div className="modal-actions">
              <button type="button" className="button" onClick={closeModal} disabled={saving}>
                Cancel
              </button>
              <button type="button" className="button primary" onClick={save} disabled={saving}>
                {saving ? "Saving..." : editing ? "Save changes" : "Create sub-user"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-backdrop" onClick={() => setDeleteTarget(null)}>
          <div className="modal-card confirm-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Remove sub-user?</h2>
                <p className="confirm-copy">
                  <strong>{deleteTarget.name}</strong> will lose access immediately.
                </p>
              </div>
              <button type="button" className="modal-close" onClick={() => setDeleteTarget(null)} aria-label="Close">×</button>
            </div>
            <div className="modal-actions">
              <button type="button" className="button" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button type="button" className="button danger" onClick={confirmDelete}>Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
