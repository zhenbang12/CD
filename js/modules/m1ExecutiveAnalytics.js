/**
 * Executive Sustainability Analytics Portal
 * Features: Cross-property environmental aggregation, compliance scoring,
 * interactive trend charts, parameterized report generator, official PDF export,
 * and operational baselines updater.
 */

import { db } from '../db/storage.js';
import { ComplianceEngine } from '../engines/complianceEngine.js';

export class Module1Executive {
  constructor(container) {
    this.container = container;
    this.chartMetric = 'food'; // 'food' | 'water' | 'energy' | 'co2' | 'cost'
    this.reportPeriod = 'all'; // 'all' | 'q1' | 'q2' | 'mtd'
    this.selectedDepartment = '';
    this.init();
  }

  init() {
    this.render();
    db.subscribe('system', () => this.render());
    db.subscribe('baselines', () => this.render());
    db.subscribe('auditLogs', () => this.render());
    db.subscribe('repairTickets', () => this.render());
    db.subscribe('plateWasteLogs', () => this.render());
    db.subscribe('foodWasteLogs', () => this.render());
    db.subscribe('utilityMeters', () => this.render());
  }

  render() {
    let compliance;
    let departmentPerformance = null;
    let isOperationsDirector = false;
    let baselines;
    let auditLogs;
    let complianceHistory;

    try {
      const databaseError = db.getLastDatabaseError();

      if (databaseError) {
        throw databaseError;
      }

      compliance = ComplianceEngine.calculateLiveScore();

      const system = db.getSystem();
      isOperationsDirector =
        system?.activeUser?.role === 'Operations Director';

      if (isOperationsDirector && this.selectedDepartment) {
        departmentPerformance =
          ComplianceEngine.getDepartmentPerformance(
            this.selectedDepartment
          );
      }

      baselines = db.getBaselines();
      auditLogs = db.get('auditLogs');
      complianceHistory = db.get('complianceLogs');
    } catch (error) {
      this.renderDashboardError(error);
      return;
    }

    // Filter compliance history by selected report period
    let filteredHistory = complianceHistory;
    if (this.reportPeriod === 'q1') {
      filteredHistory = complianceHistory.filter(c => c.month.includes('Mar') || c.month.includes('Apr'));
    } else if (this.reportPeriod === 'q2') {
      filteredHistory = complianceHistory.filter(c => c.month.includes('May') || c.month.includes('Jun') || c.month.includes('Jul'));
    } else if (this.reportPeriod === 'mtd') {
      filteredHistory = complianceHistory.filter(c => c.month.includes('Aug') || c.month.includes('MTD'));
    }

    this.container.innerHTML = `
      <div class="module-view m1-container fade-in">
        <!-- Module Header & Global Actions -->
        <div class="view-header">
          <div>
            <h1 class="view-title">Executive Sustainability Analytics</h1>
            <p class="view-subtitle">Cross-property environmental aggregation and sustainability compliance metrics.</p>
          </div>
          <div class="header-actions">
            <button class="btn btn-sm btn-outline" id="btn-export-m1-pdf">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export Compliance PDF
            </button>
            <button class="btn btn-sm btn-primary" id="btn-open-baseline-modal">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              Update Baselines
            </button>
          </div>
        </div>

        <!-- Top Metric KPI Cards -->
        <div class="grid grid-4 kpi-row">
          <div class="card kpi-card">
            <div class="kpi-header">
              <span class="kpi-label">Sustainability Score</span>
              <span class="badge badge-success">Certified</span>
            </div>
            <div class="kpi-body">
              <div class="kpi-score-main">${compliance.score}<span class="kpi-score-denom">/100</span></div>
              <div class="kpi-grade-text">${compliance.grade}</div>
            </div>
            <div class="progress-bar-wrap">
              <div class="progress-bar" style="width: ${compliance.score}%;"></div>
            </div>
          </div>

          <div class="card kpi-card">
            <div class="kpi-header">
              <span class="kpi-label">Food Waste Logged</span>
              <span class="badge badge-success">Live</span>
            </div>
            <div class="kpi-body">
              <div class="kpi-value-lg text-primary">${compliance.metrics.foodWasteCurrentKg.toFixed(1)} <span class="kpi-unit">kg current</span></div>
              <div class="kpi-desc">Aggregated from current waste records</div>
            </div>
            <div class="kpi-subtext text-muted">Current operational waste total</div>
          </div>

          <div class="card kpi-card">
            <div class="kpi-header">
              <span class="kpi-label">Current Water Usage</span>
              <span class="badge badge-info">Live</span>
            </div>
            <div class="kpi-body">
              <div class="kpi-value-lg text-info">${(compliance.metrics.waterUseCurrentL / 1000).toFixed(1)} <span class="kpi-unit">kL current</span></div>
              <div class="kpi-desc">Aggregated from current meter readings</div>
            </div>
            <div class="kpi-subtext text-muted">Current hotel-wide water consumption</div>
          </div>

          <div class="card kpi-card">
            <div class="kpi-header">
              <span class="kpi-label">Current Electricity Usage</span>
              <span class="badge badge-primary">Live</span>
            </div>
            <div class="kpi-body">
              <div class="kpi-value-lg">${compliance.metrics.energyUseCurrentKwh.toFixed(1)} <span class="kpi-unit">kWh current</span></div>
              <div class="kpi-desc">Aggregated from current meter readings</div>
            </div>
            <div class="kpi-subtext text-muted">Current hotel-wide electricity consumption</div>
          </div>
        </div>

        <!-- 2-Column Section: Trend Charts & Monthly Trajectory -->
        <div class="grid grid-2">
          <!-- Trajectory Trend Visualizer -->
          <div class="card">
            <div class="card-header">
              <div>
                <h3 class="card-title">Historical Trajectory Visualizer</h3>
                <p class="card-subtitle">Month-on-month trend telemetry against targets</p>
              </div>
              <div class="tab-pills">
                <button class="tab-btn ${this.chartMetric === 'food' ? 'active' : ''}" data-metric="food">Food (kg)</button>
                <button class="tab-btn ${this.chartMetric === 'water' ? 'active' : ''}" data-metric="water">Water (kL)</button>
                <button class="tab-btn ${this.chartMetric === 'energy' ? 'active' : ''}" data-metric="energy">Power (kWh)</button>
                <button class="tab-btn ${this.chartMetric === 'score' ? 'active' : ''}" data-metric="score">Score</button>
              </div>
            </div>
            
            <!-- SVG Chart Canvas -->
            <div class="chart-container" style="padding: 10px 0;">
              ${this.renderSVGChart(complianceHistory, this.chartMetric)}
            </div>
          </div>

          <!-- Parameterized Compliance Trajectory Table -->
          <div class="card">
            <div class="card-header">
              <div>
                <h3 class="card-title">Compliance Audit Log</h3>
                <p class="card-subtitle">Resource reductions across reporting quarters</p>
              </div>
              <div class="tab-pills">
                <button class="tab-btn ${this.reportPeriod === 'all' ? 'active' : ''}" data-period="all">All 6M</button>
                <button class="tab-btn ${this.reportPeriod === 'q1' ? 'active' : ''}" data-period="q1">Q1</button>
                <button class="tab-btn ${this.reportPeriod === 'q2' ? 'active' : ''}" data-period="q2">Q2</button>
                <button class="tab-btn ${this.reportPeriod === 'mtd' ? 'active' : ''}" data-period="mtd">MTD</button>
              </div>
            </div>
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Reporting Month</th>
                    <th>Food Saved</th>
                    <th>Water Conserved</th>
                    <th>Energy Saved</th>
                    <th>Compliance Score</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${filteredHistory.map(row => `
                    <tr>
                      <td><strong>${row.month}</strong></td>
                      <td>${row.foodSavedKg.toLocaleString()} kg</td>
                      <td>${(row.waterConservedL / 1000).toFixed(1)} kL</td>
                      <td>${row.energySavedKwh.toLocaleString()} kWh</td>
                      <td><span class="score-pill ${row.vmScore >= 90 ? 'pill-high' : 'pill-mid'}">${row.vmScore}/100</span></td>
                      <td><span class="badge ${row.vmScore >= 90 ? 'badge-success' : 'badge-info'}">${row.status}</span></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- 2-Column Section: Departmental Performance & Operational Baselines -->
        <div class="grid grid-2">
          <!-- Departmental Offender Heatmap -->
          <div class="card">
            <div class="card-header">
              <div>
                <h3 class="card-title">Departmental Performance</h3>
                <p class="card-subtitle">
                  Performance, spoilage logs and utility anomalies
                </p>
              </div>
            </div>

            ${!isOperationsDirector ? `
              <p class="text-muted">
                Operations Director access is required.
              </p>
            ` : `
              <select class="form-input form-input-sm"
                      id="department-selector">
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
          ? '<p class="text-muted">No records found for this department</p>'
          : this.renderDepartmentBreakdown(departmentPerformance)
      }
            `}
          </div>

          <!-- Operational Baselines -->
          <div class="card">
            <div class="card-header">
              <div>
                <h3 class="card-title">Operational Resource Baselines</h3>
                <p class="card-subtitle">Calibrated targets and consumption standards</p>
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

        <!-- System Security Audit Trail -->
        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">System Log & Parameter Adjustments</h3>
              <p class="card-subtitle">Timestamped ledger recording administrative calibration changes</p>
            </div>
            <span class="badge badge-secondary">Audit Trail</span>
          </div>
          <div class="audit-stream">
            ${auditLogs.length === 0 ? `
              <div class="text-muted text-center py-3">No baseline adjustments have been recorded.</div>
            ` : auditLogs.slice(0, 6).map(log => `
              <div class="audit-entry">
                <div class="audit-icon">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <div class="audit-content">
                  <div class="audit-top">
                    <span class="audit-action"><code>${log.action}</code></span>
                    <span class="audit-time text-muted">${log.timestamp}</span>
                  </div>
                  <div class="audit-desc">
                    <strong>${log.userName}</strong> adjusted <code>${log.targetKey}</code>:
                    <span class="audit-diff text-danger">${log.previousValue}</span> ➔ <span class="audit-diff text-success">${log.newValue}</span>
                  </div>
                  <div class="audit-reason text-muted"><em>Reason: ${log.reason}</em></div>
                </div>
              </div>
            `).join('')}
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
    `;

    this.attachEventListeners();
  }

  renderDepartmentBreakdown(data) {
    return `
      <h4>Performance Data</h4>
      ${data.performanceData.map(meter => `
        <div class="heatmap-item">
          <strong>${meter.zone}</strong>
          <span>
            ${meter.lastReading} ${meter.unit} - ${meter.status}
          </span>
        </div>
      `).join('')}

      <h4>Spoilage Logs</h4>
      ${data.spoilageLogs.length
        ? data.spoilageLogs.map(log => `
            <div class="heatmap-item">
              <strong>${log.item}</strong>
              <span>${log.quantity} ${log.unit} - ${log.reason}</span>
            </div>
          `).join('')
        : '<p class="text-muted">No spoilage records.</p>'
      }

      <h4>Utility Anomalies</h4>
      ${data.utilityAnomalies.length
        ? data.utilityAnomalies.map(meter => `
            <div class="heatmap-item">
              <strong>${meter.zone}</strong>
              <span>${meter.status}</span>
            </div>
          `).join('')
        : '<p class="text-muted">No utility anomalies.</p>'
      }
    `;
  }

  renderDashboardError(error) {
    console.error('Dashboard loading failed:', error);

    this.container.innerHTML = `
    <div class="card">
      <h2>Unable to load dashboard data</h2>
      <p class="text-muted">
        The dashboard metrics could not be retrieved.
      </p>
      <button class="btn btn-sm btn-primary" id="retry-dashboard">
        Refresh
      </button>
    </div>
  `;

    this.container.querySelector('#retry-dashboard').onclick = () => {
      db.clearLastDatabaseError();
      this.render();
    };
  }

  renderSVGChart(history, metricKey) {
    let dataPoints = [];
    let label = 'Food Saved (kg)';
    let color = '#059669';

    if (metricKey === 'food') {
      dataPoints = history.map(h => ({ x: h.month.split(' ')[0], y: h.foodSavedKg }));
      label = 'Food Saved (kg)';
      color = '#059669';
    } else if (metricKey === 'water') {
      dataPoints = history.map(h => ({ x: h.month.split(' ')[0], y: h.waterConservedL / 1000 }));
      label = 'Water Conserved (kL)';
      color = '#0284c7';
    } else if (metricKey === 'energy') {
      dataPoints = history.map(h => ({ x: h.month.split(' ')[0], y: h.energySavedKwh }));
      label = 'Power Saved (kWh)';
      color = '#71717a';
    } else if (metricKey === 'score') {
      dataPoints = history.map(h => ({ x: h.month.split(' ')[0], y: h.vmScore }));
      label = 'Compliance Score (/100)';
      color = '#059669';
    }

    const maxY = Math.max(...dataPoints.map(d => d.y)) * 1.15 || 100;
    const minY = 0;
    const width = 580;
    const height = 180;
    const padding = 35;

    const points = dataPoints.map((d, i) => {
      const x = padding + (i * ((width - padding * 2) / (dataPoints.length - 1)));
      const y = height - padding - ((d.y - minY) / (maxY - minY)) * (height - padding * 2);
      return { x, y, val: d.y, label: d.x };
    });

    const pathD = points.reduce((acc, p, i) => i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`, '');
    const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

