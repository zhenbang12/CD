import { db } from '../db/storage.js';

export class Module1Baselines {
  constructor(container) {
    this.container = container;
    this.init();
  }

  init() {
    this.render();
    db.subscribe('baselines', () => this.render());
  }

  render() {
    let baselines = [];
    try {
      baselines = db.getBaselines();
    } catch (error) {
      this.container.innerHTML = `<div class="card"><p class="text-danger">Error loading baselines.</p></div>`;
      return;
    }

    const sidebarTpl = `
      <aside style="width: 240px; flex-shrink: 0; position: sticky; top: 120px; display: flex; flex-direction: column; gap: 8px;">
        <div class="card" style="padding: 16px; display: flex; flex-direction: column; gap: 8px;">
          <h4 style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); margin-bottom: 8px; padding-left: 4px; letter-spacing: 0.05em;">Executive Analytics</h4>
          
          <button class="btn btn-sm btn-outline btn-block sidebar-nav-btn" data-target="m1-dashboard" style="justify-content: flex-start; padding-left: 12px;">
            <span style="margin-right: 6px;">📊</span> Sustainability Dashboard
          </button>
          
          <button class="btn btn-sm btn-outline btn-block sidebar-nav-btn" data-target="m1-department" style="justify-content: flex-start; padding-left: 12px;">
            <span style="margin-right: 6px;">🏢</span> Department Dashboard
          </button>
          
          <button class="btn btn-sm btn-primary btn-block sidebar-nav-btn" data-target="m1-baselines" style="justify-content: flex-start; padding-left: 12px;">
            <span style="margin-right: 6px;">🎯</span> Operational Baselines
          </button>
          
          <button class="btn btn-sm btn-outline btn-block sidebar-nav-btn" data-target="m1-audit" style="justify-content: flex-start; padding-left: 12px;">
            <span style="margin-right: 6px;">🛡️</span> System Audit Log
          </button>
        </div>
      </aside>
    `;

    this.container.innerHTML = `
      <div class="module-view m1-container fade-in">
        <div class="view-header">
          <div>
            <h1 class="view-title">Executive Sustainability Analytics</h1>
            <p class="view-subtitle">Calibrated targets and consumption standards.</p>
          </div>
          <div class="header-actions" style="display: flex; gap: 8px;">
            <button class="btn btn-sm btn-outline" id="btn-open-add-baseline-modal">
              + Add Baseline
            </button>
            <button class="btn btn-sm btn-primary" id="btn-open-baseline-modal">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px;"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              Update Baselines
            </button>
          </div>
        </div>

        <div style="display: flex; gap: 24px; align-items: flex-start; margin-top: 10px;">
          ${sidebarTpl}

          <!-- Main Content Area -->
          <div style="flex-grow: 1; display: flex; flex-direction: column; gap: 16px; min-width: 0;">
            <div class="card">
              <div class="card-header">
                <div>
                  <h3 class="card-title">Operational Resource Baselines</h3>
                  <p class="card-subtitle">Current standards across modules</p>
                </div>
                <span class="badge badge-secondary">Standard Configuration</span>
              </div>
              <div class="table-responsive">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Baseline Key</th>
                      <th>Standard Name</th>
                      <th>Value</th>
                      <th>Category</th>
                      <th>Last Calibrated</th>
                      <th style="width: 80px;">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${baselines.map(b => `
                      <tr>
                        <td><code>${b.key}</code></td>
                        <td><strong>${b.name}</strong></td>
                        <td><span class="font-bold text-primary">${b.value}</span> <small class="text-muted">${b.unit}</small></td>
                        <td><span class="badge badge-secondary">${b.category}</span></td>
                        <td><small class="text-muted">${b.updatedAt}</small></td>
                        <td>
                          <button class="btn btn-sm btn-outline btn-delete-baseline" data-id="${b.id}" style="color: var(--danger); border-color: var(--danger); padding: 2px 8px; font-size: 11px;">Delete</button>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <!-- Baseline Delete Modal -->
        <div class="modal-backdrop" id="baseline-delete-modal" style="display: none; align-items: center; justify-content: center; z-index: 9999; background: rgba(0,0,0,0.6);">
          <div class="modal-card" style="max-width: 400px; padding: 24px; text-align: center;">
            <div style="font-size: 40px; color: var(--danger); margin-bottom: 16px;">&#9888;</div>
            <h3 style="margin: 0 0 12px 0; font-size: 18px; color: var(--text-main);">Confirm Deletion</h3>
            <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 24px;">Are you sure you want to completely delete this operational baseline? This may affect compliance calculations across the entire system.</p>
            <div style="display: flex; gap: 12px; justify-content: center;">
              <button type="button" class="btn btn-outline" id="btn-cancel-delete" style="flex: 1;">Cancel</button>
              <button type="button" class="btn btn-primary" id="btn-confirm-delete" style="flex: 1; background: var(--danger); border-color: var(--danger);">Delete Baseline</button>
            </div>
          </div>
        </div>

        <!-- Baseline Add Modal Form -->
        <div class="modal-backdrop" id="baseline-add-modal" style="display: none;">
          <div class="modal-card">
            <div class="modal-header">
              <h3 class="modal-title">Add New Operational Baseline</h3>
              <button class="modal-close" id="btn-close-add-modal">&times;</button>
            </div>
            <form id="form-add-baseline">
              <div class="form-group">
                <label class="form-label">Baseline Key</label>
                <input type="text" class="form-input" id="add-baseline-key" placeholder="e.g. pool_water_daily" />
                <small class="form-help">Unique system identifier (no spaces).</small>
              </div>
              <div class="form-group">
                <label class="form-label">Standard Name</label>
                <input type="text" class="form-input" id="add-baseline-name" placeholder="e.g. Pool Maintenance" />
              </div>
              <div class="form-group">
                <label class="form-label">Category</label>
                <select class="form-input" id="add-baseline-category">
                  <option value="Water">Water</option>
                  <option value="Energy">Energy</option>
                  <option value="Food & Beverage">Food & Beverage</option>
                  <option value="Facilities">Facilities</option>
                </select>
              </div>
              <div class="form-group" style="display: flex; gap: 10px;">
                <div style="flex: 1;">
                  <label class="form-label">Value</label>
                  <input type="number" step="any" class="form-input" id="add-baseline-val" placeholder="0.00" />
                </div>
                <div style="flex: 1;">
                  <label class="form-label">Unit</label>
                  <input type="text" class="form-input" id="add-baseline-unit" placeholder="e.g. L, kWh, kg" />
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-sm btn-outline" id="btn-cancel-add">Cancel</button>
                <button type="submit" class="btn btn-sm btn-primary">Add Baseline</button>
              </div>
            </form>
          </div>
        </div>

        <!-- Baseline Update Modal Form -->
        <div class="modal-backdrop" id="baseline-modal" style="display: none;">
          <div class="modal-card">
            <div class="modal-header">
              <h3 class="modal-title">Update Operational Baseline</h3>
              <button class="modal-close" id="btn-close-baseline-modal">&times;</button>
            </div>
            <form id="form-update-baseline">
              <div class="form-group">
                <label class="form-label">Select Baseline Metric</label>
                <select class="form-input" id="modal-baseline-id">
                  ${baselines.map(b => `<option value="${b.id}">${b.name} (Current: ${b.value} ${b.unit})</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">New Baseline Value</label>
                <input type="number" step="any" class="form-input" id="modal-baseline-val" placeholder="Enter numeric value..." />
                <small class="form-help">Must be a positive numeric value.</small>
              </div>
              <div class="form-group">
                <label class="form-label">Effective Date</label>
                <input type="date" class="form-input" id="modal-baseline-date" />
              </div>
              <div class="form-group">
                <label class="form-label">Reason for Modification</label>
                <textarea class="form-input" id="modal-baseline-reason" rows="3" placeholder="Explain rationale (e.g., Aerator retrofit completed in Tower A)..."></textarea>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-sm btn-outline" id="btn-cancel-baseline">Cancel</button>
                <button type="submit" class="btn btn-sm btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  attachEventListeners() {
    this.container.querySelectorAll('.sidebar-nav-btn').forEach(btn => {
      btn.onclick = () => {
        const target = btn.dataset.target;
        const isStandalone = window.location.pathname.endsWith('.html') && !window.location.pathname.endsWith('index.html');
        if (isStandalone) {
          window.location.href = `./${target}.html`;
        } else {
          window.location.hash = `#/${target}`;
        }
      };
    });

    const modal = this.container.querySelector('#baseline-modal');
    const openBtn = this.container.querySelector('#btn-open-baseline-modal');
    const closeBtn = this.container.querySelector('#btn-close-baseline-modal');
    const cancelBtn = this.container.querySelector('#btn-cancel-baseline');
    const form = this.container.querySelector('#form-update-baseline');

    if (openBtn) openBtn.onclick = () => { modal.style.display = 'flex'; };
    if (closeBtn) closeBtn.onclick = () => { modal.style.display = 'none'; };
    if (cancelBtn) cancelBtn.onclick = () => { modal.style.display = 'none'; };

    if (form) {
      form.onsubmit = (e) => {
        e.preventDefault();
        const inputs = form.querySelectorAll('.form-input');
        inputs.forEach(inp => inp.style.borderColor = ''); // reset

        const elId = this.container.querySelector('#modal-baseline-id');
        const elVal = this.container.querySelector('#modal-baseline-val');
        const elDate = this.container.querySelector('#modal-baseline-date');
        const elReason = this.container.querySelector('#modal-baseline-reason');

        const id = elId.value;
        const val = elVal.value;
        const date = elDate.value;
        const reason = elReason.value;

        const showError = (el, msg) => {
          el.style.borderColor = 'var(--danger)';
          window.showGlobalToast(msg, 'error');
        };

        if (!id) return showError(elId, 'Please select a baseline metric to update.');
        if (!val || parseFloat(val) <= 0 || isNaN(parseFloat(val))) return showError(elVal, 'Baseline value must be a positive numeric number.');
        if (!date) return showError(elDate, 'Effective date is required.');
        if (!reason.trim()) return showError(elReason, 'Reason for modification is required.');

        const result = db.updateBaseline(id, val, date, reason);
        if (result && result.success) {
          modal.style.display = 'none';
          window.showGlobalToast?.('Operational baseline updated and audit record created.', 'success');
        } else {
          window.showGlobalToast('Baseline update was not saved. No changes were made.', 'error');
        }
      };
    }

    // --- ADD MODAL LOGIC ---
    const addModal = this.container.querySelector('#baseline-add-modal');
    const btnOpenAdd = this.container.querySelector('#btn-open-add-baseline-modal');
    const btnCloseAdd = this.container.querySelector('#btn-close-add-modal');
    const btnCancelAdd = this.container.querySelector('#btn-cancel-add');
    const formAdd = this.container.querySelector('#form-add-baseline');

    if (btnOpenAdd) btnOpenAdd.onclick = () => { addModal.style.display = 'flex'; };
    if (btnCloseAdd) btnCloseAdd.onclick = () => { addModal.style.display = 'none'; };
    if (btnCancelAdd) btnCancelAdd.onclick = () => { addModal.style.display = 'none'; };

    if (formAdd) {
      formAdd.onsubmit = (e) => {
        e.preventDefault();
        const inputs = formAdd.querySelectorAll('.form-input');
        inputs.forEach(inp => inp.style.borderColor = ''); // reset

        const elKey = this.container.querySelector('#add-baseline-key');
        const elName = this.container.querySelector('#add-baseline-name');
        const elCat = this.container.querySelector('#add-baseline-category');
        const elVal = this.container.querySelector('#add-baseline-val');
        const elUnit = this.container.querySelector('#add-baseline-unit');

        const key = elKey.value.trim();
        const name = elName.value.trim();
        const category = elCat.value;
        const val = elVal.value;
        const unit = elUnit.value.trim();

        const showError = (el, msg) => {
          el.style.borderColor = 'var(--danger)';
          window.showGlobalToast(msg, 'error');
        };

        if (!key || key.includes(' ')) return showError(elKey, 'Baseline Key must be provided and cannot contain spaces.');
        if (!name) return showError(elName, 'Standard Name is required.');
        if (!category) return showError(elCat, 'Category is required.');
        if (!val || parseFloat(val) <= 0 || isNaN(parseFloat(val))) return showError(elVal, 'Value must be a positive numeric number.');
        if (!unit) return showError(elUnit, 'Unit is required.');
        
        const existingBaselines = db.getBaselines();
        if (existingBaselines.some(b => b.key.toLowerCase() === key.toLowerCase() || b.id.toLowerCase() === key.toLowerCase())) {
          return showError(elKey, 'A baseline with this key already exists. Keys must be unique.');
        }

        db.addBaseline({
          id: key,
          key: key,
          name: name,
          category: category,
          value: parseFloat(val),
          unit: unit,
          updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
          updatedBy: db.getSystem()?.activeUser?.name || 'System'
        });

        addModal.style.display = 'none';
        window.showGlobalToast('New baseline added successfully.', 'success');
        this.render();
      };
    }

    // --- DELETE LOGIC ---
    const deleteModal = this.container.querySelector('#baseline-delete-modal');
    const btnCancelDelete = this.container.querySelector('#btn-cancel-delete');
    const btnConfirmDelete = this.container.querySelector('#btn-confirm-delete');
    let baselineIdToDelete = null;

    if (btnCancelDelete) {
      btnCancelDelete.onclick = () => { 
        deleteModal.style.display = 'none'; 
        baselineIdToDelete = null;
      };
    }

    if (btnConfirmDelete) {
      btnConfirmDelete.onclick = () => {
        if (baselineIdToDelete) {
          const success = db.deleteBaseline(baselineIdToDelete);
          if (success) {
            window.showGlobalToast('Baseline deleted successfully.', 'success');
          } else {
            window.showGlobalToast('Failed to delete baseline.', 'error');
          }
        }
        deleteModal.style.display = 'none';
        this.render();
      };
    }

    this.container.querySelectorAll('.btn-delete-baseline').forEach(btn => {
      btn.onclick = () => {
        baselineIdToDelete = btn.dataset.id;
        deleteModal.style.display = 'flex';
      };
    });
  }
}
