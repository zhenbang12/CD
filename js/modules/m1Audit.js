import { db } from '../db/storage.js';

export class Module1Audit {
  constructor(container) {
    this.container = container;
    this.auditFilters = { date: '', user: '', action: '' };
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
      const databaseError = db.getLastDatabaseError();
      if (databaseError) throw databaseError;

      const allLogs = db.get('userAudit') || [];
      auditLogs = allLogs.filter(log => {
        let matches = true;
        if (this.auditFilters.date && !(log.timestamp || '').includes(this.auditFilters.date) && !(log.effectiveDate || '').includes(this.auditFilters.date)) matches = false;
        if (this.auditFilters.user && !(log.userName || '').toLowerCase().includes(this.auditFilters.user.toLowerCase()) && !(log.userId || '').toLowerCase().includes(this.auditFilters.user.toLowerCase())) matches = false;
        if (this.auditFilters.action && !(log.action || '').toLowerCase().includes(this.auditFilters.action.toLowerCase())) matches = false;
        return matches;
      });
      
      this.currentPage = this.currentPage || 1;
      this.itemsPerPage = 10;
      this.totalPages = Math.ceil(auditLogs.length / this.itemsPerPage) || 1;
      if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;
      
      this.paginatedLogs = auditLogs.slice((this.currentPage - 1) * this.itemsPerPage, this.currentPage * this.itemsPerPage);

    } catch (error) {
      this.container.innerHTML = `<div class="card"><p class="text-danger">Error loading audit logs.</p></div>`;
      return;
    }

    const subNavTpl = `
      <div class="tab-pills-full grid-cols-4" style="margin-bottom: 20px;">
        <button class="tab-btn sidebar-nav-btn" data-target="m1-dashboard">
          <span>&#128200;</span> Sustainability Dashboard
        </button>
        <button class="tab-btn sidebar-nav-btn" data-target="m1-department">
          <span>&#127970;</span> Department Breakdown
        </button>
        <button class="tab-btn sidebar-nav-btn" data-target="m1-baselines">
          <span>&#128207;</span> Operational Baselines
        </button>
        <button class="tab-btn sidebar-nav-btn active" data-target="m1-audit">
          <span>&#128269;</span> System Audit Log
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
            <div class="filter-group" style="display: flex; gap: 8px; align-items: center; flex-wrap: nowrap; overflow-x: auto;">
              <input type="text" class="form-input form-input-sm" id="audit-filter-date" style="min-height: 36px;" placeholder="Date (YYYY-MM-DD)" value="${this.auditFilters.date || ''}">
              <input type="text" class="form-input form-input-sm" id="audit-filter-user" style="min-height: 36px;" placeholder="User ID / Name" value="${this.auditFilters.user || ''}">
              <input type="text" class="form-input form-input-sm" id="audit-filter-action" style="min-height: 36px;" placeholder="Action" value="${this.auditFilters.action || ''}">
              <button class="btn btn-sm btn-primary" id="btn-audit-search">Filter</button>
              <button class="btn btn-sm btn-outline" id="btn-audit-reset">Reset</button>
            </div>
          </div>
          <div class="audit-stream">
            ${auditLogs.length === 0 ? `
              <div class="text-danger text-center py-3">No audit records match the selected filters.</div>
            ` : this.paginatedLogs.map(log => `
              <div class="audit-entry">
                <div class="audit-icon">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <div class="audit-content">
                  <div class="audit-top" style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                      <span class="audit-action" style="margin-right: 8px;"><code>${log.action}</code></span>
                      ${log.transactionRef ? `<span class="badge badge-secondary" style="font-size: 9px;">${log.transactionRef}</span>` : ''}
                    </div>
                    <span class="audit-time text-muted" style="font-size: 11px;">${log.timestamp}</span>
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
          ${auditLogs.length > this.itemsPerPage ? `
            <div class="pagination-footer" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; border-top: 1px solid var(--border-color); background: var(--bg-card-subtle, #f8fafc); border-radius: 0 0 8px 8px;">
                  <button class="btn btn-sm btn-outline" id="btn-prev-audit" ${this.currentPage <= 1 ? 'disabled' : ''} style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; ${this.currentPage <= 1 ? 'opacity: 0.4; cursor: not-allowed;' : ''}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                    Previous
                  </button>
                  <div style="font-size: 13px; font-weight: 600; color: var(--text-main, #334155); display: flex; gap: 6px; align-items: center;">
                    <span style="background: var(--bg-surface); color: var(--text-main); border: 1px solid var(--border-color); padding: 4px 10px; border-radius: 6px; min-width: 24px; text-align: center;">${this.currentPage}</span> 
                    <span style="color: var(--text-muted, #94a3b8); font-weight: 500;">/</span> 
                    <span style="color: var(--text-muted, #94a3b8);">${this.totalPages}</span>
                  </div>
                  <button class="btn btn-sm btn-outline" id="btn-next-audit" ${this.currentPage >= (this.totalPages) ? 'disabled' : ''} style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; ${this.currentPage >= (this.totalPages) ? 'opacity: 0.4; cursor: not-allowed;' : ''}">
                    Next
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                  </button>
                </div>
          ` : ''}
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
          date: this.container.querySelector('#audit-filter-date').value||'',
          user: this.container.querySelector('#audit-filter-user').value||'',
          action: this.container.querySelector('#audit-filter-action').value||''
        };
        this.currentPage = 1;
        this.render();
      };
    }

    const auditResetBtn = this.container.querySelector('#btn-audit-reset');
    if (auditResetBtn) {
      auditResetBtn.onclick = () => {
        this.auditFilters = { date: '', user: '', action: '' };
        this.currentPage = 1;
        this.render();
      };
    }

    ['#audit-filter-date', '#audit-filter-user', '#audit-filter-action'].forEach(sel => {
      const input = this.container.querySelector(sel);
      if (input) {
        input.onkeydown = (e) => {
          if (e.key === 'Enter') {
            auditSearchBtn?.click();
          }
        };
      }
    });

    const prevAudit = this.container.querySelector('#btn-prev-audit');
    if (prevAudit) prevAudit.onclick = () => { this.currentPage--; this.render(); };
    const nextAudit = this.container.querySelector('#btn-next-audit');
    if (nextAudit) nextAudit.onclick = () => { this.currentPage++; this.render(); };
  }
}
