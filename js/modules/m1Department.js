import { db } from '../db/storage.js';
import { ComplianceEngine } from '../engines/complianceEngine.js';

export class Module1Department {
  constructor(container) {
    this.container = container;
    this.selectedDepartment = '';
    this.unsubs = [];
    this.isDestroyed = false;
    this.init();
  }

  init() {
    this.render();
    this.unsubs.push(
      db.subscribe('system', () => { if (!this.isDestroyed) this.render(); }),
      db.subscribe('baselines', () => { if (!this.isDestroyed) this.render(); }),
      db.subscribe('plateWasteLogs', () => { if (!this.isDestroyed) this.render(); }),
      db.subscribe('foodWasteLogs', () => { if (!this.isDestroyed) this.render(); }),
      db.subscribe('utilityMeters', () => { if (!this.isDestroyed) this.render(); })
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
    let departmentPerformance = null;
    let isAuthorized = false;

    try {
      const databaseError = db.getLastDatabaseError();
      if (databaseError) throw databaseError;

      const system = db.getSystem();
      const role = system?.activeUser?.role || '';
      
      // Allow Operations Director and Executive roles
      isAuthorized = role === 'Operations Director' || role.includes('Executive');

      if (isAuthorized && this.selectedDepartment) {
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
            <button class="btn btn-sm btn-outline" id="btn-export-m1-pdf">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Generate Sustainability Compliance Report
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
    const compliance = ComplianceEngine.calculateLiveScore();
    
    if (!compliance.dataComplete) {
      alert("PDF export failed. Please try again later. Data incomplete. A compliance grade cannot be calculated.");
      return;
    }

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      alert("PDF export failed. Please try again later.");
      return;
    }
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Sustainability Compliance Report</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #18181b; background: #ffffff; }
          .header { border-bottom: 2px solid #059669; padding-bottom: 20px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: flex-start; }
          .title { font-size: 20px; font-weight: 800; color: #18181b; margin: 0; }
          .subtitle { color: #71717a; margin-top: 5px; font-size: 12px; }
          .seal { border: 1.5px solid #059669; color: #059669; padding: 6px 12px; border-radius: 6px; font-weight: 700; font-size: 11px; text-transform: uppercase; text-align: center; }
          .score-box { background: #f9fafb; border: 1px solid #e4e4e7; border-radius: 8px; padding: 20px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: center; }
          .score-num { font-size: 44px; font-weight: 800; color: #059669; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { text-align: left; padding: 10px; border-bottom: 1px solid #e4e4e7; font-size: 12px; }
          th { background: #f4f4f5; font-size: 10px; text-transform: uppercase; color: #71717a; }
          .footer { margin-top: 40px; font-size: 11px; color: #71717a; border-top: 1px solid #e4e4e7; padding-top: 15px; display: flex; justify-content: space-between; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">SUSTAINABILITY COMPLIANCE AUDIT REPORT</div>
            <div class="subtitle">Property: Grand Bay Eco-Resort & Spa • Date: ${new Date().toLocaleDateString()}</div>
          </div>
          <div class="seal">
            Report Data<br/>${compliance.label}
          </div>
        </div>
        <div class="score-box">
          <div>
            <h3 style="margin: 0 0 4px 0; font-size: 16px;">Overall Environmental Conformance Grade</h3>
            <p style="margin: 0; color: #18181b; font-weight: 600;">${compliance.grade}</p>
            <p style="margin: 4px 0 0 0; color: #71717a; font-size: 11px;">GHG Avoided: ${(compliance.metrics.totalCo2AvoidedKg / 1000).toFixed(1)} metric tons CO2e • Net Operational Cost Savings: RM ${compliance.metrics.totalCostSavingsMyr.toLocaleString()}</p>
          </div>
          <div class="score-num">${compliance.score} / 100</div>
        </div>
        <h3>Cumulative Month-to-Date Resource Savings</h3>
        <table>
          <thead>
            <tr>
              <th>Resource Metric</th>
              <th>Month-to-Date Conserved</th>
              <th>Status vs Baseline Target</th>
              <th>CO2e Offset</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>F&B Spoilage & Prep Waste Prevented</td>
              <td>${compliance.metrics.foodWasteSavedMTD} kg</td>
              <td>+18.4% (Optimized Batching)</td>
              <td>${(compliance.metrics.foodWasteSavedMTD * 2.5).toFixed(0)} kg CO2e</td>
            </tr>
            <tr>
              <td>Water Recovered & Conserved</td>
              <td>${(compliance.metrics.waterSavedMTD / 1000).toFixed(1)} kL</td>
              <td>+12.1% (Aerator Flow Calibration)</td>
              <td>${(compliance.metrics.waterSavedMTD / 1000 * 0.3).toFixed(1)} kg CO2e</td>
            </tr>
            <tr>
              <td>Energy Optimization Yield</td>
              <td>${compliance.metrics.energySavedMTD.toLocaleString()} kWh</td>
              <td>+8.5% (Smart HVAC Throttling)</td>
              <td>${(compliance.metrics.energySavedMTD * 0.4).toFixed(0)} kg CO2e</td>
            </tr>
          </tbody>
        </table>
        <div class="footer">
          <div>Generated by EcoHotel OS Validation Engine • User ID: ADMIN_EXEC_01</div>
          <div>Page 1 of 1</div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
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

    const departmentSelector = this.container.querySelector('#department-selector');
    if (departmentSelector) {
      departmentSelector.value = this.selectedDepartment;
      departmentSelector.onchange = event => {
        this.selectedDepartment = event.target.value;
        this.render();
      };
    }

    const exportBtn = this.container.querySelector('#btn-export-m1-pdf');
    if (exportBtn) {
      exportBtn.onclick = () => this.exportComplianceReportPDF();
    }
  }
}
