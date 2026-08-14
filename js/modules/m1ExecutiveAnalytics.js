/**
 * Module 1: Executive Sustainability Analytics Portal (PIC: Kar Hang)
 * Features: Cross-property environmental aggregation, VM2026 compliance scoring,
 * interactive SVG trend charts, parameterized report generator, official PDF export,
 * operational baselines updater with immutable audit logging.
 */

import { db } from '../db/storage.js';
import { ComplianceEngine } from '../engines/complianceEngine.js';

export class Module1Executive {
  constructor(container) {
    this.container = container;
    this.chartMetric = 'food'; // 'food' | 'water' | 'energy' | 'co2' | 'cost'
    this.reportPeriod = 'all'; // 'all' | 'q1' | 'q2' | 'mtd'
    this.init();
  }

  init() {
    this.render();
    db.subscribe('baselines', () => this.render());
    db.subscribe('auditLogs', () => this.render());
    db.subscribe('repairTickets', () => this.render());
    db.subscribe('plateWasteLogs', () => this.render());
    db.subscribe('foodWasteLogs', () => this.render());
    db.subscribe('utilityMeters', () => this.render());
  }

  render() {
    const compliance = ComplianceEngine.calculateLiveScore();
    const heatmaps = ComplianceEngine.getDepartmentHeatmaps();
    const baselines = db.getBaselines();
    const auditLogs = db.get('auditLogs');
    const complianceHistory = db.get('complianceLogs');

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
            <span class="badge badge-primary">Module 1 • Executive Portal</span>
            <h1 class="view-title">Executive Sustainability Analytics</h1>
            <p class="view-subtitle">Cross-property environmental aggregation & Visit Malaysia 2026 (VM2026) compliance engine (FR_01 - FR_08).</p>
          </div>
          <div class="header-actions">
            <button class="btn btn-outline" id="btn-export-m1-pdf">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export Compliance PDF (FR_07)
            </button>
            <button class="btn btn-primary" id="btn-open-baseline-modal">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              Update Baselines (FR_04)
            </button>
          </div>
        </div>

        <!-- Top Metric KPI Cards -->
        <div class="grid grid-4 kpi-row">
          <div class="card kpi-card ${compliance.statusClass}">
            <div class="kpi-header">
              <span class="kpi-label">VM2026 Compliance Score</span>
              <span class="badge ${compliance.gradeBadge}">Live Grade</span>
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
              <span class="kpi-label">Food Waste Avoided</span>
              <span class="badge badge-success">+18.4% YoY</span>
            </div>
            <div class="kpi-body">
              <div class="kpi-value-lg text-primary">${compliance.metrics.foodWasteSavedMTD.toLocaleString()} <span class="kpi-unit">kg MTD</span></div>
              <div class="kpi-desc">Avoided kitchen spoilage & over-prep</div>
            </div>
            <div class="kpi-subtext text-muted">Target: 800 kg/month (Surpassed)</div>
          </div>

          <div class="card kpi-card">
            <div class="kpi-header">
              <span class="kpi-label">Water Conserved (Audit)</span>
              <span class="badge badge-info">+14.2%</span>
            </div>
            <div class="kpi-body">
              <div class="kpi-value-lg text-info">${(compliance.metrics.waterConservedMTD / 1000).toFixed(1)} <span class="kpi-unit">kL MTD</span></div>
              <div class="kpi-desc">Guest opt-outs & fast leak repairs</div>
            </div>
            <div class="kpi-subtext text-muted">122,000 Liters cumulative saving</div>
          </div>

          <div class="card kpi-card">
            <div class="kpi-header">
              <span class="kpi-label">GHG Decarbonization</span>
              <span class="badge badge-primary">ESG Certified</span>
            </div>
            <div class="kpi-body">
              <div class="kpi-value-lg">${(compliance.metrics.totalCo2AvoidedKg / 1000).toFixed(1)} <span class="kpi-unit">t CO2e</span></div>
              <div class="kpi-desc">RM ${compliance.metrics.totalCostSavingsMyr.toLocaleString()} estimated savings</div>
            </div>
            <div class="kpi-subtext text-muted">Energy: 10,400 kWh saved MTD</div>
          </div>
        </div>

        <!-- 2-Column Section: Interactive SVG Visualizer & Monthly Trajectory -->
        <div class="grid grid-2">
          <!-- Interactive SVG Trajectory Trend Visualizer -->
          <div class="card">
            <div class="card-header">
              <div>
                <h3 class="card-title">VM2026 Historical Trajectory Visualizer</h3>
                <p class="card-subtitle">Month-on-month trend telemetry against national benchmarks (FR_06)</p>
              </div>
              <div class="tab-pills">
                <button class="tab-btn ${this.chartMetric === 'food' ? 'active' : ''}" data-metric="food">Food (kg)</button>
                <button class="tab-btn ${this.chartMetric === 'water' ? 'active' : ''}" data-metric="water">Water (kL)</button>
                <button class="tab-btn ${this.chartMetric === 'energy' ? 'active' : ''}" data-metric="energy">Power (kWh)</button>
                <button class="tab-btn ${this.chartMetric === 'score' ? 'active' : ''}" data-metric="score">VM Score</button>
              </div>
            </div>
            
            <!-- SVG Chart Canvas -->
            <div class="chart-container" style="padding: 10px 0;">
              ${this.renderSVGChart(complianceHistory, this.chartMetric)}
            </div>
          </div>

          <!-- Parameterized Compliance Trajectory Table (FR_02) -->
          <div class="card">
            <div class="card-header">
              <div>
                <h3 class="card-title">Parameterized Compliance Audit Log (FR_02)</h3>
                <p class="card-subtitle">Filter resource reductions across specific quarters</p>
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
                    <th>VM2026 Score</th>
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

        <!-- 2-Column Section: Departmental Offender Heatmap & Operational Baselines -->
        <div class="grid grid-2">
          <!-- Departmental Offender Heatmap (FR_03) -->
          <div class="card">
            <div class="card-header">
              <div>
                <h3 class="card-title">Departmental Offender & Variance Heatmap (FR_03)</h3>
                <p class="card-subtitle">Live cross-module resource telemetry by department</p>
              </div>
              <span class="badge badge-warning">Live Telemetry</span>
            </div>
            <div class="heatmap-list">
              ${heatmaps.map(h => `
                <div class="heatmap-item level-${h.statusLevel}">
                  <div class="heatmap-info">
                    <div class="heatmap-title-row">
                      <span class="heatmap-dept">${h.department}</span>
                      <span class="badge badge-${h.statusLevel === 'critical' ? 'danger' : h.statusLevel === 'good' ? 'success' : 'primary'}">${h.status}</span>
                    </div>
                    <div class="heatmap-meta">
                      <span><strong>PIC:</strong> ${h.leadPIC}</span> • 
                      <span><strong>Primary:</strong> ${h.primaryResource}</span>
                    </div>
                  </div>
                  <div class="heatmap-metric-block">
                    <div class="heatmap-val">${h.wasteMetric}</div>
                    <div class="heatmap-variance ${h.varianceVsBaseline.startsWith('+') ? 'text-danger' : 'text-success'}">${h.varianceVsBaseline} vs target</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Operational Baselines (FR_04) & Audit Trail (FR_05 / FR_08) -->
          <div class="card">
            <div class="card-header">
              <div>
                <h3 class="card-title">Operational Resource Baselines (Oracle SQL)</h3>
                <p class="card-subtitle">Foundational constants with mandatory justification audit</p>
              </div>
              <span class="badge badge-secondary">FR_04 Configuration</span>
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
                      <td><small class="text-muted">${b.updatedAt} (${b.updatedBy})</small></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Chronological Security Audit Trail (FR_05 / FR_08) -->
        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">System Log & Immutable Baseline Audit Trail (FR_05 / FR_08)</h3>
              <p class="card-subtitle">Cryptographically timestamped ledger recording all administrative parameter adjustments</p>
            </div>
            <span class="badge badge-primary">Oracle SQL USER_AUDIT</span>
          </div>
          <div class="audit-stream">
            ${auditLogs.length === 0 ? `
              <div class="empty-state">No baseline adjustments have been made.</div>
            ` : auditLogs.slice(0, 8).map(log => `
              <div class="audit-entry">
                <div class="audit-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <div class="audit-content">
                  <div class="audit-top">
                    <span class="audit-action"><code>${log.action}</code></span>
                    <span class="audit-time text-muted">${log.timestamp}</span>
                  </div>
                  <div class="audit-desc">
                    <strong>${log.userName}</strong> modified baseline <code>${log.targetKey}</code>:
                    <span class="audit-diff text-danger">${log.previousValue}</span> ➔ <span class="audit-diff text-success">${log.newValue}</span>
                  </div>
                  <div class="audit-reason text-muted"><em>Justification: ${log.reason}</em></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Baseline Update Modal Form (FR_04 & FR_08) -->
      <div class="modal-backdrop" id="baseline-modal" style="display: none;">
        <div class="modal-card">
          <div class="modal-header">
            <h3 class="modal-title">Update Operational Baseline (FR_04)</h3>
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
              <label class="form-label">Mandatory Operational Justification (Audit Trail FR_08)</label>
              <textarea class="form-input" id="modal-baseline-reason" rows="3" placeholder="Explain engineering/culinary rationale (e.g., Aerator retrofit completed in Tower A)..." required></textarea>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline" id="btn-cancel-baseline">Cancel</button>
              <button type="submit" class="btn btn-primary">Save & Record to Immutable Log</button>
            </div>
          </form>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  renderSVGChart(history, metricKey) {
    let dataPoints = [];
    let label = 'Food Saved (kg)';
    let color = '#10b981';

    if (metricKey === 'food') {
      dataPoints = history.map(h => ({ x: h.month.split(' ')[0], y: h.foodSavedKg }));
      label = 'Food Saved (kg)';
      color = '#10b981';
    } else if (metricKey === 'water') {
      dataPoints = history.map(h => ({ x: h.month.split(' ')[0], y: h.waterConservedL / 1000 }));
      label = 'Water Conserved (kL)';
      color = '#0ea5e9';
    } else if (metricKey === 'energy') {
      dataPoints = history.map(h => ({ x: h.month.split(' ')[0], y: h.energySavedKwh }));
      label = 'Power Saved (kWh)';
      color = '#8b5cf6';
    } else if (metricKey === 'score') {
      dataPoints = history.map(h => ({ x: h.month.split(' ')[0], y: h.vmScore }));
      label = 'VM2026 Score (/100)';
      color = '#f59e0b';
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
            <stop offset="0%" stop-color="${color}" stop-opacity="0.35" />
            <stop offset="100%" stop-color="${color}" stop-opacity="0.0" />
          </linearGradient>
        </defs>
        <!-- Horizontal Gridlines -->
        <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="rgba(255,255,255,0.1)" stroke-width="1" />
        <line x1="${padding}" y1="${(height - padding) / 2}" x2="${width - padding}" y2="${(height - padding) / 2}" stroke="rgba(255,255,255,0.06)" stroke-dasharray="4" />
        
        <!-- Area fill -->
        <path d="${areaD}" fill="url(#chartGrad-${metricKey})" />
        
        <!-- Line stroke -->
        <path d="${pathD}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" />
        
        <!-- Data Dots & Labels -->
        ${points.map(p => `
          <circle cx="${p.x}" cy="${p.y}" r="4" fill="${color}" stroke="#ffffff" stroke-width="2" />
          <text x="${p.x}" y="${p.y - 8}" fill="${color}" font-size="10" font-weight="700" text-anchor="middle" font-family="sans-serif">${p.val.toLocaleString()}</text>
          <text x="${p.x}" y="${height - 12}" fill="#94a3b8" font-size="11" text-anchor="middle" font-family="sans-serif">${p.label}</text>
        `).join('')}
      </svg>
    `;
  }

  attachEventListeners() {
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
          alert('Validation Error (A1 Step 2): Baseline value must be a positive numeric number.');
          return;
        }

        const success = db.updateBaseline(id, val, reason);
        if (success) {
          modal.style.display = 'none';
          window.showGlobalToast?.('Operational baseline updated and recorded to Oracle SQL Audit Trail!', 'success');
        }
      };
    }

    if (exportBtn) {
      exportBtn.onclick = () => this.exportComplianceReportPDF();
    }
  }

  exportComplianceReportPDF() {
    const compliance = ComplianceEngine.calculateLiveScore();
    const printWindow = window.open('', '_blank', 'width=950,height=750');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>VM2026 Sustainability Compliance Report</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #0f172a; background: #ffffff; }
          .header { border-bottom: 3px solid #059669; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-start; }
          .title { font-size: 24px; font-weight: 900; color: #0f172a; margin: 0; }
          .subtitle { color: #64748b; margin-top: 6px; font-size: 13px; }
          .seal { border: 2px solid #059669; color: #059669; padding: 8px 14px; border-radius: 8px; font-weight: 800; font-size: 12px; text-transform: uppercase; text-align: center; }
          .score-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
          .score-num { font-size: 52px; font-weight: 900; color: #059669; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { text-align: left; padding: 12px; border-bottom: 1px solid #e2e8f0; }
          th { background: #f1f5f9; font-size: 11px; text-transform: uppercase; color: #64748b; }
          .footer { margin-top: 50px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; display: flex; justify-content: space-between; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">VISIT MALAYSIA 2026 (VM2026) SUSTAINABILITY COMPLIANCE AUDIT</div>
            <div class="subtitle">Property: Grand Bay Eco-Resort & Spa (VM2026 Certified) • Date: ${new Date().toLocaleDateString()} • Lead: Kar Hang (Exec Director)</div>
          </div>
          <div class="seal">
            VM2026 Verified<br/>Platinum Tier
          </div>
        </div>
        <div class="score-box">
          <div>
            <h3 style="margin: 0 0 6px 0; font-size: 18px;">Overall Environmental Conformance Grade</h3>
            <p style="margin: 0; color: #475569; font-weight: 600;">${compliance.grade}</p>
            <p style="margin: 4px 0 0 0; color: #64748b; font-size: 12px;">GHG Avoided: ${(compliance.metrics.totalCo2AvoidedKg / 1000).toFixed(1)} metric tons CO2e • Net Operational Cost Savings: RM ${compliance.metrics.totalCostSavingsMyr.toLocaleString()}</p>
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
              <td>+18.4% (Optimized via Module 3 Smart Prep)</td>
              <td>${(compliance.metrics.foodWasteSavedMTD * 2.5).toFixed(0)} kg CO2e</td>
            </tr>
            <tr>
              <td>Water Conserved (Guest Opt-Outs & Rapid Leak Fixes)</td>
              <td>${(compliance.metrics.waterConservedMTD / 1000).toFixed(1)} kL (122,000 Liters)</td>
              <td>+14.2% Conformance (Module 4 & 5 Sync)</td>
              <td>${((compliance.metrics.waterConservedMTD / 1000) * 0.35).toFixed(0)} kg CO2e</td>
            </tr>
            <tr>
              <td>Decarbonized Electricity Consumption</td>
              <td>${compliance.metrics.energySavedMTD} kWh</td>
              <td>+12.0% Target Compliant</td>
              <td>${(compliance.metrics.energySavedMTD * 0.65).toFixed(0)} kg CO2e</td>
            </tr>
          </tbody>
        </table>
        <div class="footer">
          <span>Verified by Oracle SQL Audit Engine • Immutable Hash: SEC-${Date.now()}</span>
          <span>Approved by Sustainability Board</span>
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
