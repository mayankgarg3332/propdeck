import { useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Mail, Send, X } from "lucide-react";
import { api } from "../services/api.js";
import { isSmtpConfigured } from "../lib/emailConfig.js";
import { CcTagInput } from "../pages/settings/SettingsPage.jsx";

export function SendProposalEmailModal({
  title = "Send proposal",
  subtitle = "",
  settings,
  toEmail: initialTo = "",
  subject: initialSubject = "",
  htmlBody,
  proposalId = null,
  onBeforeSend = null,
  onSent,
  onClose,
}) {
  const smtpReady = isSmtpConfigured(settings?.email);
  const fromLabel = settings?.email?.fromEmail || settings?.email?.smtpUser || "";

  // defaultCc from admin settings — these are locked and cannot be removed by sub-users
  const defaultCc = Array.isArray(settings?.email?.defaultCc) ? settings.email.defaultCc : [];

  const [toEmail, setToEmail] = useState(initialTo);
  // All CC emails = locked (defaultCc) + user-added extras
  const [ccEmails, setCcEmails] = useState(defaultCc);

  // When user modifies CC, ensure locked emails are always preserved
  const handleCcChange = (next) => {
    const extras = next.filter((e) => !defaultCc.includes(e));
    setCcEmails([...defaultCc, ...extras]);
  };
  const [subject, setSubject] = useState(initialSubject);
  const [status, setStatus] = useState("idle"); // idle | sending | gmail | sent | error
  const [error, setError] = useState("");

  const isMac = typeof navigator !== "undefined" && navigator.platform.toUpperCase().includes("MAC");
  const pasteShortcut = isMac ? "⌘V" : "Ctrl+V";
  const busy = status === "sending" || status === "gmail";

  // CC filtered to exclude the To address (edge case guard)
  const validCc = ccEmails.filter((e) => e !== toEmail.trim());

  const resolveProposalId = async () => {
    if (!onBeforeSend) return proposalId;
    const result = await onBeforeSend();
    return result?.proposalId ?? result?.id ?? proposalId;
  };

  const sendViaSmtp = async () => {
    setError("");
    setStatus("sending");
    try {
      const idForSend = await resolveProposalId();
      await api.sendProposalEmail({
        to: toEmail.trim(),
        cc: validCc,
        subject: subject.trim(),
        htmlBody,
        proposalId: idForSend,
      });
      setStatus("sent");
      onSent?.("smtp");
    } catch (err) {
      setStatus("error");
      setError(err.message || "Failed to send email.");
    }
  };

  const openInGmail = async () => {
    setError("");
    setStatus("gmail");
    let idForGmail = proposalId;
    try {
      idForGmail = await resolveProposalId();
      await navigator.clipboard.write([
        new ClipboardItem({ "text/html": new Blob([htmlBody], { type: "text/html" }) }),
      ]);
    } catch (err) {
      if (err?.message && !String(err.message).includes("clipboard")) {
        setStatus("error");
        setError(err.message);
        return;
      }
      setError("Clipboard access was denied. Allow clipboard permission and try again.");
      setStatus("error");
      return;
    }

    const gmailUrl =
      `https://mail.google.com/mail/?view=cm&fs=1` +
      `&to=${encodeURIComponent(toEmail)}` +
      `&su=${encodeURIComponent(subject)}`;
    window.open(gmailUrl, "_blank");
    setStatus("idle");
    if (idForGmail) {
      api
        .notifyGmailOpen({ proposalId: idForGmail, to: toEmail.trim(), ccCount: validCc.length })
        .catch(() => {});
    }
    onSent?.("gmail");
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card send-email-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="send-email-fields">
          <label>
            <span className="field-label">To</span>
            <input
              className="input"
              type="email"
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              placeholder="client@agency.com"
              disabled={busy}
            />
          </label>

          <div>
            <span className="field-label">CC <span style={{ fontWeight: 400, color: "#9ca3af" }}>(optional)</span></span>
            <div style={{ marginTop: 4 }}>
              <CcTagInput
                emails={ccEmails}
                onChange={busy ? null : handleCcChange}
                readOnly={busy}
                lockedEmails={defaultCc}
                placeholder="Add email and press Enter..."
              />
            </div>
            {validCc.length > 0 && (
              <div className="field-hint" style={{ marginTop: 4 }}>
                {validCc.length} CC address{validCc.length > 1 ? "es" : ""} · applied via SMTP only
              </div>
            )}
            {ccEmails.some((e) => e === toEmail.trim()) && (
              <div className="field-hint" style={{ marginTop: 4, color: "#f59e0b" }}>
                ⚠ One address matches To — it will be skipped from CC.
              </div>
            )}
          </div>

          <label>
            <span className="field-label">Subject</span>
            <input
              className="input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={busy}
            />
          </label>

          {smtpReady && fromLabel && (
            <div className="smtp-from-banner">
              SMTP sends from <strong>{settings.email.fromName ? `${settings.email.fromName} ` : ""}</strong>
              &lt;{fromLabel}&gt;
            </div>
          )}
        </div>

        {smtpReady && (
          <div className="smtp-send-note">
            <strong>Send email</strong> delivers the proposal from your SMTP settings.
            <strong> Open Gmail &amp; Paste</strong> opens Gmail with the proposal copied — paste with {pasteShortcut} in the compose window.
            {validCc.length > 0 && (
              <span> CC addresses are applied when using <strong>Send email</strong>. Add them manually in Gmail if using that path.</span>
            )}
          </div>
        )}

        <div className="gmail-how-it-works">
          {!smtpReady && (
            <p className="smtp-setup-hint">
              Configure SMTP under <Link to="/settings" onClick={onClose}>Settings → Email Config</Link> to send directly from the app, or use Gmail:
            </p>
          )}
          <div className="gmail-step"><span>1</span> Click <strong>Open Gmail &amp; Paste</strong> — Gmail compose opens in a new tab</div>
          <div className="gmail-step"><span>2</span> The formatted proposal is copied to your clipboard automatically</div>
          <div className="gmail-step"><span>3</span> Click inside the Gmail body and press <kbd>{pasteShortcut}</kbd> to paste</div>
        </div>

        {error && <div className="form-error">{error}</div>}

        {status === "sent" && (
          <div className="smtp-success-banner">Email sent successfully via SMTP.</div>
        )}

        <div className="modal-actions send-email-modal-actions">
          {smtpReady && (
            <button
              type="button"
              className="button primary"
              onClick={sendViaSmtp}
              disabled={!toEmail.trim() || !subject.trim() || busy}
            >
              {status === "sending" ? (
                "Sending..."
              ) : (
                <>
                  <Send size={14} /> Send email
                </>
              )}
            </button>
          )}
          <button
            type="button"
            className={smtpReady ? "button" : "button primary"}
            onClick={openInGmail}
            disabled={!toEmail.trim() || busy}
          >
            {status === "gmail" ? (
              "Opening Gmail..."
            ) : (
              <>
                <ExternalLink size={14} /> Open Gmail &amp; Paste
              </>
            )}
          </button>
          {!smtpReady && (
            <Link to="/settings" className="button" onClick={onClose}>
              Configure SMTP
            </Link>
          )}
          <button type="button" className="button" onClick={onClose} disabled={busy}>
            {status === "sent" ? "Close" : "Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}