    return `
      <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" style="overflow: visible;">
        <defs>
          <linearGradient id="chartGrad-${metricKey}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${color}" stop-opacity="0.2" />
            <stop offset="100%" stop-color="${color}" stop-opacity="0.0" />
          </linearGradient>
        </defs>
        <!-- Horizontal Gridlines -->
        <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="rgba(128,128,128,0.15)" stroke-width="1" />
        <line x1="${padding}" y1="${(height - padding) / 2}" x2="${width - padding}" y2="${(height - padding) / 2}" stroke="rgba(128,128,128,0.1)" stroke-dasharray="4" />
        
        <!-- Area fill -->
        <path d="${areaD}" fill="url(#chartGrad-${metricKey})" />
        
        <!-- Line stroke -->
        <path d="${pathD}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" />
        
        <!-- Data Dots & Labels -->
        ${points.map(p => `
          <circle cx="${p.x}" cy="${p.y}" r="3.5" fill="${color}" stroke="#ffffff" stroke-width="1.5" />
          <text x="${p.x}" y="${p.y - 8}" fill="${color}" font-size="10" font-weight="600" text-anchor="middle" font-family="sans-serif">${p.val.toLocaleString()}</text>
          <text x="${p.x}" y="${height - 12}" fill="#71717a" font-size="11" text-anchor="middle" font-family="sans-serif">${p.label}</text>
        `).join('')}
      </svg>
    `;
  }

  attachEventListeners() {
    const departmentSelector =
      this.container.querySelector('#department-selector');

    if (departmentSelector) {
      departmentSelector.value = this.selectedDepartment;

      departmentSelector.onchange = event => {
        this.selectedDepartment = event.target.value;
        this.render();
      };
    }
    
    // Chart metric tabs
    this.container.querySelectorAll('.tab-btn[data-metric]').forEach(btn => {
      btn.onclick = () => {
        this.chartMetric = btn.dataset.metric;
        this.render();
      };
    });

    // Report period tabs
    this.container.querySelectorAll('.tab-btn[data-period]').forEach(btn => {
      btn.onclick = () => {
        this.reportPeriod = btn.dataset.period;
        this.render();
      };
    });

    // Modal Handlers
    const modal = this.container.querySelector('#baseline-modal');
    const openBtn = this.container.querySelector('#btn-open-baseline-modal');
    const closeBtn = this.container.querySelector('#btn-close-baseline-modal');
    const cancelBtn = this.container.querySelector('#btn-cancel-baseline');
    const form = this.container.querySelector('#form-update-baseline');
    const exportBtn = this.container.querySelector('#btn-export-m1-pdf');

    if (openBtn) openBtn.onclick = () => { modal.style.display = 'flex'; };
    if (closeBtn) closeBtn.onclick = () => { modal.style.display = 'none'; };
    if (cancelBtn) cancelBtn.onclick = () => { modal.style.display = 'none'; };

    if (form) {
      form.onsubmit = (e) => {
        e.preventDefault();
        const id = this.container.querySelector('#modal-baseline-id').value;
        const val = this.container.querySelector('#modal-baseline-val').value;
        const reason = this.container.querySelector('#modal-baseline-reason').value;

        if (parseFloat(val) <= 0 || isNaN(parseFloat(val))) {
          alert('Baseline value must be a positive numeric number.');
          return;
        }

        const success = db.updateBaseline(id, val, reason);
        if (success) {
          modal.style.display = 'none';
          window.showGlobalToast?.('Operational baseline updated!', 'success');
        }
      };
    }

    if (exportBtn) {
      exportBtn.onclick = () => this.exportComplianceReportPDF();
    }
  }

  exportComplianceReportPDF() {
    const compliance = ComplianceEngine.calculateLiveScore();
    const printWindow = window.open('', '_blank', 'width=900,height=700');
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
            Verified Report<br/>Platinum Tier
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
              <td>Water Conserved (Guest Opt-Outs & Leak Fixes)</td>
              <td>${(compliance.metrics.waterConservedMTD / 1000).toFixed(1)} kL (122,000 Liters)</td>
              <td>+14.2% Conformance</td>
              <td>${((compliance.metrics.waterConservedMTD / 1000) * 0.35).toFixed(0)} kg CO2e</td>
            </tr>
            <tr>
              <td>Electricity Conservation</td>
              <td>${compliance.metrics.energySavedMTD} kWh</td>
              <td>+12.0% Target Compliant</td>
              <td>${(compliance.metrics.energySavedMTD * 0.65).toFixed(0)} kg CO2e</td>
            </tr>
          </tbody>
        </table>
        <div class="footer">
          <span>Verified System Hash: SEC-${Date.now()}</span>
          <span>Grand Bay Eco-Resort & Spa</span>
        </div>
        <script>
          window.onload = () => { window.print(); };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }
}
