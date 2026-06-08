import { useState, useRef, useEffect } from "react";
import { Check, Mail } from "lucide-react";
import { SendProposalEmailModal } from "../../components/SendProposalEmailModal.jsx";
import { formatINR, amountInWords } from "../../lib/format.js";
import { buildLineItems, nextProposalId, summarizeProposal, normalizeSelection } from "../../lib/proposalMath.js";
import { upsertProposal } from "../../services/api.js";
import { downloadProposalPdf } from "../../lib/proposalPdf.js";
import { getProposalHeaderColor, headerSubtitleColor, buildProposalTheme } from "../../lib/proposalTheme.js";
import { buildProposalHtmlEmail, generateUpiQr, renderExtrasHtml } from "../../lib/proposalEmail.js";
import { billingLabel, getBillingTypes } from "../../lib/billingTypes.js";
import { getStatusByRole } from "../../lib/proposalStatuses.js";

const steps = ["Client Details", "Select Products", "Pricing", "Preview & Send"];

export function ProposalBuilderPage({ data, reload, navigate, initialClient }) {
  const [step, setStep] = useState(1);
  const [client, setClient] = useState(initialClient || data.clients[0] || {});
  const [selections, setSelections] = useState({
    prod_leads: { recommended: "plan_leads_starter", showcase: [] },
    prod_crm: { recommended: "plan_crm_pro", showcase: [] },
  });
  const [discounts, setDiscounts] = useState({ prod_leads: 10 });
  const [paymentLink, setPaymentLink] = useState("");
  const [extrasHeading, setExtrasHeading] = useState("");
  const [extrasText, setExtrasText] = useState("");
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [upiQrDataUrl, setUpiQrDataUrl] = useState(null);

  const upiId = data.settings?.payment?.upi || "";
  const companyName = data.settings?.company?.name || "";
  useEffect(() => {
    generateUpiQr(upiId, companyName).then(setUpiQrDataUrl);
  }, [upiId, companyName]);

  const [proposalId, setProposalId] = useState(
    () => data.nextProposalId ?? nextProposalId(data.proposals, data.settings),
  );
  const lineItems = buildLineItems({ selections, products: data.products, discounts });
  const totals = summarizeProposal(lineItems, data.settings?.defaults?.gstRate || 18);
  // Derive frequency label from the billing types of selected plans
  const frequency = [...new Set(lineItems.map((i) => i.plan.billing).filter(Boolean))].join(", ") || "monthly";
  const billingTypes = getBillingTypes(data.settings);
  const frequencyLabel = [...new Set(lineItems.map((i) => i.plan.billing).filter(Boolean))].map((v) => billingLabel(v, data.settings)).join(" + ") || billingLabel("monthly", data.settings);

  const toggleProduct = (product) => {
    setSelections((current) => {
      if (current[product.id]) {
        const next = { ...current };
        delete next[product.id];
        return next;
      }
      return { ...current, [product.id]: { recommended: product.plans[0]?.id, showcase: [] } };
    });
  };

  const setRecommendedPlan = (productId, planId) => {
    setSelections((prev) => {
      const sel = normalizeSelection(prev[productId]);
      // If the new recommended was a showcase plan, remove it from showcase
      return {
        ...prev,
        [productId]: {
          recommended: planId,
          showcase: sel.showcase.filter((id) => id !== planId),
        },
      };
    });
  };

  const addShowcasePlan = (productId, planId) => {
    setSelections((prev) => {
      const sel = normalizeSelection(prev[productId]);
      if (!planId || sel.recommended === planId || sel.showcase.includes(planId)) return prev;
      return { ...prev, [productId]: { ...sel, showcase: [...sel.showcase, planId] } };
    });
  };

  const removeShowcasePlan = (productId, planId) => {
    setSelections((prev) => {
      const sel = normalizeSelection(prev[productId]);
      return { ...prev, [productId]: { ...sel, showcase: sel.showcase.filter((id) => id !== planId) } };
    });
  };

  const buildProductLabels = () =>
    lineItems.map((item) => {
      const extra = item.showcasePlans?.length
        ? ` [+${item.showcasePlans.map((p) => p.name).join(", ")}]`
        : "";
      return `${item.product.name} (${item.plan.name}${extra})`;
    });

  const saveProposal = async (status) => {
    const saved = await upsertProposal({
      id: proposalId,
      clientId: client.id,
      products: buildProductLabels(),
      amount: totals.total,
      subtotal: totals.subtotal,
      gst: totals.gst,
      status,
      date: new Date().toISOString().split("T")[0],
      createdAt: new Date().toISOString(),
      repId: data.rep?.id || "rep_aditya",
      frequency,
      extrasHeading: extrasHeading.trim(),
      extrasText: extrasText.trim(),
      lineItemsSnapshot: lineItems.map((item) => ({
        productName: item.product.name,
        productColor: item.product.color,
        planName: item.plan.name,
        planDescription: item.plan.description,
        billing: item.plan.billing,
        features: item.plan.features || [],
        mrp: item.mrp,
        repDiscount: item.repDiscount,
        frequencyDiscount: 0,
        final: item.final,
        showcasePlans: (item.showcasePlans || []).map((p) => ({
          planName: p.name,
          planDescription: p.description,
          billing: p.billing,
          features: p.features || [],
          mrp: p.mrp,
        })),
      })),
    });
    if (saved?.id && saved.id !== proposalId) {
      setProposalId(saved.id);
    }
    await reload();
    return saved;
  };

  const handleSaveDraft = async () => {
    setSaveError("");

    if (!client?.id) {
      setSaveError("Please select a client before saving a draft.");
      return;
    }

    if (lineItems.length === 0) {
      setSaveError("Please select at least one product plan before saving a draft.");
      return;
    }

    try {
      setSavingDraft(true);
      await saveProposal(getStatusByRole(data.settings, "initial")?.value || "Draft");
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        navigate("/proposals");
      }, 1200);
    } catch (err) {
      setSaveError(err?.message || "Could not save draft. Please try again.");
    } finally {
      setSavingDraft(false);
    }
  };

  const handleExportPdf = () => {
    downloadProposalPdf({
      proposal: {
        id: proposalId,
        products: buildProductLabels(),
        amount: totals.total,
        status: getStatusByRole(data.settings, "initial")?.value || "Draft",
        date: new Date().toISOString().split("T")[0],
        extrasHeading: extrasHeading.trim(),
        extrasText: extrasText.trim(),
      },
      client,
      settings: data.settings,
      rep: data.rep,
      lineItems,
      totals,
      frequency,
      upiQrDataUrl,
    });
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">New Proposal</h1>
          <div className="muted">Proposal {proposalId}</div>
        </div>
      </div>
      <div className="card stepper">
        {steps.map((label, index) => {
          const number = index + 1;
          const done = step > number;
          return (
            <div className={`step ${step === number ? "active" : ""} ${done ? "done" : ""}`} key={label}>
              <span>{done ? <Check size={16} /> : number}</span>
              <strong>{label}</strong>
            </div>
          );
        })}
      </div>

      {step === 1 && (
        <div className="card form-card">
          <div className="builder-grid">
            <ClientSearch
              clients={data.clients}
              selected={client}
              onSelect={(c) => setClient(c)}
            />
            <Field label="Travel Agency Name" value={client.agency} onChange={(value) => setClient({ ...client, agency: value })} />
            <Field label="Contact Person" value={client.contact} onChange={(value) => setClient({ ...client, contact: value })} />
            <Field label="Email Address" value={client.email} onChange={(value) => setClient({ ...client, email: value })} />
            <Field label="Phone Number" value={client.phone} onChange={(value) => setClient({ ...client, phone: value })} />
            <Field label="City" value={client.city} onChange={(value) => setClient({ ...client, city: value })} />
            <Field label="State" value={client.state} onChange={(value) => setClient({ ...client, state: value })} />
            <Field label="GST Number" value={client.gst} onChange={(value) => setClient({ ...client, gst: value })} />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="product-select-grid">
          {data.products.map((product) => {
            const selected = Boolean(selections[product.id]);
            const sel = selected ? normalizeSelection(selections[product.id]) : null;
            const usedPlanIds = sel ? [sel.recommended, ...sel.showcase] : [];
            const availablePlans = product.plans.filter((p) => !usedPlanIds.includes(p.id));

            return (
              <div
                className={`card product-select ${selected ? "selected" : ""}`}
                key={product.id}
                onClick={!selected ? () => toggleProduct(product) : undefined}
              >
                <div
                  className="product-check"
                  onClick={selected ? (e) => { e.stopPropagation(); toggleProduct(product); } : undefined}
                >
                  {selected && <Check size={14} />}
                </div>
                <div style={{ width: "100%" }}>
                  <h3>{product.name}</h3>
                  <p>{product.description}</p>
                  {selected ? (
                    <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 10 }}>
                      {/* Recommended plan selector */}
                      <div style={{ marginBottom: 8 }}>
                        <span className="field-label" style={{ display: "block", marginBottom: 4 }}>
                          Recommended plan <span style={{ color: "#6b7280", fontWeight: 400 }}>(used for pricing)</span>
                        </span>
                        <select
                          className="select"
                          value={sel.recommended}
                          onChange={(e) => setRecommendedPlan(product.id, e.target.value)}
                        >
                          {product.plans.map((plan) => (
                            <option key={plan.id} value={plan.id}>
                              {plan.name} — {plan.description} — {formatINR(plan.mrp)}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Showcase plan tags */}
                      {sel.showcase.length > 0 && (
                        <div style={{ marginBottom: 8 }}>
                          <span className="field-label" style={{ display: "block", marginBottom: 6 }}>
                            Also shown in proposal
                          </span>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {sel.showcase.map((planId) => {
                              const plan = product.plans.find((p) => p.id === planId);
                              if (!plan) return null;
                              return (
                                <span key={planId} className="showcase-tag">
                                  {plan.name} · {formatINR(plan.mrp)}
                                  <button
                                    className="showcase-tag-remove"
                                    onClick={() => removeShowcasePlan(product.id, planId)}
                                    title="Remove"
                                  >×</button>
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Add another plan to showcase */}
                      {availablePlans.length > 0 && (
                        <select
                          className="select"
                          value=""
                          onChange={(e) => { if (e.target.value) addShowcasePlan(product.id, e.target.value); }}
                          style={{ fontSize: 12, color: "#6b7280" }}
                        >
                          <option value="">+ Add plan to showcase...</option>
                          {availablePlans.map((plan) => (
                            <option key={plan.id} value={plan.id}>
                              {plan.name} — {formatINR(plan.mrp)}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  ) : (
                    <div className="plan-tags">
                      {product.plans.map((plan) => <span key={plan.id}>{plan.name}</span>)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {step === 3 && (
        <>
          <div className="pricing-layout">
            <div>
              {lineItems.map((item) => (
                <div className="card price-item" key={item.product.id}>
                  <div>
                    <h3>{item.product.name}</h3>
                    <span>{item.plan.name} - {item.plan.description}</span>
                  </div>
                  <strong>{formatINR(item.final)}</strong>
                  <label>
                    <span className="field-label">Rep Discount %</span>
                    <input className="input" type="number" max="30" value={discounts[item.product.id] || ""} onChange={(event) => setDiscounts({ ...discounts, [item.product.id]: Math.min(30, Number(event.target.value)) })} />
                  </label>
                </div>
              ))}
            </div>
            <div className="card price-summary">
              <h2>Price Summary</h2>
              {lineItems.map((item) => (
                <div className="summary-row" key={item.product.id}>
                  <span>
                    {item.product.name} ({item.plan.name})
                    {item.plan.billing && <em className="billing-tag">{billingLabel(item.plan.billing, data.settings)}</em>}
                  </span>
                  <strong>{formatINR(item.final)}</strong>
                </div>
              ))}
              <div className="summary-row"><span>Subtotal</span><strong>{formatINR(totals.subtotal)}</strong></div>
              <div className="summary-row"><span>GST ({data.settings?.defaults?.gstRate || 18}%)</span><strong>{formatINR(totals.gst)}</strong></div>
              <div className="total-row"><span>Total Payable</span><strong>{formatINR(totals.total)}</strong></div>
              {frequency && (
                <div className="billing-note">Billing: {frequencyLabel}</div>
              )}
              <label>
                <span className="field-label">Payment Link (optional)</span>
                <input className="input" value={paymentLink} onChange={(event) => setPaymentLink(event.target.value)} placeholder="Paste Razorpay link..." />
              </label>
            </div>
          </div>

          <div className="card extras-card">
            <h3 className="extras-title">
              Complimentary / Extras <span className="extras-optional">(optional)</span>
            </h3>
            <p className="extras-hint">
              Add any complimentary services, bonuses, or special offers. If left blank, this section won't appear in the proposal.
            </p>
            <label>
              <span className="field-label">Section Heading</span>
              <input
                className="input"
                value={extrasHeading}
                onChange={(e) => setExtrasHeading(e.target.value)}
                placeholder={`e.g. "Special Offer", "What's Included", "Bonus for You"`}
              />
            </label>
            <label style={{ marginTop: 12, display: "block" }}>
              <span className="field-label">Content</span>
              <textarea
                className="textarea"
                style={{ minHeight: 120, resize: "vertical", marginTop: 6 }}
                value={extrasText}
                onChange={(e) => setExtrasText(e.target.value)}
                placeholder={"Write a paragraph or use bullet points:\\n- Free onboarding session\\n- 1 month priority support\\n- Dedicated account manager"}
              />
              <span className="field-hint">Lines starting with - or • are rendered as bullets in the proposal.</span>
            </label>
          </div>
        </>
      )}

      {step === 4 && (
        <div>
          <div className="send-actions">
            <button className="button primary" onClick={() => setSendModalOpen(true)}>
              <Mail size={16} /> Send Email
            </button>
            <button className="button" onClick={handleExportPdf}>Export PDF</button>
            <button className="button" onClick={handleSaveDraft} disabled={savingDraft}>
              {saved ? <><Check size={14} /> Saved!</> : savingDraft ? "Saving..." : "Save as Draft"}
            </button>
          </div>
          {saveError && <div className="form-error" style={{ marginBottom: 16 }}>{saveError}</div>}
          <ProposalPreview client={client} data={data} lineItems={lineItems} totals={totals} proposalId={proposalId} paymentLink={paymentLink} frequency={frequency} extrasHeading={extrasHeading.trim()} extrasText={extrasText.trim()} upiQrDataUrl={upiQrDataUrl} />
        </div>
      )}

      <div className="builder-actions">
        <button className="button" disabled={step === 1} onClick={() => setStep(Math.max(1, step - 1))}>Back</button>
        {step < 4 && <button className="button primary" onClick={() => setStep(Math.min(4, step + 1))}>Continue</button>}
      </div>

      {sendModalOpen && (
        <SendProposalEmailModal
          title="Send proposal"
          subtitle={`${proposalId} · ${client.agency || ""}`}
          settings={data.settings}
          toEmail={client.email || ""}
          subject={(data.settings?.email?.subjectTemplate || "Proposal {{id}} for {{agency}}")
            .replace("{{id}}", proposalId)
            .replace("{{agency}}", client.agency || "")}
          htmlBody={buildProposalHtmlEmail({ client, proposalId, lineItems, totals, paymentLink, frequency, extrasHeading: extrasHeading.trim(), extrasText: extrasText.trim(), settings: data.settings, rep: data.rep })}
          proposalId={proposalId}
          onBeforeSend={async () => {
            const saved = await saveProposal(getStatusByRole(data.settings, "initial")?.value || "Draft");
            return { proposalId: saved?.id || proposalId };
          }}
          onSent={async (method) => {
            if (method === "gmail") {
              await saveProposal(getStatusByRole(data.settings, "sent")?.value || "Sent");
            }
            setSendModalOpen(false);
            await reload();
            navigate("/proposals");
          }}
          onClose={() => setSendModalOpen(false)}
        />
      )}
    </div>
  );
}

function ClientSearch({ clients, selected, onSelect }) {
  const [query, setQuery] = useState(selected?.agency || "");
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(-1);
  const containerRef = useRef(null);
  const listRef = useRef(null);

  // Keep query in sync when selected client changes externally
  useEffect(() => {
    setQuery(selected?.agency || "");
  }, [selected?.id]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = clients.filter((c) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      c.agency?.toLowerCase().includes(q) ||
      c.contact?.toLowerCase().includes(q) ||
      c.city?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    );
  });

  const pick = (client) => {
    onSelect(client);
    setQuery(client.agency);
    setOpen(false);
    setFocused(-1);
  };

  const handleKey = (e) => {
    if (!open) {
      if (e.key === "ArrowDown") { setOpen(true); setFocused(0); e.preventDefault(); }
      return;
    }
    if (e.key === "ArrowDown") {
      setFocused((f) => Math.min(f + 1, filtered.length - 1));
      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      setFocused((f) => Math.max(f - 1, 0));
      e.preventDefault();
    } else if (e.key === "Enter" && focused >= 0 && filtered[focused]) {
      pick(filtered[focused]);
      e.preventDefault();
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="client-search-wrap" style={{ gridColumn: "1 / -1" }}>
      <span className="field-label">Search existing client</span>
      <input
        className="input"
        value={query}
        placeholder="Type agency name, contact, or city…"
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setFocused(-1); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKey}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div className="client-suggestions" ref={listRef}>
          {filtered.map((c, i) => (
            <div
              key={c.id}
              className={`client-suggestion-item${i === focused ? " focused" : ""}`}
              onMouseDown={() => pick(c)}
              onMouseEnter={() => setFocused(i)}
            >
              <div className="cs-main">{c.agency}</div>
              <div className="cs-sub">
                {[c.contact, c.city, c.email].filter(Boolean).join(" · ")}
              </div>
            </div>
          ))}
        </div>
      )}
      {open && query.trim() && filtered.length === 0 && (
        <div className="client-suggestions">
          <div className="cs-empty">No clients match "{query}"</div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value = "", onChange }) {
  return (
    <label>
      <span className="field-label">{label}</span>
      <input className="input" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}


function renderExtrasJsx(extrasText) {
  if (!extrasText) return null;
  const lines = extrasText.split("\n").filter((l) => l.trim());
  const isBullet = (l) => /^[-•*]/.test(l.trim());
  return lines.map((line, i) => {
    if (isBullet(line)) {
      return (
        <div key={i} style={{ fontSize: 13, color: "#374151", padding: "2px 0" }}>
          • {line.trim().replace(/^[-•*]\s*/, "")}
        </div>
      );
    }
    return (
      <p key={i} style={{ margin: "4px 0", fontSize: 13, color: "#374151", lineHeight: 1.6 }}>
        {line}
      </p>
    );
  });
}

function ProposalPreview({ client, data, lineItems, totals, proposalId, paymentLink, frequency, extrasHeading, extrasText, upiQrDataUrl }) {
  const company = data.settings?.company || {};
  const headerColor = getProposalHeaderColor(company);
  const headerSub = headerSubtitleColor();
  const { primary: ac, primaryDark: acd, primaryBg: acbg, primaryBadgeBg: acbadge } = buildProposalTheme(headerColor);
  const payment = data.settings?.payment || {};
  const kyc = data.settings?.defaults?.kyc || [];
  const terms = data.settings?.defaults?.terms || [];
  const gstRate = data.settings?.defaults?.gstRate || 18;
  const validityDays = data.settings?.defaults?.validityDays || 7;
  const freqLabel = frequency || "monthly";
  const rep = data.rep || {};

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const validTill = new Date(now);
  validTill.setDate(validTill.getDate() + validityDays);
  const validTillStr = validTill.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const signatory = company.signatory || rep.name || "Sales Team";
  const phone = company.phone || rep.phone || "";
  const repEmail = company.email || rep.email || "";

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.10)", fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ background: headerColor, padding: "24px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ color: "#fff", fontSize: 20, fontWeight: 800 }}>{company.name || "Propdeck"}</div>
            <div style={{ color: headerSub, fontSize: 11, marginTop: 3 }}>{company.tagline || ""}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>{proposalId}</div>
            <div style={{ color: headerSub, fontSize: 11, marginTop: 3 }}>Prepared for {client.agency}</div>
          </div>
        </div>
      </div>

      {/* Meta strip */}
      <div style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", padding: "12px 32px", display: "flex", gap: 0 }}>
        {[["PREPARED BY", signatory], ["PREPARED FOR", client.agency], ["DATE", dateStr], ["VALID TILL", validTillStr]].map(([label, value]) => (
          <div key={label} style={{ flex: 1 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#111827", marginTop: 2 }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: "24px 32px" }}>
        {company.about && <p style={{ margin: "0 0 20px", color: "#6b7280", fontSize: 13, lineHeight: 1.7 }}>{company.about}</p>}

        {/* Products */}
        <div style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 12 }}>Products Offered</div>
        {lineItems.map((item) => {
          const disc = item.repDiscount + (item.frequencyDiscount || 0);
          const showcase = item.showcasePlans || [];
          const hasComparison = showcase.length > 0;

          if (!hasComparison) {
            // Single plan card — existing layout
            return (
              <div key={item.product.id} style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden", marginBottom: 10 }}>
                <div style={{ borderLeft: `4px solid ${item.product.color || ac}`, padding: "12px 16px", background: "#fafafa", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{item.product.name}</span>
                    <span style={{ display: "inline-block", background: acbadge, color: acd, fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, marginLeft: 8 }}>{item.plan.name}</span>
                    <div style={{ color: "#6b7280", fontSize: 11, marginTop: 3 }}>{item.plan.description}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 16 }}>
                    {disc > 0 && <div style={{ textDecoration: "line-through", color: "#9ca3af", fontSize: 11 }}>{formatINR(item.mrp)}</div>}
                    <div style={{ fontSize: 15, fontWeight: 800, color: ac }}>{formatINR(item.final)}</div>
                    {item.plan.billing && <div style={{ fontSize: 10, color: "#9ca3af" }}>{billingLabel(item.plan.billing, data.settings)}</div>}
                  </div>
                </div>
                <div style={{ padding: "8px 16px 10px", background: "#fff" }}>
                  {(item.plan.features || []).map((f) => (
                    <div key={f} style={{ fontSize: 12, color: "#374151", padding: "2px 0" }}>
                      <span style={{ color: ac, fontWeight: 700, marginRight: 5 }}>✓</span>{f}
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          // Comparison card — recommended + showcase plans in columns
          const allPlans = [
            { plan: item.plan, isRec: true, price: item.final, mrp: item.mrp, disc },
            ...showcase.map((p) => ({ plan: p, isRec: false, price: p.mrp, mrp: p.mrp, disc: 0 })),
          ];
          return (
            <div key={item.product.id} style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden", marginBottom: 10 }}>
              <div style={{ borderLeft: `4px solid ${item.product.color || ac}`, padding: "12px 16px", background: "#fafafa" }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{item.product.name}</span>
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>Choose the plan that works for you</div>
              </div>
              <div style={{ padding: "12px 14px", background: "#fff", display: "grid", gridTemplateColumns: `repeat(${Math.min(allPlans.length, 3)}, 1fr)`, gap: 10 }}>
                {allPlans.map(({ plan, isRec, price, mrp: planMrp, disc: d }) => (
                  <div
                    key={plan.name}
                    style={{
                      border: isRec ? `2px solid ${ac}` : "1px solid #e5e7eb",
                      borderRadius: 8,
                      padding: "12px 10px",
                      background: isRec ? acbg : "#fff",
                    }}
                  >
                    {isRec && (
                      <div style={{ display: "inline-block", background: ac, color: "#fff", fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 999, marginBottom: 6 }}>
                        ⭐ Recommended
                      </div>
                    )}
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 2 }}>{plan.name}</div>
                    <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 8 }}>{plan.description}</div>
                    {isRec && d > 0 && <div style={{ textDecoration: "line-through", color: "#9ca3af", fontSize: 11 }}>{formatINR(planMrp)}</div>}
                    <div style={{ fontSize: 15, fontWeight: 800, color: isRec ? ac : "#374151", marginBottom: 2 }}>{formatINR(price)}</div>
                    {plan.billing && <div style={{ fontSize: 10, color: "#9ca3af", marginBottom: 8 }}>{billingLabel(plan.billing, data.settings)}</div>}
                    {(plan.features || []).map((f) => (
                      <div key={f} style={{ fontSize: 11, color: isRec ? "#374151" : "#6b7280", padding: "2px 0" }}>
                        <span style={{ color: isRec ? ac : "#9ca3af", fontWeight: 700, marginRight: 4 }}>✓</span>{f}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Pricing table */}
        {(() => {
          const hasDiscount = lineItems.some((item) => (item.repDiscount + (item.frequencyDiscount || 0)) > 0);
          const headers = hasDiscount ? ["Product", "Plan", "MRP", "Disc.%", "Your Price"] : ["Product", "Plan", "Amount"];
          return (
            <>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#111827", margin: "20px 0 10px" }}>Pricing Breakdown</div>
              <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden", marginBottom: 8 }}>
                <thead>
                  <tr style={{ background: "#f3f4f6" }}>
                    {headers.map((h) => (
                      <th key={h} style={{ padding: "9px 10px", textAlign: h === "Your Price" || h === "Amount" ? "right" : h === "Disc.%" ? "center" : "left", fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item) => {
                    const disc = item.repDiscount + (item.frequencyDiscount || 0);
                    return (
                      <tr key={item.product.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "9px 10px", fontSize: 12, color: "#374151" }}>{item.product.name}</td>
                        <td style={{ padding: "9px 10px", fontSize: 12, color: "#6b7280" }}>{item.plan.name}</td>
                        {hasDiscount && (
                          <td style={{ padding: "9px 10px", fontSize: 12 }}>
                            {disc > 0 ? <s style={{ color: "#9ca3af" }}>{formatINR(item.mrp)}</s> : formatINR(item.mrp)}
                          </td>
                        )}
                        {hasDiscount && (
                          <td style={{ padding: "9px 10px", fontSize: 12, textAlign: "center" }}>{disc > 0 ? `${disc}%` : "—"}</td>
                        )}
                        <td style={{ padding: "9px 10px", fontSize: 12, fontWeight: 700, color: ac, textAlign: "right" }}>{formatINR(item.final)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          );
        })()}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 24, padding: "6px 10px", marginBottom: 6, fontSize: 13, color: "#6b7280" }}>
          <span>Subtotal: <strong style={{ color: "#374151" }}>{formatINR(totals.subtotal)}</strong></span>
          <span>GST ({gstRate}%): <strong style={{ color: "#374151" }}>{formatINR(totals.gst)}</strong></span>
        </div>
        <div style={{ background: ac, borderRadius: 8, padding: "13px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>TOTAL PAYABLE</span>
          <span style={{ color: "#fff", fontWeight: 800, fontSize: 20 }}>{formatINR(totals.total)}</span>
        </div>
        <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 20 }}>Prices in INR. GST @ {gstRate}% applicable. Frequency: {freqLabel}.</div>

        {/* Extras */}
        {extrasText && (
          <div style={{ border: `1.5px solid ${ac}`, borderRadius: 8, overflow: "hidden", background: acbg, marginBottom: 20 }}>
            <div style={{ borderLeft: `4px solid ${ac}`, padding: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: acd, marginBottom: 8 }}>
                {extrasHeading || "Complimentary / Extras"}
              </div>
              {renderExtrasJsx(extrasText)}
            </div>
          </div>
        )}

        {/* Bank Transfer */}
        <div style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 10 }}>Bank Transfer Details</div>
        <div style={{ border: `1.5px solid ${ac}`, borderRadius: 8, overflow: "hidden", background: acbg, marginBottom: 20 }}>
          <div style={{ borderLeft: `4px solid ${ac}`, padding: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px" }}>
              {[["Bank", payment.bank], ["Account Holder", payment.holder || payment.bank], ["Account No", payment.account], ["Account Type", payment.type], ["IFSC", payment.ifsc]].map(([label, value]) => (
                <div key={label}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{value || "—"}</div>
                </div>
              ))}
            </div>
            {(upiQrDataUrl || payment.upi) && (
              <div style={{ borderTop: `1px solid ${ac}22`, marginTop: 12, paddingTop: 12, display: "flex", alignItems: "center", gap: 14 }}>
                {upiQrDataUrl && (
                  <img src={upiQrDataUrl} width={90} height={90} style={{ display: "block", borderRadius: 6, border: "1px solid #e5e7eb", flexShrink: 0 }} alt="UPI QR" />
                )}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: acd, marginBottom: 4 }}>PAY VIA UPI</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#111827", wordBreak: "break-all", marginBottom: 6 }}>{payment.upi}</div>
                  <div style={{ fontSize: 10, color: "#6b7280" }}>Scan with GPay · PhonePe · Paytm · any UPI app</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* KYC */}
        {kyc.length > 0 && (
          <>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 10 }}>KYC Documents Required</div>
            <div style={{ border: "1.5px solid #f59e0b", borderRadius: 8, overflow: "hidden", background: "#fffbeb", marginBottom: 20 }}>
              <div style={{ borderLeft: "4px solid #f59e0b", padding: 14 }}>
                {kyc.map((doc, i) => (
                  <div key={i} style={{ fontSize: 13, color: "#92400e", padding: "2px 0" }}>{i + 1}. {doc}</div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Terms */}
        {terms.length > 0 && (
          <>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 8 }}>Terms & Conditions</div>
            <div style={{ marginBottom: 20 }}>
              {terms.map((term, i) => (
                <div key={i} style={{ fontSize: 12, color: "#6b7280", padding: "2px 0" }}>{i + 1}. {term}</div>
              ))}
            </div>
          </>
        )}

        {/* Signature */}
        <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 16 }}>
          <div style={{ fontWeight: 700, color: "#111827", fontSize: 14 }}>{signatory}</div>
          <div style={{ color: "#6b7280", fontSize: 12, marginTop: 2 }}>{company.designation || rep.role || "Sales Rep"} · {company.name || "Propdeck"}</div>
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>{[phone, repEmail].filter(Boolean).join(" · ")}</div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: "#f9fafb", borderTop: "1px solid #e5e7eb", padding: "14px 32px", textAlign: "center" }}>
        <div style={{ color: acd, fontWeight: 700, fontSize: 13, marginBottom: 3 }}>{company.name || "Propdeck"}</div>
        <div style={{ color: "#9ca3af", fontSize: 10 }}>© {new Date().getFullYear()} {company.name || "Propdeck"}. All rights reserved.</div>
      </div>
    </div>
  );
}
