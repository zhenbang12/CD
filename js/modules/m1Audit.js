import { db } from '../db/storage.js';

export class Module1Audit {
  constructor(container) {
    this.container = container;
    this.auditFilters = { date: '', user: '', action: '', baseline: '' };
    this.init();
  }

  init() {
    this.render();
    db.subscribe('auditLogs', () => this.render());
  }

  render() {
    let auditLogs = [];
    try {
      const allLogs = db.get('auditLogs') || [];
      auditLogs = allLogs.filter(log => {
        let matches = true;
        if (this.auditFilters.date && !(log.timestamp || '').includes(this.auditFilters.date) && !(log.effectiveDate || '').includes(this.auditFilters.date)) matches = false;
        if (this.auditFilters.user && !(log.userName || '').toLowerCase().includes(this.auditFilters.user.toLowerCase()) && !(log.userId || '').toLowerCase().includes(this.auditFilters.user.toLowerCase())) matches = false;
        if (this.auditFilters.action && !(log.action || '').toLowerCase().includes(this.auditFilters.action.toLowerCase())) matches = false;
        if (this.auditFilters.baseline && !(log.targetKey || '').toLowerCase().includes(this.auditFilters.baseline.toLowerCase()) && !(log.transactionRef || '').toLowerCase().includes(this.auditFilters.baseline.toLowerCase())) matches = false;
        return matches;
      });
    } catch (error) {
      this.container.innerHTML = `<div class="card"><p class="text-danger">Error loading audit logs.</p></div>`;
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
          
          <button class="btn btn-sm btn-outline btn-block sidebar-nav-btn" data-target="m1-baselines" style="justify-content: flex-start; padding-left: 12px;">
            <span style="margin-right: 6px;">🎯</span> Operational Baselines
          </button>
          
          <button class="btn btn-sm btn-primary btn-block sidebar-nav-btn" data-target="m1-audit" style="justify-content: flex-start; padding-left: 12px;">
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
            <p class="view-subtitle">Timestamped ledger recording administrative calibration changes.</p>
          </div>
        </div>

        <div style="display: flex; gap: 24px; align-items: flex-start; margin-top: 10px;">
          ${sidebarTpl}

          <!-- Main Content Area -->
          <div style="flex-grow: 1; display: flex; flex-direction: column; gap: 16px; min-width: 0;">
            <div class="card">
              <div class="card-header" style="flex-wrap: wrap; gap: 10px;">
                <div>
                  <h3 class="card-title">System Log & Parameter Adjustments</h3>
                  <p class="card-subtitle">Filter by Date, User, Action, or Target</p>
                </div>
                <div class="filter-group" style="display: flex; gap: 10px; align-items: center;">
                  <input type="text" class="form-input form-input-sm" id="audit-filter-date" placeholder="Date (YYYY-MM-DD)" value="${this.auditFilters.date}">
                  <input type="text" class="form-input form-input-sm" id="audit-filter-user" placeholder="User ID / Name" value="${this.auditFilters.user}">
                  <input type="text" class="form-input form-input-sm" id="audit-filter-action" placeholder="Action" value="${this.auditFilters.action}">
                  <input type="text" class="form-input form-input-sm" id="audit-filter-baseline" placeholder="Baseline ID" value="${this.auditFilters.baseline}">
                  <button class="btn btn-sm btn-outline" id="btn-audit-search">Filter</button>
                </div>
              </div>
              <div class="audit-stream">
                ${auditLogs.length === 0 ? `
                  <div class="text-danger text-center py-3">No audit records match the selected filters.</div>
                ` : auditLogs.slice(0, 20).map(log => `
                  <div class="audit-entry">
                    <div class="audit-icon">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    </div>
                    <div class="audit-content">
                      <div class="audit-top">
                        <span class="audit-action"><code>${log.action}</code></span>
                        <span class="audit-time text-muted">${log.timestamp}</span>
                        ${log.transactionRef ? `<span class="badge badge-secondary" style="font-size: 9px;">${log.transactionRef}</span>` : ''}
                      </div>
                      <div class="audit-desc">
                        <strong>${log.userName}</strong> adjusted <code>${log.targetKey}</code>
                        ${log.effectiveDate ? ` (Effective: ${log.effectiveDate})` : ''}:
                        <span class="audit-diff text-danger">${log.previousValue}</span> ➔ <span class="audit-diff text-success">${log.newValue}</span>
                      </div>
                      <div class="audit-reason text-muted"><em>Reason: ${log.reason}</em></div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
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

    const auditSearchBtn = this.container.querySelector('#btn-audit-search');
    if (auditSearchBtn) {
      auditSearchBtn.onclick = () => {
        this.auditFilters = {
          date: this.container.querySelector('#audit-filter-date').value,
          user: this.container.querySelector('#audit-filter-user').value,
          action: this.container.querySelector('#audit-filter-action').value,
          baseline: this.container.querySelector('#audit-filter-baseline').value,
        };
        this.render();
      };
    }
  }
}
