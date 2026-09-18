import { db } from '../db/storage.js';

export class Module1Audit {
  constructor(container) {
    this.container = container;
    this.auditFilters = { date: '', user: '', action: '', baseline: '' };
    this.unsub = null;
    this.init();
  }

  init() {
    this.render();
    this.unsub = db.subscribe('userAudit', () => this.render());
  }

  destroy() {
    if (typeof this.unsub === 'function') {
      try { this.unsub(); } catch (e) {}
      this.unsub = null;
    }
  }

  render() {
    let auditLogs = [];
    try {
      const allLogs = db.get('userAudit') || [];
      auditLogs = allLogs.filter(log => {
        let matches = true;
        if (this.auditFilters.date && !(log.timestamp || '').includes(this.auditFilters.date) && !(log.effectiveDate || '').includes(this.auditFilters.date)) matches = false;
        if (this.auditFilters.user && !(log.userName || '').toLowerCase().includes(this.auditFilters.user.toLowerCase()) && !(log.userId || '').toLowerCase().includes(this.auditFilters.user.toLowerCase())) matches = false;
        if (this.auditFilters.action && !(log.action || '').toLowerCase().includes(this.auditFilters.action.toLowerCase())) matches = false;
        if (this.auditFilters.baseline && !(log.targetKey || '').toLowerCase().includes(this.auditFilters.baseline.toLowerCase())) matches = false;
        return matches;
      });
    } catch (error) {
      this.container.innerHTML = `<div class="card"><p class="text-danger">Error loading audit logs.</p></div>`;
      return;
    }

    const subNavTpl = `
      <div class="tab-pills-full grid-cols-4" style="margin-bottom: 20px;">
        <button class="tab-btn sidebar-nav-btn" data-target="m1-dashboard">
          <span>📊</span> Sustainability Dashboard
        </button>
        <button class="tab-btn sidebar-nav-btn" data-target="m1-department">
          <span>🏢</span> Department Breakdown
        </button>
        <button class="tab-btn sidebar-nav-btn" data-target="m1-baselines">
          <span>🎯</span> Operational Baselines
        </button>
        <button class="tab-btn sidebar-nav-btn active" data-target="m1-audit">
          <span>🛡️</span> System Audit Log
        </button>
      </div>
    `;

    this.container.innerHTML = `
      <div class="module-view m1-container fade-in">
        <div class="view-header">
          <div>
            <h1 class="view-title">Executive Analytics</h1>
          </div>
        </div>

        ${subNavTpl}

        <!-- Main Content Area - Full Widescreen Width -->
        <div class="card">
          <div class="card-header" style="flex-wrap: wrap; gap: 10px;">
            <div>
              <h3 class="card-title">System Audit Log</h3>
              <p class="card-subtitle">Immutable trail of baseline calibrations, overrides, and administrative modifications.</p>
            </div>
            <div class="filter-group" style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
              <input type="text" class="form-input form-input-sm" id="audit-filter-date" placeholder="Date (YYYY-MM-DD)" value="${this.auditFilters.date || ''}">
              <input type="text" class="form-input form-input-sm" id="audit-filter-user" placeholder="User ID / Name" value="${this.auditFilters.user || ''}">
              <input type="text" class="form-input form-input-sm" id="audit-filter-action" placeholder="Action" value="${this.auditFilters.action || ''}">
              <input type="text" class="form-input form-input-sm" id="audit-filter-baseline" placeholder="Target / Baseline Key" value="${this.auditFilters.baseline || ''}">
              <button class="btn btn-sm btn-primary" id="btn-audit-search">Filter</button>
              <button class="btn btn-sm btn-outline" id="btn-audit-reset">Reset</button>
            </div>
          </div>
          <div class="audit-stream">
            ${auditLogs.length === 0 ? `
              <div class="text-danger text-center py-3">No audit records match the selected filters.</div>
            ` : auditLogs.slice(0, 50).map(log => `
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
                    <strong>${log.userName || log.userId || 'System'}</strong> adjusted <code>${log.targetKey || 'Record'}</code>
                    ${log.effectiveDate ? ` (Effective: ${log.effectiveDate})` : ''}:
                    <span class="audit-diff text-danger">${log.previousValue !== undefined ? log.previousValue : '—'}</span> ➔ <span class="audit-diff text-success">${log.newValue !== undefined ? log.newValue : '—'}</span>
                  </div>
                  <div class="audit-reason text-muted"><em>Reason: ${log.reason || 'No description provided'}</em></div>
                </div>
              </div>
            `).join('')}
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
          date: this.container.querySelector('#audit-filter-date')?.value.trim() || '',
          user: this.container.querySelector('#audit-filter-user')?.value.trim() || '',
          action: this.container.querySelector('#audit-filter-action')?.value.trim() || '',
          baseline: this.container.querySelector('#audit-filter-baseline')?.value.trim() || '',
        };
        this.render();
      };
    }

    const auditResetBtn = this.container.querySelector('#btn-audit-reset');
    if (auditResetBtn) {
      auditResetBtn.onclick = () => {
        this.auditFilters = { date: '', user: '', action: '', baseline: '' };
        this.render();
      };
    }

    ['#audit-filter-date', '#audit-filter-user', '#audit-filter-action', '#audit-filter-baseline'].forEach(sel => {
      const input = this.container.querySelector(sel);
      if (input) {
        input.onkeydown = (e) => {
          if (e.key === 'Enter') {
            auditSearchBtn?.click();
          }
        };
      }
    });
  }
}
