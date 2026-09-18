import { db } from '../db/storage.js';
import { ComplianceEngine } from '../engines/complianceEngine.js';

export class Module1Department {
  constructor(container) {
    this.container = container;
    this.selectedDepartment = '';
    this.unsubs = [];
    this.init();
  }

  init() {
    this.render();
    this.unsubs.push(
      db.subscribe('system', () => this.render()),
      db.subscribe('baselines', () => this.render()),
      db.subscribe('plateWasteLogs', () => this.render()),
      db.subscribe('foodWasteLogs', () => this.render()),
      db.subscribe('utilityMeters', () => this.render())
    );
  }

  destroy() {
    if (this.unsubs) {
      this.unsubs.forEach(unsub => {
        try { unsub(); } catch(e) {}
      });
      this.unsubs = [];
    }
  }

  render() {
    let departmentPerformance = null;

    try {
      const databaseError = db.getLastDatabaseError();
      if (databaseError) throw databaseError;

      if (this.selectedDepartment) {
        departmentPerformance = ComplianceEngine.getDepartmentPerformance(this.selectedDepartment);
      }
    } catch (error) {
      this.container.innerHTML = `<div class="card"><p class="text-danger">Error loading data.</p></div>`;
      return;
    }

    const subNavTpl = `
      <div class="tab-pills-full grid-cols-4" style="margin-bottom: 20px;">
        <button class="tab-btn sidebar-nav-btn" data-target="m1-dashboard">
          <span>📊</span> Sustainability Dashboard
        </button>
        <button class="tab-btn sidebar-nav-btn active" data-target="m1-department">
          <span>🏢</span> Department Breakdown
        </button>
        <button class="tab-btn sidebar-nav-btn" data-target="m1-baselines">
          <span>🎯</span> Operational Baselines
        </button>
        <button class="tab-btn sidebar-nav-btn" data-target="m1-audit">
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
          <div class="header-actions">
            <button class="btn btn-sm btn-primary" id="btn-export-m1-pdf">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Generate Department Report
            </button>
          </div>
        </div>

        ${subNavTpl}

        <!-- Main Content Area - Full Widescreen Width -->
        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">Departmental Performance</h3>
              <p class="card-subtitle">Select a department to view detailed resource consumption and operational anomalies.</p>
            </div>
          </div>

          ${!isAuthorized ? `
            <p class="text-muted">Operations Director or Executive access is required.</p>
          ` : `
            <select class="form-input form-input-sm" id="department-selector" style="max-width: 320px; margin-bottom: 16px;">
              <option value="">Select a department</option>
              <option value="kitchen">Kitchen</option>
              <option value="housekeeping">Housekeeping</option>
              <option value="laundry">Laundry</option>
              <option value="facilities">Facilities</option>
              <option value="front-office">Front Office</option>
            </select>
          
            ${!this.selectedDepartment
              ? '<p class="text-muted">Select a department to review.</p>'
              : !departmentPerformance?.hasData
                ? `<p class="text-danger">${departmentPerformance.message}</p>`
                : this.renderDepartmentBreakdown(departmentPerformance)
            }
          `}
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  renderDepartmentBreakdown(perf) {
    return `
      <div style="display: flex; gap: 20px; flex-wrap: wrap; margin-top: 10px;">
        <div style="flex: 1; min-width: 200px; background: var(--bg-card-subtle); padding: 15px; border-radius: var(--radius-md);">
          <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Energy Usage</div>
          <div style="font-size: 20px; font-weight: 600; color: ${perf.flags.includes('energy') ? 'var(--danger)' : 'var(--text-main)'}">
            ${perf.metrics.energy.toLocaleString()} kWh
          </div>
          ${perf.flags.includes('energy') ? '<span class="badge badge-danger" style="margin-top: 5px;">High Anomaly</span>' : '<span class="badge badge-success" style="margin-top: 5px;">Normal</span>'}
        </div>
        <div style="flex: 1; min-width: 200px; background: var(--bg-card-subtle); padding: 15px; border-radius: var(--radius-md);">
          <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Water Usage</div>
          <div style="font-size: 20px; font-weight: 600; color: ${perf.flags.includes('water') ? 'var(--warning)' : 'var(--text-main)'}">
            ${(perf.metrics.water / 1000).toFixed(1)} kL
          </div>
          ${perf.flags.includes('water') ? '<span class="badge badge-warning" style="margin-top: 5px;">Elevated</span>' : '<span class="badge badge-success" style="margin-top: 5px;">Normal</span>'}
        </div>
        <div style="flex: 1; min-width: 200px; background: var(--bg-card-subtle); padding: 15px; border-radius: var(--radius-md);">
          <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Waste Generated</div>
          <div style="font-size: 20px; font-weight: 600; color: var(--text-main);">
            ${perf.metrics.waste.toFixed(1)} kg
          </div>
          <span class="badge badge-secondary" style="margin-top: 5px;">Logged</span>
        </div>
      </div>

      <div style="margin-top: 20px;">
        <h4 style="margin-bottom: 10px; font-size: 14px; border-bottom: 1px solid var(--border-color); padding-bottom: 5px;">Detailed Equipment & Zones</h4>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${perf.performanceData.length === 0 ? '<p class="text-muted">No meter data found.</p>' : perf.performanceData.map(meter => `
            <div style="display: flex; justify-content: space-between; background: var(--bg-surface); padding: 10px; border-radius: 4px; border-left: 3px solid ${meter.status && meter.status.includes('Anomaly') ? 'var(--danger)' : 'var(--success)'};">
              <div>
                <strong style="display: block; font-size: 13px;">${meter.zone || meter.name || 'Unknown Zone'}</strong>
                <span class="text-muted" style="font-size: 11px;">${meter.type || 'Utility'} • Last updated: ${meter.lastReadingTime || meter.lastUpdated}</span>
              </div>
              <div style="text-align: right;">
                <div style="font-weight: 600;">${(meter.lastReading || meter.currentReading).toLocaleString()} ${meter.unit || ''}</div>
                <span style="font-size: 10px; color: ${meter.status && meter.status.includes('Anomaly') ? 'var(--danger)' : 'var(--text-muted)'}">${meter.status || 'Normal'}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div style="margin-top: 20px;">
        <h4 style="margin-bottom: 10px; font-size: 14px; border-bottom: 1px solid var(--border-color); padding-bottom: 5px;">Spoilage & Waste Log</h4>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${perf.spoilageLogs.length === 0 ? '<p class="text-muted">No waste records found for this period.</p>' : perf.spoilageLogs.map(log => `
            <div style="display: flex; justify-content: space-between; background: var(--bg-surface); padding: 10px; border-radius: 4px;">
              <div>
                <strong style="display: block; font-size: 13px;">${log.item || log.type}</strong>
                <span class="text-muted" style="font-size: 11px;">Logged by: ${log.loggedBy} • ${log.date || log.timestamp}</span>
              </div>
              <div style="text-align: right; font-weight: 600;">
                ${log.quantity || log.weightKg} ${log.unit || 'kg'}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  exportComplianceReportPDF() {
    if (!this.selectedDepartment) {
      window.showGlobalToast('Please select a department first before generating a report.', 'error');
      return;
    }

    const perf = ComplianceEngine.getDepartmentPerformance(this.selectedDepartment);
    
    if (!perf.hasData) {
      window.showGlobalToast(`Cannot generate report: ${perf.message}`, 'error');
      return;
    }

    db.recordAuditLog({
      action: 'GENERATE_DEPARTMENT_REPORT',
      targetKey: this.selectedDepartment.replace('-', ' ').toUpperCase(),
      previousValue: 'N/A',
      newValue: 'PDF Exported',
      reason: `User generated a Department Performance Report for ${this.selectedDepartment}`
    });

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      window.showGlobalToast('PDF export failed. Please check popup blockers.', 'error');
      return;
    }
    
    const deptName = this.selectedDepartment.replace('-', ' ').toUpperCase();
    const currentDate = new Date().toLocaleDateString();

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${deptName} - Performance Report</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #18181b; background: #ffffff; }
          .header { border-bottom: 2px solid var(--primary, #059669); padding-bottom: 20px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: flex-start; }
          .title { font-size: 24px; font-weight: 800; color: #18181b; margin: 0; text-transform: uppercase; }
          .subtitle { color: #71717a; margin-top: 5px; font-size: 13px; }
          .seal { border: 1.5px solid var(--primary, #059669); color: var(--primary, #059669); padding: 6px 12px; border-radius: 6px; font-weight: 700; font-size: 11px; text-transform: uppercase; text-align: center; }
          .score-box { background: #f9fafb; border: 1px solid #e4e4e7; border-radius: 8px; padding: 20px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: center; }
          .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 25px; }
          .card { background: #ffffff; border: 1px solid #e4e4e7; border-radius: 8px; padding: 15px; }
          .card h4 { margin: 0 0 10px 0; color: #71717a; font-size: 12px; text-transform: uppercase; }
          .card .val { font-size: 24px; font-weight: 700; color: #18181b; margin: 0; }
          .table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
          .table th { text-align: left; padding: 10px; background: #f4f4f5; border-bottom: 2px solid #e4e4e7; color: #3f3f46; }
          .table td { padding: 10px; border-bottom: 1px solid #e4e4e7; color: #18181b; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e4e4e7; font-size: 11px; color: #a1a1aa; text-align: center; }
          .text-danger { color: #ef4444; font-weight: 600; }
          @media print { .no-print { display: none !important; } }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 20px; text-align: right;">
          <button onclick="window.print()" style="background: var(--primary, #059669); color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: 600; font-size: 14px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Save as PDF
          </button>
        </div>
        <div class="header">
          <div>
            <h1 class="title">${deptName} DEPARTMENT</h1>
            <div class="subtitle">Operational Performance & Compliance Analytics</div>
          </div>
          <div>
            <div class="seal">VM2026 Audit Ready</div>
            <div style="font-size: 11px; color: #71717a; text-align: right; margin-top: 8px;">Date: ${currentDate}</div>
          </div>
        </div>

        <div class="score-box">
          <div>
            <div style="font-size: 12px; color: #71717a; text-transform: uppercase; font-weight: 600;">Status Overview</div>
            <div style="font-size: 18px; font-weight: 700; margin-top: 5px; color: ${perf.flags.length > 0 ? '#ef4444' : '#059669'};">
              ${perf.flags.length > 0 ? 'Action Required (Anomalies Detected)' : 'Nominal Operation (Within Baseline limits)'}
            </div>
          </div>
        </div>

        <div class="grid">
          <div class="card">
            <h4>Energy Usage</h4>
            <div class="val">${perf.metrics.energy.toFixed(1)} kWh</div>
          </div>
          <div class="card">
            <h4>Water Usage</h4>
            <div class="val">${(perf.metrics.water / 1000).toFixed(1)} kL</div>
          </div>
          <div class="card">
            <h4>Waste Logged</h4>
            <div class="val">${perf.metrics.waste.toFixed(1)} kg</div>
          </div>
        </div>
        
        <h3 style="font-size: 14px; text-transform: uppercase; color: #3f3f46; border-bottom: 1px solid #e4e4e7; padding-bottom: 5px; margin-top: 30px;">Anomalies & Flags</h3>
        ${perf.utilityAnomalies.length > 0 ? `
          <table class="table">
            <thead>
              <tr>
                <th>Date / Time</th>
                <th>Meter ID</th>
                <th>Type</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${perf.utilityAnomalies.map(anom => `
                <tr>
                  <td>${anom.lastReadingTime || anom.lastUpdated || '-'}</td>
                  <td>${anom.id || anom.meterId}</td>
                  <td>${anom.type || anom.category}</td>
                  <td class="text-danger">${anom.status}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : `<p style="color: #71717a; font-size: 13px; padding: 15px; background: #f9fafb; border-radius: 6px; border: 1px dashed #d4d4d8;">No system anomalies detected for this department during the current period.</p>`}

        <div class="footer">
          EcoHotel OS Department Analytics System &bull; Confidential &bull; Generated ${currentDate}
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

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

    this.container.querySelectorAll('.dept-card').forEach(card => {
      card.onclick = () => {
        this.selectedDepartment = card.dataset.id;
        this.render();
      };
      card.onmouseover = () => {
        card.style.transform = 'translateY(-4px)';
        card.style.boxShadow = '0 8px 12px rgba(0,0,0,0.3)';
        card.style.borderColor = 'var(--primary)';
      };
      card.onmouseout = () => {
        card.style.transform = 'translateY(0)';
        card.style.boxShadow = '0 4px 6px rgba(0,0,0,0.2)';
        card.style.borderColor = 'var(--border-color)';
      };
    });

    const backBtn = this.container.querySelector('#btn-back-departments');
    if (backBtn) {
      backBtn.onclick = () => {
        this.selectedDepartment = '';
    this.unsubs = [];
        this.render();
      };
    }

    const exportBtn = this.container.querySelector('#btn-export-m1-pdf');
    if (exportBtn) {
      exportBtn.onclick = () => this.exportComplianceReportPDF();
    }
  }
}
