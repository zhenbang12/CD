import { db } from '../db/storage.js';
import { ComplianceEngine } from '../engines/complianceEngine.js';

export class Module1Department {
  constructor(container) {
    this.container = container;
    this.selectedDepartment = '';
    this.init();
  }

  init() {
    this.render();
    db.subscribe('system', () => this.render());
    db.subscribe('baselines', () => this.render());
    db.subscribe('plateWasteLogs', () => this.render());
    db.subscribe('foodWasteLogs', () => this.render());
    db.subscribe('utilityMeters', () => this.render());
  }

  render() {
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

    const sidebarTpl = `
      <aside style="width: 240px; flex-shrink: 0; position: sticky; top: 120px; display: flex; flex-direction: column; gap: 8px;">
        <div class="card" style="padding: 16px; display: flex; flex-direction: column; gap: 8px;">
          <h4 style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); margin-bottom: 8px; padding-left: 4px; letter-spacing: 0.05em;">Executive Analytics</h4>
          
          <button class="btn btn-sm btn-outline btn-block sidebar-nav-btn" data-target="m1-dashboard" style="justify-content: flex-start; padding-left: 12px;">
            <span style="margin-right: 6px;">📊</span> Sustainability Dashboard
          </button>
          
          <button class="btn btn-sm btn-primary btn-block sidebar-nav-btn" data-target="m1-department" style="justify-content: flex-start; padding-left: 12px;">
            <span style="margin-right: 6px;">🏢</span> Department Dashboard
          </button>
          
          <button class="btn btn-sm btn-outline btn-block sidebar-nav-btn" data-target="m1-baselines" style="justify-content: flex-start; padding-left: 12px;">
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
            <p class="view-subtitle">Departmental performance, spoilage logs and utility anomalies.</p>
          </div>
          <div class="header-actions">
            <button class="btn btn-sm btn-outline" id="btn-export-m1-pdf">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Generate Sustainability Compliance Report
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
                  <h3 class="card-title">Departmental Performance</h3>
                  <p class="card-subtitle">Select a department to view detailed resource consumption.</p>
                </div>
              </div>

              ${!isAuthorized ? `
                <p class="text-muted">Operations Director or Executive access is required.</p>
              ` : `
                <select class="form-input form-input-sm" id="department-selector" style="max-width: 300px; margin-bottom: 15px;">
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
        </div>
      </div>
        <!-- Export PDF Modal -->
        <div class="modal-backdrop" id="export-pdf-modal" style="display: none; z-index: 1000;">
          <div class="modal-card" style="max-width: 400px; padding: 24px;">
            <div class="modal-header">
              <h3 class="modal-title">Generate PDF Report</h3>
              <button class="modal-close" id="btn-close-export-modal">&times;</button>
            </div>
            <div style="padding: 16px 0;">
              <p class="text-muted" style="font-size: 13px; line-height: 1.4; margin-bottom: 20px;">Select the scope of the audit report you wish to export.</p>
              <div class="form-group">
                <select id="export-scope-selector" class="form-input" style="width: 100%;">
                  <option value="global">Overall Hotel Sustainability Scorecard</option>
                  <option value="kitchen">Kitchen & F&B Department</option>
                  <option value="housekeeping">Housekeeping Department</option>
                  <option value="laundry">Laundry Department</option>
                  <option value="facilities">Facilities & Engineering</option>
                  <option value="front-office">Front Office</option>
                </select>
              </div>
            </div>
            <div class="modal-footer" style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-subtle);">
              <button class="btn btn-sm btn-outline" id="btn-cancel-export">Cancel</button>
              <button class="btn btn-sm btn-primary" id="btn-confirm-export">Generate Report</button>
            </div>
          </div>
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

  exportComplianceReportPDF(scope = 'global') {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      window.showGlobalToast('PDF export failed. Please check popup blockers.', 'error');
      return;
    }

