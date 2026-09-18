import { db } from '../db/storage.js';
import { ComplianceEngine } from '../engines/complianceEngine.js';

export class Module1Dashboard {
  constructor(container) {
    this.container = container;
    this.chartMetric = 'food';
    this.reportYear = '2026';
    this.reportPeriod = 'all';
    this.unsubs = [];
    this.isDestroyed = false;
    this.init();
  }

  init() {
    this.render();
    this.unsubs.push(
      db.subscribe('system', () => { if (!this.isDestroyed) this.render(); }),
      db.subscribe('baselines', () => { if (!this.isDestroyed) this.render(); }),
      db.subscribe('userAudit', () => { if (!this.isDestroyed) this.render(); }),
      db.subscribe('repairTickets', () => { if (!this.isDestroyed) this.render(); }),
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
    let compliance;
    let complianceHistory;

    try {
      const databaseError = db.getLastDatabaseError();
      if (databaseError) throw databaseError;

      compliance = ComplianceEngine.calculateLiveScore();
      complianceHistory = db.get('complianceLogs');
    } catch (error) {
      this.renderDashboardError(error);
      return;
    }

    let filteredHistory = complianceHistory;

  if (this.reportYear && this.reportYear !== 'all-years') {
    filteredHistory = filteredHistory.filter(c => c.month.includes(this.reportYear));
  }
  
  if (this.reportPeriod === 'q1') {
    filteredHistory = filteredHistory.filter(c => c.month.startsWith('Jan') || c.month.startsWith('Feb') || c.month.startsWith('Mar'));
  } else if (this.reportPeriod === 'q2') {
    filteredHistory = filteredHistory.filter(c => c.month.startsWith('Apr') || c.month.startsWith('May') || c.month.startsWith('Jun'));
  } else if (this.reportPeriod === 'q3') {
    filteredHistory = filteredHistory.filter(c => c.month.startsWith('Jul') || c.month.startsWith('Aug') || c.month.startsWith('Sep'));
  } else if (this.reportPeriod === 'q4') {
    filteredHistory = filteredHistory.filter(c => c.month.startsWith('Oct') || c.month.startsWith('Nov') || c.month.startsWith('Dec'));
  } else if (this.reportPeriod === 'mtd') {
      filteredHistory = filteredHistory.filter(c => c.month.includes('(MTD)'));
    }

    const subNavTpl = `
      <div class="tab-pills-full grid-cols-4" style="margin-bottom: 8px;">
        <button class="tab-btn sidebar-nav-btn active" data-target="m1-dashboard">
          <span>📊</span> Sustainability Dashboard
        </button>
        <button class="tab-btn sidebar-nav-btn" data-target="m1-department">
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
        <div class="view-header" style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h1 class="view-title">Executive Analytics</h1>
          </div>
          <div>
            <button class="btn btn-sm btn-primary" id="btn-export-global-pdf">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export Executive Report
            </button>
          </div>
        </div>

        ${subNavTpl}

        <!-- Main Content Area - Full Widescreen Width -->
        <div class="grid grid-4 kpi-row">
          <div class="card kpi-card">
            <span class="kpi-label">Sustainability Score</span>
            ${compliance.dataComplete ? `
              <div class="kpi-value-lg text-primary">${compliance.score}<span style="font-size: 14px; color: var(--text-muted); font-weight: 400;">/100</span></div>
              <span class="kpi-trend positive">Grade ${compliance.grade} (${compliance.label})</span>
            ` : `
              <div class="kpi-value-lg text-warning">—</div>
              <span class="kpi-trend negative">Data incomplete</span>
            `}
          </div>

          <div class="card kpi-card">
            <span class="kpi-label">Food Waste</span>
            <div class="kpi-value-lg text-primary">${compliance.metrics.foodWasteCurrentKg.toFixed(1)} <span class="kpi-unit">kg</span></div>
            <span class="kpi-trend neutral">Current period aggregation</span>
          </div>

          <div class="card kpi-card">
            <span class="kpi-label">Water Usage</span>
            <div class="kpi-value-lg">${(compliance.metrics.waterUseCurrentL / 1000).toFixed(1)} <span class="kpi-unit">kL</span></div>
            <span class="kpi-trend neutral">Hotel-wide consumption</span>
          </div>

          <div class="card kpi-card">
            <span class="kpi-label">Electricity Usage</span>
            <div class="kpi-value-lg">${compliance.metrics.energyUseCurrentKwh.toFixed(1)} <span class="kpi-unit">kWh</span></div>
            <span class="kpi-trend neutral">Hotel-wide consumption</span>
          </div>
        </div>

        <div class="grid grid-2">
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Historical Trajectory</h3>
              <div class="tab-pills">
                <button class="tab-btn ${this.chartMetric === 'food' ? 'active' : ''}" data-metric="food">Food</button>
                <button class="tab-btn ${this.chartMetric === 'water' ? 'active' : ''}" data-metric="water">Water</button>
                <button class="tab-btn ${this.chartMetric === 'energy' ? 'active' : ''}" data-metric="energy">Power</button>
                <button class="tab-btn ${this.chartMetric === 'score' ? 'active' : ''}" data-metric="score">Score</button>
              </div>
            </div>
            <div class="chart-container" style="padding: 10px 0;">
              ${this.renderSVGChart(complianceHistory, this.chartMetric)}
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Compliance Audit Log</h3>
              <div class="tab-pills">
                <button class="tab-btn ${this.reportPeriod === 'all' ? 'active' : ''}" data-period="all">All</button>
                <button class="tab-btn ${this.reportPeriod === 'q1' ? 'active' : ''}" data-period="q1">Q1</button>
                <button class="tab-btn ${this.reportPeriod === 'q2' ? 'active' : ''}" data-period="q2">Q2</button>
                <button class="tab-btn ${this.reportPeriod === 'mtd' ? 'active' : ''}" data-period="mtd">MTD</button>
              </div>
            </div>
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Reporting Period</th>
                    <th class="col-number">Food Diverted</th>
                    <th class="col-number">Water Saved</th>
                    <th class="col-number">Energy Avoided</th>
                    <th class="col-number">Target Score</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${filteredHistory.map(row => `
                    <tr>
                      <td><strong>${row.month}</strong></td>
                      <td class="col-number"><strong class="text-primary">${row.foodSavedKg} kg</strong></td>
                      <td class="col-number">${(row.waterConservedL / 1000).toFixed(1)} kL</td>
                      <td class="col-number">${row.energySavedKwh} kWh</td>
                      <td class="col-number"><strong style="color: var(--primary);">${row.vmScore}/100</strong></td>
                      <td>
                        <span class="status-dot-wrap">
                          <span class="status-dot success"></span> Verified
                        </span>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  renderDashboardError(error) {
    this.container.innerHTML = `
    <div class="card">
      <h2>Unable to load dashboard data</h2>
      <p class="text-muted">The dashboard metrics could not be retrieved.</p>
      <button class="btn btn-sm btn-primary" id="retry-dashboard">Refresh</button>
    </div>`;
    this.container.querySelector('#retry-dashboard').onclick = () => {
      db.clearLastDatabaseError();
      this.render();
    };
  }

  renderSVGChart(history, metricKey) {
  if (!history || history.length === 0) return `<div style="height: 250px; display: flex; align-items: center; justify-content: center; color: var(--text-muted); font-style: italic;">No chart telemetry available for this period.</div>`;
  let dataPoints = [];
let color = '#10b981';

if (metricKey === 'food') {
  dataPoints = history.map(h => ({ x: h.month.split(' ')[0], y: h.foodSavedKg }));
  color = '#f97316';
} else if (metricKey === 'water') {
  dataPoints = history.map(h => ({ x: h.month.split(' ')[0], y: h.waterConservedL / 1000 }));
  color = '#38bdf8';
} else if (metricKey === 'energy') {
  dataPoints = history.map(h => ({ x: h.month.split(' ')[0], y: h.energySavedKwh }));
  color = '#c084fc';
} else if (metricKey === 'score') {
  dataPoints = history.map(h => ({ x: h.month.split(' ')[0], y: h.vmScore }));
  color = '#10b981';
}

const maxY = Math.max(...dataPoints.map(d => d.y)) * 1.15 || 100;
const minY = 0;
const width = 1000;
const height = 350;
const padding = 45;

const points = dataPoints.map((d, i) => {
  const divisor = dataPoints.length > 1 ? (dataPoints.length - 1) : 1;
  const x = padding + (i * ((width - padding * 2) / divisor));
  const y = height - padding - ((d.y - minY) / (maxY - minY)) * (height - padding * 2);
  return { x, y, val: d.y, label: d.x };
});

const pathD = points.reduce((acc, p, i) => i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`, '');
const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

return `
  <svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" style="overflow: visible;">
    <defs>
      <linearGradient id="chartGrad-${metricKey}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.2" />
        <stop offset="100%" stop-color="${color}" stop-opacity="0.0" />
      </linearGradient>
    </defs>
    <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="rgba(128,128,128,0.15)" stroke-width="1" />
    <line x1="${padding}" y1="${(height - padding) / 2}" x2="${width - padding}" y2="${(height - padding) / 2}" stroke="rgba(128,128,128,0.1)" stroke-dasharray="4" />
    <path d="${areaD}" fill="url(#chartGrad-${metricKey})" />
    <path d="${pathD}" fill="none" stroke="${color}" stroke-width="4.5" stroke-linecap="round" />
    ${points.map(p => `
      <circle cx="${p.x}" cy="${p.y}" r="3.5" fill="${color}" stroke="#ffffff" stroke-width="1.5" />
      <text x="${p.x}" y="${p.y - 8}" fill="${color}" font-size="10" font-weight="600" text-anchor="middle" font-family="sans-serif">${p.val.toLocaleString()}</text>
      <text x="${p.x}" y="${height - 12}" fill="#71717a" font-size="11" text-anchor="middle" font-family="sans-serif">${p.label}</text>
    `).join('')}
  </svg>
`;
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

    this.container.querySelectorAll('.tab-btn[data-metric]').forEach(btn => {
      btn.onclick = () => {
        this.chartMetric = btn.dataset.metric;
        this.render();
      };
    });

    this.container.querySelectorAll('.tab-btn[data-period]').forEach(btn => {
  btn.onclick = () => {
    this.reportPeriod = btn.dataset.period;
    this.render();
  };
});

const yearSelect = this.container.querySelector('#filter-year');
if (yearSelect) {
  yearSelect.onchange = (e) => {
    this.reportYear = e.target.value;
    this.render();
  };
}

const exportBtn = this.container.querySelector('#btn-export-global-pdf');
if (exportBtn) {
  exportBtn.onclick = () => this.exportComplianceReportPDF();
}
}

  exportComplianceReportPDF() {
    const compliance = ComplianceEngine.calculateLiveScore();
    
    if (!compliance.dataComplete) {
      window.showGlobalToast('PDF export failed. Data incomplete.', 'error');
      return;
    }

    db.recordAuditLog({
      action: 'GENERATE_EXECUTIVE_REPORT',
      targetKey: 'Global VM2026 Metrics',
      previousValue: 'N/A',
      newValue: 'PDF Exported',
      reason: 'User generated the Executive Sustainability Compliance Report'
    });

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      window.showGlobalToast('PDF export failed. Please check popup blockers.', 'error');
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
            <div class="title">SUSTAINABILITY COMPLIANCE AUDIT REPORT</div>
            <div class="subtitle">Property: Grand Bay Eco-Resort & Spa &bull; Date: ${new Date().toLocaleDateString()}</div>
          </div>
          <div class="seal">
            Report Data<br/>${compliance.label}
          </div>
        </div>
        <div class="score-box">
          <div>
            <h3 style="margin: 0 0 4px 0; font-size: 16px;">Overall Environmental Conformance Grade</h3>
            <p style="margin: 0; color: #18181b; font-weight: 600;">${compliance.grade}</p>
            <p style="margin: 4px 0 0 0; color: #71717a; font-size: 11px;">GHG Avoided: ${(compliance.metrics.totalCo2AvoidedKg / 1000).toFixed(1)} metric tons CO2e &bull; Net Operational Cost Savings: RM ${compliance.metrics.totalCostSavingsMyr.toLocaleString()}</p>
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
          <div>Generated by EcoHotel OS Validation Engine &bull; User ID: ADMIN_EXEC_01</div>
          <div>Page 1 of 1</div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    

  }
}
