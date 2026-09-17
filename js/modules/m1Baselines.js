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
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
              Add Baseline
            </button>
            <button class="btn btn-sm btn-primary" id="btn-open-baseline-modal">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
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
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
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
              <div class="modal-footer" style="display: flex; justify-content: space-between; align-items: center;">
                <button type="button" class="btn btn-sm" id="btn-delete-baseline" style="color: var(--danger); border: 1px solid var(--danger); background: transparent; padding: 4px 8px;">Delete Baseline</button>
                <div style="display: flex; gap: 8px;">
                  <button type="button" class="btn btn-sm btn-outline" id="btn-cancel-baseline">Cancel</button>
                  <button type="submit" class="btn btn-sm btn-primary">Save Changes</button>
                </div>
              </div>
            </form>
          </div>
        </div>
                <!-- Delete Confirmation Modal -->
        <div class="modal-backdrop" id="delete-confirm-modal" style="display: none; z-index: 1000;">
          <div class="modal-card" style="max-width: 400px; padding: 24px;">
            <div class="modal-header">
              <h3 class="modal-title" style="color: var(--danger);">Confirm Deletion</h3>
              <button class="modal-close" id="btn-close-delete-modal">&times;</button>
            </div>
            <div style="padding: 16px 0;">
              <p style="font-size: 15px; margin-bottom: 8px;">Are you sure you want to completely <strong>DELETE</strong> this baseline?</p>
              <p class="text-muted" style="font-size: 13px; line-height: 1.4;">This destructive action will be permanently recorded in the System Audit Log.</p>
            </div>
            <div class="modal-footer" style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-subtle);">
              <button type="button" class="btn btn-sm btn-outline" id="btn-cancel-delete">Cancel</button>
              <button type="button" class="btn btn-sm" id="btn-confirm-delete" style="background: var(--danger); color: white; border: none;">Yes, Delete It</button>
            </div>
          </div>
        </div>
        <!-- Add Baseline Modal Form -->
        <div class="modal-backdrop" id="add-baseline-modal" style="display: none;">
          <div class="modal-card">
            <div class="modal-header">
              <h3 class="modal-title">Create New Operational Baseline</h3>
              <button class="modal-close" id="btn-close-add-baseline-modal">&times;</button>
            </div>
            <form id="form-add-baseline">
              <div class="form-group">
                <label class="form-label">Metric Key (e.g. kitchen_power)</label>
                <input type="text" class="form-input" id="add-baseline-key" placeholder="Enter key..." />
              </div>
              <div class="form-group">
                <label class="form-label">Standard Name</label>
                <input type="text" class="form-input" id="add-baseline-name" placeholder="Enter full name..." />
              </div>
              <div style="display: flex; gap: 10px;">
                <div class="form-group" style="flex: 1;">
                  <label class="form-label">Value</label>
                  <input type="number" class="form-input" id="add-baseline-val" placeholder="0.00" />
                </div>
                <div class="form-group" style="flex: 1;">
                  <label class="form-label">Unit</label>
                  <input type="text" class="form-input" id="add-baseline-unit" placeholder="e.g. kWh/day" />
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Category</label>
                <select class="form-input" id="add-baseline-category">
                  <option value="Electricity">Electricity</option>
                  <option value="Water">Water</option>
                  <option value="F&B">F&B / Waste</option>
                  <option value="Operations">Operations</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Reason for Creation</label>
                <textarea class="form-input" id="add-baseline-reason" rows="2" placeholder="Explain rationale..."></textarea>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-sm btn-outline" id="btn-cancel-add-baseline">Cancel</button>
                <button type="submit" class="btn btn-sm btn-primary">Create Baseline</button>
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
        
        const idInput = this.container.querySelector('#modal-baseline-id');
        const valInput = this.container.querySelector('#modal-baseline-val');
        const dateInput = this.container.querySelector('#modal-baseline-date');
        const reasonInput = this.container.querySelector('#modal-baseline-reason');

        // Clear previous error messages
        this.container.querySelectorAll('.err-msg').forEach(el => el.remove());

        [idInput, valInput, dateInput, reasonInput].forEach(el => {
          if (el) { el.style.borderColor = ''; el.style.backgroundColor = ''; }
        });

        const showError = (input, msg) => {
          if (input) {
            input.style.borderColor = 'var(--danger)';
            input.style.backgroundColor = 'var(--danger-light)';
            input.focus();
            let errDiv = input.parentElement.querySelector('.err-msg');
            if (!errDiv) {
              errDiv = document.createElement('small');
              errDiv.className = 'err-msg';
              errDiv.style.color = 'var(--danger)';
              errDiv.style.display = 'block';
              errDiv.style.marginTop = '4px';
              input.parentElement.appendChild(errDiv);
            }
            errDiv.innerText = msg;
          }
        };

        const id = idInput.value;
        const val = valInput.value;
        const date = dateInput.value;
        const reason = reasonInput.value;

        if (!id) {
          showError(idInput, 'Please select a baseline metric.');
          return;
        }
        if (!val) {
          showError(valInput, 'Please enter a new baseline value.');
          return;
        }
        if (parseFloat(val) <= 0 || isNaN(parseFloat(val))) {
          showError(valInput, 'Baseline value must be a positive numeric number.');
          return;
        }
        if (!date) {
          showError(dateInput, 'Effective date is required.');
          return;
        }
        if (!reason) {
          showError(reasonInput, 'Please provide a reason for the modification.');
          return;
        }

        const baselines = db.getBaselines();
        const targetBaseline = baselines.find(b => b.id === id);
        if (targetBaseline && targetBaseline.value === parseFloat(val)) {
          showError(valInput, 'No changes were made. The new value is identical to the current baseline.');
          return;
        }

        const result = db.updateBaseline(id, val, date, reason);
        if (result) {
          modal.style.display = 'none';
          window.showGlobalToast?.('Operational baseline updated and audit record created.', 'success');
        } else {
          window.showGlobalToast('Baseline update was not saved. No changes were made.', 'error');
        }
      };
    }

    const btnDelete = this.container.querySelector('#btn-delete-baseline');
    if (btnDelete) {
      btnDelete.onclick = (e) => {
        e.preventDefault();
        const id = this.container.querySelector('#modal-baseline-id').value;
        const reason = this.container.querySelector('#modal-baseline-reason').value || 'Operational baseline removed';
        
        if (!id) return;
        
        const deleteModal = this.container.querySelector('#delete-confirm-modal');
        deleteModal.style.display = 'flex';

        const confirmBtn = this.container.querySelector('#btn-confirm-delete');
        const cancelBtn = this.container.querySelector('#btn-cancel-delete');
        const closeBtn = this.container.querySelector('#btn-close-delete-modal');

        const closeDeleteModal = () => { deleteModal.style.display = 'none'; };

        if (cancelBtn) cancelBtn.onclick = closeDeleteModal;
        if (closeBtn) closeBtn.onclick = closeDeleteModal;
        
        if (confirmBtn) {
          confirmBtn.onclick = () => {
            const result = db.deleteBaseline(id, reason);
            if (result) {
              closeDeleteModal();
              modal.style.display = 'none';
              window.showGlobalToast?.('Operational baseline deleted securely.', 'success');
            } else {
              window.showGlobalToast('Failed to delete baseline.', 'error');
            }
          };
        }
      };
    }

    const addModal = this.container.querySelector('#add-baseline-modal');
    const openAddBtn = this.container.querySelector('#btn-open-add-baseline-modal');
    const closeAddBtn = this.container.querySelector('#btn-close-add-baseline-modal');
    const cancelAddBtn = this.container.querySelector('#btn-cancel-add-baseline');
    const addForm = this.container.querySelector('#form-add-baseline');

    if (openAddBtn) openAddBtn.onclick = () => { addModal.style.display = 'flex'; };
    if (closeAddBtn) closeAddBtn.onclick = () => { addModal.style.display = 'none'; };
    if (cancelAddBtn) cancelAddBtn.onclick = () => { addModal.style.display = 'none'; };

    if (addForm) {
        addForm.onsubmit = (e) => {
          e.preventDefault();
          
          const keyInput = this.container.querySelector('#add-baseline-key');
          const nameInput = this.container.querySelector('#add-baseline-name');
          const valInput = this.container.querySelector('#add-baseline-val');
          const unitInput = this.container.querySelector('#add-baseline-unit');
          const catInput = this.container.querySelector('#add-baseline-category');
          const reasonInput = this.container.querySelector('#add-baseline-reason');

          // Clear previous error messages
          this.container.querySelectorAll('.err-msg').forEach(el => el.remove());

          [keyInput, nameInput, valInput, unitInput, catInput, reasonInput].forEach(el => {
            if (el) { el.style.borderColor = ''; el.style.backgroundColor = ''; }
          });

          const showError = (input, msg) => {
            if (input) {
              input.style.borderColor = 'var(--danger)';
              input.style.backgroundColor = 'var(--danger-light)';
              input.focus();
              let errDiv = input.parentElement.querySelector('.err-msg');
              if (!errDiv) {
                errDiv = document.createElement('small');
                errDiv.className = 'err-msg';
                errDiv.style.color = 'var(--danger)';
                errDiv.style.display = 'block';
                errDiv.style.marginTop = '4px';
                input.parentElement.appendChild(errDiv);
              }
              errDiv.innerText = msg;
            }
          };

          const key = keyInput.value;
          const name = nameInput.value;
          const val = valInput.value;
          const unit = unitInput.value;
          const category = catInput.value;
          const reason = reasonInput.value;

          if (!key) { showError(keyInput, 'Please enter a metric key.'); return; }
          if (!name) { showError(nameInput, 'Please enter a standard name.'); return; }
          if (!val) { showError(valInput, 'Please enter a baseline value.'); return; }
          if (parseFloat(val) <= 0 || isNaN(parseFloat(val))) { showError(valInput, 'Baseline value must be a positive numeric number.'); return; }
          if (!unit) { showError(unitInput, 'Please enter a unit of measurement.'); return; }
          if (!category) { showError(catInput, 'Please select a category.'); return; }
          if (!reason) { showError(reasonInput, 'Please provide a reason for the creation.'); return; }

          const newBaseline = {
            key, name, value: parseFloat(val), unit, category, reason
        };

        const result = db.addBaseline(newBaseline);
        if (result) {
          addModal.style.display = 'none';
          window.showGlobalToast?.('New operational baseline successfully created.', 'success');
        }
      };
    }
  }
}




