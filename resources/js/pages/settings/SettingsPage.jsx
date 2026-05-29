import { useEffect, useMemo, useState } from "react";
import { Check, GripVertical, X } from "lucide-react";
import { api } from "../../services/api.js";
import { usePermissions } from "../../hooks/usePermissions.js";
import {
  COMPANY_LIMITED_WRITE_FIELDS,
  pickCompanyPayloadForSave,
} from "../../lib/permissions.js";

const TABS = [
  { id: "company", label: "Company Info" },
  { id: "payment", label: "Payment Details" },
  { id: "email", label: "Email Config" },
  { id: "defaults", label: "Defaults" },
];

export function SettingsPage({ data, reload }) {
  const {
    isAccountOwner,
    canReadSettingsTab,
    canWriteSettingsTab,
    canAccessSettings,
  } = usePermissions();
  const s = data.settings || {};

  const visibleTabs = useMemo(
    () => TABS.filter((t) => canReadSettingsTab(t.id)),
    [canReadSettingsTab],
  );

  const [tab, setTab] = useState(visibleTabs[0]?.id || "company");
  const [company, setCompany] = useState({ ...(s.company || {}) });
  const [payment, setPayment] = useState({ ...(s.payment || {}) });
  const [email, setEmail] = useState({ ...(s.email || {}) });
  const [defaults, setDefaults] = useState({
    ...(s.defaults || {}),
    kyc: [...(s.defaults?.kyc || [])],
    terms: [...(s.defaults?.terms || [])],
  });
  const [saved, setSaved] = useState(false);
  const [newKyc, setNewKyc] = useState("");

  useEffect(() => {
    if (!visibleTabs.some((t) => t.id === tab)) {
      setTab(visibleTabs[0]?.id || "company");
    }
  }, [visibleTabs, tab]);

  useEffect(() => {
    setCompany({ ...(s.company || {}) });
    setPayment({ ...(s.payment || {}) });
    setEmail({ ...(s.email || {}) });
    setDefaults({
      ...(s.defaults || {}),
      kyc: [...(s.defaults?.kyc || [])],
      terms: [...(s.defaults?.terms || [])],
    });
  }, [s.company, s.payment, s.email, s.defaults]);

  const canSaveCurrentTab = canWriteSettingsTab(tab);

  const saveSettings = async () => {
    const payload = { id: s.id || "default" };

    if (canWriteSettingsTab("company")) {
      payload.company = pickCompanyPayloadForSave(company, isAccountOwner);
    }
    if (canWriteSettingsTab("payment")) {
      payload.payment = payment;
    }
    if (canWriteSettingsTab("email")) {
      payload.email = email;
    }
    if (canWriteSettingsTab("defaults")) {
      payload.defaults = defaults;
    }

    if (Object.keys(payload).length <= 1) return;

    await api.saveSettings(payload);
    await reload();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const removeKyc = (index) => {
    setDefaults((prev) => ({ ...prev, kyc: prev.kyc.filter((_, i) => i !== index) }));
  };

  const addKyc = () => {
    const trimmed = newKyc.trim();
    if (!trimmed) return;
    setDefaults((prev) => ({ ...prev, kyc: [...prev.kyc, trimmed] }));
    setNewKyc("");
  };

  const handleKycKey = (e) => {
    if (e.key === "Enter") { e.preventDefault(); addKyc(); }
  };

  if (!canAccessSettings()) {
    return (
      <div className="page">
        <div className="card" style={{ padding: 24 }}>
          <h1 className="page-title">Settings</h1>
          <p className="muted">You do not have access to any settings tabs. Contact your account owner if you need changes.</p>
        </div>
      </div>
    );
  }

  const companyCanEditAll = isAccountOwner;
  const companyCanEditLimited = !isAccountOwner && canWriteSettingsTab("company");

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <div className="muted">Manage company details, payment info, and email configuration</div>
        </div>
      </div>

      <div className="settings-tabs">
        {visibleTabs.map((t) => (
          <button key={t.id} className={tab === t.id ? "active" : ""} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="card form-card">
        {tab === "company" && (
          <>
            {companyCanEditLimited && (
              <div className="settings-limited-banner">
                You can update signatory details and the about section. Other company fields are view only.
              </div>
            )}
            <CompanyTab
              form={company}
              onChange={(f, v) => setCompany((p) => ({ ...p, [f]: v }))}
              canEditAll={companyCanEditAll}
              canEditLimited={companyCanEditLimited}
              readOnly={!canWriteSettingsTab("company")}
            />
          </>
        )}
        {tab === "payment" && (
          <PaymentTab
            form={payment}
            onChange={(f, v) => setPayment((p) => ({ ...p, [f]: v }))}
            readOnly={!canWriteSettingsTab("payment")}
          />
        )}
        {tab === "email" && (
          <EmailTab
            form={email}
            onChange={(f, v) => setEmail((p) => ({ ...p, [f]: v }))}
            readOnly={!canWriteSettingsTab("email")}
          />
        )}
        {tab === "defaults" && (
          <DefaultsTab
            form={defaults}
            onChange={(f, v) => setDefaults((p) => ({ ...p, [f]: v }))}
            newKyc={newKyc}
            setNewKyc={setNewKyc}
            onAddKyc={addKyc}
            onKycKey={handleKycKey}
            onRemoveKyc={removeKyc}
            readOnly={!canWriteSettingsTab("defaults")}
          />
        )}
      </div>

      {canSaveCurrentTab ? (
        <div className="settings-save-row">
          <button className="button primary" onClick={saveSettings}>Save Changes</button>
          {saved && (
            <span className="save-confirmation">
              <Check size={14} strokeWidth={2.5} /> Saved successfully
            </span>
          )}
        </div>
      ) : (
        <div className="settings-save-row">
          <span className="muted">You have read-only access to this tab.</span>
        </div>
      )}
    </div>
  );
}

function Field({ label, value = "", onChange, type = "text", placeholder, readOnly, hint, span }) {
  const locked = readOnly || !onChange;
  return (
    <label className={span ? "span-2" : ""}>
      <span className="field-label">{label}</span>
      <input
        className="input"
        type={type}
        value={value}
        placeholder={placeholder}
        readOnly={locked}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      />
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

function companyFieldReadOnly(field, { canEditAll, canEditLimited, readOnly }) {
  if (readOnly) return true;
  if (canEditAll) return false;
  if (canEditLimited) {
    return !COMPANY_LIMITED_WRITE_FIELDS.includes(field);
  }
  return true;
}

function CompanyTab({ form, onChange, canEditAll, canEditLimited, readOnly }) {
  const opts = { canEditAll, canEditLimited, readOnly };
  const ro = (field) => companyFieldReadOnly(field, opts);
  const change = (field) => (ro(field) ? undefined : (v) => onChange(field, v));

  return (
    <div className="settings-grid">
      <div className="span-2">
        <span className="field-label">Company Logo</span>
        <div className="logo-upload-area">
          <div className="logo-preview">TC</div>
          <div>
            <button className="button" type="button" disabled={ro("logo")}>Upload Logo</button>
            <div className="field-hint" style={{ marginTop: 6 }}>PNG or SVG, recommended 200×60px</div>
          </div>
        </div>
      </div>
      <Field label="Company Name" value={form.name} onChange={change("name")} readOnly={ro("name")} span />
      <Field label="Tagline" value={form.tagline} onChange={change("tagline")} readOnly={ro("tagline")} span placeholder="e.g. Empowering Travel Agents Across India" />
      <Field label="GST Number" value={form.gst} onChange={change("gst")} readOnly={ro("gst")} />
      <Field label="Website" value={form.website} onChange={change("website")} readOnly={ro("website")} />
      <label className="span-2">
        <span className="field-label">Registered Address</span>
        <textarea
          className="textarea"
          style={{ minHeight: 72, resize: "vertical" }}
          value={form.address || ""}
          readOnly={ro("address")}
          onChange={ro("address") ? undefined : (e) => onChange("address", e.target.value)}
        />
      </label>
      <Field label="Signatory Name" value={form.signatory} onChange={change("signatory")} readOnly={ro("signatory")} />
      <Field label="Designation" value={form.designation} onChange={change("designation")} readOnly={ro("designation")} />
      <Field label="Contact Phone" value={form.phone} onChange={change("phone")} readOnly={ro("phone")} placeholder="e.g. 98100 55678" />
      <Field label="Contact Email" value={form.email} onChange={change("email")} readOnly={ro("email")} placeholder="e.g. sales@yourcompany.com" />
      <label className="span-2">
        <span className="field-label">About (shown in proposals)</span>
        <textarea
          className="textarea"
          style={{ minHeight: 100, resize: "vertical" }}
          value={form.about || ""}
          readOnly={ro("about")}
          onChange={ro("about") ? undefined : (e) => onChange("about", e.target.value)}
        />
      </label>
    </div>
  );
}

function PaymentTab({ form, onChange, readOnly }) {
  const change = (field) => (readOnly ? undefined : (v) => onChange(field, v));
  return (
    <div className="settings-grid">
      <Field label="Bank Name" value={form.bank} onChange={change("bank")} readOnly={readOnly} />
      <Field label="Account Type" value={form.type} onChange={change("type")} readOnly={readOnly} />
      <Field label="Account Number" value={form.account} onChange={change("account")} readOnly={readOnly} />
      <Field label="IFSC Code" value={form.ifsc} onChange={change("ifsc")} readOnly={readOnly} />
      <Field label="Account Holder Name" value={form.holder} onChange={change("holder")} readOnly={readOnly} span />
      <Field label="UPI ID" value={form.upi} onChange={change("upi")} readOnly={readOnly} />
      <Field label="Razorpay API Key" type="password" value={form.razorpayKey} onChange={change("razorpayKey")} readOnly={readOnly} placeholder="rzp_live_…" />
    </div>
  );
}

function EmailTab({ form, onChange, readOnly }) {
  const configured = Boolean(form.smtpConfigured);
  const change = (field) => (readOnly ? undefined : (v) => onChange(field, v));

  return (
    <div>
      {configured && (
        <div className="smtp-configured-banner">
          SMTP is configured. You can send proposals directly from the proposal screen.
        </div>
      )}
      <div className="settings-grid">
        <Field label="SMTP Host" value={form.smtpHost} onChange={change("smtpHost")} readOnly={readOnly} placeholder="smtp.gmail.com" />
        <Field label="SMTP Port" value={form.smtpPort} onChange={change("smtpPort")} readOnly={readOnly} placeholder="587" />
        <label>
          <span className="field-label">Encryption</span>
          <select
            className="select input"
            value={form.smtpEncryption || "tls"}
            disabled={readOnly}
            onChange={(e) => onChange("smtpEncryption", e.target.value)}
          >
            <option value="tls">TLS (recommended)</option>
            <option value="ssl">SSL</option>
            <option value="none">None</option>
          </select>
        </label>
        <Field label="SMTP Username" value={form.smtpUser} onChange={change("smtpUser")} readOnly={readOnly} />
        <label>
          <span className="field-label">SMTP Password</span>
          <input
            className="input"
            type="password"
            readOnly={readOnly}
            placeholder={configured ? "Leave blank to keep current password" : "App password or SMTP password"}
            onChange={readOnly ? undefined : (e) => onChange("smtpPassword", e.target.value)}
          />
        </label>
        <Field label="From Name" value={form.fromName} onChange={change("fromName")} readOnly={readOnly} />
        <Field label="From Email" value={form.fromEmail} onChange={change("fromEmail")} readOnly={readOnly} />
        <label className="span-2">
          <span className="field-label">Default Subject Template</span>
          <input
            className="input"
            value={form.subjectTemplate || ""}
            readOnly={readOnly}
            onChange={readOnly ? undefined : (e) => onChange("subjectTemplate", e.target.value)}
          />
          <span className="field-hint">Use {"{{id}}"} for proposal number, {"{{agency}}"} for agency name</span>
        </label>
      </div>
      <div className="modal-note" style={{ marginTop: 16 }}>
        For Gmail, use an app password with host <strong>smtp.gmail.com</strong>, port <strong>587</strong>, and encryption <strong>TLS</strong>.
        Save settings before sending from proposals.
      </div>
    </div>
  );
}

function DefaultsTab({ form, onChange, newKyc, setNewKyc, onAddKyc, onKycKey, onRemoveKyc, readOnly }) {
  const termsText = (form.terms || []).join("\n");

  return (
    <div className="settings-grid">
      <div>
        <span className="field-label">GST Rate (%)</span>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <input className="input" style={{ width: 80 }} type="number" value={form.gstRate ?? 18} readOnly />
          <span className="field-hint">Fixed by law — not editable</span>
        </div>
      </div>
      <div>
        <span className="field-label">Proposal Validity (days)</span>
        <input
          className="input"
          style={{ width: 80 }}
          type="number"
          value={form.validityDays ?? 7}
          readOnly={readOnly}
          onChange={readOnly ? undefined : (e) => onChange("validityDays", Number(e.target.value))}
        />
      </div>
      <div>
        <span className="field-label">Proposal ID Prefix</span>
        <input
          className="input"
          style={{ width: 140 }}
          value={form.proposalPrefix ?? "TC"}
          placeholder="e.g. TC, INV, PROP"
          readOnly={readOnly}
          onChange={readOnly ? undefined : (e) => onChange("proposalPrefix", e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))}
        />
        <span className="field-hint">Alphanumeric and - only. Format: PREFIX-YEAR-NUMBER</span>
      </div>
      <div>
        <span className="field-label">Starting Sequence Number</span>
        <input
          className="input"
          style={{ width: 140 }}
          type="number"
          min="1"
          value={form.proposalStartNumber ?? 1}
          readOnly={readOnly}
          onChange={readOnly ? undefined : (e) => onChange("proposalStartNumber", Math.max(1, Number(e.target.value)))}
        />
        <span className="field-hint">New proposals start from this number (auto-skips taken ones)</span>
      </div>

      <div className="span-2">
        <span className="field-label">KYC Documents Required</span>
        <div className="kyc-list">
          {(form.kyc || []).map((doc, i) => (
            <div className="kyc-item" key={i}>
              <GripVertical size={14} style={{ color: "#9ca3af", flexShrink: 0 }} />
              <span>{doc}</span>
              {!readOnly && (
                <button className="kyc-remove" onClick={() => onRemoveKyc(i)} aria-label="Remove">
                  <X size={13} />
                </button>
              )}
            </div>
          ))}
          {!readOnly && (
            <div className="kyc-add-row">
              <input
                className="input"
                placeholder="Add a document requirement..."
                value={newKyc}
                onChange={(e) => setNewKyc(e.target.value)}
                onKeyDown={onKycKey}
              />
              <button className="button" onClick={onAddKyc}>Add</button>
            </div>
          )}
        </div>
      </div>

      <label className="span-2">
        <span className="field-label">Default Terms & Conditions</span>
        <textarea
          className="textarea"
          style={{ minHeight: 140, resize: "vertical", lineHeight: 1.7 }}
          value={termsText}
          readOnly={readOnly}
          placeholder={"Term 1\nTerm 2\nTerm 3"}
          onChange={readOnly ? undefined : (e) => onChange("terms", e.target.value.split("\n"))}
        />
        <span className="field-hint">One term per line. Numbered automatically in proposals.</span>
      </label>
    </div>
  );
}
