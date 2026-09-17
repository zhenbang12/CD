import { db } from '../db/storage.js';

export class Module1Baselines {
  constructor(container) {
    this.container = container;
    this.unsubs = [];
    this.isDestroyed = false;
    this.init();
  }

  init() {
    this.render();
    this.unsubs.push(
      db.subscribe('baselines', () => { if (!this.isDestroyed) this.render(); })
    );
  }

  destroy() {
    this.isDestroyed = true;
    if (this.unsubs) {
      this.unsubs.forEach(unsub => {
        try { unsub(); } catch (err) { /* ignore */ }
      });
      this.unsubs = [];
    }
  }

  render() {
    if (this.isDestroyed) return;
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
          <div class="header-actions">
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
                <select class="form-input" id="modal-baseline-id" required>
                  ${baselines.map(b => `<option value="${b.id}">${b.name} (Current: ${b.value} ${b.unit})</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">New Baseline Value</label>
                <input type="number" step="0.01" min="0.01" class="form-input" id="modal-baseline-val" placeholder="Enter numeric value..." required />
                <small class="form-help">Must be a positive numeric value.</small>
              </div>
              <div class="form-group">
                <label class="form-label">Effective Date</label>
                <input type="date" class="form-input" id="modal-baseline-date" required />
              </div>
              <div class="form-group">
                <label class="form-label">Reason for Modification</label>
                <textarea class="form-input" id="modal-baseline-reason" rows="3" placeholder="Explain rationale (e.g., Aerator retrofit completed in Tower A)..." required></textarea>
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
        const id = this.container.querySelector('#modal-baseline-id').value;
        const val = this.container.querySelector('#modal-baseline-val').value;
        const date = this.container.querySelector('#modal-baseline-date').value;
        const reason = this.container.querySelector('#modal-baseline-reason').value;

        if (parseFloat(val) <= 0 || isNaN(parseFloat(val))) {
          alert('Baseline value must be a positive numeric number.');
          return;
        }
        if (!date) {
          alert('Effective date is required.');
          return;
        }

        const result = db.updateBaseline(id, val, date, reason);
        if (result && result.success) {
          modal.style.display = 'none';
          window.showGlobalToast?.('Operational baseline updated and audit record created.', 'success');
        } else {
          alert('Baseline update was not saved. No changes were made.');
        }
      };
    }
  }
}
