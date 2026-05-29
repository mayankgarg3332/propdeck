import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { api } from "../../services/api.js";
import { formatINR } from "../../lib/format.js";
import { usePermissions } from "../../hooks/usePermissions.js";

const presetColors = ["#f59e0b", "#3b82f6", "#8b5cf6", "#ef4444", "#1d9e75", "#ec4899", "#f97316", "#06b6d4"];

const blankProduct = {
  name: "",
  description: "",
  category: "",
  color: "#3b82f6",
};

export function ProductsPage({ data, reload }) {
  const perms = usePermissions();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProduct, setNewProduct] = useState(blankProduct);
  const [savedProduct, setSavedProduct] = useState(null);
  const [editingPlan, setEditingPlan] = useState(null);
  const [planForm, setPlanForm] = useState(null);
  const [error, setError] = useState("");
  const [planError, setPlanError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: "product"|"plan", product, plan? }

  const proposalsMentioningProduct = (productName) =>
    data.proposals.filter((p) => p.products?.some((s) => s.startsWith(`${productName} (`))).length;

  const proposalsMentioningPlan = (productName, planName) =>
    data.proposals.filter((p) => p.products?.includes(`${productName} (${planName})`)).length;

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === "product") {
      await api.deleteProduct(deleteTarget.product.id);
    } else {
      const { product, plan } = deleteTarget;
      const updatedPlans = product.plans.filter((pl) => pl.id !== plan.id);
      await api.saveProduct({ ...product, plans: updatedPlans });
    }
    await reload();
    setDeleteTarget(null);
  };

  const openAddModal = () => {
    setNewProduct(blankProduct);
    setSavedProduct(null);
    setError("");
    setShowAddModal(true);
  };

  const setField = (field, value) => {
    setNewProduct((current) => ({ ...current, [field]: value }));
    setError("");
  };

  const saveProduct = async () => {
    if (!newProduct.name.trim()) {
      setError("Product name is required.");
      return;
    }

    const product = {
      id: `prod_${crypto.randomUUID()}`,
      name: newProduct.name.trim(),
      description: newProduct.description.trim(),
      category: (newProduct.category || newProduct.name).trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""),
      color: newProduct.color,
      plans: [],
      createdAt: new Date().toISOString(),
    };

    await api.createProduct(product);
    await reload();
    setSavedProduct(product);
  };

  const openEditPlan = (product, plan = null) => {
    setEditingPlan({ productId: product.id, planId: plan?.id || null });
    setPlanForm({
      name: plan?.name || "",
      description: plan?.description || "",
      mrp: plan?.mrp || "",
      billing: plan?.billing || "monthly",
      features: (plan?.features || []).join("\n"),
    });
    setPlanError("");
  };

  const setPlanField = (field, value) => {
    setPlanForm((current) => ({ ...current, [field]: value }));
    setPlanError("");
  };

  const savePlan = async () => {
    if (!planForm.name.trim()) {
      setPlanError("Plan name is required.");
      return;
    }
    if (!Number(planForm.mrp) || Number(planForm.mrp) < 0) {
      setPlanError("MRP must be a positive number.");
      return;
    }

    const product = data.products.find((item) => item.id === editingPlan.productId);
    if (!product) return;

    const normalizedPlan = {
      id: editingPlan.planId || `plan_${crypto.randomUUID()}`,
      name: planForm.name.trim(),
      description: planForm.description.trim(),
      mrp: Number(planForm.mrp),
      billing: planForm.billing,
      features: planForm.features
        .split("\n")
        .map((feature) => feature.trim())
        .filter(Boolean),
    };

    const plans = editingPlan.planId
      ? product.plans.map((plan) => (plan.id === editingPlan.planId ? normalizedPlan : plan))
      : [...product.plans, normalizedPlan];

    await api.saveProduct({ ...product, plans });
    await reload();
    setEditingPlan(null);
    setPlanForm(null);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Products & Plans</h1>
          <div className="muted">Manage pricing catalog - changes apply to all new proposals</div>
        </div>
        {perms.canWrite("products") && (
          <button className="button primary" onClick={openAddModal}><Plus size={16} /> Add Product</button>
        )}
      </div>
      <div className="catalog-stack">
        {data.products.map((product) => (
          <div className="card catalog-card" key={product.id}>
            <div className="catalog-header">
              <span style={{ background: product.color }} />
              <div>
                <h2>{product.name}</h2>
                <p>{product.description}</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span className="muted">{product.plans.length} plan{product.plans.length !== 1 ? "s" : ""}</span>
                {perms.canWrite("products") && (
                  <button
                    className="button danger"
                    style={{ padding: "5px 10px", fontSize: 12 }}
                    onClick={() => setDeleteTarget({ type: "product", product })}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
            <div className="plan-grid">
              {product.plans.map((plan) => (
                <div className="plan-card" key={plan.id}>
                  <div className="plan-top">
                    <div>
                      <h3>{plan.name}</h3>
                      <p>{plan.description}</p>
                    </div>
                    <strong>{formatINR(plan.mrp)}</strong>
                  </div>
                  <ul>{plan.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
                  {perms.canWrite("products") && (
                    <div className="row-actions">
                      <button className="button" onClick={() => openEditPlan(product, plan)}>Edit</button>
                      <button className="danger-action" onClick={() => setDeleteTarget({ type: "plan", product, plan })}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {perms.canWrite("products") && (
                product.plans.length === 0 ? (
                  <button className="empty-plan-card" onClick={() => openEditPlan(product)}>
                    <Plus size={18} />
                    <span>Add pricing plans to make this product available in proposals.</span>
                  </button>
                ) : (
                  <button className="add-plan-card" onClick={() => openEditPlan(product)}>
                    <Plus size={16} />
                    <span>Add Plan</span>
                  </button>
                )
              )}
            </div>
          </div>
        ))}
      </div>

      {deleteTarget && (() => {
        const isProduct = deleteTarget.type === "product";
        const { product, plan } = deleteTarget;
        const usageCount = isProduct
          ? proposalsMentioningProduct(product.name)
          : proposalsMentioningPlan(product.name, plan.name);
        const isLastPlan = !isProduct && product.plans.length === 1;

        return (
          <div className="modal-backdrop" onClick={() => setDeleteTarget(null)}>
            <div className="modal-card confirm-card" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h2>{isProduct ? "Delete Product" : "Delete Plan"}</h2>
                  <p>{isProduct ? product.name : `${plan.name} — ${product.name}`}</p>
                </div>
                <button className="modal-close" onClick={() => setDeleteTarget(null)}>×</button>
              </div>

              {isLastPlan && (
                <div className="delete-warning-strong">
                  <strong>⚠ Last plan in this product</strong>
                  <span>Deleting this will leave <strong>{product.name}</strong> with no plans. It will be unavailable in new proposals until a plan is added back.</span>
                </div>
              )}

              <div className="confirm-copy">
                <p>
                  {isProduct
                    ? <>Permanently remove <strong>{product.name}</strong> and all <strong>{product.plans.length} plan{product.plans.length !== 1 ? "s" : ""}</strong> from your catalog?</>
                    : <>Permanently remove the <strong>{plan.name}</strong> plan from <strong>{product.name}</strong>?</>
                  }
                </p>
                <ul className="delete-impact-list">
                  {usageCount > 0 ? (
                    <li>
                      Referenced in <strong>{usageCount} existing proposal{usageCount > 1 ? "s" : ""}</strong> — those proposals <em>will not be affected</em>, they keep their saved data.
                    </li>
                  ) : (
                    <li>Not referenced in any existing proposals.</li>
                  )}
                  {isProduct && (
                    <li>All {product.plans.length} pricing plan{product.plans.length !== 1 ? "s" : ""} will also be deleted.</li>
                  )}
                </ul>
                <p style={{ marginTop: 12, color: "#6b7280", fontSize: 13 }}>This cannot be undone.</p>
              </div>

              <div className="modal-actions">
                <button className="button danger" onClick={confirmDelete}>
                  <Trash2 size={14} /> {isProduct ? `Delete Product` : `Delete Plan`}
                </button>
                <button className="button" onClick={() => setDeleteTarget(null)}>Cancel</button>
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
                <h2>Add New Product</h2>
                <p>You can add plans to it after creation.</p>
              </div>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>x</button>
            </div>

            {savedProduct ? (
              <div className="success-state">
                <div className="success-icon">✓</div>
                <h3>Product Added</h3>
                <p>{savedProduct.name} has been added to your product catalog.</p>
                <div className="modal-actions centered">
                  <button className="button primary" onClick={() => setShowAddModal(false)}>Done</button>
                </div>
              </div>
            ) : (
              <>
                <div className="product-form">
                  <ProductField label="Product Name *" value={newProduct.name} placeholder="e.g. Email Marketing" onChange={(value) => setField("name", value)} />
                  <ProductField label="Description" value={newProduct.description} placeholder="Short description shown on proposals" onChange={(value) => setField("description", value)} />
                  <ProductField label="Category Key" value={newProduct.category} placeholder="e.g. email (used internally)" onChange={(value) => setField("category", value.toLowerCase().replace(/[^a-z0-9]+/g, "_"))} />
                  <div>
                    <span className="field-label">Product Color</span>
                    <div className="color-swatches">
                      {presetColors.map((color) => (
                        <button
                          key={color}
                          className={newProduct.color === color ? "selected" : ""}
                          style={{ background: color }}
                          aria-label={`Use color ${color}`}
                          onClick={() => setField("color", color)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                {error && <div className="form-error">{error}</div>}
                <div className="modal-note">After saving, add at least one pricing plan before using this product in proposals.</div>
                <div className="modal-actions">
                  <button className="button primary" onClick={saveProduct}>Save Product</button>
                  <button className="button" onClick={() => setShowAddModal(false)}>Cancel</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {editingPlan && planForm && (
        <div className="modal-backdrop" onClick={() => setEditingPlan(null)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>{editingPlan.planId ? "Edit Plan" : "Add New Plan"}</h2>
                <p>Update pricing, billing, and feature bullets shown inside proposals.</p>
              </div>
              <button className="modal-close" onClick={() => setEditingPlan(null)}>x</button>
            </div>

            <div className="grid-2">
              <PlanField label="Plan Name *" value={planForm.name} onChange={(value) => setPlanField("name", value)} span />
              <PlanField label="Description" value={planForm.description} placeholder="e.g. 5 users" onChange={(value) => setPlanField("description", value)} span />
              <PlanField label="MRP (INR) *" type="number" value={planForm.mrp} onChange={(value) => setPlanField("mrp", value)} />
              <label>
                <span className="field-label">Billing Type</span>
                <select className="select" value={planForm.billing} onChange={(event) => setPlanField("billing", event.target.value)}>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annual">Annual</option>
                  <option value="one-time">One-time</option>
                </select>
              </label>
              <label className="span-2">
                <span className="field-label">Features (one per line)</span>
                <textarea
                  className="textarea plan-features"
                  value={planForm.features}
                  placeholder={"Feature 1\nFeature 2\nFeature 3"}
                  onChange={(event) => setPlanField("features", event.target.value)}
                />
              </label>
            </div>

            {planError && <div className="form-error">{planError}</div>}
            <div className="modal-actions">
              <button className="button primary" onClick={savePlan}>Save Plan</button>
              <button className="button" onClick={() => setEditingPlan(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProductField({ label, value, onChange, placeholder }) {
  return (
    <label>
      <span className="field-label">{label}</span>
      <input className="input" value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function PlanField({ label, value, onChange, placeholder, type = "text", span = false }) {
  return (
    <label className={span ? "span-2" : ""}>
      <span className="field-label">{label}</span>
      <input className="input" type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