    if (scope === 'global') {
      const compliance = ComplianceEngine.calculateLiveScore();
      if (!compliance.dataComplete) {
        window.showGlobalToast('Global data incomplete.', 'error');
        printWindow.close();
        return;
      }
      
      const fTarget = compliance.metrics.foodWasteTargetKg || 0;
      const fActual = compliance.metrics.foodWasteCurrentKg || 0;
      const fVariance = ((fActual - fTarget) / (fTarget || 1) * 100).toFixed(1);
      
      const wTarget = compliance.metrics.waterTargetL || 0;
      const wActual = compliance.metrics.waterUseCurrentL || 0;
      const wVariance = ((wActual - wTarget) / (wTarget || 1) * 100).toFixed(1);
      
      const eTarget = compliance.metrics.energyTargetKwh || 0;
      const eActual = compliance.metrics.energyUseCurrentKwh || 0;
      const eVariance = ((eActual - eTarget) / (eTarget || 1) * 100).toFixed(1);

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Global Sustainability Compliance Report</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #18181b; background: #ffffff; }
            .header { border-bottom: 2px solid #059669; padding-bottom: 20px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: flex-start; }
            .title { font-size: 20px; font-weight: 800; color: #18181b; margin: 0; }
            .subtitle { color: #71717a; margin-top: 5px; font-size: 12px; }
            .seal { border: 1.5px solid #059669; color: #059669; padding: 6px 12px; border-radius: 6px; font-weight: 700; font-size: 11px; text-transform: uppercase; text-align: center; }
            .score-box { background: #f9fafb; border: 1px solid #e4e4e7; border-radius: 8px; padding: 20px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: center; }
            .score-num { font-size: 44px; font-weight: 800; color: #059669; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { text-align: left; padding: 12px 10px; border-bottom: 1px solid #e4e4e7; font-size: 12px; }
            th { background: #f4f4f5; font-size: 10px; text-transform: uppercase; color: #71717a; }
            .footer { margin-top: 40px; font-size: 11px; color: #71717a; border-top: 1px solid #e4e4e7; padding-top: 15px; display: flex; justify-content: space-between; }
            .bad { color: #dc2626; font-weight: 600; }
            .good { color: #059669; font-weight: 600; }
            .print-btn-container { text-align: right; margin-bottom: 30px; }
            .print-btn { background: #059669; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: 600; font-size: 14px; cursor: pointer; }
            @media print { .print-btn-container { display: none !important; } body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="print-btn-container"><button class="print-btn" onclick="window.print()">Download / Save as PDF</button></div>
          <div class="header">
            <div>
              <div class="title">GLOBAL SUSTAINABILITY AUDIT REPORT</div>
              <div class="subtitle">Property: Grand Bay Eco-Resort & Spa • Date: ${new Date().toLocaleDateString()}</div>
            </div>
            <div class="seal">Report Data<br/>${compliance.label}</div>
          </div>
          <div class="score-box">
            <div>
              <h3 style="margin: 0 0 4px 0; font-size: 16px;">Overall Environmental Conformance Grade</h3>
              <p style="margin: 0; color: #18181b; font-weight: 600;">${compliance.grade}</p>
              <p style="margin: 4px 0 0 0; color: #71717a; font-size: 11px;">Active High-Priority Defects: ${compliance.metrics.activeHighTickets}</p>
            </div>
            <div class="score-num">${compliance.score} / 100</div>
          </div>
          <h3 style="margin-bottom: 5px; font-size: 14px;">Live Resource Utilization vs Dynamic Targets</h3>
          <table>
            <thead>
              <tr><th>Resource Metric</th><th>Dynamic Baseline Target</th><th>Actual Logged Usage</th><th>Variance Status</th></tr>
            </thead>
            <tbody>
              <tr><td><strong>F&B Spoilage & Prep Waste</strong></td><td>${fTarget.toFixed(1)} kg</td><td>${fActual.toFixed(1)} kg</td><td class="${fVariance > 0 ? 'bad' : 'good'}">${fVariance > 0 ? '+' : ''}${fVariance}%</td></tr>
              <tr><td><strong>Water Consumption</strong></td><td>${(wTarget/1000).toFixed(2)} kL</td><td>${(wActual/1000).toFixed(2)} kL</td><td class="${wVariance > 0 ? 'bad' : 'good'}">${wVariance > 0 ? '+' : ''}${wVariance}%</td></tr>
              <tr><td><strong>Energy Yield</strong></td><td>${eTarget.toFixed(0)} kWh</td><td>${eActual.toFixed(0)} kWh</td><td class="${eVariance > 0 ? 'bad' : 'good'}">${eVariance > 0 ? '+' : ''}${eVariance}%</td></tr>
            </tbody>
          </table>
          <div style="margin-top: 30px; padding: 15px; background: #ecfdf5; border-radius: 8px;">
            <h4 style="margin: 0 0 10px 0; color: #065f46; font-size: 13px;">Month-To-Date (MTD) Carbon Avoidance</h4>
            <div style="display: flex; gap: 40px; font-size: 12px; color: #064e3b;">
              <div><strong>CO2e Offset:</strong> ${(compliance.metrics.totalCo2AvoidedKg / 1000).toFixed(1)} metric tons</div>
              <div><strong>Cost Savings:</strong> RM ${compliance.metrics.totalCostSavingsMyr.toLocaleString()}</div>
            </div>
          </div>
          <div class="footer"><div>Generated by EcoHotel OS Validation Engine</div><div>Page 1 of 1</div></div>
        </body>
        </html>
      `);
      
      // Record Audit Log for PDF Generation
      if (typeof db !== 'undefined') {
        db.recordAuditLog({
          action: "SYSTEM_REPORT_GEN",
          targetKey: `compliance_pdf_${scope}`,
          previousValue: "N/A",
          newValue: "Exported",
          effectiveDate: new Date().toISOString().split('T')[0],
          reason: `Generated ${scope === 'global' ? 'Global' : scope.charAt(0).toUpperCase() + scope.slice(1)} Audit Report`
        });
      }
      printWindow.document.close();
    
      return;
    }

    // Department Specific Report
    const deptData = ComplianceEngine.getDepartmentPerformance(scope);
    if (!deptData || !deptData.hasData) {
      window.showGlobalToast("PDF export failed. No records found for the " + scope + " department.", 'error');
      printWindow.close();
      return;
    }

    let energyTarget = 0; let waterTarget = 0;
    deptData.performanceData.forEach(m => {
      const t = (m.type || '').toLowerCase();
      if (t === 'electricity' || t === 'energy' || t === 'power') energyTarget += m.baselineDaily || 0;
      if (t === 'water') waterTarget += m.baselineDaily || 0;
    });

    const wActual = deptData.metrics.water || 0;
    const wVariance = waterTarget ? (((wActual - waterTarget) / waterTarget) * 100).toFixed(1) : '0.0';
    const eActual = deptData.metrics.energy || 0;
    const eVariance = energyTarget ? (((eActual - energyTarget) / energyTarget) * 100).toFixed(1) : '0.0';
    const fActual = deptData.metrics.waste || 0;
    const deptName = scope.charAt(0).toUpperCase() + scope.slice(1);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${deptName} Department Report</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #18181b; background: #ffffff; }
          .header { border-bottom: 2px solid #059669; padding-bottom: 20px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: flex-start; }
          .title { font-size: 20px; font-weight: 800; color: #18181b; margin: 0; text-transform: uppercase; }
          .subtitle { color: #71717a; margin-top: 5px; font-size: 12px; }
          .seal { border: 1.5px solid #059669; color: #059669; padding: 6px 12px; border-radius: 6px; font-weight: 700; font-size: 11px; text-transform: uppercase; text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { text-align: left; padding: 12px 10px; border-bottom: 1px solid #e4e4e7; font-size: 12px; }
          th { background: #f4f4f5; font-size: 10px; text-transform: uppercase; color: #71717a; }
          .footer { margin-top: 40px; font-size: 11px; color: #71717a; border-top: 1px solid #e4e4e7; padding-top: 15px; display: flex; justify-content: space-between; }
          .bad { color: #dc2626; font-weight: 600; }
          .good { color: #059669; font-weight: 600; }
          .print-btn-container { text-align: right; margin-bottom: 30px; }
          .print-btn { background: #059669; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: 600; font-size: 14px; cursor: pointer; }
          @media print { .print-btn-container { display: none !important; } body { padding: 0; } }
          .anomaly-box { margin-top: 25px; padding: 15px; border-left: 4px solid #dc2626; background: #fef2f2; border-radius: 4px; }
          .anomaly-list { margin: 0; padding-left: 20px; font-size: 12px; color: #7f1d1d; }
        </style>
      </head>
      <body>
        <div class="print-btn-container"><button class="print-btn" onclick="window.print()">Download / Save as PDF</button></div>
        <div class="header">
          <div><div class="title">${deptName} DEPARTMENT AUDIT REPORT</div><div class="subtitle">Property: Grand Bay Eco-Resort & Spa • Date: ${new Date().toLocaleDateString()}</div></div>
          <div class="seal">Departmental<br/>Analysis</div>
        </div>
        <h3 style="margin-bottom: 5px; font-size: 14px;">Department Resource Utilization</h3>
        <table>
          <thead><tr><th>Resource Metric</th><th>Allocated Baseline Target</th><th>Actual Logged Usage</th><th>Variance Status</th></tr></thead>
          <tbody>
            <tr><td><strong>Water Consumption</strong></td><td>${(waterTarget/1000).toFixed(2)} kL</td><td>${(wActual/1000).toFixed(2)} kL</td><td class="${wVariance > 0 ? 'bad' : 'good'}">${wVariance > 0 ? '+' : ''}${wVariance}%</td></tr>
            <tr><td><strong>Energy Yield</strong></td><td>${energyTarget.toFixed(0)} kWh</td><td>${eActual.toFixed(0)} kWh</td><td class="${eVariance > 0 ? 'bad' : 'good'}">${eVariance > 0 ? '+' : ''}${eVariance}%</td></tr>
            <tr><td><strong>F&B Spoilage / Prep Waste</strong></td><td>N/A (Variable)</td><td>${fActual.toFixed(1)} kg</td><td>-</td></tr>
          </tbody>
        </table>
        ${deptData.utilityAnomalies.length > 0 ? `
        <div class="anomaly-box">
          <h4 style="margin: 0 0 10px 0; color: #991b1b; font-size: 13px;">Detected Utility Anomalies</h4>
          <ul class="anomaly-list">
            ${deptData.utilityAnomalies.map(a => `<li><strong>${a.meterId} (${a.zone}):</strong> ${a.status} - Currently at ${a.lastReading} ${a.unit}</li>`).join('')}
          </ul>
        </div>` : ''}
        <div class="footer"><div>Generated by EcoHotel OS Validation Engine</div><div>Page 1 of 1</div></div>
      </body>
      </html>
    `);
    
      // Record Audit Log for PDF Generation
      if (typeof db !== 'undefined') {
        db.recordAuditLog({
          action: "SYSTEM_REPORT_GEN",
          targetKey: `compliance_pdf_${scope}`,
          previousValue: "N/A",
          newValue: "Exported",
          effectiveDate: new Date().toISOString().split('T')[0],
          reason: `Generated ${scope === 'global' ? 'Global' : scope.charAt(0).toUpperCase() + scope.slice(1)} Audit Report`
        });
      }
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
      const exportModal = this.container.querySelector('#export-pdf-modal');
      const cancelExport = this.container.querySelector('#btn-cancel-export');
      const confirmExport = this.container.querySelector('#btn-confirm-export');
      const scopeSelector = this.container.querySelector('#export-scope-selector');

      if (exportBtn && exportModal) {
        exportBtn.onclick = () => {
          // Default to the currently selected department, or global if none
          scopeSelector.value = this.selectedDepartment || 'global';
          exportModal.style.display = 'flex';
        };
      }
      if (cancelExport) cancelExport.onclick = () => exportModal.style.display = 'none';
      const closeExport = this.container.querySelector('#btn-close-export-modal');
      if (closeExport) closeExport.onclick = () => exportModal.style.display = 'none';
      if (confirmExport) {
        confirmExport.onclick = () => {
          exportModal.style.display = 'none';
          this.exportComplianceReportPDF(scopeSelector.value);
        };
      }
    }
  }
}
